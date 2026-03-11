import { ConfidenceBadge } from '@/components/ui/Badge'
import type { Timeline, AtomicFact } from '@/lib/types'

interface TimelineNode {
  fact: AtomicFact
  attribution_status: 'confirmed' | 'uncertain' | 'rejected'
}

function dotColor(status: string): string {
  if (status === 'confirmed') return '#00cc88'
  if (status === 'uncertain') return '#ffaa00'
  return '#ff4444'
}

export function TimelineDisplay({ timeline, nodes }: { timeline: Timeline; nodes: TimelineNode[] }) {
  const sorted = [...nodes].sort((a, b) => new Date(a.fact.fact_date).getTime() - new Date(b.fact.fact_date).getTime())
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: '#fff' }}>{timeline.name}</h2>
        {timeline.description && <p className="text-[13px] mt-1" style={{ color: '#555' }}>{timeline.description}</p>}
        <span className="inline-block mt-2 text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded"
          style={{ color: timeline.status === 'active' ? '#00cc88' : '#444', border: `1px solid ${timeline.status === 'active' ? '#00cc8833' : '#1a1a1a'}` }}>
          {timeline.status}
        </span>
      </div>
      <div className="relative pl-6 border-l" style={{ borderColor: '#1a1a1a' }}>
        {sorted.map(({ fact, attribution_status }) => {
          const date = new Date(fact.fact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          return (
            <div key={fact.id} className="relative mb-8">
              <div className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-full" style={{ background: dotColor(attribution_status) }} />
              <div className="flex items-center gap-3 mb-1">
                <time className="text-[11px] font-mono" style={{ color: '#444' }}>{date}</time>
                <ConfidenceBadge confidence={fact.confidence} />
                {attribution_status === 'uncertain' && (
                  <span className="text-[10px] font-mono" style={{ color: '#ffaa00' }}>uncertain</span>
                )}
              </div>
              <p className="text-[13px]" style={{ color: '#ccc' }}>{fact.content_en}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
