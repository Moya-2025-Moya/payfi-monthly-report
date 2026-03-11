import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const week = req.nextUrl.searchParams.get('week') ?? getCurrentWeekNumber()
  const factType = req.nextUrl.searchParams.get('type')

  const { data: links } = await supabaseAdmin.from('fact_entities').select('fact_id').eq('entity_id', id)
  const factIds = (links ?? []).map((l: { fact_id: string }) => l.fact_id)
  if (factIds.length === 0) return NextResponse.json([])

  let query = supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('id', factIds)
    .in('verification_status', ['verified', 'partially_verified'])
    .eq('week_number', week)
    .order('fact_date', { ascending: false })

  if (factType) query = query.eq('fact_type', factType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
