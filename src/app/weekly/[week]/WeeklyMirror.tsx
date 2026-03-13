'use client'

import { useState, useMemo } from 'react'
import type { WeeklyStats } from '@/lib/weekly-data'

/* ── Types matching V11 format stored in weekly_summary_detailed ── */

interface NarrativeData {
  topic: string
  last_week: string
  this_week: string
  origin?: string
  timeline?: string
  context?: string[]
  weekCount?: number
  facts?: { content: string; date: string; tags?: string[]; source_url?: string }[]
}

interface SignalData {
  category: 'market_structure' | 'product' | 'onchain_data'
  text: string
  context?: string
  source_url?: string
}

interface FactData {
  content: string
  date: string
  tags?: string[]
  source_url?: string
}

interface Props {
  summaryDetailed: string
  stats: WeeklyStats | null
  allFacts?: FactData[]
}

const CATEGORY_LABELS: Record<string, string> = {
  market_structure: '市场结构',
  product: '产品动态',
  onchain_data: '链上数据',
  // V10 fallback
  milestone: '里程碑',
  data: '数据',
}

export function WeeklyMirror({ summaryDetailed, stats, allFacts }: Props) {
  const [expandedNarrative, setExpandedNarrative] = useState<number | null>(null)
  const [factSearch, setFactSearch] = useState('')
  const [factTagFilter, setFactTagFilter] = useState<string | null>(null)

  // Parse the V11/V10 format
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

    // Fallback: V9 format with news + narratives
    if (!oneLiner && parsed.news && Array.isArray(parsed.news)) {
      const news = parsed.news as { simple_zh?: string; what_happened_zh?: string; tags?: string[]; source_url?: string | null }[]
      oneLiner = news.slice(0, 2).map(n => n.simple_zh || '').filter(Boolean).join('; ')
      signals = news.slice(0, 5).map(n => ({
        category: 'onchain_data' as const,
        text: n.what_happened_zh || n.simple_zh || '',
        source_url: n.source_url || undefined,
      }))
    }
  } catch { /* ignore */ }

  // Group signals by category
  const grouped: Record<string, SignalData[]> = {}
  for (const s of signals) {
    const cat = s.category || 'onchain_data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }
  const categoryOrder = ['market_structure', 'product', 'onchain_data', 'milestone', 'data']

  // All facts search/filter
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
      result = result.filter(f => f.content.toLowerCase().includes(q))
    }
    if (factTagFilter) {
      result = result.filter(f => f.tags?.includes(factTagFilter))
    }
    return result
  }, [allFacts, factSearch, factTagFilter])

  return (
    <div className="space-y-6">
      {/* Market line + One-liner */}
      {(oneLiner || marketLine) && (
        <div className="px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {marketLine && (
            <p className="text-[12px] font-mono mb-2" style={{ color: 'var(--fg-muted)' }}>
              {marketLine}
            </p>
          )}
          {oneLiner && (
            <p className="text-[14px] font-semibold leading-relaxed" style={{ color: 'var(--fg-title)' }}>
              {oneLiner}
            </p>
          )}
        </div>
      )}

      {/* Narratives */}
      {narratives.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: '#3b82f6' }}>
            叙事追踪
          </h2>
          <div className="space-y-3">
            {narratives.slice(0, 3).map((n, idx) => (
              <div key={idx} className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-[14px] font-semibold" style={{ color: 'var(--fg-title)' }}>
                      {n.topic}
                    </h3>
                    {n.weekCount && n.weekCount > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}>
                        第{n.weekCount}周
                      </span>
                    )}
                  </div>

                  {/* Origin */}
                  {n.origin && (
                    <p className="text-[12px] leading-relaxed mb-2 pl-3 border-l-2" style={{ color: 'var(--fg-muted)', borderColor: 'var(--border)' }}>
                      起点: {n.origin}
                    </p>
                  )}

                  {/* Last week */}
                  {n.last_week && n.last_week !== '首次追踪' && (
                    <p className="text-[12px] leading-relaxed mb-1 pl-3 border-l-2" style={{ color: 'var(--fg-muted)', borderColor: 'var(--border)' }}>
                      上周: {n.last_week}
                    </p>
                  )}

                  {/* This week */}
                  <p className="text-[13px] leading-relaxed mb-2 pl-3 border-l-2" style={{ color: 'var(--fg-secondary)', borderColor: '#10b981' }}>
                    本周: {n.this_week}
                  </p>

                  {/* Context block */}
                  {n.context && n.context.length > 0 && (
                    <div className="mt-2 mb-2 pl-3 py-2 rounded" style={{ background: 'rgba(16,185,129,0.05)' }}>
                      <p className="text-[11px] font-semibold mb-1" style={{ color: '#10b981' }}>上下文</p>
                      {n.context.map((c, ci) => (
                        <p key={ci} className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                          · {c}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Timeline */}
                  {n.timeline && (
                    <p className="text-[12px] leading-relaxed mb-1 pl-3" style={{ color: 'var(--fg-muted)' }}>
                      时间线: {n.timeline}
                    </p>
                  )}

                  {/* Expandable source facts */}
                  {n.facts && n.facts.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedNarrative(expandedNarrative === idx ? null : idx)}
                        className="text-[11px] font-medium transition-colors"
                        style={{ color: 'var(--accent)' }}>
                        {expandedNarrative === idx ? '收起来源' : `查看 ${n.facts.length} 条来源事实 →`}
                      </button>
                      {expandedNarrative === idx && (
                        <div className="mt-2 pl-3 border-l space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                          {n.facts.map((f, fi) => (
                            <div key={fi} className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
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
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: '#10b981' }}>
            本周事实
          </h2>
          <div className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="px-4 py-3 space-y-4">
              {categoryOrder.filter(cat => grouped[cat]?.length).map(cat => (
                <div key={cat}>
                  <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                    {CATEGORY_LABELS[cat]}:
                  </p>
                  <div className="space-y-1.5">
                    {grouped[cat]!.map((s, i) => (
                      <div key={i}>
                        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                          · {s.text}
                          {s.source_url && (
                            <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                              className="ml-1 text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
                              [来源]
                            </a>
                          )}
                        </p>
                        {s.context && (
                          <p className="text-[11px] pl-3 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            {s.context}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {stats && stats.total_facts > 0 && (
        <div className="text-center py-2">
          <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            数据来源: RSS + SEC EDGAR + DeFiLlama · AI 多源交叉验证
          </p>
        </div>
      )}

      {/* ─── Full facts section (below mirror) ─── */}
      {allFacts && allFacts.length > 0 && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            本周全部事实 ({allFacts.length})
          </h2>

          {/* Search + tag filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              type="text"
              value={factSearch}
              onChange={e => setFactSearch(e.target.value)}
              placeholder="搜索事实..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md border text-[12px] outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }}
            />
            {factTagFilter && (
              <button
                onClick={() => setFactTagFilter(null)}
                className="px-2 py-1 rounded border text-[11px]"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                {factTagFilter} ×
              </button>
            )}
          </div>

          {/* Tag cloud */}
          {allTags.length > 0 && !factTagFilter && (
            <div className="flex flex-wrap gap-1 mb-3">
              {allTags.slice(0, 20).map(tag => (
                <button
                  key={tag}
                  onClick={() => setFactTagFilter(tag)}
                  className="px-2 py-0.5 rounded text-[10px] border transition-colors hover:border-[var(--accent-muted)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Facts list */}
          <div className="space-y-1">
            {filteredFacts.slice(0, 50).map((f, i) => (
              <div key={i} className="flex gap-2 py-1.5 px-2 rounded text-[12px] hover:bg-[var(--surface)]">
                <span className="font-mono shrink-0" style={{ color: 'var(--fg-muted)', minWidth: '70px' }}>{f.date}</span>
                <span style={{ color: 'var(--fg-secondary)' }}>{f.content}</span>
                {f.source_url && (
                  <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
                    [来源]
                  </a>
                )}
              </div>
            ))}
            {filteredFacts.length > 50 && (
              <p className="text-[11px] text-center py-2" style={{ color: 'var(--fg-muted)' }}>
                显示前 50 条，共 {filteredFacts.length} 条
              </p>
            )}
            {filteredFacts.length === 0 && (
              <p className="text-[12px] py-4 text-center" style={{ color: 'var(--fg-muted)' }}>无匹配事实</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
