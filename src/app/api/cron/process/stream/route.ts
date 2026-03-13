// SSE streaming endpoint for AI processing pipeline with detailed progress
// Supports ?from=N to resume from stage N (1-6), skipping earlier stages
// Logs are persisted to pipeline_runs for page refresh recovery
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { processUnprocessedRaw } from '@/modules/ai-agents/fact-splitter'
import { resolveEntitiesBatch } from '@/modules/ai-agents/entity-resolver'
import { mergeTimelinesBatch } from '@/modules/ai-agents/timeline-merger'
import { detectContradictionsBatch } from '@/modules/ai-agents/contradiction-detector'
import { translateFactsBatch } from '@/modules/ai-agents/translator'

import { validateSourceTraceback } from '@/modules/ai-agents/validators/source-traceback'
import { validateCrossSource } from '@/modules/ai-agents/validators/cross-source'
import { validateNumericalSanity } from '@/modules/ai-agents/validators/numerical-sanity'
import { validateOnchainAnchor } from '@/modules/ai-agents/validators/onchain-anchor'
import { validateTemporalConsistency } from '@/modules/ai-agents/validators/temporal-consistency'
import { adjudicate } from '@/modules/ai-agents/validators/adjudicator'
import { getVerifiersForFact } from '@/config/verification-strategy'

import { createPipelineLogger, PipelineCancelledError } from '@/lib/pipeline-logger'
import { verifyAdminToken } from '@/lib/admin-auth'
import type { AtomicFact } from '@/lib/types'

export const maxDuration = 900

