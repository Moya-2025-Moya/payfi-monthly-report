import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function POST(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id || !['resolved', 'dismissed', 'unresolved'].includes(status)) {
    return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from('fact_contradictions')
    .update({ status, resolved_at: status === 'unresolved' ? null : new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
