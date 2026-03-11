import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { FeedClient } from './FeedClient'
import type { AtomicFact } from '@/lib/types'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams
  const week = weekParam ?? getCurrentWeekNumber()
  const { data } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .eq('week_number', week)
    .order('fact_date', { ascending: false })
    .limit(200)

  const facts = (data ?? []) as AtomicFact[]
  return (
    <div>
      <PageHeader title="StablePulse Feed" description={`${week.replace('-', ' ')} · ${facts.length} verified facts`} />
      <FeedClient facts={facts} currentWeek={week} />
    </div>
  )
}
