'use client'

import { useState } from 'react'
import { useDepth } from '@/components/depth/DepthProvider'

type ContextItem = string | { event: string; detail: string }

function formatContextItem(c: ContextItem): string {
  if (typeof c === 'string') return c
  return `${c.event}: ${c.detail}`
}

interface V13Event {
  date: string; title: string; description: string
  significance: 'high' | 'medium' | 'low'
  isExternal?: boolean; externalUrl?: string; sourceUrl?: string
}

interface V13Upcoming {
  date: string; title: string; description: string
  type: 'confirmed' | 'prediction'; source?: string
}

interface NarrativeData {
  topic: string
  last_week?: string
  this_week?: string
  origin?: string
  timeline?: string
  next_week?: string
  next_week_watch?: string
  summary?: string
  events?: V13Event[]
  upcoming?: V13Upcoming[]
  context?: ContextItem[]
  weekCount?: number
  facts?: { content: string; date: string; tags?: string[]; source_url?: string }[]
}

interface NarrativeRiverProps {
  narratives: NarrativeData[]
}

const ACCENT = '#2563eb'

function isV13(n: NarrativeData): boolean {
  return Array.isArray(n.events) && n.events.length > 0
}

/* ── Parse semicolon-separated upcoming string into items ── */
function parseUpcomingString(str: string): { date: string; title: string }[] {
  return str.split(/;\s*/).filter(Boolean).map(item => {
    const m = item.match(/^(\d{4}-\d{2}-\d{2}|\d{4}-\d{2}|\d{4}-Q\d|[\d/]+月?):\s*(.+)$/)
    if (m) return { date: m[1], title: m[2].trim() }
    return { date: '', title: item.trim() }
  }).filter(u => u.title)
}

function fmtDate(d: string): string {
  const m = d.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (m) return `${parseInt(m[1])}/${parseInt(m[2])}`
  const m2 = d.match(/^\d{4}-(\d{2})$/)
  if (m2) return `${parseInt(m2[1])}月`
  return d
}

/* ── Compact Timeline ── */

