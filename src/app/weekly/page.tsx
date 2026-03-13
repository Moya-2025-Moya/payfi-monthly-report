import { getCurrentWeekNumber } from '@/db/client'
import { getWeeklyArchiveList } from '@/lib/weekly-data'
import Link from 'next/link'

export const metadata = {
  title: '周报归档 — StablePulse',
  description: '稳定币行业周报历史归档',
}

export default async function WeeklyIndexPage() {
  const currentWeek = getCurrentWeekNumber()
  const weeks = await getWeeklyArchiveList()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[18px] font-bold" style={{ color: 'var(--fg-title)' }}>
          周报归档
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--fg-muted)' }}>
          所有历史周报
        </p>
      </div>

      {weeks.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>暂无历史周报</p>
      ) : (
        <div className="space-y-1">
          {weeks.map(w => {
            const isCurrent = w.week === currentWeek
            return (
              <Link key={w.week} href={`/weekly/${w.week}`}
                className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:border-[var(--accent-muted)]"
                style={{
                  borderColor: isCurrent ? 'var(--accent-muted)' : 'var(--border)',
                  background: 'var(--surface)',
                }}>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-mono font-medium" style={{ color: 'var(--fg-title)' }}>
                    {w.week}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      本周
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                  {w.narrativeCount > 0 && <span>{w.narrativeCount} 条叙事</span>}
                  {w.factCount > 0 && <span>{w.factCount} 条事实</span>}
                  <span>{new Date(w.generatedAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
