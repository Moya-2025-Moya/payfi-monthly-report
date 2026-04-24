// Admin API: Re-send today's daily digest.
// Clears included_in_daily on recent events so pushDailySummary() re-picks
// them, then runs the push. Useful for iterating on digest formatting without
// re-running extraction/merge.

import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'
import { pushDailySummary } from '@/modules/distributors/telegram'

export const maxDuration = 60

export async function POST(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ pipeline_type: 'daily_push', status: 'running' })
    .select('id')
    .single()

  try {
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
    const { error: flagErr, count: clearedFlagCount } = await supabaseAdmin
      .from('events')
      .update({ included_in_daily: false }, { count: 'exact' })
      .gte('published_at', since)
      .eq('included_in_daily', true)
    if (flagErr) throw new Error(`clear included_in_daily: ${flagErr.message}`)

    const pushed = await pushDailySummary()

    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          stats: { events_pushed: pushed, daily_flag_cleared: clearedFlagCount ?? 0 },
        })
        .eq('id', run.id)
    }

    return NextResponse.json({
      status: 'done',
      events_pushed: pushed,
      daily_flag_cleared: clearedFlagCount ?? 0,
    })
  } catch (err) {
    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: String(err) })
        .eq('id', run.id)
    }
    console.error('[admin/repush-daily] failed:', err)
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
