import { FactList } from '@/components/facts/FactList'
import type { AtomicFact } from '@/lib/types'

export function AggregateView({ facts }: { facts: AtomicFact[] }) {
  // Group by tag/topic
  const grouped = new Map<string, AtomicFact[]>()
  for (const fact of facts) {
    const key = fact.tags[0] ?? 'other'
    const arr = grouped.get(key) ?? []
    arr.push(fact)
    grouped.set(key, arr)
  }

  const sorted = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="space-y-6">
      {sorted.map(([topic, topicFacts]) => (
        <section key={topic}>
          <h3 className="text-sm font-semibold mb-2 capitalize">{topic} <span style={{ color: 'var(--muted-fg)' }}>({topicFacts.length})</span></h3>
          <FactList facts={topicFacts} compact />
        </section>
      ))}
    </div>
  )
}
