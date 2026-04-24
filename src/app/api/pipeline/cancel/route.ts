// POST /api/pipeline/cancel
// Body: { pipeline_type: string, run_id?: string }
//
// Marks the latest RUNNING run of that type (or the specific run_id if given)
// as cancelled. On Vercel, serverless function invocations cannot be killed
// mid-flight — the task continues to completion but pipeline-progress.ts
// checks this flag at phase boundaries and suppresses further writes.

import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'

const VALID_TYPES = new Set(['collect', 'process', 'daily_push', 'weekly_summary'])

export async function POST(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    const { pipeline_type, run_id } = body as { pipeline_type?: string; run_id?: string }

    if (!pipeline_type && !run_id) {
      return NextResponse.json(
        { error: 'pipeline_type or run_id required' },
        { status: 400 },
      )
    }
    if (pipeline_type && !VALID_TYPES.has(pipeline_type)) {
      return NextResponse.json({ error: 'invalid pipeline_type' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('pipeline_runs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('status', 'running')
      .select('id, pipeline_type')

    if (run_id) {
      query = query.eq('id', run_id)
    } else if (pipeline_type) {
      query = query.eq('pipeline_type', pipeline_type)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json({
      status: 'done',
      cancelled: data?.length ?? 0,
      runs: data ?? [],
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
