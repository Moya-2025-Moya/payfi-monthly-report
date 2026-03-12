'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AggregateView } from '@/components/feed/AggregateView'
import { TimelineView } from '@/components/feed/TimelineView'
import type { AtomicFact } from '@/lib/types'

type View = 'aggregate' | 'timeline'

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

/** Convert ISO week string (2026-W11) to date range (3月10日 - 3月16日) */
function weekToDateRange(week: string): string {
  const { year, num } = parseWeek(week)
  // ISO week: Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const fmt = (d: Date) => `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return `${fmt(monday)} - ${fmt(sunday)}`
}

export function FeedClient({ facts, currentWeek }: { facts: AtomicFact[]; currentWeek: string }) {
  const [view, setView] = useState<View>('aggregate')
  const router = useRouter()
  const views: { key: View; label: string; desc: string }[] = [
    { key: 'aggregate', label: '聚合视图', desc: '按实体分组' },
    { key: 'timeline', label: '时间线', desc: '按日期排列' },
  ]

  function navigate(week: string) {
    router.push(`/?week=${encodeURIComponent(week)}`)
  }

  return (
    <div>
      {/* Week navigator — date range format */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(shiftWeek(currentWeek, -1))}
          className="px-3 py-1.5 rounded-md text-[12px] tracking-wide transition-colors"
          style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)', border: '1px solid var(--border)' }}
          aria-label="上一周"
        >
          ← {weekToDateRange(shiftWeek(currentWeek, -1))}
        </button>
        <span className="text-[14px] font-medium" style={{ color: 'var(--fg-title)' }}>
          {weekToDateRange(currentWeek)}
        </span>
        <button
          onClick={() => navigate(shiftWeek(currentWeek, 1))}
          className="px-3 py-1.5 rounded-md text-[12px] tracking-wide transition-colors"
          style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)', border: '1px solid var(--border)' }}
          aria-label="下一周"
        >
          {weekToDateRange(shiftWeek(currentWeek, 1))} →
        </button>
      </div>

      {/* Fact count */}
      <p className="text-[12px] mb-4" style={{ color: 'var(--fg-muted)' }}>
        本周共 {facts.length} 条已验证事实
      </p>

      {/* View switcher */}
      <div className="flex gap-0 mb-8 border-b" style={{ borderColor: 'var(--border)' }}>
        {views.map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className="px-4 py-2 text-[13px] font-medium tracking-wider transition-colors -mb-px border-b-2"
            style={{
              borderColor: view === v.key ? 'var(--accent)' : 'transparent',
              color: view === v.key ? 'var(--accent)' : 'var(--fg-muted)',
            }}
            title={v.desc}>
            {v.label}
          </button>
        ))}
      </div>
      {view === 'aggregate' && <AggregateView facts={facts} />}
      {view === 'timeline' && <TimelineView facts={facts} />}
    </div>
  )
}
