'use client'

import { useState, useEffect } from 'react'
import { FactList } from '@/components/facts/FactList'
import { WATCHLIST } from '@/config/watchlist'
import type { AtomicFact } from '@/lib/types'

const ENTITY_LOOKUP = new Map<string, string>()
for (const e of WATCHLIST) {
  ENTITY_LOOKUP.set(e.name.toLowerCase(), e.name)
  for (const alias of e.aliases) ENTITY_LOOKUP.set(alias.toLowerCase(), e.name)
}

function matchEntity(tags: string[]): string | null {
  for (const tag of tags) {
    const match = ENTITY_LOOKUP.get(tag.toLowerCase())
    if (match) return match
  }
  return null
}

/* Q5: AI-generated entity summary */
function EntitySummary({ entity, facts }: { entity: string; facts: AtomicFact[] }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (entity === '其他' || facts.length < 2) return
    setLoading(true)
    const contents = facts.map(f => f.content_zh || f.content_en)
    fetch('/api/facts/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, facts: contents }),
    })
      .then(r => r.json())
      .then(d => setSummary(d.summary || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entity, facts])

  if (entity === '其他' || facts.length < 2) return null

  return (
    <div className="text-[13px] mt-1 mb-3" style={{ color: 'var(--fg-secondary)' }}>
      {loading ? (
        <span className="text-[11px]" style={{ color: 'var(--fg-dim)' }}>生成摘要...</span>
      ) : summary ? (
        summary
      ) : null}
    </div>
  )
}

export function AggregateView({ facts }: { facts: AtomicFact[] }) {
  const grouped = new Map<string, AtomicFact[]>()
  for (const fact of facts) {
    const entity = matchEntity(fact.tags) ?? '其他'
    const arr = grouped.get(entity) ?? []
    arr.push(fact)
    grouped.set(entity, arr)
  }

  const sorted = [...grouped.entries()].sort((a, b) => {
    if (a[0] === '其他') return 1
    if (b[0] === '其他') return -1
    return b[1].length - a[1].length
  })

  return (
    <div className="space-y-10">
      {sorted.map(([entity, entityFacts]) => (
        <section key={entity}>
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--fg-title)' }}>{entity}</h3>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-alt)', color: 'var(--fg-dim)' }}>
              {entityFacts.length}
            </span>
          </div>
          <EntitySummary entity={entity} facts={entityFacts} />
          <FactList facts={entityFacts} compact />
        </section>
      ))}
    </div>
  )
}
