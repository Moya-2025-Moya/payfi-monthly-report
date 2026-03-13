'use client'

import { useState, useMemo } from 'react'
import type { AtomicFact } from '@/lib/types'
import type { WeeklyStats } from '@/lib/weekly-data'

/* ── Types ── */

interface NarrativeData {
  topic: string
  last_week: string
  this_week: string
  origin?: string
  timeline?: string
  context?: string[]
  weekCount?: number
  next_week?: string
  facts?: { content: string; date: string; tags?: string[]; source_url?: string }[]
}

interface SignalData {
  category: string
  text: string
  context?: string
  source_url?: string
}

interface Props {
  week: string
  summaryDetailed: string
  stats: WeeklyStats | null
  allFacts?: AtomicFact[]
}

/* ── Constants ── */

const CATEGORY_LABELS: Record<string, string> = {
  market_structure: '市场',
  product: '产品',
  onchain_data: '链上',
  regulatory: '监管',
  funding: '融资',
  milestone: '里程碑',
  data: '数据',
}

const CATEGORY_ORDER = ['market_structure', 'product', 'onchain_data', 'regulatory', 'funding', 'milestone', 'data']

/* ── Context Block (blue left-border, the product's core visual) ── */

function ContextBlock({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-2 rounded-r" style={{
      borderLeft: '3px solid var(--info)',
      background: 'var(--context-bg)',
      padding: '10px 14px',
    }}>
      {items.map((c, i) => (
        <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)', fontFamily: 'var(--font-mono), monospace' }}>
          {c}
        </p>
      ))}
    </div>
  )
}

/* ── Narrative Card (vertical, no horizontal flow) ── */

