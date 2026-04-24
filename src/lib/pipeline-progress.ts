// Pipeline progress helper — the cron/admin routes that own a pipeline_run
// row pass one of these to the orchestrator/collectors/distributor so they
// can append log entries and incremental stats as they make progress.
//
// Writes go straight to the pipeline_runs row. Each append reads the current
// logs array, pushes the new entry, writes back. Only one writer per run, so
// the read-modify-write race is not a concern in practice.

import { supabaseAdmin } from '@/db/client'
import type { PipelineLog, PipelineStats } from '@/lib/types'

// Keep the tail bounded so a misbehaving pipeline can't blow up the row.
const MAX_LOG_ENTRIES = 200

export interface ProgressEntry {
  level?: 'info' | 'success' | 'error' | 'progress'
  message: string
  stats?: Partial<PipelineStats>
}

export interface ProgressReporter {
  (entry: ProgressEntry): Promise<void>
}

// Create a reporter bound to a specific pipeline_runs.id. If `runId` is null
// (row insert failed), we return a no-op reporter so callers don't crash.
export function makeProgressReporter(runId: string | null): ProgressReporter {
  if (!runId) {
    return async () => { /* no-op when row didn't insert */ }
  }

  return async (entry) => {
    const newLog: PipelineLog = {
      timestamp: new Date().toISOString(),
      level: entry.level ?? 'info',
      message: entry.message,
    }

    // Also mirror to console so Vercel function logs still capture everything.
    const tag = `[pipeline:${runId.slice(0, 8)}]`
    if (entry.level === 'error') console.error(tag, entry.message)
    else if (entry.level === 'success') console.log(tag, '✓', entry.message)
    else console.log(tag, entry.message)

    try {
      const { data: row } = await supabaseAdmin
        .from('pipeline_runs')
        .select('logs, stats, status')
        .eq('id', runId)
        .single()

      // If caller marked this run as cancelled, stop writing more logs.
      if (row?.status === 'cancelled') return

      const existingLogs: PipelineLog[] = Array.isArray(row?.logs) ? row.logs : []
      const nextLogs = [...existingLogs, newLog].slice(-MAX_LOG_ENTRIES)

      const nextStats = entry.stats
        ? { ...(row?.stats as PipelineStats | null ?? {}), ...entry.stats }
        : (row?.stats as PipelineStats | null ?? undefined)

      const update: Record<string, unknown> = { logs: nextLogs }
      if (nextStats !== undefined) update.stats = nextStats

      await supabaseAdmin
        .from('pipeline_runs')
        .update(update)
        .eq('id', runId)
    } catch (err) {
      // Swallow — the pipeline's actual work is more important than the
      // progress log. Mirror failure to console for postmortem.
      console.warn('[pipeline-progress] write failed:', err)
    }
  }
}

// Check whether a run has been cancelled from outside (admin page). Long-
// running pipelines can poll this at phase boundaries and bail early.
export async function isRunCancelled(runId: string | null): Promise<boolean> {
  if (!runId) return false
  try {
    const { data } = await supabaseAdmin
      .from('pipeline_runs')
      .select('status')
      .eq('id', runId)
      .single()
    return data?.status === 'cancelled'
  } catch {
    return false
  }
}
