// Stuck-run watchdog. A pipeline_runs row sits in `status='running'` whenever
// a Vercel function gets killed mid-execution (timeout, OOM, deploy). Without
// cleanup the row never resolves, so the only outward sign was daily_push
// silently pushing 0 events — that's how we missed two days of outage.
//
// Run this at the start of every pipeline cron. It marks any `running` row
// older than the threshold as `failed` so observability stays honest, and
// optionally pings Telegram so a human knows.

import { supabaseAdmin } from '@/db/client'
import { sendPipelineAlert } from '@/modules/distributors/telegram'

const STUCK_AFTER_MINUTES = 30

interface StuckRun {
  id: string
  pipeline_type: string
  started_at: string
}

export async function reapStuckRuns(): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('pipeline_runs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: `auto-failed by watchdog: stuck running >${STUCK_AFTER_MINUTES}min`,
    })
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .select('id, pipeline_type, started_at')

  if (error) {
    console.warn('[watchdog] reapStuckRuns failed:', error.message)
    return 0
  }

  const reaped = (data ?? []) as StuckRun[]
  if (reaped.length === 0) return 0

  console.warn(`[watchdog] Reaped ${reaped.length} stuck pipeline_runs:`, reaped.map(r => `${r.pipeline_type}@${r.started_at}`))

  // Single alert per reap, listing types — avoids paging the user for every
  // stuck row independently.
  const summary = reaped
    .map(r => `${r.pipeline_type} (started ${r.started_at})`)
    .join('\n')
  await sendPipelineAlert(
    `Watchdog reaped ${reaped.length} stuck pipeline_run(s):\n${summary}`,
  )
  return reaped.length
}
