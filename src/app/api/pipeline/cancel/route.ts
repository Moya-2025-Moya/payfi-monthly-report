import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function POST(request: Request) {
  try {
    const { runId } = await request.json()
    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }

    // Set status to 'cancelled' — the running pipeline checks this between stages
    const { error } = await supabaseAdmin
      .from('pipeline_runs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', runId)
      .eq('status', 'running')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
