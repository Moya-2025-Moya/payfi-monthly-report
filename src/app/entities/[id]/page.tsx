import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityProfile } from '@/components/entity/EntityProfile'
import { WATCHLIST } from '@/config/watchlist'
import type { Entity, AtomicFact, EntityRelationship } from '@/lib/types'

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const isWatchlistId = id.startsWith('watchlist-')
  let entity: Entity | null = null
  let facts: AtomicFact[] = []
  let relationships: EntityRelationship[] = []
  let coAppearingEntities: { name: string; count: number; id: string }[] = []

  if (isWatchlistId) {
    const idx = parseInt(id.replace('watchlist-', ''), 10)
    const w = WATCHLIST[idx]
    if (!w) return <p>Entity not found</p>

    entity = {
      id,
      name: w.name,
      aliases: w.aliases,
      category: w.category,
      description_en: null,
      description_zh: null,
      logo_url: null,
      website: w.website ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    // Find facts by matching tags
    const searchTerms = [w.name, ...w.aliases].map(n => n.toLowerCase())
    const { data: allFacts } = await supabaseAdmin
      .from('atomic_facts')
      .select('*')
      .in('verification_status', ['verified', 'partially_verified'])
      .order('fact_date', { ascending: false })
      .limit(200)

    facts = ((allFacts ?? []) as AtomicFact[]).filter(f =>
      f.tags.some(t => searchTerms.includes(t.toLowerCase()))
    )

    // Build co-appearing entities from shared tags in matched facts
    const coAppearCounts = new Map<string, number>()
    for (const f of facts) {
      for (const tag of f.tags) {
        const tagLower = tag.toLowerCase()
        if (!searchTerms.includes(tagLower)) {
          coAppearCounts.set(tag, (coAppearCounts.get(tag) ?? 0) + 1)
        }
      }
    }

    // Match co-appearing tags to watchlist entities
    const entityCoAppear = new Map<number, { name: string; count: number }>()
    for (const [tag, count] of coAppearCounts) {
      const tagLower = tag.toLowerCase()
      const wIdx = WATCHLIST.findIndex(
        we => we.name.toLowerCase() === tagLower || we.aliases.some(a => a.toLowerCase() === tagLower)
      )
      if (wIdx >= 0 && wIdx !== idx) {
        const existing = entityCoAppear.get(wIdx)
        if (existing) {
          existing.count += count
        } else {
          entityCoAppear.set(wIdx, { name: WATCHLIST[wIdx].name, count })
        }
      }
    }

    coAppearingEntities = [...entityCoAppear.entries()]
      .map(([wIdx, info]) => ({ name: info.name, count: info.count, id: `watchlist-${wIdx}` }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  } else {
    // Standard DB entity
    const { data: entityData } = await supabaseAdmin.from('entities').select('*').eq('id', id).single()
    if (!entityData) return <p>Entity not found</p>
    entity = entityData as Entity

    // Linked facts via fact_entities
    const { data: links } = await supabaseAdmin.from('fact_entities').select('fact_id').eq('entity_id', id)
    const factIds = (links ?? []).map((l: { fact_id: string }) => l.fact_id)
    if (factIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('atomic_facts')
        .select('*')
        .in('id', factIds)
        .in('verification_status', ['verified', 'partially_verified'])
        .order('fact_date', { ascending: false })
      facts = (data ?? []) as AtomicFact[]
    }

    // Related entities (from entity_relationships table)
    const { data: rels } = await supabaseAdmin
      .from('entity_relationships')
      .select('*')
      .or(`entity_a_id.eq.${id},entity_b_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(50)
    relationships = (rels ?? []) as EntityRelationship[]
  }

  return (
    <div>
      <PageHeader title={entity.name} />
      <EntityProfile
        entity={entity}
        facts={facts}
        relationships={relationships}
        coAppearingEntities={coAppearingEntities}
      />
    </div>
  )
}
