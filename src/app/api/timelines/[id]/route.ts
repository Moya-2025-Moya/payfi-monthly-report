import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: timeline, error } = await supabaseAdmin.from('timelines').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: tf } = await supabaseAdmin.from('timeline_facts').select('*').eq('timeline_id', id).order('order_index')
  const factIds = (tf ?? []).map((t: { fact_id: string }) => t.fact_id)
  let facts: unknown[] = []
  if (factIds.length > 0) {
    const { data } = await supabaseAdmin.from('atomic_facts').select('*').in('id', factIds)
    facts = data ?? []
  }

  return NextResponse.json({ timeline, timeline_facts: tf ?? [], facts })
}
