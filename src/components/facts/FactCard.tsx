'use client'
import { useState } from 'react'
import type { AtomicFact, Note } from '@/lib/types'

const DEFAULT_USER_ID = 'default-user'

const FACT_TYPE_ZH: Record<string, string> = {
  event: '事件', metric: '指标', quote: '引述', relationship: '关系', status_change: '状态变更',
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getSourceUrls(fact: AtomicFact): string[] {
  const urls = new Set<string>()
  if (fact.source_url) urls.add(fact.source_url)
  const v2 = fact.v2_result as { source_urls?: string[] } | null
  if (v2?.source_urls) {
    for (const u of v2.source_urls) urls.add(u)
  }
  return [...urls]
}

function getVerificationIndicators(fact: AtomicFact): { label: string; detail?: string }[] {
  const indicators: { label: string; detail?: string }[] = []

  const v1 = fact.v1_result as { match_score?: number; status?: string } | null
  if (v1?.match_score != null) {
    indicators.push({ label: `原文${v1.match_score}%`, detail: `来源原文匹配度 ${v1.match_score}%` })
  } else if (v1?.status === 'source_unavailable') {
    indicators.push({ label: '原文不可达', detail: '来源 URL 无法访问' })
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

// Contradiction info from V5 or contradiction_pairs
function getContradiction(fact: AtomicFact): string | null {
  const v5 = fact.v5_result as { temporal_status?: string; conflict_detail?: string } | null
  if (v5?.temporal_status === 'conflict' && v5.conflict_detail) {
    return v5.conflict_detail
  }
  return null
}

export function FactCard({ fact, compact = false }: { fact: AtomicFact; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const date = new Date(fact.fact_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  const displayContent = fact.content_zh || fact.content_en
  const sourceUrls = getSourceUrls(fact)
  const verificationIndicators = getVerificationIndicators(fact)
  const contradiction = getContradiction(fact)

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
    } finally {
      setSubmitting(false)
    }
  }

  function exportFactWithNotes() {
    const source = sourceUrls[0] ? extractDomain(sourceUrls[0]) : '未知来源'
    const lines = [
      `【事实】${displayContent}`,
      `来源: ${source} | ${date}`,
    ]
    if (sourceUrls[0]) lines.push(`链接: ${sourceUrls[0]}`)
    if (notes.length > 0) {
      lines.push('')
      for (const n of notes) {
        const nDate = new Date(n.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        lines.push(`【笔记】${n.content}`)
        lines.push(`— ${nDate}`)
      }
    }
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div
      className="rounded-lg border p-4 transition-colors"
      style={{
        borderColor: expanded ? 'var(--border-hover)' : 'var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Content — largest, most prominent */}
      <p
        className="text-[14px] leading-relaxed cursor-pointer"
        style={{ color: 'var(--fg-body)' }}
        onClick={() => { setExpanded(e => !e); if (!expanded) loadNotes() }}
      >
        {displayContent}
      </p>

      {/* Metric values inline */}
      {fact.fact_type === 'metric' && fact.metric_value != null && !compact && (
        <div className="mt-2 flex items-center gap-4 text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>
          <span>{fact.metric_name}: {fact.metric_value.toLocaleString()} {fact.metric_unit}</span>
          {fact.metric_change && <span style={{ color: 'var(--accent)' }}>{fact.metric_change}</span>}
          {fact.metric_period && <span>{fact.metric_period}</span>}
        </div>
      )}

      {/* Contradiction inline warning (P1-4) */}
      {contradiction && (
        <div className="mt-2 px-2.5 py-1.5 rounded-md text-[11px]"
          style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: '1px solid var(--warning-soft)' }}>
          矛盾: {contradiction}
        </div>
      )}

      {/* Bottom row — small metadata */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Source domain as primary context */}
          {sourceUrls.length > 0 && (
            <span
              className="text-[10px] font-mono cursor-pointer"
              style={{ color: 'var(--fg-dim)' }}
              onClick={() => setShowSources(s => !s)}
              title={`${sourceUrls.length} 个来源`}
            >
              {extractDomain(sourceUrls[0])}{sourceUrls.length > 1 && ` +${sourceUrls.length - 1}`}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--fg-faint)' }}>·</span>
          <time className="text-[10px] font-mono" style={{ color: 'var(--fg-dim)' }}>{date}</time>
          <span className="text-[10px]" style={{ color: 'var(--fg-faint)' }}>·</span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--fg-dim)' }}>
            {FACT_TYPE_ZH[fact.fact_type] ?? fact.fact_type}
          </span>
          {/* Small verification indicators */}
          {verificationIndicators.map((ind, i) => (
            <span key={i} className="px-1 py-0.5 rounded text-[9px] font-mono"
              style={{ color: 'var(--fg-dim)', border: '1px solid var(--border)' }}
              title={ind.detail}>
              {ind.label}
            </span>
          ))}
        </div>
        {/* Tags — small, right side */}
        <div className="flex gap-1 flex-wrap justify-end shrink-0">
          {fact.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-1 py-0.5 rounded text-[9px] font-mono"
              style={{ color: 'var(--fg-faint)', border: '1px solid var(--border)' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Source URLs expandable */}
      {showSources && sourceUrls.length > 0 && (
        <div className="mt-3 p-2.5 rounded-md space-y-1.5" style={{ background: 'var(--surface-alt)' }}>
          <p className="text-[10px] font-mono mb-1" style={{ color: 'var(--fg-faint)' }}>信息源</p>
          {sourceUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] font-mono truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
                {extractDomain(url)}
              </span>
              <a
                href={url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
                title={url}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7" />
                  <path d="M7 1h4v4M11 1L5.5 6.5" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}
          onClick={e => e.stopPropagation()}>

          {fact.content_zh && fact.content_en && !compact && (
            <p className="text-[12px] mb-3 italic" style={{ color: 'var(--fg-dim)' }}>{fact.content_en}</p>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {notes.map(n => (
                <div key={n.id} className="text-[12px] p-2.5 rounded-md" style={{ background: 'var(--surface-alt)' }}>
                  <p style={{ color: 'var(--fg-body)' }}>{n.content}</p>
                  <time className="block mt-1 text-[10px] font-mono" style={{ color: 'var(--fg-faint)' }}>
                    {new Date(n.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              ))}
            </div>
          )}

          {/* Note input + export */}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitNote() }}
              placeholder="写笔记..."
              className="flex-1 rounded-md border px-3 py-1.5 text-[12px] outline-none font-mono transition-colors focus:border-[var(--border-hover)]"
              style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
            />
            <button
              onClick={submitNote}
              disabled={submitting || !noteText.trim()}
              className="rounded-md px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--fg-title)', color: 'var(--bg)' }}
            >
              {submitting ? '...' : '保存'}
            </button>
            <button
              onClick={exportFactWithNotes}
              className="rounded-md px-3 py-1.5 text-[11px] font-mono transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
              title="复制事实+笔记到剪贴板"
            >
              导出
            </button>
          </div>

          {/* Minimal metadata */}
          <div className="mt-3 pt-3 border-t space-y-1 text-[10px] font-mono" style={{ borderColor: 'var(--border)' }}>
            {fact.source_type && (
              <div className="flex gap-2">
                <span style={{ color: 'var(--fg-faint)' }}>来源类型</span>
                <span style={{ color: 'var(--fg-muted)' }}>{fact.source_type}</span>
              </div>
            )}
            {fact.week_number && (
              <div className="flex gap-2">
                <span style={{ color: 'var(--fg-faint)' }}>周次</span>
                <span style={{ color: 'var(--fg-muted)' }}>{fact.week_number}</span>
              </div>
            )}
            {/* All tags */}
            {fact.tags.length > 3 && (
              <div className="flex gap-1 flex-wrap pt-1">
                {fact.tags.map(tag => (
                  <span key={tag} className="px-1 py-0.5 rounded text-[9px]"
                    style={{ color: 'var(--fg-faint)', border: '1px solid var(--border)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
