import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityProfile } from '@/components/entity/EntityProfile'
import { WATCHLIST } from '@/config/watchlist'
import type { Entity, AtomicFact, EntityRelationship } from '@/lib/types'

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
      <EntityProfile entity={entity} facts={facts} />

      {/* Related entities section (from old /graph) */}
      {relationships.length > 0 && (
        <div className="mt-8">
          <p className="text-[11px] font-mono tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>
            关联实体 ({relationships.length})
          </p>
          <div className="space-y-2">
            {relationships.map(rel => (
              <div key={rel.id} className="rounded-lg border p-3 text-[13px]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <span className="font-mono px-1.5 py-0.5 rounded text-[11px]"
                  style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
                  {rel.relationship_type}
                </span>
                {rel.description && (
                  <p className="mt-1.5" style={{ color: 'var(--fg-body)' }}>{rel.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes section */}
      <div className="mt-8">
        <p className="text-[11px] font-mono tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>
          笔记
        </p>
        <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>
          前往 <a href="/notes" className="underline" style={{ color: 'var(--accent)' }}>团队笔记</a> 页面查看和添加笔记。
        </p>
      </div>
    </div>
  )
}
