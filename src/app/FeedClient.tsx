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
    { key: 'aggregate', label: '聚合视图', desc: '按主题分组' },
    { key: 'timeline', label: '时间线', desc: '按时间排列' },
    { key: 'matrix', label: '矩阵视图', desc: '板块 × 类型 热力图' },
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
          className="px-3 py-1.5 rounded-md text-[12px] font-mono tracking-wider transition-colors"
          style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
          aria-label="上一周"
        >
          &lt; {shiftWeek(currentWeek, -1).replace('-', ' ')}
        </button>
        <span className="text-[13px] font-mono tracking-wider" style={{ color: 'var(--fg-title)' }}>
          {currentWeek.replace('-', ' ')}
        </span>
        <button
          onClick={() => navigate(shiftWeek(currentWeek, 1))}
          className="px-3 py-1.5 rounded-md text-[12px] font-mono tracking-wider transition-colors"
          style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
          aria-label="下一周"
        >
          {shiftWeek(currentWeek, 1).replace('-', ' ')} &gt;
        </button>
      </div>

      {/* Fact count */}
      <p className="text-[12px] font-mono mb-4" style={{ color: 'var(--fg-faint)' }}>
        本周共 {facts.length} 条已验证事实
      </p>

      {/* View switcher */}
      <div className="flex gap-0 mb-8 border-b" style={{ borderColor: 'var(--border)' }}>
        {views.map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className="px-4 py-2 text-[12px] font-medium tracking-wider transition-colors -mb-px border-b-2"
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
