// Cron: Process raw_items → events (runs once daily before daily-push)
// Extracts events, merges, translates, saves. No realtime push.

import { NextResponse } from 'next/server'
import { runProcessingPipeline } from '@/modules/ai-agents/orchestrator'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'
import { makeProgressReporter } from '@/lib/pipeline-progress'

export const maxDuration = 300

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ pipeline_type: 'process', status: 'running' })
    .select('id')
    .single()

  const reportProgress = makeProgressReporter(run?.id ?? null)

  try {
    const { eventIds, stats } = await runProcessingPipeline({
      reportProgress,
      runId: run?.id ?? null,
    })

    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          stats,
        })
        .eq('id', run.id)
    }

    return NextResponse.json({
      status: 'done',
      events_saved: eventIds.length,
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
