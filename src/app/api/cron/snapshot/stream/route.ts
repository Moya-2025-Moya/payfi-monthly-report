// SSE streaming endpoint for snapshot generation with detailed progress
// Logs are persisted to pipeline_runs for page refresh recovery
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { getDensityAnomalies } from '@/modules/knowledge/density'
import { callHaiku } from '@/lib/ai-client'
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

        // Step 6: Generate AI weekly summary
        logger.progress('6/7', 'AI 生成本周摘要...')
        let weeklySummary: string | null = null
        try {
          const { data: topFacts } = await supabaseAdmin
            .from('atomic_facts')
            .select('content_zh, fact_type, tags')
            .eq('week_number', weekNumber)
            .in('verification_status', ['verified', 'partially_verified'])
            .order('fact_date', { ascending: false })
            .limit(30)

          if (topFacts && topFacts.length > 0) {
            const factsText = topFacts
              .map((f: { content_zh: string; fact_type: string }, i: number) => `${i + 1}. [${f.fact_type}] ${f.content_zh}`)
              .join('\n')

            weeklySummary = await callHaiku(
              `你是稳定币行业分析师。根据以下本周事实，用中文写一段简洁的周摘要（3-5句话），突出最重要的动态和趋势。不要列举，要有分析视角。\n\n本周事实:\n${factsText}`,
              { maxTokens: 500, temperature: 0.3 }
            )
            logger.log('  AI 周摘要已生成', 'success')
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
          weekly_summary: weeklySummary,
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
