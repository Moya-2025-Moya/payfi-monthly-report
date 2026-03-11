'use client'
import { useState } from 'react'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Entity, EntityCategory } from '@/lib/types'

const CATEGORY_FILTERS: { key: EntityCategory | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'stablecoin_issuer', label: '稳定币发行方' },
  { key: 'b2c_product', label: 'B2C 产品' },
  { key: 'b2b_infra', label: 'B2B 基础设施' },
  { key: 'tradfi', label: '传统金融' },
  { key: 'public_company', label: '上市公司' },
  { key: 'defi', label: 'DeFi' },
  { key: 'regulator', label: '监管机构' },
]

export function EntitiesClient({ entities }: { entities: Entity[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<EntityCategory | 'all'>('all')

  const filtered = entities.filter(e => {
    const matchesCategory = category === 'all' || e.category === category
    if (!matchesCategory) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      e.name.toLowerCase().includes(q) ||
      (e.aliases ?? []).some(a => a.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      <div className="mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="按名称或别名搜索..."
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setCategory(f.key)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: category === f.key ? 'var(--accent)' : 'var(--surface-alt)',
                color: category === f.key ? 'var(--bg)' : 'var(--fg-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          显示 {filtered.length} 个实体
          {filtered.length !== entities.length && `（共 ${entities.length} 个）`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--fg-muted)' }}>没有匹配的实体。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(e => <EntityCard key={e.id} entity={e} />)}
        </div>
      )}
    </div>
  )
}
