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

interface DateGroup {
  date: string
  primary: V13Event[]
  secondary: V13Event[]
  collapsed: V13Event[]
}

function groupEventsByDate(events: V13Event[]): DateGroup[] {
  const map = new Map<string, DateGroup>()
  for (const evt of events) {
    let group = map.get(evt.date)
    if (!group) {
      group = { date: evt.date, primary: [], secondary: [], collapsed: [] }
      map.set(evt.date, group)
    }
    if (evt.significance === 'high') group.primary.push(evt)
    else if (evt.significance === 'medium') group.secondary.push(evt)
    else group.collapsed.push(evt)
  }
  const groups = [...map.values()]

  let foundPrimary = false
  for (const group of groups) {
    if (!foundPrimary && group.primary.length > 0) {
      if (group.primary.length > 1) {
        group.secondary.unshift(...group.primary.splice(1))
      }
      foundPrimary = true
    } else if (foundPrimary && group.primary.length > 0) {
      group.secondary.unshift(...group.primary.splice(0))
    }
  }

  if (!foundPrimary) {
    for (const group of groups) {
      if (group.secondary.length > 0) {
        group.primary.push(group.secondary.shift()!)
        break
      }
    }
  }

  return groups
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

function TimelineGrouped({ events }: { events: V13Event[] }) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const groups = groupEventsByDate(events)

  function toggleCollapsed(date: string) {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  return (
    <div className="relative pl-5 mb-2" style={{ borderLeft: '2px solid var(--border)' }}>
      {groups.map((group, gi) => (
        <div key={gi} className={`relative ${gi < groups.length - 1 ? 'pb-4' : ''}`}>
          {/* Timeline node */}
          <div className="absolute -left-[calc(1.25rem+5px)] top-[7px] w-[8px] h-[8px] rounded-full"
            style={{
              background: group.primary.length > 0 ? ACCENT : 'var(--border-hover)',
              boxShadow: group.primary.length > 0 ? `0 0 0 3px ${ACCENT}20` : 'none',
            }} />

          {/* Date */}
          <span className="text-[11px] font-mono tracking-wide" style={{ color: 'var(--fg-muted)' }}>
            {group.date.slice(5)}
          </span>

          {/* Primary event */}
          {group.primary.map((evt, i) => (
            <div key={`p-${i}`} className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold leading-[1.6]" style={{ color: 'var(--fg-title)' }}>
                {evt.title}
              </span>
              {(evt.sourceUrl || evt.externalUrl) && (
                <a href={evt.sourceUrl || evt.externalUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity">
                  ↗
                </a>
              )}
            </div>
          ))}

          {/* Secondary events */}
          {group.secondary.map((evt, i) => (
            <div key={`s-${i}`} className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className="text-[12px] leading-[1.6]" style={{ color: 'var(--fg-secondary)' }}>
                {evt.title}
              </span>
              {(evt.sourceUrl || evt.externalUrl) && (
                <a href={evt.sourceUrl || evt.externalUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity">
                  ↗
                </a>
              )}
            </div>
          ))}

          {/* Collapsed events */}
          {group.collapsed.length > 0 && (
            <>
              <button
                onClick={() => toggleCollapsed(group.date)}
                className="mt-1 text-[11px] font-medium transition-colors"
                style={{ color: 'var(--fg-muted)' }}
              >
                {expandedDates.has(group.date)
                  ? '收起'
                  : `+${group.collapsed.length}条`}
              </button>
              {expandedDates.has(group.date) && group.collapsed.map((evt, i) => (
                <div key={`c-${i}`} className="mt-0.5">
                  <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                    {evt.title}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  )
}

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
        {narratives.slice(0, 3).map((n, idx) => (
          <div key={idx} className="narrative-card">
            {/* Header bar with topic + week badge */}
            <div style={{
              padding: '16px 20px 14px',
              borderBottom: '1px solid var(--border)',
              background: `linear-gradient(135deg, ${ACCENT}06, transparent)`,
            }}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[16px] font-bold leading-snug" style={{ color: 'var(--fg-title)', letterSpacing: '-0.01em' }}>
                  {n.topic}
                </h3>
                {n.weekCount && n.weekCount > 1 && (
                  <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{
                    color: ACCENT,
                    background: `${ACCENT}0d`,
                    border: `1px solid ${ACCENT}20`,
                    whiteSpace: 'nowrap',
                  }}>
                    第{n.weekCount}周
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 20px 20px' }}>
              {isV13(n) ? (
                <>
                  {/* V13: Summary */}
                  {n.summary && (
                    <p className="text-[13.5px] leading-[1.8] mb-5" style={{ color: 'var(--fg-secondary)' }}>
                      {n.summary}
                    </p>
                  )}

                  {/* V13: This week highlight */}
                  {n.this_week && (
                    <div className="mb-5 rounded-lg" style={{
                      padding: '14px 16px',
                      background: `${ACCENT}06`,
                      borderLeft: `3px solid ${ACCENT}`,
                    }}>
                      <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-1.5" style={{ color: ACCENT }}>
                        本周进展
                      </p>
                      <p className="text-[13.5px] leading-[1.7] font-medium" style={{ color: 'var(--fg-title)' }}>
                        {n.this_week}
                      </p>
                    </div>
                  )}

                  {/* V13: Timeline */}
                  <TimelineGrouped events={n.events!} />

                  {/* V13: Upcoming */}
                  {n.upcoming && n.upcoming.filter(u => u.type === 'confirmed').length > 0 && (
                    <div className="mt-4 rounded-lg" style={{
                      background: 'var(--surface-alt)',
                      padding: '14px 16px',
                    }}>
                      <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-3" style={{ color: 'var(--warning)' }}>
                        前瞻
                      </p>
                      <div className="space-y-2.5">
                        {n.upcoming.filter(u => u.type === 'confirmed').map((u, ui) => {
                          const sourceUrl = u.source && /^https?:\/\//.test(u.source) ? u.source : undefined
                          const fmtDate = (d: string) => {
                            const m = d.match(/^\d{4}-(\d{2})-(\d{2})$/)
                            if (m) return `${parseInt(m[1])}/${parseInt(m[2])}`
                            const m2 = d.match(/^\d{4}-(\d{2})$/)
                            if (m2) return `${parseInt(m2[1])}月`
                            return d
                          }
                          return (
                            <div key={ui} className="flex items-start gap-3 text-[12.5px]">
                              <span className="font-mono shrink-0 min-w-[52px] text-right pt-[1px]" style={{ color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                                {fmtDate(u.date)}
                              </span>
                              <span className="flex-1 leading-[1.65] break-words" style={{ color: 'var(--fg-body)' }}>
                                {u.title}
                              </span>
                              {sourceUrl && (
                                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                                  className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity pt-[1px]">
                                  ↗
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* V12: Vertical flow instead of horizontal to prevent narrow columns */}
                  <div className="space-y-0">
                    {n.origin && (
                      <div className="relative pl-5 pb-4" style={{ borderLeft: `2px solid var(--border)` }}>
                        <div className="absolute -left-[5px] top-[6px] w-[8px] h-[8px] rounded-full" style={{ background: 'var(--border-hover)' }} />
                        <p className="text-[10px] font-semibold tracking-[0.05em] uppercase mb-0.5" style={{ color: 'var(--fg-muted)' }}>起点</p>
                        <p className="text-[13px] leading-[1.65]" style={{ color: 'var(--fg-secondary)' }}>{n.origin}</p>
                      </div>
                    )}
                    {n.last_week && n.last_week !== '首次追踪' && (
                      <div className="relative pl-5 pb-4" style={{ borderLeft: `2px solid var(--border)` }}>
                        <div className="absolute -left-[5px] top-[6px] w-[8px] h-[8px] rounded-full" style={{ background: 'var(--border-hover)' }} />
                        <p className="text-[10px] font-semibold tracking-[0.05em] uppercase mb-0.5" style={{ color: 'var(--fg-muted)' }}>上周</p>
                        <p className="text-[13px] leading-[1.65]" style={{ color: 'var(--fg-secondary)' }}>{n.last_week}</p>
                      </div>
                    )}
                    <div className="relative pl-5 pb-4" style={{ borderLeft: `2px solid ${ACCENT}` }}>
                      <div className="absolute -left-[5px] top-[6px] w-[8px] h-[8px] rounded-full" style={{ background: ACCENT, boxShadow: `0 0 0 3px ${ACCENT}20` }} />
                      <p className="text-[10px] font-semibold tracking-[0.05em] uppercase mb-0.5" style={{ color: ACCENT }}>本周</p>
                      <p className="text-[13.5px] leading-[1.65] font-medium" style={{ color: 'var(--fg-title)' }}>{n.this_week ?? ''}</p>
                    </div>
                    {(n.next_week_watch || n.next_week) && (
                      <div className="relative pl-5" style={{ borderLeft: '2px dashed var(--border)' }}>
                        <div className="absolute -left-[5px] top-[6px] w-[8px] h-[8px] rounded-full border-2" style={{ borderColor: 'var(--border-hover)', background: 'var(--surface)' }} />
                        <p className="text-[10px] font-semibold tracking-[0.05em] uppercase mb-0.5" style={{ color: 'var(--fg-muted)' }}>下周关注</p>
                        <p className="text-[13px] leading-[1.65]" style={{ color: 'var(--fg-muted)' }}>{n.next_week_watch || n.next_week || ''}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Context (depth >= 1) */}
              {n.context && n.context.length > 0 && (
                <div className="depth-layer-1" data-depth={depth}>
                  <div className="mt-4 rounded-lg" style={{ background: 'var(--context-bg)', padding: '14px 16px' }}>
                    <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-2.5" style={{ color: 'var(--success)' }}>历史可比</p>
                    <div className="space-y-1.5">
                      {n.context.map((c, ci) => (
                        <p key={ci} className="text-[12.5px] leading-[1.7] break-words" style={{ color: 'var(--fg-secondary)' }}>
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
                    <div className="mt-3 pl-3 border-l-2 space-y-2.5" style={{ borderColor: 'var(--border)' }}>
                      {n.facts.map((f, fi) => (
                        <div key={fi} className="text-[13px] leading-[1.65]" style={{ color: 'var(--fg-secondary)' }}>
                          <span className="font-mono text-[11px] mr-2" style={{ color: 'var(--fg-muted)' }}>{f.date}</span>
                          <span className="break-words">{f.content}</span>
                          {f.source_url && (
                            <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                              className="ml-1.5 text-[11px] hover:underline" style={{ color: ACCENT }}>
                              ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── V12 Flow Card Components ── */

function Arrow({ dashed }: { dashed?: boolean }) {
  return (
    <div className="flex items-center shrink-0 px-1" style={{ color: dashed ? 'var(--fg-muted)' : 'var(--border-hover)' }}>
      <svg width="20" height="12" viewBox="0 0 20 12">
        <path d="M0 6h16m0 0l-3.5-3.5m3.5 3.5l-3.5 3.5" fill="none" stroke="currentColor"
          strokeWidth={dashed ? '1' : '1.5'}
          {...(dashed ? { strokeDasharray: '3 3' } : {})} />
      </svg>
    </div>
  )
}

function FlowCard({ label, text, variant, style: customStyle }: {
  label: string
  text: string
  variant: 'origin' | 'last' | 'current' | 'next'
  style?: React.CSSProperties
}) {
  const styles: Record<string, React.CSSProperties> = {
    origin: { borderColor: 'var(--border)', background: 'var(--surface-alt)' },
    last: { borderColor: 'var(--border)', background: 'var(--surface-alt)' },
    current: { borderColor: ACCENT, background: `${ACCENT}08`, borderWidth: '2px' },
    next: { borderColor: 'var(--border)', borderStyle: 'dashed' },
  }
  const labelColor = variant === 'current' ? ACCENT : 'var(--fg-muted)'
  const textColor = variant === 'current' ? 'var(--fg-title)' : variant === 'next' ? 'var(--fg-muted)' : 'var(--fg-secondary)'

  return (
    <div className="shrink-0 px-3 py-2.5 rounded-lg border text-[12px]"
      style={{ ...styles[variant], minWidth: '120px', ...customStyle }}>
      <p className="text-[10px] font-semibold tracking-[0.05em] uppercase mb-0.5" style={{ color: labelColor }}>{label}</p>
      <p className={`leading-[1.5] ${variant === 'current' ? 'font-medium' : ''}`} style={{ color: textColor }}>{text}</p>
    </div>
  )
}
