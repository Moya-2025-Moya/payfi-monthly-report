import { FactList } from '@/components/facts/FactList'
import type { AtomicFact } from '@/lib/types'

export function AggregateView({ facts }: { facts: AtomicFact[] }) {
  const grouped = new Map<string, AtomicFact[]>()
  for (const fact of facts) {
    const key = fact.tags[0] ?? 'other'
    const arr = grouped.get(key) ?? []
    arr.push(fact)
    grouped.set(key, arr)
  }
  const sorted = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="space-y-10">
      {sorted.map(([topic, topicFacts]) => (
        <section key={topic}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[11px] font-mono tracking-wider uppercase" style={{ color: 'var(--fg-dim)' }}>{topic}</h3>
            <span className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>{topicFacts.length}</span>
          </div>
          <FactList facts={topicFacts} compact />
        </section>
      ))}
    </div>
  )
}