function CompactTimeline({ events }: { events: V13Event[] }) {
  const [showAll, setShowAll] = useState(false)

  // Group by date
  const byDate = new Map<string, V13Event[]>()
  for (const evt of events) {
    const arr = byDate.get(evt.date) || []
    arr.push(evt)
    byDate.set(evt.date, arr)
  }
  const dates = [...byDate.entries()]

  // Show top 4 dates by default, expand for more
  const visible = showAll ? dates : dates.slice(0, 4)
  const hasMore = dates.length > 4

  return (
    <div className="space-y-1">
      {visible.map(([date, evts], di) => {
        const highEvt = evts.find(e => e.significance === 'high')
        const rest = evts.filter(e => e !== highEvt)

        return (
          <div key={di} className="flex gap-3 py-1.5" style={{ borderBottom: di < visible.length - 1 ? '1px solid var(--border)' : 'none' }}>
            {/* Date column */}
            <span className="shrink-0 w-[52px] text-right text-[11px] font-mono pt-[2px]" style={{ color: 'var(--fg-muted)' }}>
              {date.slice(5)}
            </span>
            {/* Events column */}
            <div className="flex-1 min-w-0">
              {highEvt && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium leading-[1.6]" style={{ color: 'var(--fg-title)' }}>
                    {highEvt.title}
                  </span>
                  {(highEvt.sourceUrl || highEvt.externalUrl) && (
                    <a href={highEvt.sourceUrl || highEvt.externalUrl} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity">↗</a>
                  )}
                </div>
              )}
              {rest.map((evt, i) => (
                <div key={i} className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] leading-[1.6]" style={{ color: 'var(--fg-secondary)' }}>
                    {evt.title}
                  </span>
                  {(evt.sourceUrl || evt.externalUrl) && (
                    <a href={evt.sourceUrl || evt.externalUrl} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity">↗</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {hasMore && !showAll && (
        <button onClick={() => setShowAll(true)}
          className="text-[11px] font-medium pt-1" style={{ color: ACCENT }}>
          展开全部 {dates.length} 天
        </button>
      )}
    </div>
  )
}

/* ── Upcoming List (handles both array and semicolon string) ── */

function UpcomingList({ upcoming, watchStr }: { upcoming?: V13Upcoming[]; watchStr?: string }) {
  // Merge: prefer structured upcoming array, fallback to parsing the string
  const confirmedArr = (upcoming ?? []).filter(u => u.type === 'confirmed')
  const predictionArr = (upcoming ?? []).filter(u => u.type === 'prediction')
  const parsedFromStr = watchStr ? parseUpcomingString(watchStr) : []

  // Use structured data if available, otherwise parsed string
  const items = confirmedArr.length > 0 || predictionArr.length > 0
    ? [...confirmedArr.map(u => ({ date: u.date, title: u.title, type: 'confirmed' as const })),
       ...predictionArr.map(u => ({ date: u.date, title: u.title, type: 'prediction' as const }))]
    : parsedFromStr.map(u => ({ ...u, type: 'prediction' as const }))

  if (items.length === 0) return null

  return (
    <div className="rounded-lg" style={{ background: 'var(--surface-alt)', padding: '12px 16px' }}>
      <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-2.5" style={{ color: 'var(--warning)' }}>
        前瞻
      </p>
      <div className="space-y-2">
        {items.map((u, i) => (
          <div key={i} className="flex items-start gap-3 text-[12.5px]">
            <span className="shrink-0 w-[52px] text-right font-mono pt-[1px]" style={{
              color: 'var(--fg-muted)', whiteSpace: 'nowrap', fontSize: '11px',
            }}>
              {fmtDate(u.date)}
            </span>
            <span className="flex-1 leading-[1.65] break-words" style={{
              color: 'var(--fg-body)',
              fontStyle: u.type === 'prediction' ? 'italic' : 'normal',
            }}>
              {u.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Component ── */

export function NarrativeRiver({ narratives }: NarrativeRiverProps) {
  const { depth } = useDepth()
  const [expanded, setExpanded] = useState<number | null>(null)

  if (narratives.length === 0) return null

  return (
    <div>
      <div className="section-divider">
        <span className="section-label" style={{ color: ACCENT }}>
          叙事追踪
          <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>
            {narratives.length}
          </span>
        </span>
      </div>
      <div className="space-y-5">
        {narratives.slice(0, 3).map((n, idx) => {
          const v13 = isV13(n)

          return (
            <div key={idx} className="narrative-card" style={{ overflow: 'hidden', borderRadius: '12px' }}>
              {/* ── Header ── */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
              }}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[16px] font-bold leading-snug" style={{ color: 'var(--fg-title)' }}>
                    {n.topic}
                  </h3>
                  {n.weekCount && n.weekCount > 1 && (
                    <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{
                      color: ACCENT, background: `${ACCENT}0d`, border: `1px solid ${ACCENT}20`, whiteSpace: 'nowrap',
                    }}>
                      第{n.weekCount}周
                    </span>
                  )}
                </div>
              </div>

              {/* ── Body ── */}
              <div style={{ padding: '16px 20px 20px' }}>
                {/* Summary */}
                {n.summary && (
                  <p className="text-[13px] leading-[1.85] mb-4" style={{ color: 'var(--fg-secondary)' }}>
                    {n.summary}
                  </p>
                )}

                {v13 ? (
                  <>
                    {/* V13: Compact timeline table */}
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>
                        事件线
                      </p>
                      <CompactTimeline events={n.events!} />
                    </div>

                    {/* V13: Upcoming / predictions */}
                    <div className="mb-4">
                      <UpcomingList upcoming={n.upcoming} watchStr={n.next_week_watch} />
                    </div>
                  </>
                ) : (
                  <>
                    {/* V12: Vertical progress */}
                    <div className="mb-4">
                      {[
                        n.origin && { label: '起点', text: n.origin, muted: true },
                        n.last_week && n.last_week !== '首次追踪' && { label: '上周', text: n.last_week, muted: true },
                        { label: '本周', text: n.this_week ?? '', accent: true },
                        (n.next_week_watch || n.next_week) && { label: '下周关注', text: n.next_week_watch || n.next_week || '', muted: true, dashed: true },
                      ].filter(Boolean).map((step, i) => {
                        const s = step as { label: string; text: string; muted?: boolean; accent?: boolean; dashed?: boolean }
                        return (
                          <div key={i} className="flex gap-3 py-2" style={{
                            borderBottom: '1px solid var(--border)',
                          }}>
                            <span className="shrink-0 w-[52px] text-right text-[10px] font-semibold tracking-[0.05em] uppercase pt-[3px]" style={{
                              color: s.accent ? ACCENT : 'var(--fg-muted)',
                            }}>
                              {s.label}
                            </span>
                            <p className={`flex-1 min-w-0 text-[13px] leading-[1.65] break-words ${s.accent ? 'font-medium' : ''}`} style={{
                              color: s.accent ? 'var(--fg-title)' : s.dashed ? 'var(--fg-muted)' : 'var(--fg-secondary)',
                            }}>
                              {s.text}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Context / 历史可比 */}
                {n.context && n.context.length > 0 && (
                  <div className="depth-layer-1" data-depth={depth}>
                    <div className="rounded-lg" style={{ background: 'var(--context-bg)', padding: '12px 16px' }}>
                      <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-2" style={{ color: 'var(--success)' }}>历史可比</p>
                      <div className="space-y-1">
                        {n.context.map((c, ci) => (
                          <p key={ci} className="text-[12px] leading-[1.7] break-words" style={{ color: 'var(--fg-secondary)' }}>
                            · {formatContextItem(c)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Expandable facts */}
                {n.facts && n.facts.length > 0 && (
                  <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => setExpanded(expanded === idx ? null : idx)}
                      className="text-[11px] font-medium transition-colors"
                      style={{ color: ACCENT }}>
                      {expanded === idx ? '收起来源' : `查看 ${n.facts.length} 条来源事实`}
                    </button>
                    {expanded === idx && (
                      <div className="mt-3 pl-3 border-l-2 space-y-2" style={{ borderColor: 'var(--border)' }}>
                        {n.facts.map((f, fi) => (
                          <div key={fi} className="text-[12px] leading-[1.65]" style={{ color: 'var(--fg-secondary)' }}>
                            <span className="font-mono text-[11px] mr-2" style={{ color: 'var(--fg-muted)' }}>{f.date}</span>
                            <span className="break-words">{f.content}</span>
                            {f.source_url && (
                              <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                                className="ml-1.5 text-[11px] hover:underline" style={{ color: ACCENT }}>↗</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
