// Cron: Daily push (22:00 UTC+8 = 14:00 UTC)
// Sends daily summary to Telegram

import { NextResponse } from 'next/server'
import { pushDailySummary } from '@/modules/distributors/telegram'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'
import { makeProgressReporter } from '@/lib/pipeline-progress'

export const maxDuration = 60

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ pipeline_type: 'daily_push', status: 'running' })
    .select('id')
    .single()

  const reportProgress = makeProgressReporter(run?.id ?? null)

  try {
    const count = await pushDailySummary({ reportProgress })

    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          stats: { events_pushed: count },
        })
        .eq('id', run.id)
    }

    return NextResponse.json({ status: 'done', events_in_summary: count })
  } catch (err) {
    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: String(err) })
        .eq('id', run.id)
    }
    console.error('[Cron] Daily push failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
