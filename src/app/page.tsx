import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { FeedClient } from './FeedClient'
import type { AtomicFact } from '@/lib/types'

async function getWeeklySummary(week: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('weekly_snapshots')
      .select('snapshot_data')
      .eq('week_number', week)
      .single()
    return (data?.snapshot_data as { weekly_summary?: string })?.weekly_summary ?? null
  } catch {
    return null
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
      <PageHeader title="信息流" description={`${week.replace('-W', ' 第')}周 · ${facts.length} 条已验证事实`} />
      {summary && (
        <div
          className="mb-6 p-4 rounded-lg border"
          style={{ borderColor: 'var(--accent-muted)', background: 'var(--accent-soft)' }}
        >
          <p className="text-[11px] font-medium tracking-wider uppercase mb-2" style={{ color: 'var(--accent)' }}>
            本周摘要
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
            {summary}
          </p>
        </div>
      )}
      <FeedClient facts={facts} currentWeek={week} />
    </div>
  )
}
