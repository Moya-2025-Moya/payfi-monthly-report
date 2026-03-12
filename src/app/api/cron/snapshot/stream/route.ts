// SSE streaming endpoint for snapshot generation with detailed progress
// Logs are persisted to pipeline_runs for page refresh recovery
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { getDensityAnomalies } from '@/modules/knowledge/density'
import { callHaikuJSON } from '@/lib/ai-client'
import { createPipelineLogger } from '@/lib/pipeline-logger'

export const maxDuration = 120

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const logger = await createPipelineLogger('snapshot', send)
      send({ type: 'init', runId: logger.runId })

      const weekNumber = getCurrentWeekNumber()
      logger.log(`开始生成周报快照: ${weekNumber}`, 'info')

      try {
        // Step 1: Count facts
        logger.progress('1/7', '统计本周事实数据...')
        const { count: totalFacts } = await supabaseAdmin
          .from('atomic_facts')
          .select('id', { count: 'exact', head: true })
          .eq('week_number', weekNumber)
        logger.log(`  总事实数: ${totalFacts ?? 0}`, 'info')

        // Step 2: Confidence breakdown
        logger.progress('2/7', '统计置信度分布...')
        const { count: highCount } = await supabaseAdmin
          .from('atomic_facts').select('id', { count: 'exact', head: true })
          .eq('week_number', weekNumber).eq('confidence', 'high')
        const { count: mediumCount } = await supabaseAdmin
          .from('atomic_facts').select('id', { count: 'exact', head: true })
          .eq('week_number', weekNumber).eq('confidence', 'medium')
        const { count: lowCount } = await supabaseAdmin
          .from('atomic_facts').select('id', { count: 'exact', head: true })
          .eq('week_number', weekNumber).eq('confidence', 'low')
        const { count: rejectedCount } = await supabaseAdmin
          .from('atomic_facts').select('id', { count: 'exact', head: true })
          .eq('week_number', weekNumber).eq('verification_status', 'rejected')
        logger.log(`  高可信: ${highCount ?? 0}，中可信: ${mediumCount ?? 0}，低可信: ${lowCount ?? 0}，拒绝: ${rejectedCount ?? 0}`, 'info')

        // Step 3: Entity stats
        logger.progress('3/7', '统计实体数据...')
        const weekMatch = weekNumber.match(/^(\d{4})-W(\d{2})$/)
        let newEntities = 0
        let activeEntities = 0
        if (weekMatch) {
          const year = parseInt(weekMatch[1], 10)
          const week = parseInt(weekMatch[2], 10)
          const jan4 = new Date(Date.UTC(year, 0, 4))
          const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
          const monday = new Date(jan4)
          monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (week - 1) * 7)
          const weekEnd = new Date(monday)
          weekEnd.setDate(weekEnd.getDate() + 7)

          const { count: ne } = await supabaseAdmin.from('entities')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', monday.toISOString()).lt('created_at', weekEnd.toISOString())
          newEntities = ne ?? 0

          const { data: activeRows } = await supabaseAdmin
            .from('fact_entities')
            .select('entity_id, atomic_facts!inner(week_number)')
            .eq('atomic_facts.week_number', weekNumber)
          activeEntities = new Set((activeRows ?? []).map(r => r.entity_id as string)).size
        }
        logger.log(`  新增实体: ${newEntities}，活跃实体: ${activeEntities}`, 'info')

        // Step 4: Contradictions
        logger.progress('4/7', '统计矛盾数据...')
        logger.log('  矛盾统计完成', 'info')

        // Step 5: Density anomalies
        logger.progress('5/7', '检测信息密度异常...')
        let topAnomalies: string[] = []
        try {
          const anomalies = await getDensityAnomalies(weekNumber)
          topAnomalies = anomalies.slice(0, 5).map(a => a.topic)
          logger.log(`  密度异常: ${anomalies.length} 个 (显示前5)`, 'info')
        } catch {
          logger.log('  密度异常检测跳过', 'info')
        }

        // Step 6: Generate AI weekly summary (simplified + detailed)
        logger.progress('6/7', 'AI 生成本周摘要...')
        let weeklySummarySimple: string | null = null
        let weeklySummaryDetailed: string | null = null
        try {
          const { data: topFacts } = await supabaseAdmin
            .from('atomic_facts')
            .select('content_zh, content_en, fact_type, tags, fact_date, source_url')
            .eq('week_number', weekNumber)
            .in('verification_status', ['verified', 'partially_verified'])
            .order('fact_date', { ascending: false })
            .limit(50)

          if (topFacts && topFacts.length > 0) {
            const factsText = topFacts
              .map((f: { content_zh: string; content_en: string; fact_type: string; tags: string[]; fact_date: string; source_url: string | null }, i: number) =>
                `${i + 1}. [${f.fact_type}] ${f.content_zh || f.content_en} (${String(f.fact_date).split('T')[0]}) [tags: ${f.tags.join(', ')}]${f.source_url ? ` [url: ${f.source_url}]` : ''}`)
              .join('\n')

            const summaryResult = await callHaikuJSON<{
              items: Array<{
                date: string
                simple_zh: string
                simple_en: string
                background_zh: string
                background_en: string
                what_happened_zh: string
                what_happened_en: string
                insight_zh: string
                insight_en: string
                source_url: string | null
                tags: string[]
              }>
            }>(
              `你是稳定币行业分析师。从以下本周事实中，选出最重要的新闻，去重后按影响力从高到低排序。

**必须输出恰好 10 条**。如果去重后不足 10 条独立事件，将剩余的次要事实也纳入，确保总数为 10。如果事实总量极少（<5条），则有多少输出多少。

聚焦方向（按优先级）：
1. 稳定币发行方动态（Circle, Tether, PayPal PYUSD 等）
2. B2B 基础设施/跨境支付（Stripe, Fireblocks, Bridge 等）
3. 美国上市公司与稳定币（Coinbase, MicroStrategy, Visa 等）
4. 监管政策（GENIUS Act, MiCA, SEC, OCC 等）
5. 重要融资/合作/收购

对每条新闻，必须同时输出中文和英文版本：
- date: 事件日期，格式 YYYY.MM.DD
- simple_zh: 一句话中文简报，格式 "YYYY.MM.DD, [公司/主体] [动作 + 1-2个关键指标] [影响]。"
- simple_en: 一句话英文简报，格式 "YYYY.MM.DD, [Company] [action + 1-2 key metrics] [impact]."
- background_zh: 组织背景（1句中文）
- background_en: 组织背景（1句英文）
- what_happened_zh: 具体发生了什么（1-2句中文，包含量化信息）
- what_happened_en: 具体发生了什么（1-2句英文，包含量化信息）
- insight_zh: 对稳定币行业的影响分析（1句中文）
- insight_en: 对稳定币行业的影响分析（1句英文）
- source_url: 最相关的来源 URL（从事实的 [url: ...] 中提取，必须是完整 URL）
- tags: 相关标签数组，如 ["B2C", "Stablecoin", "Regulation"]

规则：
1. 严格去重：同一事件出现多次只保留最完整的一条
2. 不要使用任何 markdown 格式符号
3. simple_zh/simple_en 必须是纯文本一句话，不要换行
4. 如果信息不足无法确认，用 [Uncertainty: ...] 标注
5. 如果缺少关键数据，用 [Info gap: ...] 标注
6. items 数组必须恰好 10 个元素（除非事实极少）

输出严格 JSON：
{
  "items": [
    {
      "date": "2026.03.12",
      "simple_zh": "2026.03.12, Tether 领投 Ark Labs 5.2亿美元种子轮，布局比特币稳定币基础设施。",
      "simple_en": "2026.03.12, Tether invested $520M in Ark Labs seed round to support Bitcoin stablecoin infrastructure development.",
      "background_zh": "Tether 是市值最大的稳定币 USDT 的发行方。",
      "background_en": "Tether is the issuer of USDT, the largest stablecoin by market cap.",
      "what_happened_zh": "Tether 领投 Ark Labs 5.2亿美元种子轮，该公司构建比特币原生稳定币与支付基础设施。",
      "what_happened_en": "Tether led a $520M seed round investment in Ark Labs, building Bitcoin-native stablecoin and payment infrastructure.",
      "insight_zh": "标志着 Tether 从 USDT 发行扩展至比特币 L2 基础设施，可能与闪电网络竞争支付场景。",
      "insight_en": "Signals Tether's strategic expansion beyond USDT issuance into Bitcoin L2 infrastructure.",
      "source_url": "https://example.com/article",
      "tags": ["B2B", "Stablecoin", "Funding"]
    }
  ]
}

本周事实 (共 ${topFacts.length} 条):
${factsText}`,
              { system: '你是稳定币行业分析师。输出严格 JSON，不要任何 markdown 格式。items 数组必须恰好 10 个元素。每条必须同时包含中英文版本。' }
            )

            if (summaryResult.items?.length > 0) {
              // Build simplified version (bilingual)
              weeklySummarySimple = 'Weekly Stablecoin News Update:\n' +
                summaryResult.items.map((item, i) => `${i + 1}. ${item.simple_en}`).join('\n\n')

              // Build detailed version as JSON for structured rendering
              weeklySummaryDetailed = JSON.stringify(summaryResult.items)

              logger.log(`  AI 周摘要已生成: ${summaryResult.items.length} 条（简报+详细）`, 'success')
            } else {
              logger.log('  AI 返回空 items，摘要生成失败', 'error')
            }
          } else {
            logger.log('  本周无事实，跳过摘要生成', 'info')
          }
        } catch (err) {
          logger.log(`  AI 摘要生成失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
        }

        // Step 7: Save snapshot (merge with existing data to preserve narratives etc.)
        logger.progress('7/7', '保存快照到数据库...')

        // Read existing snapshot_data first to preserve fields written by other pipelines
        const { data: existingSnapshot } = await supabaseAdmin
          .from('weekly_snapshots')
          .select('snapshot_data')
          .eq('week_number', weekNumber)
          .single()

        const existingData = (existingSnapshot?.snapshot_data ?? {}) as Record<string, unknown>

        const snapshotData = {
          ...existingData,
          total_facts: totalFacts ?? 0,
          new_facts: totalFacts ?? 0,
          high_confidence: highCount ?? 0,
          medium_confidence: mediumCount ?? 0,
          low_confidence: lowCount ?? 0,
          rejected: rejectedCount ?? 0,
          new_entities: newEntities,
          active_entities: activeEntities,
          new_contradictions: 0,
          resolved_contradictions: 0,
          blind_spot_changes: [],
          top_density_anomalies: topAnomalies,
          weekly_summary: weeklySummarySimple,
          weekly_summary_detailed: weeklySummaryDetailed,
        }

        const { error } = await supabaseAdmin
          .from('weekly_snapshots')
          .upsert({ week_number: weekNumber, snapshot_data: snapshotData, generated_at: new Date().toISOString() }, { onConflict: 'week_number' })

        if (error) throw new Error(`保存失败: ${error.message}`)

        logger.log(`快照已保存: ${weekNumber}`, 'success')
        await logger.done({ message: '周报快照生成完成' })
      } catch (err) {
        await logger.fail(`快照生成失败: ${err instanceof Error ? err.message : String(err)}`)
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
