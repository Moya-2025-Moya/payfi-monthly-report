import { FactList } from '@/components/facts/FactList'
import { WATCHLIST } from '@/config/watchlist'
import type { AtomicFact } from '@/lib/types'

// Build a lookup: lowercase name/alias → entity display name
const ENTITY_LOOKUP = new Map<string, string>()
for (const e of WATCHLIST) {
  ENTITY_LOOKUP.set(e.name.toLowerCase(), e.name)
  for (const alias of e.aliases) {
    ENTITY_LOOKUP.set(alias.toLowerCase(), e.name)
  }
}

function matchEntity(tags: string[]): string | null {
  for (const tag of tags) {
    const match = ENTITY_LOOKUP.get(tag.toLowerCase())
    if (match) return match
  }
  return null
}

export function AggregateView({ facts }: { facts: AtomicFact[] }) {
  const grouped = new Map<string, AtomicFact[]>()
  for (const fact of facts) {
    const entity = matchEntity(fact.tags) ?? '其他'
    const arr = grouped.get(entity) ?? []
    arr.push(fact)
    grouped.set(entity, arr)
  }

  // Sort: named entities first (by count desc), "其他" last
  const sorted = [...grouped.entries()].sort((a, b) => {
    if (a[0] === '其他') return 1
    if (b[0] === '其他') return -1
    return b[1].length - a[1].length
  })

  return (
    <div className="space-y-10">
      {sorted.map(([entity, entityFacts]) => (
        <section key={entity}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[11px] font-mono tracking-wider uppercase" style={{ color: 'var(--fg-dim)' }}>{entity}</h3>
            <span className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>{entityFacts.length}</span>
          </div>
          <FactList facts={entityFacts} compact />
        </section>
      ))}
    </div>
  )
}
