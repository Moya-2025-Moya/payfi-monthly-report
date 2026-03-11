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
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(shiftWeek(currentWeek, -1))}
          className="px-3 py-1.5 rounded text-[12px] font-mono tracking-wider uppercase transition-colors hover:opacity-80"
          style={{ background: '#111', color: '#666', border: '1px solid #1a1a1a' }}
          aria-label="Previous week"
        >
          &lt; {shiftWeek(currentWeek, -1).replace('-', ' ')}
        </button>
        <span className="text-[13px] font-mono tracking-wider uppercase" style={{ color: '#fff' }}>
          {currentWeek.replace('-', ' ')}
        </span>
        <button
          onClick={() => navigate(shiftWeek(currentWeek, 1))}
          className="px-3 py-1.5 rounded text-[12px] font-mono tracking-wider uppercase transition-colors hover:opacity-80"
          style={{ background: '#111', color: '#666', border: '1px solid #1a1a1a' }}
          aria-label="Next week"
        >
          {shiftWeek(currentWeek, 1).replace('-', ' ')} &gt;
        </button>
      </div>

      {/* View switcher */}
      <div className="flex gap-0 mb-8 border-b" style={{ borderColor: '#1a1a1a' }}>
        {views.map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className="px-4 py-2 text-[12px] font-mono tracking-wider uppercase transition-colors -mb-px border-b-2"
            style={{
              borderColor: view === v.key ? '#fff' : 'transparent',
              color: view === v.key ? '#fff' : '#444',
            }}>
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
