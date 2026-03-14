'use client'

import { useState } from 'react'
import { useDepth } from '@/components/depth/DepthProvider'

type ContextItem = string | { event: string; detail: string }

function dedup(text: string): string {
  return text.replace(/(\([^)]*\))\s*(\([^)]*\))/g, (_match, a: string, b: string) => {
    const isDateParen = (s: string) => /\d{4}/.test(s)
    if (!isDateParen(a) || !isDateParen(b)) return `${a} ${b}`
    return a.length >= b.length ? a : b
  })
}

function formatContextItem(c: ContextItem): string {
  if (typeof c === 'string') return dedup(c)
  return dedup(`${c.event}，${c.detail}`)
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

function fmtDate(d: string): string {
  const m = d.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (m) return `${parseInt(m[1])}月${parseInt(m[2])}日`
  const m2 = d.match(/^\d{4}-(\d{2})$/)
  if (m2) return `${parseInt(m2[1])}月`
  const m3 = d.match(/^\d{4}-(Q\d)$/)
  if (m3) return m3[1]
  return d
}

/* ── Visual Timeline with nodes ── */

function VisualTimeline({ events, upcoming }: { events: V13Event[]; upcoming?: V13Upcoming[] }) {
  const confirmedUpcoming = (upcoming ?? []).filter(u =>
    u.type === 'confirmed' && u.source && /^https?:\/\//.test(u.source)
  )

  interface EventItem {
    title: string
    significance: 'high' | 'medium' | 'low'
    isFuture: boolean
    sourceUrl?: string
  }

  interface DateGroup {
    date: string
    items: EventItem[]
    hasHigh: boolean
    isFuture: boolean
  }

  // Collect all items
  const allItems: (EventItem & { date: string })[] = [
    ...events.map(e => ({
      date: e.date,
      title: e.title,
      significance: e.significance,
      isFuture: false,
      sourceUrl: e.sourceUrl || e.externalUrl,
    })),
    ...confirmedUpcoming.map(u => ({
      date: u.date,
      title: u.title,
      significance: 'medium' as const,
      isFuture: true,
      sourceUrl: u.source,
    })),
  ]

  // Group by date
  const groupMap = new Map<string, DateGroup>()
  for (const item of allItems) {
    let group = groupMap.get(item.date)
    if (!group) {
      group = { date: item.date, items: [], hasHigh: false, isFuture: item.isFuture }
      groupMap.set(item.date, group)
    }
    // Dedup by title within same date
    if (group.items.some(i => i.title === item.title)) continue
    group.items.push(item)
    if (item.significance === 'high') group.hasHigh = true
    if (item.isFuture) group.isFuture = true
  }

  const groups = [...groupMap.values()].sort((a, b) => a.date.localeCompare(b.date))
  if (groups.length === 0) return null

  return (
    <div className="relative pl-5">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-[6px] bottom-[6px] w-[2px]" style={{
        background: 'linear-gradient(to bottom, var(--border), var(--accent-muted, var(--border)))',
      }} />

      <div className="space-y-0">
        {groups.map((group, gi) => {
          const isLast = gi === groups.length - 1

          return (
            <div key={gi} className="relative flex gap-3" style={{
              paddingBottom: isLast ? '0' : '16px',
            }}>
              {/* Node dot */}
              <div className="absolute shrink-0" style={{
                left: '-17px',
                top: '5px',
                width: group.hasHigh ? '10px' : '8px',
                height: group.hasHigh ? '10px' : '8px',
                borderRadius: '50%',
                background: group.isFuture
                  ? 'transparent'
                  : group.hasHigh
                    ? ACCENT
                    : 'var(--fg-muted)',
                border: group.isFuture
                  ? '2px dashed var(--fg-muted)'
                  : group.hasHigh
                    ? `2px solid ${ACCENT}`
                    : '2px solid var(--fg-muted)',
                marginLeft: group.hasHigh ? '-1px' : '0',
              }} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 text-[11px] font-mono" style={{
                    color: group.isFuture ? 'var(--warning)' : 'var(--fg-muted)',
                  }}>
                    {fmtDate(group.date)}
                  </span>
                  {group.isFuture && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{
                      color: 'var(--warning)',
                      background: 'var(--surface-alt)',
                    }}>
                      前瞻
                    </span>
                  )}
                </div>
                {group.items.map((item, ii) => {
                  const isHigh = item.significance === 'high'
                  return (
                    <div key={ii} className="flex items-baseline justify-between gap-2 mt-0.5">
                      <p className={`flex-1 text-[13px] leading-[1.6] break-words ${isHigh ? 'font-medium' : ''}`} style={{
                        color: isHigh ? 'var(--fg-title)' : 'var(--fg-secondary)',
                      }}>
                        {item.title}
                      </p>
                      {item.sourceUrl && (
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity">↗</a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
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

          // Build timeline nodes from facts for V12 narratives
          const hasTimeline = v13 || (n.facts && n.facts.length >= 2)

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
                  /* V13: Visual timeline with nodes + upcoming merged */
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
                      时间线
                    </p>
                    <VisualTimeline events={n.events!} upcoming={n.upcoming} />
                  </div>
                ) : hasTimeline && n.facts ? (
                  /* V12 with facts: build timeline from facts */
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
                      时间线
                    </p>
                    <VisualTimeline
                      events={n.facts.slice(0, 8).map(f => ({
                        date: f.date,
                        title: f.content,
                        description: f.content,
                        significance: 'medium' as const,
                        sourceUrl: f.source_url,
                      }))}
                    />
                  </div>
                ) : (
                  /* V12 without timeline: vertical progress */
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

                {/* Expandable facts (only show if no timeline, to avoid duplication) */}
                {n.facts && n.facts.length > 0 && !hasTimeline && (
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
