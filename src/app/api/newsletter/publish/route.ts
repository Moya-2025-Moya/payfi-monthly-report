import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { generateNewsletterHTML } from '@/lib/newsletter-template'

export async function POST(req: NextRequest) {
  try {
    const { weekNumber } = await req.json().catch(() => ({ weekNumber: undefined }))
    const week = weekNumber ?? getCurrentWeekNumber()

    // Fetch snapshot data (contains weekly summary + narratives)
    const { data: snapshot } = await supabaseAdmin
      .from('weekly_snapshots')
      .select('snapshot_data')
      .eq('week_number', week)
      .single()

    if (!snapshot?.snapshot_data) {
      return NextResponse.json({ error: '该周暂无快照数据' }, { status: 404 })
    }

    const sd = snapshot.snapshot_data as Record<string, unknown>

    // Fetch verified facts for the week
    const { data: facts } = await supabaseAdmin
      .from('atomic_facts')
      .select('content_zh, content_en, fact_type, objectivity, speaker, tags, source_url, metric_value, metric_unit, metric_change, metric_period, fact_date')
      .in('verification_status', ['verified', 'partially_verified'])
      .eq('week_number', week)
      .order('fact_date', { ascending: false })
      .limit(100)

    // Parse the weekly summary detailed items
    let detailedItems: { simple_zh?: string; simple?: string; background_zh?: string; background?: string; what_happened_zh?: string; what_happened?: string; insight_zh?: string; insight?: string; source_url?: string; tags?: string[] }[] = []
    const detailedStr = sd.weekly_summary_detailed as string | undefined
    if (detailedStr) {
      try { detailedItems = JSON.parse(detailedStr) } catch { /* ignore */ }
    }

    // Compute date for this report
    const reportDate = weekToMonday(week)

    // Generate HTML
    const html = generateNewsletterHTML({
      weekNumber: week,
      reportDate,
      summaryItems: detailedItems,
      facts: (facts ?? []) as { content_zh: string; fact_type: string; objectivity?: string; speaker?: string; tags: string[]; source_url?: string; metric_value?: number; metric_unit?: string; metric_change?: string }[],
      narratives: (sd.narratives as { topic: string; summary: string }[]) ?? [],
    })

    const subject = `StablePulse Weekly | ${reportDate}`

    // Upsert into reports table
    const { error } = await supabaseAdmin
      .from('reports')
      .upsert({
        date: reportDate,
        subject,
        content: html,
      }, {
        onConflict: 'date',
      })

    if (error) {
      console.error('[newsletter] Publish error:', error)
      return NextResponse.json({ error: `发布失败: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, date: reportDate, subject })
  } catch (err) {
    console.error('[newsletter] Publish error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

function weekToMonday(week: string): string {
  const [yearStr, wPart] = week.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  return monday.toISOString().split('T')[0]
}
