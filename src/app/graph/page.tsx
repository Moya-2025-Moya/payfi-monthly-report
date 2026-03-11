import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import type { EntityRelationship, RelationshipType } from '@/lib/types'

interface GraphEntity {
  id: string
  name: string
  category: string
}

const CATEGORY_COLORS: Record<string, string> = {
  company: '#3b82f6',
  person: '#8b5cf6',
  product: '#10b981',
  regulator: '#f59e0b',
  fund: '#ef4444',
  bank: '#06b6d4',
  exchange: '#f97316',
}

const TYPE_LABELS: Record<RelationshipType, string> = {
  investment: 'Investments',
  partnership: 'Partnerships',
  competition: 'Competition',
  dependency: 'Dependencies',
  acquisition: 'Acquisitions',
  issuance: 'Issuances',
}

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? '#6b7280'
}

export default async function GraphPage() {
  const { data: rels, error } = await supabaseAdmin
    .from('entity_relationships')
    .select('*')
    .limit(200)

  if (error) {
    return (
      <div>
        <PageHeader title="Relationship Graph" description="Entity relationship visualization" />
        <Card className="text-center py-8">
          <p className="text-lg mb-1">Failed to load graph data</p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>{error.message}</p>
        </Card>
      </div>
    )
  }

  const edges = (rels ?? []) as EntityRelationship[]

  if (edges.length === 0) {
    return (
      <div>
        <PageHeader title="Relationship Graph" description="Entity relationship visualization" />
        <Card className="text-center py-8">
          <p className="text-lg mb-1">No relationships mapped yet</p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Entity relationships are extracted during pipeline processing. Run the pipeline to populate the graph.</p>
        </Card>
      </div>
    )
  }

  const entityIds = [...new Set(edges.flatMap(e => [e.entity_a_id, e.entity_b_id]))]
  const { data: entData } = await supabaseAdmin
    .from('entities')
    .select('id, name, category')
    .in('id', entityIds)

  const entities = (entData ?? []) as GraphEntity[]
  const entityMap = new Map(entities.map(e => [e.id, e]))

  // Group edges by relationship type
  const byType = new Map<RelationshipType, EntityRelationship[]>()
  for (const edge of edges) {
    const arr = byType.get(edge.relationship_type) ?? []
    arr.push(edge)
    byType.set(edge.relationship_type, arr)
  }

  // Category counts for legend
  const categoryCounts = new Map<string, number>()
  for (const e of entities) {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1)
  }

  return (
    <div>
      <PageHeader
        title="Relationship Graph"
        description={`${entities.length} entities, ${edges.length} relationships`}
      />

      {/* Entity overview */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">Entities by Category</h2>
        <div className="flex flex-wrap gap-2">
          {[...categoryCounts.entries()].map(([cat, count]) => (
            <div
              key={cat}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: `${categoryColor(cat)}20`, color: categoryColor(cat) }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: categoryColor(cat) }}
              />
              <span className="capitalize">{cat}</span>
              <span className="opacity-70">({count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Relationships grouped by type */}
      <div className="space-y-4">
        {[...byType.entries()].map(([type, typeEdges]) => (
          <Card key={type}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{TYPE_LABELS[type] ?? type}</h3>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-mono"
                style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}
              >
                {typeEdges.length}
              </span>
            </div>
            <div className="space-y-2">
              {typeEdges.map(edge => {
                const a = entityMap.get(edge.entity_a_id)
                const b = entityMap.get(edge.entity_b_id)
                return (
                  <div
                    key={edge.id}
                    className="flex items-start gap-3 p-2 rounded-md"
                    style={{ background: 'var(--muted)' }}
                  >
                    {/* Entity A */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: categoryColor(a?.category ?? '') }}
                      />
                      <span className="text-xs font-medium truncate">{a?.name ?? edge.entity_a_id}</span>
                      {a?.category && (
                        <span className="text-xs opacity-50 capitalize flex-shrink-0">({a.category})</span>
                      )}
                    </div>

                    {/* Arrow */}
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted-fg)' }}>→</span>

                    {/* Entity B */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: categoryColor(b?.category ?? '') }}
                      />
                      <span className="text-xs font-medium truncate">{b?.name ?? edge.entity_b_id}</span>
                      {b?.category && (
                        <span className="text-xs opacity-50 capitalize flex-shrink-0">({b.category})</span>
                      )}
                    </div>

                    {/* Description */}
                    {edge.description && (
                      <p className="text-xs flex-shrink-0 max-w-[200px] truncate" style={{ color: 'var(--muted-fg)' }} title={edge.description}>
                        {edge.description}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
