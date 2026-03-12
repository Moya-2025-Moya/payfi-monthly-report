import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityProfile } from '@/components/entity/EntityProfile'
import { WATCHLIST } from '@/config/watchlist'
import type { Entity, AtomicFact, EntityRelationship } from '@/lib/types'

const RELATIONSHIP_LABELS: Record<string, string> = {
  investment: '投资',
  partnership: '合作',
  competition: '竞争',
  dependency: '依赖',
  acquisition: '收购',
  issuance: '发行',
}

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Handle watchlist-based IDs (fallback when DB entities are empty)
  const isWatchlistId = id.startsWith('watchlist-')
  let entity: Entity | null = null
  let facts: AtomicFact[] = []
  let relationships: EntityRelationship[] = []

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

    // Related entities (absorbs old /graph functionality)
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
      <EntityProfile entity={entity} facts={facts} relationships={relationships} />
    </div>
  )
}
