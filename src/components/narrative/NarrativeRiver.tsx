'use client'

import { useState } from 'react'
import { useDepth } from '@/components/depth/DepthProvider'

// Context can be string[] (legacy) or {event, detail}[] (V12+)
type ContextItem = string | { event: string; detail: string }

function formatContextItem(c: ContextItem): string {
  if (typeof c === 'string') return c
  return `${c.event}: ${c.detail}`
}

// V13 types
interface V13Event {
  date: string; title: string; description: string
  significance: 'high' | 'medium' | 'low'
  isExternal?: boolean; externalUrl?: string; sourceUrl?: string
}

interface DateGroup {
  date: string
  primary: V13Event[]   // high significance — full size
  secondary: V13Event[] // medium significance — sub-items
  collapsed: V13Event[] // low significance — hidden behind "+N条"
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
  // Pass 1: per-group — max 1 primary per date
  for (const group of map.values()) {
    if (group.primary.length === 0 && group.secondary.length > 0) {
      group.primary.push(group.secondary.shift()!)
    }
    if (group.primary.length > 1) {
      group.secondary.unshift(...group.primary.splice(1))
    }
  }

  // Pass 2: global — max 2 primary across entire timeline
  const groups = [...map.values()]
  let totalPrimary = groups.reduce((n, g) => n + g.primary.length, 0)
  if (totalPrimary > 2) {
    // Keep first and last group's primary, demote the rest
    for (let i = 1; i < groups.length - 1 && totalPrimary > 2; i++) {
      if (groups[i].primary.length > 0) {
        groups[i].secondary.unshift(...groups[i].primary.splice(0))
        totalPrimary--
      }
    }
    // If still > 2, demote from end
    for (let i = groups.length - 1; i >= 0 && totalPrimary > 2; i--) {
      while (groups[i].primary.length > 0 && totalPrimary > 2) {
        groups[i].secondary.unshift(groups[i].primary.pop()!)
        totalPrimary--
      }
    }
  }

  return groups
}
interface V13Upcoming {
  date: string; title: string; description: string
  type: 'confirmed' | 'prediction'; source?: string
}

// Union narrative type supporting both v12 and v13
interface NarrativeData {
  topic: string
  // v12 fields
  last_week?: string
  this_week?: string
  origin?: string
  timeline?: string
  next_week?: string
  next_week_watch?: string
  // v13 fields
  summary?: string
  events?: V13Event[]
  upcoming?: V13Upcoming[]
  // shared
  context?: ContextItem[]
  weekCount?: number
  facts?: { content: string; date: string; tags?: string[]; source_url?: string }[]
}

interface NarrativeRiverProps {
  narratives: NarrativeData[]
}

