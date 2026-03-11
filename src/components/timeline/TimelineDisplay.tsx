import { ConfidenceBadge } from '@/components/ui/Badge'
import type { Timeline, AtomicFact } from '@/lib/types'

interface TimelineNode {
  fact: AtomicFact
  attribution_status: 'confirmed' | 'uncertain' | 'rejected'
}

export function TimelineDisplay({ timeline, nodes }: { timeline: Timeline; nodes: TimelineNode[] }) {
  const sorted = [...nodes].sort((a, b) => new Date(a.fact.fact_date).getTime() - new Date(b.fact.fact_date).getTime())
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{timeline.name}</h2>
        {timeline.description && <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>{timeline.description}</p>}
        <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs"
          style={{ background: timeline.status === 'active' ? '#dcfce7' : 'var(--muted)', color: timeline.status === 'active' ? '#166534' : 'var(--muted-fg)' }}>
          {timeline.status}
        </span>
      </div>
      <div className="relative pl-6 border-l-2" style={{ borderColor: 'var(--border)' }}>
        {sorted.map(({ fact, attribution_status }) => {
          const date = new Date(fact.fact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          const dotColor = attribution_status === 'confirmed' ? 'var(--success)' : attribution_status === 'uncertain' ? 'var(--warning)' : 'var(--danger)'
          return (
            <div key={fact.id} className="relative mb-6">
              <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full" style={{ background: dotColor }} />
              <div className="flex items-center gap-2 mb-1">
                <time className="text-xs font-mono" style={{ color: 'var(--muted-fg)' }}>{date}</time>
                <ConfidenceBadge confidence={fact.confidence} />
                {attribution_status === 'uncertain' && (
                  <span className="text-xs px-1 rounded" style={{ background: '#fef9c3', color: '#854d0e' }}>uncertain attribution</span>
                )}
              </div>
              <p className="text-sm">{fact.content_en}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
