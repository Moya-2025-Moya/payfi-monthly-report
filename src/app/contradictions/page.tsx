import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { ContradictionCard } from '@/components/contradictions/ContradictionCard'
import type { FactContradiction, AtomicFact } from '@/lib/types'

export default async function ContradictionsPage() {
  const { data } = await supabaseAdmin.from('fact_contradictions').select('*').order('detected_at', { ascending: false }).limit(50)
  const contradictions = (data ?? []) as FactContradiction[]

  const factIds = [...new Set(contradictions.flatMap(c => [c.fact_id_a, c.fact_id_b]))]
  let factsMap = new Map<string, AtomicFact>()
  if (factIds.length > 0) {
    const { data: facts } = await supabaseAdmin.from('atomic_facts').select('*').in('id', factIds)
    for (const f of (facts ?? []) as AtomicFact[]) factsMap.set(f.id, f)
  }

  const unresolved = contradictions.filter(c => c.status === 'unresolved')
  const resolved = contradictions.filter(c => c.status !== 'unresolved')

  return (
    <div>
      <PageHeader title="Fact Contradictions" description={`${unresolved.length} unresolved, ${resolved.length} resolved/dismissed`} />
      <div className="space-y-3">
        {contradictions.map(c => (
          <ContradictionCard key={c.id} contradiction={c} factA={factsMap.get(c.fact_id_a)} factB={factsMap.get(c.fact_id_b)} />
        ))}
      </div>
    </div>
  )
}
