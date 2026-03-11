'use client'
import { useState } from 'react'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Entity, EntityCategory } from '@/lib/types'

const CATEGORY_FILTERS: { key: EntityCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'stablecoin_issuer', label: 'Stablecoin Issuer' },
  { key: 'b2b_infra', label: 'B2B Infra' },
  { key: 'tradfi', label: 'TradFi' },
  { key: 'public_company', label: 'Public Company' },
  { key: 'defi', label: 'DeFi' },
  { key: 'regulator', label: 'Regulator' },
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
          placeholder="Search by name or alias..."
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setCategory(f.key)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: category === f.key ? 'var(--accent)' : 'var(--muted)',
                color: category === f.key ? 'var(--accent-fg)' : 'var(--muted-fg)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          {filtered.length} {filtered.length === 1 ? 'entity' : 'entities'} shown
          {filtered.length !== entities.length && ` (of ${entities.length} total)`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--muted-fg)' }}>No entities match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(e => <EntityCard key={e.id} entity={e} />)}
        </div>
      )}
    </div>
  )
}
