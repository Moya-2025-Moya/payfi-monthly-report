'use client'
import { useState } from 'react'
import { FactCard } from '@/components/facts/FactCard'
import type { AtomicFact } from '@/lib/types'

const INITIAL_SHOW = 5

export function TimelineView({ facts }: { facts: AtomicFact[] }) {
  const sorted = [...facts].sort((a, b) => new Date(b.fact_date).getTime() - new Date(a.fact_date).getTime())

  // Group by date
  const grouped = new Map<string, AtomicFact[]>()
  for (const fact of sorted) {
    const dateKey = new Date(fact.fact_date).toISOString().split('T')[0]
    const arr = grouped.get(dateKey) ?? []
    arr.push(fact)
    grouped.set(dateKey, arr)
  }

  return (
    <div className="space-y-8">
      {[...grouped.entries()].map(([dateKey, dateFacts]) => (
        <DateGroup key={dateKey} dateKey={dateKey} facts={dateFacts} />
      ))}
      {sorted.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--fg-muted)' }}>本周暂无事实。</p>
      )}
    </div>
  )
}

function DateGroup({ dateKey, facts }: { dateKey: string; facts: AtomicFact[] }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(dateKey + 'T00:00:00')
  const label = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
  const showAll = expanded || facts.length <= INITIAL_SHOW
  const visible = showAll ? facts : facts.slice(0, INITIAL_SHOW)
  const remaining = facts.length - INITIAL_SHOW

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--info)' }} />
        <h3 className="text-[13px] font-mono tracking-wider" style={{ color: 'var(--fg-faint)' }}>
          {label}
        </h3>
        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>
          {facts.length} 条
        </span>
      </div>
      <div className="space-y-0.5 pl-5 border-l" style={{ borderColor: 'var(--border)' }}>
        {visible.map(fact => (
          <FactCard key={fact.id} fact={fact} compact />
        ))}
        {!showAll && remaining > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-[13px] font-mono px-3 py-1.5 rounded-md transition-colors"
            style={{ color: 'var(--accent)', background: 'var(--surface-alt)' }}
          >
            展开更多 (+{remaining})
          </button>
        )}
      </div>
    </section>
  )
}
