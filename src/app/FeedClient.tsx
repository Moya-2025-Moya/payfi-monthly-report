'use client'
import { useState } from 'react'
import { AggregateView } from '@/components/feed/AggregateView'
import { TimelineView } from '@/components/feed/TimelineView'
import { MatrixView } from '@/components/feed/MatrixView'
import type { AtomicFact } from '@/lib/types'

type View = 'aggregate' | 'timeline' | 'matrix'

export function FeedClient({ facts }: { facts: AtomicFact[] }) {
  const [view, setView] = useState<View>('aggregate')
  const views: { key: View; label: string }[] = [
    { key: 'aggregate', label: 'Aggregate' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'matrix', label: 'Matrix' },
  ]
  return (
    <div>
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'var(--muted)' }}>
        {views.map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{ background: view === v.key ? 'var(--background)' : 'transparent', color: 'var(--foreground)' }}>
            {v.label}
          </button>
        ))}
      </div>
      {view === 'aggregate' && <AggregateView facts={facts} />}
      {view === 'timeline' && <TimelineView facts={facts} />}
      {view === 'matrix' && <MatrixView facts={facts} />}
    </div>
  )
}
