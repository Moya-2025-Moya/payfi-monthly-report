import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, content, fact_id, entity_id, timeline_id } = body
  if (!user_id || !content) return NextResponse.json({ error: 'user_id and content required' }, { status: 400 })

  const { data, error } = await supabaseAdmin.from('notes').insert({
    user_id, content, fact_id: fact_id ?? null, entity_id: entity_id ?? null, timeline_id: timeline_id ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
