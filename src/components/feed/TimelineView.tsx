import { ConfidenceBadge } from '@/components/ui/Badge'
import type { AtomicFact } from '@/lib/types'

export function TimelineView({ facts }: { facts: AtomicFact[] }) {
  const sorted = [...facts].sort((a, b) => new Date(b.fact_date).getTime() - new Date(a.fact_date).getTime())

  return (
    <div className="relative pl-6 border-l-2" style={{ borderColor: 'var(--border)' }}>
      {sorted.map(fact => {
        const date = new Date(fact.fact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={fact.id} className="relative mb-4 pb-4">
            <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2"
              style={{
                borderColor: 'var(--accent)',
                background: fact.confidence === 'high' ? 'var(--success)' : fact.confidence === 'medium' ? 'var(--accent)' : 'var(--warning)'
              }} />
            <div className="flex items-center gap-2 mb-1">
              <time className="text-xs font-mono" style={{ color: 'var(--muted-fg)' }}>{date}</time>
              <ConfidenceBadge confidence={fact.confidence} />
            </div>
            <p className="text-sm">{fact.content_en}</p>
            <div className="flex gap-1 mt-1">
              {fact.tags.slice(0, 3).map(t => (
                <span key={t} className="text-xs px-1 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>{t}</span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
