import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityProfile } from '@/components/entity/EntityProfile'
import type { Entity, AtomicFact } from '@/lib/types'

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: entity } = await supabaseAdmin.from('entities').select('*').eq('id', id).single()
  if (!entity) return <p>Entity not found</p>

  const { data: links } = await supabaseAdmin.from('fact_entities').select('fact_id').eq('entity_id', id)
  const factIds = (links ?? []).map((l: { fact_id: string }) => l.fact_id)
  let facts: AtomicFact[] = []
  if (factIds.length > 0) {
    const { data } = await supabaseAdmin.from('atomic_facts').select('*').in('id', factIds).in('verification_status', ['verified', 'partially_verified']).order('fact_date', { ascending: false })
    facts = (data ?? []) as AtomicFact[]
  }
  return (
    <div>
      <PageHeader title={entity.name} />
      <EntityProfile entity={entity as Entity} facts={facts} />
    </div>
  )
}
