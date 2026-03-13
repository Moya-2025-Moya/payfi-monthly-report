import { getCurrentWeekNumber } from '@/db/client'
import { getWeeklyArchiveListEnhanced } from '@/lib/weekly-data'
import Link from 'next/link'

export const metadata = {
  title: '周报归档 — StablePulse',
  description: '稳定币行业周报历史归档',
}

function parseWeekDateRange(week: string): string | null {
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
  const fmt = (d: Date) => `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return `${fmt(monday)} - ${fmt(sunday)}`
}

export default async function WeeklyIndexPage() {
  const currentWeek = getCurrentWeekNumber()
  const weeks = await getWeeklyArchiveListEnhanced()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--fg-title)' }}>
          周报归档
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--fg-muted)' }}>
          所有历史周报
        </p>
      </div>

      {weeks.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>暂无历史周报</p>
      ) : (
        <div className="space-y-2">
          {weeks.map(w => {
            const isCurrent = w.week === currentWeek
            const dateRange = parseWeekDateRange(w.week)
            return (
              <Link key={w.week} href={`/weekly/${w.week}`}
                className="block px-4 py-3 rounded-lg border transition-colors hover:border-[var(--accent-muted)]"
                style={{
                  borderColor: isCurrent ? 'var(--accent-muted)' : 'var(--border)',
                  background: 'var(--surface)',
                }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-medium" style={{ color: 'var(--fg-title)' }}>
                      {dateRange || w.week}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>{w.week}</span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        本周
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                    {w.narrativeCount > 0 && <span>{w.narrativeCount} 叙事</span>}
                    {w.factCount > 0 && <span>{w.factCount} 事实</span>}
                  </div>
                </div>

                {/* One-liner preview */}
                {w.oneLiner && (
                  <p className="text-[13px] mt-1 line-clamp-1" style={{ color: 'var(--fg-secondary)' }}>
                    {w.oneLiner}
                  </p>
                )}

                {/* Narrative topic badges */}
                {w.narrativeTopics && w.narrativeTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {w.narrativeTopics.map((topic, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ color: '#2563eb', background: 'rgba(37,99,235,0.06)' }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
