import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { ContradictionsClient } from './ContradictionsClient'
import type { FactContradiction, AtomicFact } from '@/lib/types'

export default async function ContradictionsPage() {
  const { data } = await supabaseAdmin.from('fact_contradictions').select('*').order('detected_at', { ascending: false }).limit(50)
  const contradictions = (data ?? []) as FactContradiction[]

  const factIds = [...new Set(contradictions.flatMap(c => [c.fact_id_a, c.fact_id_b]))]
  const factsMap: Record<string, AtomicFact> = {}
  if (factIds.length > 0) {
    const { data: facts } = await supabaseAdmin.from('atomic_facts').select('*').in('id', factIds)
    for (const f of (facts ?? []) as AtomicFact[]) factsMap[f.id] = f
  }

  const unresolved = contradictions.filter(c => c.status === 'unresolved')
  const resolved = contradictions.filter(c => c.status !== 'unresolved')

  return (
    <div>
      <PageHeader title="矛盾检测" description={`${unresolved.length} 条未解决，${resolved.length} 条已解决/忽略`} />
      <ContradictionsClient contradictions={contradictions} factsMap={factsMap} />
    </div>
  )
}
