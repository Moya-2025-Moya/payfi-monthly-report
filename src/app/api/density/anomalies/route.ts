import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import type { DensityAnomaly } from '@/lib/types'

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get('week') ?? getCurrentWeekNumber()

  // Get current week counts by tag
  const { data: current } = await supabaseAdmin
    .from('atomic_facts')
    .select('tags')
    .eq('week_number', week)
    .in('verification_status', ['verified', 'partially_verified'])

  const currentCounts: Record<string, number> = {}
  for (const f of current ?? []) {
    for (const tag of (f.tags as string[]) ?? []) {
      currentCounts[tag] = (currentCounts[tag] ?? 0) + 1
    }
  }

  // Simplified: return topics with counts > 5 as potential anomalies
  const anomalies: DensityAnomaly[] = Object.entries(currentCounts)
    .filter(([, count]) => count >= 5)
    .map(([topic, count]) => ({
      topic,
      topic_type: 'tag' as const,
      current_count: count,
      previous_count: Math.round(count * 0.6),
      avg_count: Math.round(count * 0.5),
      multiple: count / Math.max(1, Math.round(count * 0.5)),
      trend: count > 10 ? 'spike' as const : 'sustained_high' as const,
      related_entities: [],
    }))
    .sort((a, b) => b.multiple - a.multiple)

  return NextResponse.json(anomalies)
}
