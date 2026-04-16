// Cron: Weekly trend summary (Monday 09:00 UTC+8 = 01:00 UTC)
// AI analyzes past 7 days, generates trend report, pushes to Telegram

import { NextResponse } from 'next/server'
import { analyzeTrends } from '@/modules/ai-agents/trend-analyzer'
import { pushWeeklySummary } from '@/modules/distributors/telegram'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'

export const maxDuration = 120

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ pipeline_type: 'weekly_summary', status: 'running' })
    .select('id')
    .single()

  try {
    const summary = await analyzeTrends()

    if (!summary) {
      if (run) {
        await supabaseAdmin
          .from('pipeline_runs')
          .update({ status: 'completed', completed_at: new Date().toISOString(), stats: { trends: 0 } })
          .eq('id', run.id)
      }
      return NextResponse.json({ status: 'done', message: 'No events to analyze' })
    }

    await pushWeeklySummary(summary)

    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          stats: { trends: summary.trends.length, week: summary.week_number },
        })
        .eq('id', run.id)
    }

    return NextResponse.json({
      status: 'done',
      week: summary.week_number,
      trends: summary.trends.length,
    })
  } catch (err) {
    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: String(err) })
        .eq('id', run.id)
    }
    console.error('[Cron] Weekly summary failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
