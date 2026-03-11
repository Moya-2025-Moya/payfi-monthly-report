import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'
import type { DiffResult } from '@/lib/types'

export async function GET(req: NextRequest) {
  const weekA = req.nextUrl.searchParams.get('weekA')
  const weekB = req.nextUrl.searchParams.get('weekB')
  if (!weekA || !weekB) return NextResponse.json({ error: 'weekA and weekB required' }, { status: 400 })

  const [{ data: factsA }, { data: factsB }] = await Promise.all([
    supabaseAdmin.from('atomic_facts').select('id, tags, fact_type, confidence').eq('week_number', weekA).in('verification_status', ['verified', 'partially_verified']),
    supabaseAdmin.from('atomic_facts').select('id, tags, fact_type, confidence').eq('week_number', weekB).in('verification_status', ['verified', 'partially_verified']),
  ])

  const a = factsA ?? []
  const b = factsB ?? []

  const diff: DiffResult = {
    week_a: weekA,
    week_b: weekB,
    new_entities: [],
    status_changes: [],
    relationship_changes: [],
    metric_changes: [],
    timeline_updates: [],
    fact_count: { week_a: a.length, week_b: b.length, change_pct: a.length === 0 ? 0 : ((b.length - a.length) / a.length) * 100 },
    entity_count: { week_a: 0, week_b: 0 },
    new_contradictions: 0,
    resolved_contradictions: 0,
    blind_spot_changes: { newly_covered: [], new_gaps: [] },
  }

  return NextResponse.json(diff)
}
