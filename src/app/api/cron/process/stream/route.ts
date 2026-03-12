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

import { createPipelineLogger } from '@/lib/pipeline-logger'
import type { AtomicFact } from '@/lib/types'

export const maxDuration = 600

const RAW_TABLES = ['raw_news', 'raw_filings', 'raw_product_updates', 'raw_funding', 'raw_regulatory'] as const
const RAW_TABLE_NAMES: Record<string, string> = {
  raw_news: '新闻', raw_filings: 'SEC 报告', raw_product_updates: '产品更新',
  raw_funding: '融资事件', raw_regulatory: '监管动态',
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const fromStage = parseInt(url.searchParams.get('from') ?? '1', 10)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const logger = await createPipelineLogger('process', send)
      send({ type: 'init', runId: logger.runId })

      const weekNumber = getCurrentWeekNumber()
      logger.log(`AI 处理流水线启动，当前周次: ${weekNumber}${fromStage > 1 ? `，从阶段 ${fromStage} 开始` : ''}`, 'info')

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
              const result = await processUnprocessedRaw(table, weekNumber)
              totalRaw += result.total
              totalFacts += result.factIds.length
              logger.log(`  ${tableName}: 处理 ${result.total} 条，提取 ${result.factIds.length} 条事实，丢弃 ${result.dropped}`, 'success')
            } catch (err) {
              logger.log(`  ${tableName}: 处理失败 — ${err instanceof Error ? err.message : String(err)}`, 'error')
            }
          }
          logger.log(`阶段1完成 — 原始数据 ${totalRaw} 条，提取事实 ${totalFacts} 条`, 'success')
        } else {
          logger.log('阶段1 跳过（从后续阶段开始）', 'info')
        }

        // ── Stage 2: Validation ──
        if (fromStage <= 2) {
          logger.progress('阶段2/6', '六层验证 (V1-V5 + V0) — 验证候选事实')

          const { data: pendingFacts } = await supabaseAdmin
            .from('atomic_facts')
            .select('*')
            .eq('verification_status', 'pending_verification')

          const facts = (pendingFacts ?? []) as AtomicFact[]
          logger.log(`  待验证事实: ${facts.length} 条`, 'info')

          const BATCH = 20
          for (let i = 0; i < facts.length; i += BATCH) {
            const batch = facts.slice(i, i + BATCH)
            const batchNum = Math.floor(i / BATCH) + 1
            const totalBatches = Math.ceil(facts.length / BATCH)
            logger.log(`  验证批次 ${batchNum}/${totalBatches} (${batch.length} 条)...`, 'info')

            const results = await Promise.allSettled(batch.map(async (fact) => {
              const [r1, r2, r3, r4, r5] = await Promise.allSettled([
                validateSourceTraceback(fact),
                validateCrossSource(fact),
                validateNumericalSanity(fact),
                validateOnchainAnchor(fact),
                validateTemporalConsistency(fact),
              ])

              const v1 = r1.status === 'fulfilled' ? r1.value : { status: 'source_unavailable' as const, evidence_quote: null, match_score: 0 }
              const v2 = r2.status === 'fulfilled' ? r2.value : { source_count: 1, consistent_count: 1, cross_validation: 'single_source' as const, is_minority: false, majority_value: null, independent_sources: false, source_urls: [], source_independence_note: null, details: null }
              const v3 = r3.status === 'fulfilled' ? r3.value : { sanity: 'not_applicable' as const, reason: null, historical_reference: null }
              const v4 = r4.status === 'fulfilled' ? r4.value : { anchor_status: 'not_applicable' as const, claimed_value: null, actual_value: null, deviation_pct: null }
              const v5 = r5.status === 'fulfilled' ? r5.value : { temporal_status: 'unchecked' as const, conflict_detail: null }

              const verdict = adjudicate({ v1, v2, v3, v4, v5 })

              await supabaseAdmin
                .from('atomic_facts')
                .update({
                  v1_result: v1, v2_result: v2, v3_result: v3, v4_result: v4, v5_result: v5,
                  verification_status: verdict.status,
                  confidence: verdict.confidence,
                  confidence_reasons: verdict.reason ? verdict.reason.split('; ').filter(Boolean) : [],
                  updated_at: new Date().toISOString(),
                })
                .eq('id', fact.id)

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

        // ── Get verified fact IDs for stages 3-6 ──
        const { data: verifiedRows } = await supabaseAdmin
          .from('atomic_facts')
          .select('id')
          .in('verification_status', ['verified', 'partially_verified'])

        const verifiedFactIds = (verifiedRows ?? []).map((r: { id: string }) => r.id)
        logger.log(`  ${verifiedFactIds.length} 条已验证事实`, 'info')

        // ── Stage 3: Entity resolution ──
        if (fromStage <= 3) {
          logger.progress('阶段3/6', '实体识别 (B2) — 关联事实与实体')
          try {
            const b2Stats = await resolveEntitiesBatch(verifiedFactIds)
            logger.log(`阶段3完成 — 成功 ${b2Stats.succeeded} 条，失败 ${b2Stats.failed} 条`, 'success')
          } catch (err) {
            logger.log(`阶段3失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }
        } else {
          logger.log('阶段3 跳过', 'info')
        }

        // ── Stage 4: Timeline merging ──
        if (fromStage <= 4) {
          logger.progress('阶段4/6', '时间线归并 (B3) — 将事实分配到时间线')
          try {
            const b3Stats = await mergeTimelinesBatch(verifiedFactIds)
            logger.log(
              `阶段4完成 — 分配到已有时间线 ${b3Stats.assigned} 条，新建 ${b3Stats.created} 条，独立 ${b3Stats.standalone} 条，失败 ${b3Stats.failed} 条`,
              'success'
            )
          } catch (err) {
            logger.log(`阶段4失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }
        } else {
          logger.log('阶段4 跳过', 'info')
        }

        // ── Stage 5: Contradiction detection ──
        if (fromStage <= 5) {
          logger.progress('阶段5/6', '矛盾检测 (B4) — 检测事实间矛盾')
          try {
            const b4Stats = await detectContradictionsBatch(verifiedFactIds)
            logger.log(`阶段5完成 — 已检查 ${b4Stats.checked} 条，失败 ${b4Stats.failed} 条`, 'success')
          } catch (err) {
            logger.log(`阶段5失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
          }
        } else {
          logger.log('阶段5 跳过', 'info')
        }

        // ── Stage 6: Translation ──
        if (fromStage <= 6) {
          logger.progress('阶段6/6', '翻译 (B5) — 双语补全')
          try {
            const b5Stats = await translateFactsBatch(verifiedFactIds)
            logger.log(`阶段6完成 — 翻译 ${b5Stats.translated} 条，跳过 ${b5Stats.skipped} 条，失败 ${b5Stats.failed} 条`, 'success')
          } catch (err) {
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
        await logger.fail(`流水线异常: ${err instanceof Error ? err.message : String(err)}`)
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
