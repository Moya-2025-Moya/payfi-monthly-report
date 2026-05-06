// Cron: Daily push (22:00 UTC+8 = 14:00 UTC)
// Sends daily summary to Telegram

import { NextResponse } from 'next/server'
import { pushDailySummary, sendPipelineAlert } from '@/modules/distributors/telegram'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'
import { makeProgressReporter } from '@/lib/pipeline-progress'
import { reapStuckRuns } from '@/lib/pipeline-watchdog'

export const maxDuration = 60

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  await reapStuckRuns()

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

    // Zero-push almost always means the upstream `process` cron failed
    // (events_extracted but never saved, or never ran). Page a human so we
    // don't repeat the two-day silent outage.
    if (count === 0) {
      await sendPipelineAlert(
        `Daily push sent 0 events. Upstream \`process\` likely failed — check pipeline_runs for the most recent process row.`,
      )
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