function NarrativeCard({ narrative, index, expanded, onToggle }: {
  narrative: NarrativeData
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const n = narrative
  const isFirstWeek = !n.weekCount || n.weekCount <= 1

  return (
    <div className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="px-5 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[16px] font-semibold" style={{ color: 'var(--fg-title)' }}>
            {n.topic}
          </h3>
          {n.weekCount && n.weekCount > 1 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded" style={{
              color: 'var(--info)',
              background: 'var(--info-soft)',
            }}>
              第{n.weekCount}周
            </span>
          )}
        </div>

        {/* Timeline flow (vertical text, not horizontal cards) */}
        <div className="space-y-2 text-[14px]" style={{ color: 'var(--fg-body)' }}>
          {/* Origin (first week only) */}
          {isFirstWeek && n.origin && (
            <div className="flex gap-3">
              <span className="text-[12px] font-medium shrink-0 w-16 pt-0.5" style={{ color: 'var(--fg-muted)' }}>起点</span>
              <span style={{ color: 'var(--fg-secondary)' }}>{n.origin}</span>
            </div>
          )}

          {/* Last week (skip if first week) */}
          {!isFirstWeek && n.last_week && n.last_week !== '首次追踪' && (
            <div className="flex gap-3">
              <span className="text-[12px] font-medium shrink-0 w-16 pt-0.5" style={{ color: 'var(--fg-muted)' }}>上周</span>
              <span style={{ color: 'var(--fg-secondary)' }}>{n.last_week}</span>
            </div>
          )}

          {/* This week (highlighted) */}
          <div className="flex gap-3">
            <span className="text-[12px] font-semibold shrink-0 w-16 pt-0.5" style={{ color: 'var(--info)' }}>本周</span>
            <span className="font-medium" style={{ color: 'var(--fg-title)' }}>{n.this_week}</span>
          </div>

          {/* Next week (if present) */}
          {n.next_week && (
            <div className="flex gap-3">
              <span className="text-[12px] font-medium shrink-0 w-16 pt-0.5" style={{ color: 'var(--fg-muted)' }}>下周关注</span>
              <span style={{ color: 'var(--fg-muted)' }}>{n.next_week}</span>
            </div>
          )}
        </div>

        {/* Context block — ALWAYS VISIBLE, blue left border (the product's core) */}
        {n.context && n.context.length > 0 && (
          <ContextBlock items={n.context} />
        )}

        {/* Timeline label */}
        {n.timeline && (
          <p className="text-[13px] mt-2" style={{ color: 'var(--fg-muted)' }}>
            时间线: {n.timeline}
          </p>
        )}

        {/* Expandable source facts */}
        {n.facts && n.facts.length > 0 && (
          <div className="mt-3">
            <button
              onClick={onToggle}
              className="text-[12px] font-medium transition-colors hover:underline"
              style={{ color: 'var(--info)' }}>
              {expanded ? '收起来源' : `查看 ${n.facts.length} 条来源事实`}
            </button>
            {expanded && (
              <div className="mt-2 pl-3 border-l space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                {n.facts.map((f, fi) => (
                  <div key={fi} className="text-[13px]" style={{ color: 'var(--fg-secondary)' }}>
                    <span className="font-mono mr-2" style={{ color: 'var(--fg-muted)' }}>{f.date}</span>
                    <span>{f.content}</span>
                    {f.source_url && (
                      <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                        className="ml-1 text-[11px] hover:underline" style={{ color: 'var(--info)' }}>
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
  )
}

/* ── Simplified Fact Card (no TrustSpine, no EvidenceDrawer) ── */

function ReaderFactCard({ fact }: { fact: AtomicFact }) {
  const f = fact
  const domain = f.source_url ? (() => { try { return new URL(f.source_url).hostname.replace('www.', '') } catch { return null } })() : null

  return (
    <div className="py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      {/* Fact content */}
      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
        {f.content_zh || f.content_en}
      </p>

      {/* Metric highlight */}
      {f.fact_type === 'metric' && f.metric_value != null && (
        <p className="text-[16px] font-semibold font-mono mt-1" style={{ color: 'var(--fg-title)' }}>
          {f.metric_value}{f.metric_unit ? ` ${f.metric_unit}` : ''}
          {f.metric_change && (
            <span className="text-[13px] ml-2" style={{
              color: f.metric_change.startsWith('-') ? 'var(--danger)' : 'var(--success)'
            }}>
              {f.metric_change}
            </span>
          )}
        </p>
      )}

      {/* Meta line: date + source + badge */}
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className="text-[12px] font-mono" style={{ color: 'var(--fg-muted)' }}>
          {f.fact_date ? String(f.fact_date).slice(0, 10) : ''}
        </span>
        {domain && (
          <a href={f.source_url!} target="_blank" rel="noopener noreferrer"
            className="text-[12px] hover:underline" style={{ color: 'var(--fg-muted)' }}>
            {domain}
          </a>
        )}
        {f.verification_status === 'verified' && (
          <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: 'var(--success)', background: 'var(--success-soft)' }}>
            ✓ 已验证
          </span>
        )}
        {f.verification_status === 'partially_verified' && (
          <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: 'var(--warning)', background: 'var(--warning-soft)' }}>
            ◐ 部分验证
          </span>
        )}
      </div>

      {/* Tags */}
      {f.tags && f.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {f.tags.map(tag => (
            <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded border"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main Component ── */

export function WeeklyReader({ week, summaryDetailed, stats, allFacts }: Props) {
  const [expandedNarrative, setExpandedNarrative] = useState<number | null>(null)
  const [factSearch, setFactSearch] = useState('')
  const [factTagFilter, setFactTagFilter] = useState<string | null>(null)

  // Parse summary
  let oneLiner = ''
  let marketLine = ''
  let narratives: NarrativeData[] = []
  let signals: SignalData[] = []

  try {
    const parsed = JSON.parse(summaryDetailed)
    oneLiner = parsed.oneLiner || parsed.one_liner || ''
    marketLine = parsed.marketLine || ''
    narratives = parsed.narratives || []
    signals = parsed.signals || []

    if (!oneLiner && parsed.news && Array.isArray(parsed.news)) {
      const news = parsed.news as { simple_zh?: string; what_happened_zh?: string; source_url?: string | null }[]
      oneLiner = news.slice(0, 2).map(n => n.simple_zh || '').filter(Boolean).join('; ')
      signals = news.slice(0, 5).map(n => ({
        category: 'onchain_data',
        text: n.what_happened_zh || n.simple_zh || '',
        source_url: n.source_url || undefined,
      }))
    }
  } catch { /* ignore */ }

  // Group signals
  const grouped: Record<string, SignalData[]> = {}
  for (const s of signals) {
    const cat = s.category || 'onchain_data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }

  // Facts search/filter
  const allTags = useMemo(() => {
    if (!allFacts) return []
    const tagSet = new Set<string>()
    for (const f of allFacts) {
      for (const t of f.tags ?? []) tagSet.add(t)
    }
    return [...tagSet].sort()
  }, [allFacts])

  const filteredFacts = useMemo(() => {
    if (!allFacts) return []
    let result = allFacts
    if (factSearch.trim()) {
      const q = factSearch.trim().toLowerCase()
      result = result.filter(f => (f.content_zh || f.content_en).toLowerCase().includes(q))
    }
    if (factTagFilter) {
      result = result.filter(f => f.tags?.includes(factTagFilter))
    }
    return result
  }, [allFacts, factSearch, factTagFilter])

  return (
    <div className="max-w-[680px] mx-auto space-y-8">
      {/* ── Header ── */}
      <div>
        {marketLine && (
          <p className="text-[13px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            {marketLine}
          </p>
        )}
        {oneLiner && (
          <h2 className="text-[20px] font-bold leading-snug mt-2" style={{ color: 'var(--fg-title)' }}>
            {oneLiner}
          </h2>
        )}
      </div>

      {/* ── Narratives ── */}
      {narratives.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--info)' }}>
            叙事追踪
          </h2>
          <div className="space-y-4">
            {narratives.slice(0, 3).map((n, idx) => (
              <NarrativeCard
                key={idx}
                narrative={n}
                index={idx}
                expanded={expandedNarrative === idx}
                onToggle={() => setExpandedNarrative(expandedNarrative === idx ? null : idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Signals ── */}
      {signals.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            本周信号
          </h2>
          <div className="space-y-4">
            {CATEGORY_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
              <div key={cat}>
                <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                  {CATEGORY_LABELS[cat] || cat}
                </p>
                <div className="space-y-2">
                  {grouped[cat]!.map((s, si) => (
                    <div key={`${cat}-${si}`}>
                      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
                        · {s.text}
                        {s.source_url && (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                            className="ml-1 text-[11px] hover:underline" style={{ color: 'var(--info)' }}>
                            [来源]
                          </a>
                        )}
                      </p>
                      {/* Context always visible */}
                      {s.context && (
                        <ContextBlock items={[s.context]} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Full Facts ── */}
      {allFacts && allFacts.length > 0 && (
        <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            全部事实 ({allFacts.length})
          </h2>

          {/* Search + tag filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <label htmlFor="reader-fact-search" className="sr-only">搜索事实</label>
            <input
              id="reader-fact-search"
              type="text"
              value={factSearch}
              onChange={e => setFactSearch(e.target.value)}
              placeholder="搜索事实..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md border text-[13px] outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)', color: 'var(--fg-body)' }}
            />
            {factTagFilter && (
              <button
                onClick={() => setFactTagFilter(null)}
                className="px-2 py-1 rounded border text-[11px]"
                style={{ borderColor: 'var(--info)', color: 'var(--info)' }}>
                {factTagFilter} ×
              </button>
            )}
          </div>

          {/* Tag pills */}
          {allTags.length > 0 && !factTagFilter && (
            <div className="flex flex-wrap gap-1 mb-3">
              {allTags.slice(0, 20).map(tag => (
                <button
                  key={tag}
                  onClick={() => setFactTagFilter(tag)}
                  className="px-2 py-0.5 rounded text-[11px] border transition-colors hover:border-[var(--info-muted)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Facts list */}
          <div>
            {filteredFacts.slice(0, 50).map(f => (
              <ReaderFactCard key={f.id} fact={f} />
            ))}
            {filteredFacts.length > 50 && (
              <p className="text-[12px] text-center py-3" style={{ color: 'var(--fg-muted)' }}>
                显示前 50 条，共 {filteredFacts.length} 条
              </p>
            )}
            {filteredFacts.length === 0 && (
              <p className="text-[13px] py-6 text-center" style={{ color: 'var(--fg-muted)' }}>
                未找到匹配的事实
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="pt-4 pb-8 text-center space-y-2">
        {stats && stats.total_facts > 0 && (
          <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            {stats.total_facts} 条事实 · {stats.total_facts - stats.rejected} 条已验证 · AI 多源交叉验证 · 人工审核 · 零观点
          </p>
        )}
        <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          数据来源: RSS + SEC EDGAR + DeFiLlama
        </p>
        <a href={`/console/${week}`} className="text-[11px] hover:underline" style={{ color: 'var(--fg-muted)' }}>
          Console →
        </a>
      </footer>
    </div>
  )
}
