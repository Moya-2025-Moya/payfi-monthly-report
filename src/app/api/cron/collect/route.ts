// Cron: Data collection (every 4-6 hours)
// Runs all 4 collectors in parallel: RSS, Twitter, Regulatory, Brave Search

import { NextResponse } from 'next/server'
import { runCollection } from '@/modules/collectors'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'
import { makeProgressReporter } from '@/lib/pipeline-progress'

export const maxDuration = 300

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  // Create pipeline run
  const { data: run } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({ pipeline_type: 'collect', status: 'running' })
    .select('id')
    .single()

  const reportProgress = makeProgressReporter(run?.id ?? null)

  try {
    const { results, duration_ms } = await runCollection({ reportProgress })
    const totalCount = Object.values(results).reduce((sum, r) => sum + r.count, 0)

    // Update pipeline run
    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          stats: { results, total_collected: totalCount, duration_ms },
        })
        .eq('id', run.id)
    }

    console.log('[Cron] Collection done:', results, `${duration_ms}ms`)
    return NextResponse.json({ status: 'done', results, total: totalCount, duration_ms })
  } catch (err) {
    if (run) {
      await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: String(err) })
        .eq('id', run.id)
    }
    console.error('[Cron] Collection failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
