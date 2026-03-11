import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
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
      {facts.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">No verified Twitter facts this week</p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Verified tweets are collected and processed each week. Check back after the next pipeline run.</p>
        </Card>
      ) : (
        <FactList facts={facts} />
      )}
    </div>
  )
}
