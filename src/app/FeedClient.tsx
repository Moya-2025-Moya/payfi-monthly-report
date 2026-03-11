'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AggregateView } from '@/components/feed/AggregateView'
import { TimelineView } from '@/components/feed/TimelineView'
import { MatrixView } from '@/components/feed/MatrixView'
import type { AtomicFact } from '@/lib/types'

type View = 'aggregate' | 'timeline' | 'matrix'

function parseWeek(w: string): { year: number; num: number } {
  const [year, wPart] = w.split('-W')
  return { year: Number(year), num: Number(wPart) }
}

function formatWeek(year: number, num: number): string {
  return `${year}-W${String(num).padStart(2, '0')}`
}

function shiftWeek(week: string, delta: number): string {
  const { year, num } = parseWeek(week)
  const newNum = num + delta
  if (newNum < 1) return formatWeek(year - 1, 52)
  if (newNum > 52) return formatWeek(year + 1, 1)
  return formatWeek(year, newNum)
}

export function FeedClient({ facts, currentWeek }: { facts: AtomicFact[]; currentWeek: string }) {
  const [view, setView] = useState<View>('aggregate')
  const router = useRouter()
  const views: { key: View; label: string }[] = [
    { key: 'aggregate', label: 'Aggregate' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'matrix', label: 'Matrix' },
  ]

  function navigate(week: string) {
    router.push(`/?week=${encodeURIComponent(week)}`)
  }

  return (
    <div>
      {/* Week navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(shiftWeek(currentWeek, -1))}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
          aria-label="Previous week"
        >
          &lt; {shiftWeek(currentWeek, -1).replace('-', ' ')}
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          {currentWeek.replace('-', ' ')}
        </span>
        <button
          onClick={() => navigate(shiftWeek(currentWeek, 1))}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
          aria-label="Next week"
        >
          {shiftWeek(currentWeek, 1).replace('-', ' ')} &gt;
        </button>
      </div>

      {/* View switcher */}
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
