import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get('week') ?? getCurrentWeekNumber()
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('tags, fact_type')
    .eq('week_number', week)
    .in('verification_status', ['verified', 'partially_verified'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count by tag
  const counts: Record<string, number> = {}
  for (const fact of data ?? []) {
    for (const tag of (fact.tags as string[]) ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => ({ topic, count }))
  return NextResponse.json(sorted)
}
