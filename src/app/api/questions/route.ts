import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  let query = supabaseAdmin.from('team_questions').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, question, entity_id } = body
  if (!user_id || !question) return NextResponse.json({ error: 'user_id and question required' }, { status: 400 })

  const { data, error } = await supabaseAdmin.from('team_questions').insert({
    user_id, question, entity_id: entity_id ?? null, status: 'open',
    week_number: getCurrentWeekNumber(), related_fact_ids: [],
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
