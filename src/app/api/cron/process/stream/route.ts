// SSE streaming endpoint for AI processing pipeline with detailed progress
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

import type { AtomicFact } from '@/lib/types'

export const maxDuration = 300

const RAW_TABLES = ['raw_news', 'raw_filings', 'raw_product_updates', 'raw_funding', 'raw_regulatory'] as const
const RAW_TABLE_NAMES: Record<string, string> = {
  raw_news: '新闻', raw_filings: 'SEC 报告', raw_product_updates: '产品更新',
  raw_funding: '融资事件', raw_regulatory: '监管动态',
}

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const weekNumber = getCurrentWeekNumber()
      send({ type: 'log', message: `AI 处理流水线启动，当前周次: ${weekNumber}`, level: 'info' })

      try {
        // ── Phase 1: Fact splitting ──
        send({ type: 'progress', step: '阶段1/6', message: '事实拆分 (B1) — 从原始数据提取原子事实' })

        let totalRaw = 0
        let totalFacts = 0
        const allFactIds: string[] = []

        for (const table of RAW_TABLES) {
          const tableName = RAW_TABLE_NAMES[table] ?? table
          send({ type: 'log', message: `  处理表: ${tableName} (${table})...`, level: 'info' })
          try {
            const result = await processUnprocessedRaw(table, weekNumber)
            totalRaw += result.total
            totalFacts += result.factIds.length
            allFactIds.push(...result.factIds)
            send({ type: 'log', message: `  ${tableName}: 处理 ${result.total} 条原始数据，提取 ${result.factIds.length} 条事实，丢弃 ${result.dropped}`, level: 'success' })
          } catch (err) {
            send({ type: 'log', message: `  ${tableName}: 处理失败 — ${err instanceof Error ? err.message : String(err)}`, level: 'error' })
          }
        }

        send({ type: 'log', message: `阶段1完成 — 原始数据 ${totalRaw} 条，提取事实 ${totalFacts} 条`, level: 'success' })

        // ── Phase 2: Validation ──
        send({ type: 'progress', step: '阶段2/6', message: '六层验证 (V1-V5 + V0) — 验证候选事实' })

        const { data: pendingFacts } = await supabaseAdmin
          .from('atomic_facts')
          .select('*')
          .eq('verification_status', 'pending_verification')

        const facts = (pendingFacts ?? []) as AtomicFact[]
        send({ type: 'log', message: `  待验证事实: ${facts.length} 条`, level: 'info' })

        let verified = 0, rejected = 0, partial = 0
        const BATCH = 20

        for (let i = 0; i < facts.length; i += BATCH) {
          const batch = facts.slice(i, i + BATCH)
          const batchNum = Math.floor(i / BATCH) + 1
          const totalBatches = Math.ceil(facts.length / BATCH)
          send({ type: 'log', message: `  验证批次 ${batchNum}/${totalBatches} (${batch.length} 条)...`, level: 'info' })

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

        send({ type: 'log', message: `阶段2完成 — 已验证 ${verified}，部分验证 ${partial}，拒绝 ${rejected}`, level: 'success' })

        // ── Get verified fact IDs ──
        const { data: verifiedRows } = await supabaseAdmin
          .from('atomic_facts')
          .select('id')
          .in('verification_status', ['verified', 'partially_verified'])

        const verifiedFactIds = (verifiedRows ?? []).map((r: { id: string }) => r.id)
        send({ type: 'log', message: `  ${verifiedFactIds.length} 条事实进入后处理阶段`, level: 'info' })

        // ── Phase 3: Entity resolution ──
        send({ type: 'progress', step: '阶段3/6', message: '实体识别 (B2) — 关联事实与实体' })
        try {
          await resolveEntitiesBatch(verifiedFactIds)
          send({ type: 'log', message: '阶段3完成 — 实体识别完成', level: 'success' })
        } catch (err) {
          send({ type: 'log', message: `阶段3失败: ${err instanceof Error ? err.message : String(err)}`, level: 'error' })
        }

        // ── Phase 4: Timeline merging ──
        send({ type: 'progress', step: '阶段4/6', message: '时间线归并 (B3) — 将事实分配到时间线' })
        try {
          await mergeTimelinesBatch(verifiedFactIds)
          send({ type: 'log', message: '阶段4完成 — 时间线归并完成', level: 'success' })
        } catch (err) {
          send({ type: 'log', message: `阶段4失败: ${err instanceof Error ? err.message : String(err)}`, level: 'error' })
        }

        // ── Phase 5: Contradiction detection ──
        send({ type: 'progress', step: '阶段5/6', message: '矛盾检测 (B4) — 检测事实间矛盾' })
        try {
          await detectContradictionsBatch(verifiedFactIds)
          send({ type: 'log', message: '阶段5完成 — 矛盾检测完成', level: 'success' })
        } catch (err) {
          send({ type: 'log', message: `阶段5失败: ${err instanceof Error ? err.message : String(err)}`, level: 'error' })
        }

        // ── Phase 6: Translation ──
        send({ type: 'progress', step: '阶段6/6', message: '翻译 (B5) — 英文事实翻译为中文' })
        try {
          await translateFactsBatch(verifiedFactIds)
          send({ type: 'log', message: '阶段6完成 — 翻译完成', level: 'success' })
        } catch (err) {
          send({ type: 'log', message: `阶段6失败: ${err instanceof Error ? err.message : String(err)}`, level: 'error' })
        }

        send({ type: 'done', message: 'AI 处理流水线全部完成' })
      } catch (err) {
        send({ type: 'error', message: `流水线异常: ${err instanceof Error ? err.message : String(err)}` })
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
