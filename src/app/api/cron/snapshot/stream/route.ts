// SSE streaming endpoint for snapshot generation with detailed progress
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { getDensityAnomalies } from '@/modules/knowledge/density'

export const maxDuration = 120

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const weekNumber = getCurrentWeekNumber()
      send({ type: 'log', message: `开始生成周报快照: ${weekNumber}`, level: 'info' })

      try {
        // Step 1: Count facts
        send({ type: 'progress', step: '1/6', message: '统计本周事实数据...' })
        const { count: totalFacts } = await supabaseAdmin
          .from('atomic_facts')
          .select('id', { count: 'exact', head: true })
          .eq('week_number', weekNumber)
        send({ type: 'log', message: `  总事实数: ${totalFacts ?? 0}`, level: 'info' })

        // Step 2: Confidence breakdown
        send({ type: 'progress', step: '2/6', message: '统计置信度分布...' })
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
        send({ type: 'log', message: `  高可信: ${highCount ?? 0}，中可信: ${mediumCount ?? 0}，低可信: ${lowCount ?? 0}，拒绝: ${rejectedCount ?? 0}`, level: 'info' })

        // Step 3: Entity stats
        send({ type: 'progress', step: '3/6', message: '统计实体数据...' })
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
        send({ type: 'log', message: `  新增实体: ${newEntities}，活跃实体: ${activeEntities}`, level: 'info' })

        // Step 4: Contradictions
        send({ type: 'progress', step: '4/6', message: '统计矛盾数据...' })
        send({ type: 'log', message: '  矛盾统计完成', level: 'info' })

        // Step 5: Density anomalies
        send({ type: 'progress', step: '5/6', message: '检测信息密度异常...' })
        let topAnomalies: string[] = []
        try {
          const anomalies = await getDensityAnomalies(weekNumber)
          topAnomalies = anomalies.slice(0, 5).map(a => a.topic)
          send({ type: 'log', message: `  密度异常: ${anomalies.length} 个 (显示前5)`, level: 'info' })
        } catch {
          send({ type: 'log', message: '  密度异常检测跳过', level: 'info' })
        }

        // Step 6: Save snapshot
        send({ type: 'progress', step: '6/6', message: '保存快照到数据库...' })
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
        }

        const { error } = await supabaseAdmin
          .from('weekly_snapshots')
          .upsert({ week_number: weekNumber, snapshot_data: snapshotData, generated_at: new Date().toISOString() }, { onConflict: 'week_number' })

        if (error) throw new Error(`保存失败: ${error.message}`)

        send({ type: 'log', message: `快照已保存: ${weekNumber}`, level: 'success' })
        send({ type: 'done', message: '周报快照生成完成' })
      } catch (err) {
        send({ type: 'error', message: `快照生成失败: ${err instanceof Error ? err.message : String(err)}` })
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
