import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const fact_id = searchParams.get('fact_id')
  const entity_id = searchParams.get('entity_id')

  let query = supabaseAdmin.from('comments').select('*').order('created_at', { ascending: true })
  if (fact_id) query = query.eq('fact_id', fact_id)
  if (entity_id) query = query.eq('entity_id', entity_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, fact_id, content, parent_id } = body
  if (!user_id || !fact_id || !content) return NextResponse.json({ error: 'user_id, fact_id, content required' }, { status: 400 })

  const { data, error } = await supabaseAdmin.from('comments').insert({
    user_id, fact_id, content, parent_id: parent_id ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
