import { getCurrentWeekNumber } from '@/db/client'
import { getWeeklyArchiveListEnhanced } from '@/lib/weekly-data'
import { formatWeekRange } from '@/lib/week-utils'
import Link from 'next/link'

export const metadata = {
  title: '周报归档 — StablePulse',
  description: '稳定币行业周报历史归档',
}

/** Build narrative continuity map: topic → list of weeks it appeared in */
function buildNarrativeContinuity(weeks: { week: string; narrativeTopics?: string[] }[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const w of weeks) {
    for (const topic of (w.narrativeTopics ?? [])) {
      const existing = map.get(topic) ?? []
      existing.push(w.week)
      map.set(topic, existing)
    }
  }
  // Only keep narratives that span 2+ weeks (those are the interesting ones)
  for (const [key, val] of map) {
    if (val.length < 2) map.delete(key)
  }
  return map
}

const CONTINUITY_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

export default async function WeeklyIndexPage() {
  const currentWeek = getCurrentWeekNumber()
  const weeks = await getWeeklyArchiveListEnhanced()
  const continuity = buildNarrativeContinuity(weeks)
  const continuityTopics = [...continuity.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)

  // Get ordered week list for the continuity chart
  const orderedWeeks = weeks.map(w => w.week).reverse() // oldest → newest

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--fg-title)' }}>
          周报归档
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--fg-muted)' }}>
          所有历史周报 · {weeks.length} 周
        </p>
      </div>

      {/* Narrative Continuity Chart */}
      {continuityTopics.length > 0 && (
        <div className="mb-8 px-4 py-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            叙事追踪线 · 跨周叙事
          </p>
          <div className="space-y-2">
            {continuityTopics.map(([topic, topicWeeks], i) => {
              const color = CONTINUITY_COLORS[i % CONTINUITY_COLORS.length]
              return (
                <div key={topic} className="flex items-center gap-3">
                  <span className="text-[11px] w-32 shrink-0 truncate" style={{ color }} title={topic}>
                    {topic}
                  </span>
                  <div className="flex-1 flex gap-0.5">
                    {orderedWeeks.map(w => {
                      const active = topicWeeks.includes(w)
                      return (
                        <div key={w} className="flex-1 h-3 rounded-sm" title={`${w}${active ? ' ●' : ''}`}
                          style={{
                            background: active ? color : 'var(--surface-alt)',
                            opacity: active ? 1 : 0.3,
                            minWidth: '8px',
                          }} />
                      )
                    })}
                  </div>
                  <span className="text-[10px] font-mono w-8 shrink-0 text-right" style={{ color: 'var(--fg-muted)' }}>
                    {topicWeeks.length}周
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            <span>{orderedWeeks[0]}</span>
            <span>{orderedWeeks[orderedWeeks.length - 1]}</span>
          </div>
        </div>
      )}

      {/* Weekly List */}
      {weeks.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>暂无历史周报</p>
      ) : (
        <div className="space-y-2">
          {weeks.map(w => {
            const isCurrent = w.week === currentWeek
            const dateRange = formatWeekRange(w.week)
            return (
              <Link key={w.week} href={`/weekly/${w.week}`}
                className="block px-4 py-3 rounded-lg border transition-colors hover:border-[var(--info-muted)]"
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
                    {w.narrativeTopics.map((topic, i) => {
                      // Color-code if this narrative spans multiple weeks
                      const contIdx = continuityTopics.findIndex(([t]) => t === topic)
                      const color = contIdx >= 0 ? CONTINUITY_COLORS[contIdx % CONTINUITY_COLORS.length] : undefined
                      return (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            color: color ?? 'var(--info)',
                            background: color ? `${color}12` : 'var(--info-soft)',
                          }}>
                          {topic}
                        </span>
                      )
                    })}
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
