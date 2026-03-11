import { FactCard } from './FactCard'
import type { AtomicFact } from '@/lib/types'

export function FactList({ facts, compact = false }: { facts: AtomicFact[]; compact?: boolean }) {
  if (facts.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--muted-fg)' }}>
        <p className="text-sm">No facts found</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {facts.map(fact => (
        <FactCard key={fact.id} fact={fact} compact={compact} />
      ))}
    </div>
  )
}
