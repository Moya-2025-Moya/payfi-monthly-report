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
      <div className="space-y-4">
        {narratives.slice(0, 3).map((n, idx) => (
          <div key={idx} className="narrative-card">
            {/* Top accent bar */}
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}40)` }} />

            <div className="px-5 py-5">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-3">
                <h3 className="text-[17px] font-bold leading-tight" style={{ color: 'var(--fg-title)', letterSpacing: '-0.01em' }}>
                  {n.topic}
                </h3>
                {n.weekCount && n.weekCount > 1 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                    color: ACCENT,
                    background: `${ACCENT}0d`,
                    border: `1px solid ${ACCENT}20`,
                  }}>
                    第{n.weekCount}周
                  </span>
                )}
              </div>

              {isV13(n) ? (
                <>
                  {/* V13: Summary */}
                  <p className="text-[14px] leading-[1.75] mb-4" style={{ color: 'var(--fg-body)' }}>
                    {n.summary}
                  </p>

                  {/* V13: Timeline */}
                  <TimelineGrouped events={n.events!} />

                  {/* V13: Upcoming */}
                  {n.upcoming && n.upcoming.filter(u => u.type === 'confirmed').length > 0 && (
                    <div className="rounded-lg mb-2" style={{
                      background: 'var(--surface-alt)',
                      padding: '12px 16px',
                    }}>
                      <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-2.5" style={{ color: 'var(--warning)' }}>
                        前瞻
                      </p>
                      <div className="space-y-2">
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
                            <div key={ui} className="flex items-baseline gap-3 text-[12px]">
                              <span className="font-mono shrink-0 w-[40px] text-right" style={{ color: 'var(--fg-muted)' }}>
                                {fmtDate(u.date)}
                              </span>
                              <span className="flex-1 leading-[1.6]" style={{ color: 'var(--fg-body)' }}>
                                {u.title}
                              </span>
                              {sourceUrl && (
                                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                                  className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity">
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
                  {/* V12: Horizontal flow cards */}
                  <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                    {n.origin && (
                      <>
                        <FlowCard label="起点" text={n.origin} variant="origin" />
                        <Arrow />
                      </>
                    )}
                    {n.last_week && n.last_week !== '首次追踪' && (
                      <>
                        <FlowCard label="上周" text={n.last_week} variant="last" />
                        <Arrow />
                      </>
                    )}
                    <FlowCard label="本周" text={n.this_week ?? ''} variant="current" style={{ minWidth: '140px' }} />
                    {(n.next_week_watch || n.next_week) && (
                      <>
                        <Arrow dashed />
                        <FlowCard label="下周关注" text={n.next_week_watch || n.next_week || ''} variant="next" />
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Context (depth >= 1) */}
              {n.context && n.context.length > 0 && (
                <div className="depth-layer-1" data-depth={depth}>
                  <div className="mt-3 rounded-lg" style={{ background: 'var(--context-bg)', padding: '12px 16px' }}>
                    <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-2" style={{ color: 'var(--success)' }}>历史可比</p>
                    {n.context.map((c, ci) => (
                      <p key={ci} className="text-[12px] leading-[1.7]" style={{ color: 'var(--fg-secondary)' }}>
                        · {formatContextItem(c)}
                      </p>
                    ))}
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
                        <div key={fi} className="text-[13px] leading-[1.6]" style={{ color: 'var(--fg-secondary)' }}>
                          <span className="font-mono text-[11px] mr-2" style={{ color: 'var(--fg-muted)' }}>{f.date}</span>
                          <span>{f.content}</span>
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
