// Cron: Process raw_items → events (runs after collection)
// Extracts events, merges, V1 checks, translates, saves, pushes real-time

import { NextResponse } from 'next/server'
import { runProcessingPipeline } from '@/modules/ai-agents/orchestrator'
import { pushRealtimeEvents } from '@/modules/distributors/telegram'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'

export const maxDuration = 300

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ pipeline_type: 'process', status: 'running' })
    .select('id')
    .single()

  try {
    const { eventIds, stats } = await runProcessingPipeline()

    // Push importance 1-2 events to Telegram immediately
    let pushed = 0
    if (eventIds.length > 0) {
      const { data: urgentEvents } = await supabaseAdmin
        .from('events')
        .select('id')
        .in('id', eventIds)
        .lte('importance', 2)
        .eq('pushed_to_tg', false)

      const urgentIds = (urgentEvents ?? []).map((e: { id: string }) => e.id)
      if (urgentIds.length > 0) {
        pushed = await pushRealtimeEvents(urgentIds)
      }
    }

    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          stats: { ...stats, realtime_pushed: pushed },
        })
        .eq('id', run.id)
    }

    return NextResponse.json({
      status: 'done',
      events_saved: eventIds.length,
      realtime_pushed: pushed,
      stats,
    })
  } catch (err) {
    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: String(err) })
        .eq('id', run.id)
    }
    console.error('[Cron] Processing failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
