import { ConfidenceBadge } from '@/components/ui/Badge'
import type { AtomicFact } from '@/lib/types'

function dotColor(confidence: string | null): string {
  if (confidence === 'high') return '#00cc88'
  if (confidence === 'medium') return '#4488ff'
  return '#ffaa00'
}

export function TimelineView({ facts }: { facts: AtomicFact[] }) {
  const sorted = [...facts].sort((a, b) => new Date(b.fact_date).getTime() - new Date(a.fact_date).getTime())

  return (
    <div className="relative pl-6 border-l" style={{ borderColor: '#1a1a1a' }}>
      {sorted.map(fact => {
        const date = new Date(fact.fact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={fact.id} className="relative mb-6 pb-2">
            <div className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-full"
              style={{ background: dotColor(fact.confidence) }} />
            <div className="flex items-center gap-3 mb-1">
              <time className="text-[11px] font-mono" style={{ color: '#444' }}>{date}</time>
              <ConfidenceBadge confidence={fact.confidence} />
            </div>
            <p className="text-[13px]" style={{ color: '#ccc' }}>{fact.content_en}</p>
            <div className="flex gap-1.5 mt-2">
              {fact.tags.slice(0, 3).map(t => (
                <span key={t} className="text-[10px] font-mono" style={{ color: '#333' }}>{t}</span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
