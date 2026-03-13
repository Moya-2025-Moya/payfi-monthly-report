import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { FeedClient } from './FeedClient'
import type { AtomicFact } from '@/lib/types'

interface SnapshotStats {
  total_facts: number
  new_facts: number
  high_confidence: number
  medium_confidence: number
  low_confidence: number
  rejected: number
  new_entities: number
  active_entities: number
  weekly_summary?: string | null
  weekly_summary_detailed?: string | null
}

interface StoredNarrative {
  topic: string
  summary: string
  branches: { id: string; label: string; side: 'left' | 'right'; color: string }[]
  nodes: {
    id: string; date: string; title: string; description: string
    significance: 'high' | 'medium' | 'low'
    factIds: string[]; entityNames: string[]
    sourceUrl?: string; isExternal?: boolean; externalUrl?: string
    isPrediction?: boolean; branchId: string
  }[]
  edges: { id: string; source: string; target: string; label?: string }[]
}

interface HomepageData {
  stats: SnapshotStats | null
  narratives: StoredNarrative[]
  summarySimple: string | null
  summaryDetailed: string | null
}

async function getHomepageData(week: string): Promise<HomepageData> {
  try {
    const { data } = await supabaseAdmin
      .from('weekly_snapshots')
      .select('snapshot_data')
      .eq('week_number', week)
      .single()

    const sd = data?.snapshot_data as Record<string, unknown> | null
    if (!sd) return { stats: null, narratives: [], summarySimple: null, summaryDetailed: null }

    const stats: SnapshotStats = {
      total_facts: (sd.total_facts as number) ?? 0,
      new_facts: (sd.new_facts as number) ?? 0,
      high_confidence: (sd.high_confidence as number) ?? 0,
      medium_confidence: (sd.medium_confidence as number) ?? 0,
      low_confidence: (sd.low_confidence as number) ?? 0,
      rejected: (sd.rejected as number) ?? 0,
      new_entities: (sd.new_entities as number) ?? 0,
      active_entities: (sd.active_entities as number) ?? 0,
    }

    return {
      stats,
      narratives: (sd.narratives as StoredNarrative[]) ?? [],
      summarySimple: (sd.weekly_summary as string) ?? null,
      summaryDetailed: (sd.weekly_summary_detailed as string) ?? null,
    }
  } catch {
    return { stats: null, narratives: [], summarySimple: null, summaryDetailed: null }
  }
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams
  const week = weekParam ?? getCurrentWeekNumber()
  const [{ data }, homepage, { data: metricsData }] = await Promise.all([
    supabaseAdmin
      .from('atomic_facts')
      .select('*')
      .in('verification_status', ['verified', 'partially_verified'])
      .eq('week_number', week)
      .order('fact_date', { ascending: false })
      .limit(200),
    getHomepageData(week),
    supabaseAdmin
      .from('raw_onchain_metrics')
      .select('coin_symbol, metric_name, metric_value, metric_unit, fetched_at')
      .in('coin_symbol', ['USDT', 'USDC', 'DAI'])
      .eq('metric_name', 'market_cap')
      .order('fetched_at', { ascending: false })
      .limit(9),
  ])

  const facts = (data ?? []) as AtomicFact[]

  // Deduplicate: keep latest per coin_symbol
  const latestMetrics: typeof metricsData = []
  const seen = new Set<string>()
  for (const m of (metricsData ?? [])) {
    const key = `${m.coin_symbol}-${m.metric_name}`
    if (!seen.has(key)) { seen.add(key); latestMetrics.push(m) }
  }

  return (
    <FeedClient
      facts={facts}
      currentWeek={week}
      stats={homepage.stats}
      narratives={homepage.narratives}
      summarySimple={homepage.summarySimple}
      summaryDetailed={homepage.summaryDetailed}
      marketMetrics={latestMetrics}
    />
  )
}