const COLOR = {
  narrative: '#2563eb',
  context: '#059669',
  narrativeBg: 'rgba(37,99,235,0.06)',
} as const

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
    <div className="relative pl-4 mb-2" style={{ borderLeft: '2px solid var(--border)' }}>
      {groups.map((group, gi) => (
        <div key={gi} className={`relative ${gi < groups.length - 1 ? 'pb-2' : ''}`}>
          {/* Date label + primary events */}
          {group.primary.map((evt, i) => (
            <div key={`p-${i}`} className="relative pb-1.5">
              <div className="absolute -left-[calc(1rem+5px)] top-[6px] w-[8px] h-[8px] rounded-full"
                style={{ background: COLOR.narrative }} />
              <div className="flex items-baseline gap-2">
                {i === 0 && (
                  <span className="text-[12px] font-mono shrink-0" style={{ color: 'var(--fg-muted)' }}>
                    {evt.date.slice(5)}
                  </span>
                )}
                {i > 0 && <span className="w-[3.5ch] shrink-0" />}
                <span className="text-[13px] font-semibold" style={{ color: 'var(--fg-title)' }}>
                  {evt.title}
                  {evt.isExternal && (
                    <span className="text-[10px] ml-1 px-1 py-0.5 rounded"
                      style={{ color: 'var(--fg-muted)', background: 'var(--surface-alt)' }}>外部</span>
                  )}
                </span>
              </div>
            </div>
          ))}

          {/* Secondary events (medium) — indented, smaller */}
          {group.secondary.map((evt, i) => (
            <div key={`s-${i}`} className="relative pb-1 pl-[3.5ch]">
              <div className="absolute -left-[calc(1rem+5px)] top-[5px] w-[6px] h-[6px] rounded-full"
                style={{ background: 'transparent', border: '1.5px solid var(--fg-muted)' }} />
              <div className="flex items-baseline gap-2">
                {group.primary.length === 0 && i === 0 && (
                  <span className="text-[12px] font-mono shrink-0 -ml-[3.5ch]" style={{ color: 'var(--fg-muted)' }}>
                    {evt.date.slice(5)}
                  </span>
                )}
                <span className="text-[12px]" style={{ color: 'var(--fg-secondary)' }}>
                  {evt.title}
                  {evt.isExternal && (
                    <span className="text-[10px] ml-1 px-1 py-0.5 rounded"
                      style={{ color: 'var(--fg-muted)', background: 'var(--surface-alt)' }}>外部</span>
                  )}
                </span>
              </div>
            </div>
          ))}

          {/* Collapsed events (low) — hidden behind "+N条" */}
          {group.collapsed.length > 0 && (
            <>
              <button
                onClick={() => toggleCollapsed(group.date)}
                className="pl-[3.5ch] text-[11px] transition-colors"
                style={{ color: 'var(--fg-muted)' }}
              >
                {expandedDates.has(group.date)
                  ? '收起'
                  : `+${group.collapsed.length}条`}
              </button>
              {expandedDates.has(group.date) && group.collapsed.map((evt, i) => (
                <div key={`c-${i}`} className="relative pb-1 pl-[3.5ch]">
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
      <h2 className="text-[12px] font-semibold tracking-wider uppercase mb-4" style={{ color: COLOR.narrative }}>
        叙事追踪
      </h2>
      <div className="space-y-4">
        {narratives.slice(0, 3).map((n, idx) => (
          <div key={idx} className="rounded-lg border" style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            borderLeft: `3px solid ${COLOR.narrative}`,
          }}>
            <div className="px-5 py-4">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-[18px] font-bold" style={{ color: 'var(--fg-title)' }}>
                  {n.topic}
                </h3>
                {n.weekCount && n.weekCount > 1 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: COLOR.narrative, background: COLOR.narrativeBg }}>
                    第{n.weekCount}周
                  </span>
                )}
              </div>

              {isV13(n) ? (
                <>
                  {/* V13: Summary */}
                  <p className="text-[14px] leading-relaxed mb-2" style={{ color: 'var(--fg-body)' }}>
                    {n.summary}
                  </p>

                  {/* V13: Timeline events — grouped by date, B+D hierarchy */}
                  <TimelineGrouped events={n.events!} />

                  {/* V13: Upcoming */}
                  {n.upcoming && n.upcoming.length > 0 && (
                    <div className="rounded-r mb-2" style={{
                      borderLeft: '3px solid var(--warning, #f59e0b)',
                      background: 'var(--surface-alt)',
                      padding: '8px 12px',
                    }}>
                      <p className="text-[10px] font-medium tracking-wider uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>前瞻</p>
                      {n.upcoming.map((u, ui) => (
                        <div key={ui} className="text-[12px] flex gap-2">
                          {u.type === 'confirmed' && (
                            <span className="font-mono shrink-0" style={{ color: 'var(--fg-muted)' }}>{u.date.slice(5)}</span>
                          )}
                          <span style={{ color: 'var(--fg-body)' }}>
                            {u.title}
                            {u.type === 'confirmed' && (
                              <span className="text-[9px] ml-1 px-1 rounded"
                                style={{ color: 'var(--success, #22c55e)', background: 'var(--success-soft, #f0fdf4)' }}>
                                已确认
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
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
                  <div className="mt-2 mb-2 pl-3 py-2 rounded" style={{ background: 'rgba(5,150,105,0.05)' }}>
                    <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: COLOR.context }}>历史可比</p>
                    {n.context.map((c, ci) => (
                      <p key={ci} className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                        · {formatContextItem(c)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Expandable facts */}
              {n.facts && n.facts.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpanded(expanded === idx ? null : idx)}
                    className="text-[11px] font-medium transition-colors"
                    style={{ color: 'var(--accent)' }}>
                    {expanded === idx ? '收起来源' : `查看 ${n.facts.length} 条来源事实`}
                  </button>
                  {expanded === idx && (
                    <div className="mt-2 pl-3 border-l space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                      {n.facts.map((f, fi) => (
                        <div key={fi} className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>
                          <span className="font-mono mr-2">{f.date}</span>
                          <span>{f.content}</span>
                          {f.source_url && (
                            <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                              className="ml-1 text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
                              [来源]
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
    <div className="flex items-center shrink-0" style={{ color: dashed ? 'var(--fg-muted)' : 'var(--border-hover)' }}>
      <svg width="24" height="12" viewBox="0 0 24 12">
        <path d="M0 6h20m0 0l-4-4m4 4l-4 4" fill="none" stroke="currentColor"
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
    current: { borderColor: COLOR.narrative, background: COLOR.narrativeBg, borderWidth: '2px' },
    next: { borderColor: 'var(--border)', borderStyle: 'dashed' },
  }
  const labelColor = variant === 'current' ? COLOR.narrative : 'var(--fg-muted)'
  const textColor = variant === 'current' ? 'var(--fg-title)' : variant === 'next' ? 'var(--fg-muted)' : 'var(--fg-secondary)'

  return (
    <div className="shrink-0 px-3 py-2 rounded-md border text-[12px]"
      style={{ ...styles[variant], minWidth: '120px', ...customStyle }}>
      <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: labelColor }}>{label}</p>
      <p className={variant === 'current' ? 'font-medium' : ''} style={{ color: textColor }}>{text}</p>
    </div>
  )
}