const RAW_TABLES = ['raw_news', 'raw_filings', 'raw_product_updates', 'raw_funding', 'raw_regulatory'] as const
const RAW_TABLE_NAMES: Record<string, string> = {
  raw_news: '新闻', raw_filings: 'SEC 报告', raw_product_updates: '产品更新',
  raw_funding: '融资事件', raw_regulatory: '监管动态',
}

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const url = new URL(request.url)
  const fromStage = parseInt(url.searchParams.get('from') ?? '1', 10)
  const isTest = url.searchParams.get('test') === 'true'
  const encoder = new TextEncoder()

  // Test mode: 每张表最多处理 3 条，验证最多 5 条
  const RAW_LIMIT = isTest ? 3 : 200
  const VERIFY_LIMIT = isTest ? 5 : Infinity

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const logger = await createPipelineLogger('process', send)
      send({ type: 'init', runId: logger.runId })

      const weekNumber = getCurrentWeekNumber()
      const modeLabel = isTest ? ' [测试模式: 每表3条]' : ''
      logger.log(`AI 处理流水线启动，当前周次: ${weekNumber}${modeLabel}${fromStage > 1 ? `，从阶段 ${fromStage} 开始` : ''}`, 'info')

      try {
        // ── Pre-check ──
        logger.progress('预检', '统计待处理数据...')

        let totalUnprocessed = 0
        for (const table of RAW_TABLES) {
          const tableName = RAW_TABLE_NAMES[table] ?? table
          const { count, error } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq('processed', false)

          if (error) {
            logger.log(`  ${tableName}: 查询失败 — ${error.message}`, 'error')
          } else {
            const c = count ?? 0
            totalUnprocessed += c
            logger.log(`  ${tableName}: ${c} 条待处理`, c > 0 ? 'info' : 'success')
          }
        }

        const { count: pendingCount } = await supabaseAdmin
          .from('atomic_facts')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'pending_verification')

        const { count: verifiedCount } = await supabaseAdmin
          .from('atomic_facts')
          .select('*', { count: 'exact', head: true })
          .in('verification_status', ['verified', 'partially_verified'])

        const { count: untranslatedCount } = await supabaseAdmin
          .from('atomic_facts')
          .select('*', { count: 'exact', head: true })
          .in('verification_status', ['verified', 'partially_verified'])
          .or('content_en.is.null,content_en.eq.')

        logger.log(
          `预检完成 — 待处理原始数据 ${totalUnprocessed} 条，待验证 ${pendingCount ?? 0} 条，已验证 ${verifiedCount ?? 0} 条，待翻译 ${untranslatedCount ?? 0} 条`,
          'info'
        )

        if (fromStage <= 1 && totalUnprocessed === 0 && (pendingCount ?? 0) === 0 && (untranslatedCount ?? 0) === 0) {
          logger.log('没有需要处理的数据，流水线跳过', 'success')
          await logger.done({ message: '无待处理数据' })
          controller.close()
          return
        }

        let totalRaw = 0
        let totalFacts = 0
        let verified = 0, rejected = 0, partial = 0

        // ── Stage 1: Fact splitting ──
        if (fromStage <= 1) {
          logger.progress('阶段1/6', '事实拆分 (B1) — 从原始数据提取原子事实')

          for (const table of RAW_TABLES) {
            const tableName = RAW_TABLE_NAMES[table] ?? table
            logger.log(`  处理表: ${tableName} (${table})...`, 'info')
            try {
              const result = await processUnprocessedRaw(table, weekNumber, RAW_LIMIT, (current, total) => {
                logger.log(`  ${tableName}: ${current}/${total}`, 'progress')
              }, () => logger.checkCancelled())
              totalRaw += result.total
              totalFacts += result.factIds.length
              logger.log(`  ${tableName}: 处理 ${result.total} 条，提取 ${result.factIds.length} 条事实，丢弃 ${result.dropped}`, 'success')
            } catch (err) {
              if (err instanceof PipelineCancelledError) throw err
              logger.log(`  ${tableName}: 处理失败 — ${err instanceof Error ? err.message : String(err)}`, 'error')
            }
          }
          logger.log(`阶段1完成 — 原始数据 ${totalRaw} 条，提取事实 ${totalFacts} 条`, 'success')
        } else {
          logger.log('阶段1 跳过（从后续阶段开始）', 'info')
        }

        await logger.checkCancelled()

        // ── Stage 2: Validation ──
        if (fromStage <= 2) {
          logger.progress('阶段2/6', '六层验证 (V1-V5 + V0) — 验证候选事实')

          const { data: pendingFacts } = await supabaseAdmin
            .from('atomic_facts')
            .select('*')
            .eq('verification_status', 'pending_verification')

          const allPending = (pendingFacts ?? []) as AtomicFact[]
          const facts = VERIFY_LIMIT < Infinity ? allPending.slice(0, VERIFY_LIMIT) : allPending
          logger.log(`  待验证事实: ${facts.length} 条${isTest && allPending.length > facts.length ? ` (测试模式，跳过 ${allPending.length - facts.length} 条)` : ''}`, 'info')

          const BATCH = 20
          for (let i = 0; i < facts.length; i += BATCH) {
            const batch = facts.slice(i, i + BATCH)
            logger.log(`  验证: ${Math.min(i + BATCH, facts.length)}/${facts.length}`, 'progress')

            const results = await Promise.allSettled(batch.map(async (fact) => {
              // Decision #14: 按事实类型选择需要运行的验证器
              const activeVerifiers = getVerifiersForFact(fact.fact_type)

              // V1 (source traceback) always runs via strategy; run only selected verifiers
              const [r1, r2, r3, r4, r5] = await Promise.allSettled([
                validateSourceTraceback(fact),
                activeVerifiers.has('v2') ? validateCrossSource(fact) : Promise.resolve(null),
                activeVerifiers.has('v3') ? validateNumericalSanity(fact) : Promise.resolve(null),
                activeVerifiers.has('v4') ? validateOnchainAnchor(fact) : Promise.resolve(null),
                activeVerifiers.has('v5') ? validateTemporalConsistency(fact) : Promise.resolve(null),
              ])

              const v1 = r1.status === 'fulfilled' ? r1.value : { status: 'source_unavailable' as const, evidence_quote: null, match_score: 0 }
              const v2 = r2.status === 'fulfilled' ? r2.value : (activeVerifiers.has('v2') ? { source_count: 1, consistent_count: 1, cross_validation: 'single_source' as const, is_minority: false, majority_value: null, independent_sources: false, source_urls: [], source_independence_note: null, details: null } : null)
              const v3 = r3.status === 'fulfilled' ? r3.value : (activeVerifiers.has('v3') ? { sanity: 'not_applicable' as const, reason: null, historical_reference: null } : null)
              const v4 = r4.status === 'fulfilled' ? r4.value : (activeVerifiers.has('v4') ? { anchor_status: 'not_applicable' as const, claimed_value: null, actual_value: null, deviation_pct: null } : null)
              const v5 = r5.status === 'fulfilled' ? r5.value : (activeVerifiers.has('v5') ? { temporal_status: 'unchecked' as const, conflict_detail: null } : null)

              const verdict = adjudicate({ v1, v2, v3, v4, v5 })

              const { error: updateError } = await supabaseAdmin
                .from('atomic_facts')
                .update({
                  v1_result: v1, v2_result: v2, v3_result: v3, v4_result: v4, v5_result: v5,
                  verification_status: verdict.status,
                  confidence: verdict.confidence,
                  confidence_reasons: verdict.reason ? verdict.reason.split('; ').filter(Boolean) : [],
                  updated_at: new Date().toISOString(),
                })
                .eq('id', fact.id)

              if (updateError) {
                console.error(`[process] Failed to update fact ${fact.id}:`, updateError.message)
              }

              return verdict
            }))

            for (const r of results) {
              if (r.status === 'fulfilled') {
                if (r.value.status === 'verified') verified++
                else if (r.value.status === 'rejected') rejected++
                else if (r.value.status === 'partially_verified') partial++
              }
            }
          }
          logger.log(`阶段2完成 — 已验证 ${verified}，部分验证 ${partial}，拒绝 ${rejected}`, 'success')
        } else {
          logger.log('阶段2 跳过', 'info')
        }

        await logger.checkCancelled()

        // ── Get verified fact IDs for stages 3-6 ──
        const { data: verifiedRows } = await supabaseAdmin
          .from('atomic_facts')
          .select('id')
          .in('verification_status', ['verified', 'partially_verified'])

        const verifiedFactIds = (verifiedRows ?? []).map((r: { id: string }) => r.id)
        logger.log(`${verifiedFactIds.length} 条已验证事实`, 'info')

        // ── 增量过滤：只处理尚未完成各阶段的事实 ──
        // B2: 过滤掉已有 fact_entities 记录的事实
        const { data: b2DoneRows } = await supabaseAdmin
          .from('fact_entities')
          .select('fact_id')
          .in('fact_id', verifiedFactIds.length > 0 ? verifiedFactIds : ['__none__'])
        const b2DoneSet = new Set((b2DoneRows ?? []).map((r: { fact_id: string }) => r.fact_id))
        const b2TodoIds = verifiedFactIds.filter(id => !b2DoneSet.has(id))

        // B3: 过滤掉已有 timeline_facts 记录的事实
        const { data: b3DoneRows } = await supabaseAdmin
          .from('timeline_facts')
          .select('fact_id')
          .in('fact_id', verifiedFactIds.length > 0 ? verifiedFactIds : ['__none__'])
        const b3DoneSet = new Set((b3DoneRows ?? []).map((r: { fact_id: string }) => r.fact_id))
        const b3TodoIds = verifiedFactIds.filter(id => !b3DoneSet.has(id))

        // B4: 过滤掉已作为 fact_id_a 检查过的事实
        const { data: b4DoneRows } = await supabaseAdmin
          .from('fact_contradictions')
          .select('fact_id_a')
          .in('fact_id_a', verifiedFactIds.length > 0 ? verifiedFactIds : ['__none__'])
        const b4DoneSet = new Set((b4DoneRows ?? []).map((r: { fact_id_a: string }) => r.fact_id_a))
        // B4 比较特殊：没有矛盾的事实不会有记录，所以不能用这个方法跳过
        // 改用：跟 B2 一样只处理本次新验证的事实（b2TodoIds 之外的都是老的）
        // 但更可靠的方式是：对所有事实都跑 B4（因为新老事实可能矛盾）
        // 折中：只对本次新增的事实运行 B4
        const b4TodoIds = b2TodoIds.length > 0 ? b2TodoIds : []

        logger.log(`增量: B2 待处理 ${b2TodoIds.length}/${verifiedFactIds.length}, B3 待处理 ${b3TodoIds.length}/${verifiedFactIds.length}, B4 待处理 ${b4TodoIds.length}`, 'info')

        // ── Stage 3: Entity resolution ──
        if (fromStage <= 3) {
          if (b2TodoIds.length > 0) {
            logger.progress('阶段3/6', `实体识别 (B2) — ${b2TodoIds.length} 条待处理`)
            try {
              const b2Stats = await resolveEntitiesBatch(
                b2TodoIds,
                () => logger.checkCancelled(),
                (current, total) => logger.log(`  实体识别: ${current}/${total}`, 'progress')
              )
              logger.log(`阶段3完成 — 成功 ${b2Stats.succeeded} 条，失败 ${b2Stats.failed} 条 (跳过 ${b2DoneSet.size} 条已处理)`, 'success')
            } catch (err) {
              if (err instanceof PipelineCancelledError) throw err
              logger.log(`阶段3失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
            }
          } else {
            logger.log('阶段3 跳过 — 所有事实已完成实体识别', 'info')
          }
        } else {
          logger.log('阶段3 跳过', 'info')
        }

        await logger.checkCancelled()

        // ── Stage 4: Timeline merging ──
        if (fromStage <= 4) {
          if (b3TodoIds.length > 0) {
            logger.progress('阶段4/6', `时间线归并 (B3) — ${b3TodoIds.length} 条待处理`)
            try {
              const b3Stats = await mergeTimelinesBatch(
                b3TodoIds,
                () => logger.checkCancelled(),
                (current, total) => logger.log(`  时间线归并: ${current}/${total}`, 'progress')
              )
              logger.log(
                `阶段4完成 — 分配 ${b3Stats.assigned}，新建 ${b3Stats.created}，独立 ${b3Stats.standalone}，失败 ${b3Stats.failed} (跳过 ${b3DoneSet.size} 条已处理)`,
                'success'
              )
            } catch (err) {
              if (err instanceof PipelineCancelledError) throw err
              logger.log(`阶段4失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
            }
          } else {
            logger.log('阶段4 跳过 — 所有事实已完成时间线归并', 'info')
          }
        } else {
          logger.log('阶段4 跳过', 'info')
        }

        await logger.checkCancelled()

        // ── Stage 5: Contradiction detection ──
        if (fromStage <= 5) {
          if (b4TodoIds.length > 0) {
            logger.progress('阶段5/6', `矛盾检测 (B4) — ${b4TodoIds.length} 条待处理`)
            try {
              const b4Stats = await detectContradictionsBatch(
                b4TodoIds,
                () => logger.checkCancelled(),
                (current, total) => logger.log(`  矛盾检测: ${current}/${total}`, 'progress')
              )
              logger.log(`阶段5完成 — 已检查 ${b4Stats.checked} 条，失败 ${b4Stats.failed} 条`, 'success')
            } catch (err) {
              if (err instanceof PipelineCancelledError) throw err
              logger.log(`阶段5失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
            }
          } else {
            logger.log('阶段5 跳过 — 无新事实需要矛盾检测', 'info')
          }
        } else {
          logger.log('阶段5 跳过', 'info')
        }

        await logger.checkCancelled()

        // ── Stage 6: Translation ──
        if (fromStage <= 6) {
          logger.progress('阶段6/6', '翻译 (B5) — 双语补全')
          try {
            const b5Stats = await translateFactsBatch(
              verifiedFactIds,
              () => logger.checkCancelled(),
              (current, total) => logger.log(`  翻译: ${current}/${total}`, 'progress')
            )
            logger.log(`阶段6完成 — 翻译 ${b5Stats.translated} 条，跳过 ${b5Stats.skipped} 条，失败 ${b5Stats.failed} 条`, 'success')
          } catch (err) {
            if (err instanceof PipelineCancelledError) throw err
            logger.log(`阶段6失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }
        }

        // ── Final summary ──
        logger.log('─── 处理汇总 ───', 'info')
        if (fromStage <= 1) {
          logger.log(`  原始数据处理: ${totalRaw} 条 → 提取事实 ${totalFacts} 条`, 'info')
        }
        if (fromStage <= 2) {
          logger.log(`  验证结果: 通过 ${verified}，部分通过 ${partial}，拒绝 ${rejected}`, 'info')
        }
        logger.log(`  后处理: ${verifiedFactIds.length} 条事实`, 'info')
        await logger.done({ message: 'AI 处理流水线全部完成' })
      } catch (err) {
        if (err instanceof PipelineCancelledError) {
          logger.log('流水线已被用户取消', 'error')
          await logger.cancel()
        } else {
          await logger.fail(`流水线异常: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
