import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { FeedClient } from './FeedClient'
import { WeeklySummary } from '@/components/feed/WeeklySummary'
import type { AtomicFact } from '@/lib/types'

interface SummaryData {
  simple: string | null
  detailed: string | null
}

async function getWeeklySummary(week: string): Promise<SummaryData> {
  try {
    const { data } = await supabaseAdmin
      .from('weekly_snapshots')
      .select('snapshot_data')
      .eq('week_number', week)
      .single()
    const sd = data?.snapshot_data as {
      weekly_summary?: string
      weekly_summary_detailed?: string
    } | null
    return {
      simple: sd?.weekly_summary ?? null,
      detailed: sd?.weekly_summary_detailed ?? null,
    }
  } catch {
    return { simple: null, detailed: null }
  }
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams
  const week = weekParam ?? getCurrentWeekNumber()
  const [{ data }, summary] = await Promise.all([
    supabaseAdmin
      .from('atomic_facts')
      .select('*')
      .in('verification_status', ['verified', 'partially_verified'])
      .eq('week_number', week)
      .order('fact_date', { ascending: false })
      .limit(200),
    getWeeklySummary(week),
  ])

  const facts = (data ?? []) as AtomicFact[]
  return (
    <div>
      <PageHeader title="周报" />
      {summary.simple && (
        <WeeklySummary simple={summary.simple} detailed={summary.detailed} />
      )}
      <FeedClient facts={facts} currentWeek={week} />
    </div>
  )
}
