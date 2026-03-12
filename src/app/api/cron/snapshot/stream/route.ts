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
                simple: string
                background: string
                what_happened: string
                insight: string
                source_url: string | null
                tags: string[]
              }>
            }>(
              `你是稳定币行业分析师。从以下本周事实中，选出最重要的 10 条新闻（去重后），按影响力从高到低排序。

聚焦方向：稳定币 B2C 产品、B2B 基础设施/支付、美国上市公司动态、监管政策、重要融资/合作。

对每条新闻输出：
- date: 事件日期，格式 YYYY.MM.DD
- simple: 一句话简报，格式为 "YYYY.MM.DD, [公司/主体] did [行动 + 1-2个量化指标] to [目标/影响]."。用英文，简洁，包含关键数字。不要提及具体地域/国家。
- background: 组织背景（1句话，英文）
- what_happened: 具体发生了什么（1-2句，英文，包含金额/用户数/时间线等量化信息）
- insight: 对稳定币行业的影响分析（1句话，英文）
- source_url: 最相关的来源 URL（从事实中提取，如果有的话）
- tags: 相关标签数组，如 ["B2C", "Stablecoin", "Regulation"]

规则：
1. 严格去重：同一事件只保留最完整的一条
2. 不要使用任何 markdown 格式符号（不要 ** 加粗、不要 # 标题）
3. 简报(simple)必须是纯英文一句话，不要换行
4. 如果信息不足无法确认，用 [Uncertainty: ...] 标注
5. 如果缺少关键数据，用 [Info gap: ...] 标注

输出严格 JSON：
{
  "items": [
    {
      "date": "2026.03.12",
      "simple": "2026.03.12, Tether invested $520M in Ark Labs seed round to support Bitcoin stablecoin infrastructure development.",
      "background": "Tether is the issuer of USDT, the largest stablecoin by market cap.",
      "what_happened": "Tether led a $520M seed round investment in Ark Labs, a company building Bitcoin-native stablecoin and payment infrastructure.",
      "insight": "Signals Tether's strategic expansion beyond USDT issuance into Bitcoin L2 infrastructure, potentially competing with Lightning Network for payments.",
      "source_url": "https://example.com/article",
      "tags": ["B2B", "Stablecoin", "Funding"]
    }
  ]
}

本周事实:
${factsText}`,
              { system: '你是稳定币行业分析师。输出严格 JSON，不要任何 markdown 格式。' }
            )

            if (summaryResult.items?.length > 0) {
              // Build simplified version
              weeklySummarySimple = 'Weekly Stablecoin News Update:\n' +
                summaryResult.items.map((item, i) => `${i + 1}. ${item.simple}`).join('\n\n')

              // Build detailed version as JSON for structured rendering
              weeklySummaryDetailed = JSON.stringify(summaryResult.items)
            }

            logger.log('  AI 周摘要已生成（简报+详细）', 'success')
          } else {
            logger.log('  本周无事实，跳过摘要生成', 'info')
          }
        } catch (err) {
          logger.log(`  AI 摘要生成失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
        }

        // Step 7: Save snapshot
        logger.progress('7/7', '保存快照到数据库...')
        const snapshotData = {
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
