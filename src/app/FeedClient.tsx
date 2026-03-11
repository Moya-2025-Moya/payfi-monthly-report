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
  const views: { key: View; label: string; desc: string }[] = [
    { key: 'aggregate', label: 'Aggregate', desc: 'Facts grouped by topic' },
    { key: 'timeline', label: 'Timeline', desc: 'Chronological view' },
    { key: 'matrix', label: 'Matrix', desc: 'Sector × type heatmap' },
  ]

  function navigate(week: string) {
    router.push(`/?week=${encodeURIComponent(week)}`)
  }

  return (
    <div>
      {/* Week navigator */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(shiftWeek(currentWeek, -1))}
          className="px-3 py-1.5 rounded-md text-[12px] font-mono tracking-wider uppercase transition-colors"
          style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
          aria-label="Previous week"
        >
          &lt; {shiftWeek(currentWeek, -1).replace('-', ' ')}
        </button>
        <span className="text-[13px] font-mono tracking-wider uppercase" style={{ color: 'var(--fg-title)' }}>
          {currentWeek.replace('-', ' ')}
        </span>
        <button
          onClick={() => navigate(shiftWeek(currentWeek, 1))}
          className="px-3 py-1.5 rounded-md text-[12px] font-mono tracking-wider uppercase transition-colors"
          style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
          aria-label="Next week"
        >
          {shiftWeek(currentWeek, 1).replace('-', ' ')} &gt;
        </button>
      </div>

      {/* Fact count */}
      <p className="text-[12px] font-mono mb-4" style={{ color: 'var(--fg-faint)' }}>
        {facts.length} fact{facts.length === 1 ? '' : 's'} this week
      </p>

      {/* View switcher */}
      <div className="flex gap-0 mb-8 border-b" style={{ borderColor: 'var(--border)' }}>
        {views.map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className="px-4 py-2 text-[12px] font-mono tracking-wider uppercase transition-colors -mb-px border-b-2"
            style={{
              borderColor: view === v.key ? 'var(--accent)' : 'transparent',
              color: view === v.key ? 'var(--accent)' : 'var(--fg-faint)',
            }}
            title={v.desc}>
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
