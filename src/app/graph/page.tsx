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

const CATEGORY_ZH: Record<string, string> = {
  company: '公司', person: '个人', product: '产品', regulator: '监管机构',
  fund: '基金', bank: '银行', exchange: '交易所',
  stablecoin_issuer: '稳定币发行方', b2c_product: 'B2C产品', b2b_infra: 'B2B基础设施',
  tradfi: '传统金融', public_company: '上市公司', defi: 'DeFi',
}

const TYPE_LABELS: Record<RelationshipType, string> = {
  investment: '投资关系',
  partnership: '合作关系',
  competition: '竞争关系',
  dependency: '依赖关系',
  acquisition: '收购关系',
  issuance: '发行关系',
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
        <PageHeader title="关系图谱" description="实体关系可视化" />
        <Card className="text-center py-8">
          <p className="text-lg mb-1">加载图谱数据失败</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{error.message}</p>
        </Card>
      </div>
    )
  }

  const edges = (rels ?? []) as EntityRelationship[]

  if (edges.length === 0) {
    return (
      <div>
        <PageHeader title="关系图谱" description="实体关系可视化" />
        <Card className="text-center py-8">
          <p className="text-lg mb-1">暂无关系数据</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>实体关系会在流水线处理中自动提取。请先运行流水线。</p>
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

  const byType = new Map<RelationshipType, EntityRelationship[]>()
  for (const edge of edges) {
    const arr = byType.get(edge.relationship_type) ?? []
    arr.push(edge)
    byType.set(edge.relationship_type, arr)
  }

  const categoryCounts = new Map<string, number>()
  for (const e of entities) {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1)
  }

  return (
    <div>
      <PageHeader
        title="关系图谱"
        description={`${entities.length} 个实体，${edges.length} 条关系`}
      />

      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">按类别分布</h2>
        <div className="flex flex-wrap gap-2">
          {[...categoryCounts.entries()].map(([cat, count]) => (
            <div
              key={cat}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: `${categoryColor(cat)}20`, color: categoryColor(cat) }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: categoryColor(cat) }} />
              <span>{CATEGORY_ZH[cat] ?? cat}</span>
              <span className="opacity-70">({count})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {[...byType.entries()].map(([type, typeEdges]) => (
          <Card key={type}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{TYPE_LABELS[type] ?? type}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
                {typeEdges.length}
              </span>
            </div>
            <div className="space-y-2">
              {typeEdges.map(edge => {
                const a = entityMap.get(edge.entity_a_id)
                const b = entityMap.get(edge.entity_b_id)
                return (
                  <div key={edge.id} className="flex items-start gap-3 p-2 rounded-md" style={{ background: 'var(--surface-alt)' }}>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: categoryColor(a?.category ?? '') }} />
                      <span className="text-xs font-medium truncate">{a?.name ?? edge.entity_a_id}</span>
                      {a?.category && <span className="text-xs opacity-50 flex-shrink-0">({CATEGORY_ZH[a.category] ?? a.category})</span>}
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>→</span>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: categoryColor(b?.category ?? '') }} />
                      <span className="text-xs font-medium truncate">{b?.name ?? edge.entity_b_id}</span>
                      {b?.category && <span className="text-xs opacity-50 flex-shrink-0">({CATEGORY_ZH[b.category] ?? b.category})</span>}
                    </div>
                    {edge.description && (
                      <p className="text-xs flex-shrink-0 max-w-[200px] truncate" style={{ color: 'var(--fg-muted)' }} title={edge.description}>
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
