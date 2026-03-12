'use client'
import { useState, useRef } from 'react'
import type { AtomicFact, Note } from '@/lib/types'

const DEFAULT_USER_ID = 'default-user'

/* ── Fact type config: color bar + SVG icon ── */
const FACT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  event: {
    label: '事件', color: 'var(--info)',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" /></svg>,
  },
  metric: {
    label: '指标', color: 'var(--success)',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12l4-4 3 2 5-6" /><path d="M12 4h2v2" /></svg>,
  },
  quote: {
    label: '引述', color: '#8b5cf6',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity="0.7"><path d="M3 4h3v3H4.5C4.5 8.5 5 9.5 6 10v1.5C3.5 11 2 9 2 7V4h1zm7 0h3v3h-1.5c0 1.5.5 2.5 1.5 3v1.5C10.5 11 9 9 9 7V4h1z" /></svg>,
  },
  relationship: {
    label: '关系', color: '#06b6d4',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="4" cy="8" r="2" /><circle cx="12" cy="8" r="2" /><path d="M6 8h4" /></svg>,
  },
  status_change: {
    label: '状态变更', color: 'var(--warning)',
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6l4-4 4 4M4 10l4 4 4-4" /></svg>,
  },
}

const DEFAULT_TYPE_CONFIG = { label: '其他', color: 'var(--fg-muted)', icon: null }

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function getSourceUrls(fact: AtomicFact): string[] {
  const urls = new Set<string>()
  if (fact.source_url) urls.add(fact.source_url)
  const v2 = fact.v2_result as { source_urls?: string[] } | null
  if (v2?.source_urls) { for (const u of v2.source_urls) urls.add(u) }
  return [...urls]
}

function getVerificationIndicators(fact: AtomicFact): { label: string; detail?: string }[] {
  const indicators: { label: string; detail?: string }[] = []
  const v1 = fact.v1_result as { match_score?: number; status?: string } | null
  if (v1?.match_score != null && v1.match_score > 0) {
    indicators.push({ label: `原文${v1.match_score}%`, detail: `来源原文匹配度 ${v1.match_score}%` })
  } else if (v1?.status === 'source_unavailable' || (v1?.match_score != null && v1.match_score === 0)) {
    indicators.push({ label: '原文不可达', detail: '来源原文无法获取或解析' })
  }
  const v2 = fact.v2_result as { source_count?: number; independent_sources?: boolean } | null
  if (v2?.source_count != null && v2.source_count >= 2) {
    const indep = v2.independent_sources ? '独立' : ''
    indicators.push({ label: `${v2.source_count}${indep}源`, detail: `${v2.source_count} 个${indep ? '独立' : ''}信息源交叉验证` })
  }
  const v4 = fact.v4_result as { anchor_status?: string; deviation_pct?: number | null } | null
  if (v4?.anchor_status === 'anchored') {
    indicators.push({ label: '链上锚定', detail: '与链上实际数据匹配' })
  } else if (v4?.anchor_status === 'deviation' && v4.deviation_pct != null) {
    indicators.push({ label: `链上偏差${Math.abs(v4.deviation_pct).toFixed(0)}%`, detail: `与链上数据偏差 ${v4.deviation_pct}%` })
  }
  return indicators
}

function getContradiction(fact: AtomicFact): string | null {
  const v5 = fact.v5_result as { temporal_status?: string; conflict_detail?: string } | null
  if (v5?.temporal_status === 'conflict' && v5.conflict_detail) return v5.conflict_detail
  return null
}

