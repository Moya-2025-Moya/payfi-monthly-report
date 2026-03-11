import { FactCard } from './FactCard'
import type { AtomicFact } from '@/lib/types'

export function FactList({ facts, compact = false }: { facts: AtomicFact[]; compact?: boolean }) {
  if (facts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[13px] font-mono" style={{ color: 'var(--fg-faint)' }}>No facts found</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {facts.map(fact => (
        <FactCard key={fact.id} fact={fact} compact={compact} />
      ))}
    </div>
  )
}
