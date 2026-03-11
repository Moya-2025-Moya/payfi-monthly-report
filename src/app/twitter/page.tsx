import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { FactList } from '@/components/facts/FactList'
import type { AtomicFact } from '@/lib/types'

export default async function TwitterPage() {
  const week = getCurrentWeekNumber()
  const { data } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('source_type', 'tweet')
    .in('verification_status', ['verified', 'partially_verified'])
    .eq('week_number', week)
    .order('fact_date', { ascending: false })
    .limit(100)
  const facts = (data ?? []) as AtomicFact[]
  return (
    <div>
      <PageHeader title="Twitter Voices" description={`${facts.length} verified facts from Twitter this week`} />
      <FactList facts={facts} />
    </div>
  )
}