/* ── Metric change arrow ── */
function MetricChangeArrow({ change }: { change: string }) {
  const isUp = change.startsWith('+') || change.startsWith('↑') || parseFloat(change) > 0
  const isDown = change.startsWith('-') || change.startsWith('↓') || parseFloat(change) < 0
  const color = isUp ? 'var(--success)' : isDown ? 'var(--danger)' : 'var(--fg-muted)'
  return (
    <span className="inline-flex items-center gap-0.5 text-[13px] font-mono font-medium" style={{ color }}>
      {isUp && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3m0 0L3 6m3-3l3 3" /></svg>}
      {isDown && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v6m0 0l3-3m-3 3L3 6" /></svg>}
      {change}
    </span>
  )
}

/* ── Extract speaker from quote content ── */
function extractSpeaker(content: string): { speaker: string | null; quote: string } {
  // Match patterns like "X 表示：'...'" or "X 认为：'...'" or "X 说：..." etc.
  const match = content.match(/^(.+?)\s*(表示|认为|指出|称|说|透露|强调|提到|预测|警告)[\s：:]+['"「]?(.+?)['"」]?$/)
  if (match) return { speaker: match[1].trim(), quote: match[3].trim() }
  // Fallback: try to find quoted text with attribution before it
  const match2 = content.match(/^(.+?)\s*[:：]\s*['"「](.+?)['"」]$/)
  if (match2) return { speaker: match2[1].trim(), quote: match2[2].trim() }
  return { speaker: null, quote: content }
}

/* ── Quote layout wrapper ── */
function QuoteContent({ content }: { content: string }) {
  const { speaker, quote } = extractSpeaker(content)
  return (
    <div className="flex gap-3">
      <div className="w-1 rounded-full shrink-0" style={{ background: '#8b5cf6', opacity: 0.4 }} />
      <div>
        {speaker && (
          <p className="text-[11px] font-medium mb-1" style={{ color: '#8b5cf6' }}>
            {speaker}
          </p>
        )}
        <div className="italic">{quote}</div>
      </div>
    </div>
  )
}

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const date = new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  const displayContent = fact.content_zh || fact.content_en
  const sourceUrls = getSourceUrls(fact)
  const verificationIndicators = getVerificationIndicators(fact)
  const contradiction = getContradiction(fact)
  const typeConfig = FACT_TYPE_CONFIG[fact.fact_type] ?? DEFAULT_TYPE_CONFIG

  async function loadNotes() {
    if (notesLoaded) return
    const res = await fetch(`/api/notes?fact_id=${fact.id}`)
    if (res.ok) setNotes(await res.json())
    setNotesLoaded(true)
  }

  async function submitNote() {
    if (!noteText.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: DEFAULT_USER_ID, fact_id: fact.id, content: noteText.trim() }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes(prev => [...prev, note])
        setNotesLoaded(true)
        setNoteText('')
      }
    } finally { setSubmitting(false) }
  }

  function exportFactWithNotes() {
    const source = sourceUrls[0] ? extractDomain(sourceUrls[0]) : '未知来源'
    const lines = [`【事实】${displayContent}`, `来源: ${source} | ${date}`]
    if (sourceUrls[0]) lines.push(`链接: ${sourceUrls[0]}`)
    if (notes.length > 0) {
      lines.push('')
      for (const n of notes) {
        const nDate = new Date(n.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        lines.push(`【笔记】${n.content}`, `— ${nDate}`)
      }
    }
    navigator.clipboard.writeText(lines.join('\n'))
  }

  function toggleExpand() {
    setExpanded(e => !e)
    if (!expanded) loadNotes()
  }

  /* ── Q6: Compact mode for timeline — minimal, no border, single line ── */
  if (compact && !expanded) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-1 rounded-md cursor-pointer transition-colors hover:bg-[var(--surface-alt)]"
        onClick={toggleExpand}>
        <div className="w-1 h-4 shrink-0 rounded-full" style={{ background: typeConfig.color }} />
        <p className="text-[13px] truncate flex-1 min-w-0" style={{ color: 'var(--fg-body)' }}>{displayContent}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {verificationIndicators.slice(0, 2).map((ind, i) => (
            <span key={i} className="px-1 py-0.5 rounded text-[11px] font-mono"
              style={{ background: 'var(--info-soft)', color: 'var(--info)' }} title={ind.detail}>
              {ind.label}
            </span>
          ))}
          <time className="text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>{date}</time>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--fg-dim)" strokeWidth="1.5"><path d="M5 3l4 4-4 4" /></svg>
        </div>
      </div>
    )
  }

  return (
    <div
      className={compact ? 'rounded-lg border overflow-hidden transition-colors mb-1' : 'rounded-lg border overflow-hidden transition-colors'}
      style={{
        borderColor: expanded ? 'var(--border-hover)' : 'var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div className="flex">
        {/* Q1: Left color bar */}
        <div className="w-1 shrink-0 rounded-l-lg" style={{ background: typeConfig.color }} />

        <div className="flex-1 p-4 min-w-0">
          {/* Header row: type icon + chevron */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Q1: Content with type-specific layout */}
              {fact.fact_type === 'quote' ? (
                <div className="cursor-pointer" onClick={toggleExpand}>
                  <QuoteContent content={displayContent} />
                </div>
              ) : (
                <p className="text-[15px] leading-relaxed cursor-pointer" style={{ color: 'var(--fg-body)' }} onClick={toggleExpand}>
                  {displayContent}
                </p>
              )}
            </div>

            {/* Q20: Chevron expand indicator */}
            <button onClick={toggleExpand} className="shrink-0 mt-1 p-0.5 rounded transition-colors" style={{ color: 'var(--fg-dim)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"
                style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease' }}>
                <path d="M5 3l4 4-4 4" />
              </svg>
            </button>
          </div>

          {/* Q3: Metric values — enlarged layout */}
          {fact.fact_type === 'metric' && fact.metric_value != null && !compact && (
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <span className="text-[18px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>
                {fact.metric_value.toLocaleString()} {fact.metric_unit}
              </span>
              {fact.metric_change && <MetricChangeArrow change={fact.metric_change} />}
              {fact.metric_period && <span className="text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>{fact.metric_period}</span>}
              {fact.metric_name && <span className="text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>{fact.metric_name}</span>}
            </div>
          )}

          {/* Contradiction inline warning */}
          {contradiction && (
            <div className="mt-2 px-2.5 py-1.5 rounded-md text-[11px]"
              style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning-soft)' }}>
              矛盾: {contradiction}
            </div>
          )}

          {/* Q2: Bottom metadata — verification indicators FIRST with pill style */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {/* Verification indicators — pills, first position */}
              {verificationIndicators.map((ind, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                  style={{ background: 'var(--info-soft)', color: 'var(--info)', border: '1px solid var(--info-muted)' }}
                  title={ind.detail}>
                  {ind.label}
                </span>
              ))}
              {/* Date */}
              <time className="text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>{date}</time>
              {/* Source domain */}
              {sourceUrls.length > 0 && (
                <>
                  <span className="text-[11px]" style={{ color: 'var(--fg-faint)' }}>·</span>
                  <span className="text-[11px] font-mono cursor-pointer" style={{ color: 'var(--fg-dim)' }}
                    onClick={() => setShowSources(s => !s)} title={`${sourceUrls.length} 个来源`}>
                    {extractDomain(sourceUrls[0])}{sourceUrls.length > 1 && ` +${sourceUrls.length - 1}`}
                  </span>
                </>
              )}
              {/* Type icon + label (color bar already shows type, so keep this subtle) */}
              <span className="text-[11px]" style={{ color: 'var(--fg-faint)' }}>·</span>
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: typeConfig.color }}>
                {typeConfig.icon}
                <span className="font-mono">{typeConfig.label}</span>
              </span>
            </div>
            {/* Tags — right side */}
            <div className="flex gap-1 flex-wrap justify-end shrink-0">
              {fact.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-1 py-0.5 rounded text-[11px] font-mono"
                  style={{ color: 'var(--fg-faint)', border: '1px solid var(--border)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Source URLs expandable */}
          {showSources && sourceUrls.length > 0 && (
            <div className="mt-3 p-2.5 rounded-md space-y-1.5" style={{ background: 'var(--surface-alt)' }}>
              <p className="text-[11px] font-mono mb-1" style={{ color: 'var(--fg-faint)' }}>信息源</p>
              {sourceUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] font-mono truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
                    {extractDomain(url)}
                  </span>
                  <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded transition-colors"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }} title={url}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7" /><path d="M7 1h4v4M11 1L5.5 6.5" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Q20: Expanded section with 150ms transition */}
          <div ref={contentRef} className="overflow-hidden transition-all duration-150"
            style={{ maxHeight: expanded ? '2000px' : '0', opacity: expanded ? 1 : 0 }}>
            {expanded && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>

                {/* Q4: Group 1 — 事实详情 */}
                <div className="mb-4">
                  <p className="text-[11px] font-mono tracking-wider uppercase mb-2" style={{ color: 'var(--fg-faint)' }}>事实详情</p>
                  {fact.content_zh && fact.content_en && !compact && (
                    <p className="text-[13px] mb-2 italic" style={{ color: 'var(--fg-dim)' }}>{fact.content_en}</p>
                  )}
                  <div className="space-y-1 text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                    {fact.source_type && (
                      <div className="flex gap-2">
                        <span style={{ color: 'var(--fg-faint)' }}>来源类型</span>
                        <span>{fact.source_type}</span>
                      </div>
                    )}
                    {fact.week_number && (
                      <div className="flex gap-2">
                        <span style={{ color: 'var(--fg-faint)' }}>周次</span>
                        <span>{fact.week_number}</span>
                      </div>
                    )}
                  </div>
                  {fact.tags.length > 3 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {fact.tags.map(tag => (
                        <span key={tag} className="px-1 py-0.5 rounded text-[11px] font-mono"
                          style={{ color: 'var(--fg-faint)', border: '1px solid var(--border)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Q4: Group 2 — 我的笔记 */}
                <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-mono tracking-wider uppercase mb-2" style={{ color: 'var(--fg-faint)' }}>我的笔记</p>
                  {notes.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {notes.map(n => (
                        <div key={n.id} className="text-[13px] p-2.5 rounded-md" style={{ background: 'var(--surface-alt)' }}>
                          <p style={{ color: 'var(--fg-body)' }}>{n.content}</p>
                          <time className="block mt-1 text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>
                            {new Date(n.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitNote() }}
                      placeholder="写笔记..."
                      className="flex-1 rounded-md border px-3 py-1.5 text-[13px] outline-none font-mono transition-colors focus:border-[var(--border-hover)]"
                      style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }} />
                    <button onClick={submitNote} disabled={submitting || !noteText.trim()}
                      className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                      {submitting ? '...' : '保存'}
                    </button>
                    <button onClick={exportFactWithNotes}
                      className="rounded-md px-3 py-1.5 text-[11px] font-mono transition-colors"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
                      title="复制事实+笔记到剪贴板">
                      导出
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
