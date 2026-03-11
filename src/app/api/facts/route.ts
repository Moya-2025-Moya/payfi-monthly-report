import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const tags = sp.get('tags')?.split(',')
  const entities = sp.get('entities')?.split(',')
  const confidence = sp.get('confidence')?.split(',')
  const week = sp.get('week') ?? getCurrentWeekNumber()
  const factType = sp.get('type')?.split(',')
  const limit = Math.min(Number(sp.get('limit') ?? 100), 500)

  let query = supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .eq('week_number', week)
    .order('fact_date', { ascending: false })
    .limit(limit)

  if (confidence) query = query.in('confidence', confidence)
  if (factType) query = query.in('fact_type', factType)
  if (tags) query = query.overlaps('tags', tags)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let facts = data ?? []
  // Filter by entity if needed (requires join through fact_entities)
  if (entities && entities.length > 0) {
    const { data: links } = await supabaseAdmin.from('fact_entities').select('fact_id').in('entity_id', entities)
    const factIds = new Set((links ?? []).map((l: { fact_id: string }) => l.fact_id))
    facts = facts.filter((f: { id: string }) => factIds.has(f.id))
  }

  return NextResponse.json(facts)
}
