import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { FeedClient } from './FeedClient'
import { getWeeklyPageData } from '@/lib/weekly-data'
import type { AtomicFact } from '@/lib/types'

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
    getWeeklyPageData(week),
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

  // Compute week date range for display
  const weekMatch = week.match(/^(\d{4})-W(\d{2})$/)
  let weekDateRange = week
  if (weekMatch) {
    const year = parseInt(weekMatch[1], 10)
    const wNum = parseInt(weekMatch[2], 10)
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
    const monday = new Date(jan4)
    monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (wNum - 1) * 7)
    const sunday = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)
    const fmt = (d: Date) => `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
    weekDateRange = `${fmt(monday)} - ${fmt(sunday)}`
  }

  return (
    <div>
      {/* Weekly report header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-bold" style={{ color: 'var(--fg-title)' }}>
            稳定币周报
          </h1>
          <a href={`/weekly/${week}`} className="text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
            永久链接 →
          </a>
        </div>
        <p className="text-[13px] font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>
          {weekDateRange}
        </p>
      </div>

      <FeedClient
        facts={facts}
        currentWeek={week}
        stats={homepage.stats}
        narratives={homepage.narratives}
        summarySimple={homepage.summarySimple}
        summaryDetailed={homepage.summaryDetailed}
        marketMetrics={latestMetrics}
        breakingAlerts={homepage.breakingAlerts}
      />
    </div>
  )
}
