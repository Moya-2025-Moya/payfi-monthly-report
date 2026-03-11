import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, fact_id, label } = body
  if (!user_id || !fact_id) return NextResponse.json({ error: 'user_id and fact_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin.from('bookmarks').insert({ user_id, fact_id, label: label ?? null }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
