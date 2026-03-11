import { ConfidenceBadge } from '@/components/ui/Badge'
import type { Timeline, AtomicFact } from '@/lib/types'

interface TimelineNode {
  fact: AtomicFact
  attribution_status: 'confirmed' | 'uncertain' | 'rejected'
}

function dotColor(status: string): string {
  if (status === 'confirmed') return 'var(--success)'
  if (status === 'uncertain') return 'var(--accent)'
  return 'var(--danger)'
}

export function TimelineDisplay({ timeline, nodes }: { timeline: Timeline; nodes: TimelineNode[] }) {
  const sorted = [...nodes].sort((a, b) => new Date(a.fact.fact_date).getTime() - new Date(b.fact.fact_date).getTime())
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--fg-title)' }}>{timeline.name}</h2>
        {timeline.description && <p className="text-[13px] mt-1" style={{ color: 'var(--fg-dim)' }}>{timeline.description}</p>}
        <span className="inline-block mt-2 text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-lg"
          style={{ color: timeline.status === 'active' ? 'var(--success)' : 'var(--fg-faint)', border: `1px solid ${timeline.status === 'active' ? 'var(--success)' : 'var(--border)'}` }}>
          {timeline.status}
        </span>
      </div>
      <div className="relative pl-6 border-l" style={{ borderColor: 'var(--border)' }}>
        {sorted.map(({ fact, attribution_status }) => {
          const date = new Date(fact.fact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          return (
            <div key={fact.id} className="relative mb-8">
              <div className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-full" style={{ background: dotColor(attribution_status) }} />
              <div className="flex items-center gap-3 mb-1">
                <time className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>{date}</time>
                <ConfidenceBadge confidence={fact.confidence} />
                {attribution_status === 'uncertain' && (
                  <span className="text-[10px] font-mono" style={{ color: 'var(--accent)' }}>uncertain</span>
                )}
              </div>
              <p className="text-[13px]" style={{ color: 'var(--fg-body)' }}>{fact.content_en}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
