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

  const orderedWeeks = weeks.map(w => w.week).reverse()

  return (
    <div className="max-w-[740px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-[5px] h-[18px] rounded-full" style={{ background: 'var(--accent)' }} />
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--fg-title)', letterSpacing: '-0.02em' }}>
            周报归档
          </h1>
        </div>
        <p className="text-[13px] ml-[17px]" style={{ color: 'var(--fg-muted)' }}>
          {weeks.length} 周历史数据
        </p>
      </div>

      {/* Narrative Continuity Chart */}
      {continuityTopics.length > 0 && (
        <div className="mb-8 card-elevated px-5 py-5">
          <p className="section-label mb-4">
            叙事追踪线
          </p>
          <div className="space-y-2.5">
            {continuityTopics.map(([topic, topicWeeks], i) => {
              const color = CONTINUITY_COLORS[i % CONTINUITY_COLORS.length]
              return (
                <div key={topic} className="flex items-center gap-3">
                  <span className="text-[11px] font-medium w-32 shrink-0 truncate" style={{ color }} title={topic}>
                    {topic}
                  </span>
                  <div className="flex-1 flex gap-[3px]">
                    {orderedWeeks.map(w => {
                      const active = topicWeeks.includes(w)
                      return (
                        <div key={w} className="flex-1 h-[10px]" title={`${w}${active ? ' ●' : ''}`}
                          style={{
                            background: active ? color : 'var(--surface-alt)',
                            opacity: active ? 1 : 0.4,
                            minWidth: '8px',
                            borderRadius: '2px',
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
          <div className="flex justify-between mt-3 text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>
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
                className="block card-elevated px-5 py-4 transition-all hover:translate-y-[-1px]"
                style={isCurrent ? { borderColor: 'var(--accent-muted)' } : {}}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--fg-title)' }}>
                      {dateRange || w.week}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>{w.week}</span>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
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

                {w.oneLiner && (
                  <p className="text-[13px] mt-1 line-clamp-1 leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                    {w.oneLiner}
                  </p>
                )}

                {w.narrativeTopics && w.narrativeTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {w.narrativeTopics.map((topic, i) => {
                      const contIdx = continuityTopics.findIndex(([t]) => t === topic)
                      const color = contIdx >= 0 ? CONTINUITY_COLORS[contIdx % CONTINUITY_COLORS.length] : undefined
                      return (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            color: color ?? 'var(--info)',
                            background: color ? `${color}0d` : 'var(--info-soft)',
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
