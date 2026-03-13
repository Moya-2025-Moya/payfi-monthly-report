import { getCurrentWeekNumber } from '@/db/client'
import { redirect } from 'next/navigation'
import { getWeeklyPageData } from '@/lib/weekly-data'
import { WeeklyMirror } from './WeeklyMirror'
import type { Metadata } from 'next'

function parseWeekDateRange(week: string): { display: string } | null {
  const m = week.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const wNum = parseInt(m[2], 10)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (wNum - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return { display: `${fmt(monday)} - ${fmt(sunday)}` }
}

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params
  const range = parseWeekDateRange(week)
  return {
    title: `稳定币周报 ${week}${range ? ` | ${range.display}` : ''}`,
    description: `StablePulse 稳定币行业周报 — ${week}`,
  }
}

function shiftWeek(week: string, delta: number): string {
  const [yearStr, wPart] = week.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart) + delta
  if (num < 1) return `${year - 1}-W${String(52 + num).padStart(2, '0')}`
  if (num > 52) return `${year + 1}-W${String(num - 52).padStart(2, '0')}`
  return `${year}-W${String(num).padStart(2, '0')}`
}

export default async function WeeklyReportPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params

  if (!/^\d{4}-W\d{2}$/.test(week)) {
    redirect(`/weekly/${getCurrentWeekNumber()}`)
  }

  const range = parseWeekDateRange(week)
  const pageData = await getWeeklyPageData(week)
  const currentWeek = getCurrentWeekNumber()
  const isCurrentWeek = week === currentWeek
  const isFutureWeek = week > currentWeek
  const prevWeek = shiftWeek(week, -1)
  const nextWeek = shiftWeek(week, 1)

  return (
    <div>
      {/* Header with nav */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-bold" style={{ color: 'var(--fg-title)' }}>
            稳定币周报
          </h1>
          <div className="flex items-center gap-2 text-[12px]">
            <a href={`/weekly/${prevWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              ← 上周
            </a>
            {!isCurrentWeek && !isFutureWeek && (
              <a href={`/weekly/${nextWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                下周 →
              </a>
            )}
            {!isCurrentWeek && (
              <a href={`/weekly/${currentWeek}`} className="px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
                本周
              </a>
            )}
          </div>
        </div>
        <p className="text-[13px] font-mono mt-1" style={{ color: 'var(--fg-muted)' }}>
          {week} · {range?.display ?? week}
        </p>
      </div>

      {!pageData.summaryDetailed ? (
        <div className="text-center py-16">
          <p className="text-[14px]" style={{ color: 'var(--fg-muted)' }}>该周暂无数据</p>
          {!isCurrentWeek && (
            <a href={`/weekly/${currentWeek}`} className="text-[13px] mt-2 inline-block hover:underline" style={{ color: 'var(--accent)' }}>
              查看本周周报 →
            </a>
          )}
        </div>
      ) : (
        <WeeklyMirror
          summaryDetailed={pageData.summaryDetailed}
          stats={pageData.stats}
        />
      )}
    </div>
  )
}
