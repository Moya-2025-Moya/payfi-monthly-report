import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { FeedClient } from '@/app/FeedClient'
import { redirect } from 'next/navigation'
import { getWeeklyPageData } from '@/lib/weekly-data'
import type { AtomicFact } from '@/lib/types'
import type { Metadata } from 'next'

function parseWeekDateRange(week: string): { monday: Date; sunday: Date; display: string } | null {
  const m = week.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const wNum = parseInt(m[2], 10)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (wNum - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return { monday, sunday, display: `${fmt(monday)} - ${fmt(sunday)}` }
}

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params
  const range = parseWeekDateRange(week)
  return {
    title: `稳定币周报 ${week}${range ? ` | ${range.display}` : ''}`,
    description: `StablePulse 稳定币行业周报 — ${week}`,
  }
}

export default async function WeeklyReportPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params

  // Validate week format
  if (!/^\d{4}-W\d{2}$/.test(week)) {
    redirect(`/weekly/${getCurrentWeekNumber()}`)
  }

  const range = parseWeekDateRange(week)

  // Fetch snapshot + facts + metrics in parallel
  const [{ data: factsData }, { data: metricsData }, pageData] = await Promise.all([
    supabaseAdmin
      .from('atomic_facts')
      .select('*')
      .in('verification_status', ['verified', 'partially_verified'])
      .eq('week_number', week)
      .order('fact_date', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('raw_onchain_metrics')
      .select('coin_symbol, metric_name, metric_value, metric_unit, fetched_at')
      .in('coin_symbol', ['USDT', 'USDC', 'DAI'])
      .eq('metric_name', 'market_cap')
      .order('fetched_at', { ascending: false })
      .limit(9),
    getWeeklyPageData(week),
  ])

  const facts = (factsData ?? []) as AtomicFact[]

  // Deduplicate metrics
  const latestMetrics: typeof metricsData = []
  const seen = new Set<string>()
  for (const m of (metricsData ?? [])) {
    const key = `${m.coin_symbol}-${m.metric_name}`
    if (!seen.has(key)) { seen.add(key); latestMetrics.push(m) }
  }

  // Previous/next week links
  const prevWeek = shiftWeek(week, -1)
  const nextWeek = shiftWeek(week, 1)
  const currentWeek = getCurrentWeekNumber()
  const isCurrentWeek = week === currentWeek
  const isFutureWeek = week > currentWeek

  return (
    <div>
      {/* Weekly report header with nav */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-bold" style={{ color: 'var(--fg-title)' }}>
            稳定币周报
          </h1>
          <div className="flex items-center gap-2 text-[12px]">
            <a href={`/weekly/${prevWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              ← 上周
            </a>
            {!isCurrentWeek && !isFutureWeek && (
              <a href={`/weekly/${nextWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                下周 →
              </a>
            )}
            {!isCurrentWeek && (
              <a href={`/weekly/${currentWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
                本周
              </a>
            )}
          </div>
        </div>
        <p className="text-[13px] font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>
          {week} · {range?.display ?? week}
        </p>
      </div>

      {facts.length === 0 && !pageData.summarySimple ? (
        <div className="text-center py-16">
          <p className="text-[14px]" style={{ color: 'var(--fg-muted)' }}>该周暂无数据</p>
          <a href={`/weekly/${currentWeek}`} className="text-[13px] mt-2 inline-block hover:underline" style={{ color: 'var(--accent)' }}>
            查看本周周报 →
          </a>
        </div>
      ) : (
        <FeedClient
          facts={facts}
          currentWeek={week}
          stats={pageData.stats}
          narratives={pageData.narratives}
          summarySimple={pageData.summarySimple}
          summaryDetailed={pageData.summaryDetailed}
          marketMetrics={latestMetrics}
        />
      )}
    </div>
  )
}

function shiftWeek(week: string, delta: number): string {
  const [yearStr, wPart] = week.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart) + delta
  if (num < 1) return `${year - 1}-W${String(52 + num).padStart(2, '0')}`
  if (num > 52) return `${year + 1}-W${String(num - 52).padStart(2, '0')}`
  return `${year}-W${String(num).padStart(2, '0')}`
}
