// GET /api/pipeline/runs
// Returns the LATEST run of each pipeline_type keyed by type. The admin
// dashboard polls this endpoint while a pipeline is running.

import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'

const PIPELINE_TYPES = ['collect', 'process', 'daily_push', 'weekly_summary'] as const

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    // One query per type is simpler than a single window-function query and
    // easier to reason about; the table has an index on (pipeline_type,
    // started_at desc) in the dedup migration series.
    const results = await Promise.all(
      PIPELINE_TYPES.map(async (type) => {
        const { data, error } = await supabaseAdmin
          .from('pipeline_runs')
          .select('id, pipeline_type, status, started_at, completed_at, logs, stats, error')
          .eq('pipeline_type', type)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) return [type, null] as const
        return [type, data] as const
      }),
    )

    const payload: Record<string, unknown> = {}
    for (const [type, run] of results) payload[type] = run
    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
