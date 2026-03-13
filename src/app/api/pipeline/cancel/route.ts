import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const { runId } = await request.json()
    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }

    // Try 'cancelled' first (if DB constraint has been updated), fall back to 'failed'
    const now = new Date().toISOString()
    const { error: err1 } = await supabaseAdmin
      .from('pipeline_runs')
      .update({ status: 'cancelled', completed_at: now, error: 'cancelled_by_user' })
      .eq('id', runId)
      .eq('status', 'running')

    if (err1) {
      // Fallback: DB constraint doesn't include 'cancelled', use 'failed' with marker
      const { error: err2 } = await supabaseAdmin
        .from('pipeline_runs')
        .update({ status: 'failed', completed_at: now, error: 'cancelled_by_user' })
        .eq('id', runId)
        .eq('status', 'running')

      if (err2) {
        return NextResponse.json({ error: err2.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
