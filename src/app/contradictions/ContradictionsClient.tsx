'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ContradictionCard } from '@/components/contradictions/ContradictionCard'
import type { FactContradiction, AtomicFact } from '@/lib/types'

type StatusFilter = 'all' | 'unresolved' | 'resolved' | 'dismissed'

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unresolved', label: 'Unresolved' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
]

interface Props {
  contradictions: FactContradiction[]
  factsMap: Record<string, AtomicFact>
}

export function ContradictionsClient({ contradictions, factsMap }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const counts: Record<StatusFilter, number> = {
    all: contradictions.length,
    unresolved: contradictions.filter(c => c.status === 'unresolved').length,
    resolved: contradictions.filter(c => c.status === 'resolved').length,
    dismissed: contradictions.filter(c => c.status === 'dismissed').length,
  }

  const filtered = filter === 'all' ? contradictions : contradictions.filter(c => c.status === filter)

  if (contradictions.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-lg mb-1" style={{ color: 'var(--fg-title)' }}>No contradictions detected</p>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>The system automatically detects conflicting facts. None found yet.</p>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'var(--surface-alt)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: filter === t.key ? 'var(--surface)' : 'transparent',
              color: filter === t.key ? 'var(--fg-title)' : 'var(--fg-muted)',
              boxShadow: filter === t.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {t.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--fg-muted)' }}>
          No {filter === 'all' ? '' : filter} contradictions found.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <ContradictionCard
              key={c.id}
              contradiction={c}
              factA={factsMap[c.fact_id_a]}
              factB={factsMap[c.fact_id_b]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
