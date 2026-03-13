'use client'

import { useState, useMemo } from 'react'
import type { WeeklyStats } from '@/lib/weekly-data'
import type { AtomicFact } from '@/lib/types'
import { ContextCard } from '@/components/facts/ContextCard'
import { DepthControl } from '@/components/depth/DepthControl'
import { useDepth } from '@/components/depth/DepthProvider'

/* ── Types matching V12 format ── */

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
  category: 'market_structure' | 'product' | 'onchain_data'
  text: string
  context?: string
  source_url?: string
}

interface Props {
  summaryDetailed: string
  stats: WeeklyStats | null
  allFacts?: AtomicFact[]
  snapshotData?: {
    newContradictions?: number
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  market_structure: '市场结构',
  product: '产品动态',
  onchain_data: '链上数据',
  milestone: '里程碑',
  data: '数据',
}

const COLOR = {
  narrative: '#2563eb',
  context: '#059669',
  narrativeBg: 'rgba(37,99,235,0.06)',
} as const

export function WeeklyMirror({ summaryDetailed, stats, allFacts, snapshotData }: Props) {
  const { depth } = useDepth()
  const [expandedNarrative, setExpandedNarrative] = useState<number | null>(null)
  const [factSearch, setFactSearch] = useState('')
  const [factTagFilter, setFactTagFilter] = useState<string | null>(null)

  // Parse format
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

    // Fallback: V9 format
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

  // Verification summary counts
  const verifiedCount = allFacts?.length ?? 0
  const rejectedCount = stats?.rejected ?? 0

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
    <div className="space-y-6">
      {/* ── Section 0: Briefing Strip ── */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {/* Fact Pulse bar */}
        {allFacts && allFacts.length > 0 && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-end gap-[2px] h-[20px]">
              {allFacts.slice(0, 80).map((f, i) => {
                const sectorColor = getSectorColor(f.tags)
                const h = f.confidence === 'high' ? 16 : f.confidence === 'medium' ? 12 : 8
                return (
                  <div key={i} style={{
                    width: '3px', height: `${h}px`, borderRadius: '1px',
                    background: sectorColor, opacity: 0.8,
                  }} />
                )
              })}
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>
              {verifiedCount} verified{rejectedCount > 0 ? ` / ${rejectedCount} rejected` : ''}
              {snapshotData?.newContradictions ? ` / ${snapshotData.newContradictions} contradictions` : ''}
            </p>
          </div>
        )}

        {/* Market line + One-liner */}
        <div className="px-4 py-3">
          {marketLine && (
            <p className="text-[13px] font-mono mb-2" style={{ color: 'var(--fg-muted)' }}>
              {marketLine}
            </p>
          )}
          {oneLiner && (
            <p className="text-[20px] font-bold leading-snug" style={{ color: 'var(--fg-title)' }}>
              {oneLiner}
            </p>
          )}
        </div>
      </div>

      {/* ── Depth Control (sticky) ── */}
      <div className="sticky z-20 py-2 flex items-center justify-between gap-3"
        style={{ top: 'var(--topbar-h)', background: 'var(--bg)' }}>
        <DepthControl />
        <span className="text-[11px] hidden md:inline" style={{ color: 'var(--fg-muted)' }}>
          按 1-4 切换深度
        </span>
      </div>

      {/* ── Section 3: Narratives ── */}
      {narratives.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: COLOR.narrative }}>
            叙事追踪
          </h2>
          <div className="space-y-3">
            {narratives.slice(0, 3).map((n, idx) => (
              <div key={idx} className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-[16px] font-semibold" style={{ color: 'var(--fg-title)' }}>
                      {n.topic}
                    </h3>
                    {n.weekCount && n.weekCount > 1 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: COLOR.narrative, background: COLOR.narrativeBg }}>
                        第{n.weekCount}周
                      </span>
                    )}
                  </div>

                  {/* Narrative River: horizontal flow */}
                  <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                    {/* Origin */}
                    {n.origin && (
                      <>
                        <div className="shrink-0 px-3 py-2 rounded-l-md border text-[12px]" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)', minWidth: '120px' }}>
                          <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--fg-muted)' }}>起点</p>
                          <p style={{ color: 'var(--fg-secondary)' }}>{n.origin}</p>
                        </div>
                        <div className="flex items-center shrink-0" style={{ color: 'var(--border-hover)' }}>
                          <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6h20m0 0l-4-4m4 4l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                        </div>
                      </>
                    )}

                    {/* Last week */}
                    {n.last_week && n.last_week !== '首次追踪' && (
                      <>
                        <div className="shrink-0 px-3 py-2 border text-[12px]" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)', minWidth: '120px' }}>
                          <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--fg-muted)' }}>上周</p>
                          <p style={{ color: 'var(--fg-secondary)' }}>{n.last_week}</p>
                        </div>
                        <div className="flex items-center shrink-0" style={{ color: 'var(--border-hover)' }}>
                          <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6h20m0 0l-4-4m4 4l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                        </div>
                      </>
                    )}

                    {/* This week (primary) */}
                    <div className="shrink-0 px-3 py-2 border-2 rounded-md text-[12px]" style={{ borderColor: COLOR.narrative, background: COLOR.narrativeBg, minWidth: '140px' }}>
                      <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: COLOR.narrative }}>本周</p>
                      <p className="font-medium" style={{ color: 'var(--fg-title)' }}>{n.this_week}</p>
                    </div>

                    {/* Next week watch (dashed) */}
                    {n.next_week && (
                      <>
                        <div className="flex items-center shrink-0" style={{ color: 'var(--fg-muted)' }}>
                          <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6h20m0 0l-4-4m4 4l-4 4" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" /></svg>
                        </div>
                        <div className="shrink-0 px-3 py-2 rounded-r-md border text-[12px]" style={{ borderColor: 'var(--border)', borderStyle: 'dashed', minWidth: '120px' }}>
                          <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--fg-muted)' }}>下周关注</p>
                          <p style={{ color: 'var(--fg-muted)' }}>{n.next_week}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Context block (depth >= 1) */}
                  {n.context && n.context.length > 0 && (
                    <div className="depth-layer-1" data-depth={depth}>
                      <div className="mt-2 mb-2 pl-3 py-2 rounded" style={{ background: 'rgba(5,150,105,0.05)' }}>
                        <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: COLOR.context }}>CONTEXT</p>
                        {n.context.map((c, ci) => (
                          <p key={ci} className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                            · {c}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {n.timeline && (
                    <p className="text-[13px] leading-relaxed mt-1 pl-3" style={{ color: 'var(--fg-muted)' }}>
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
      )}

      {/* ── Section 4: Signals (本周精选) ── */}
      {signals.length > 0 && (
        <div>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: COLOR.context }}>
            本周精选
          </h2>
          <div className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="px-4 py-3 space-y-4">
              {categoryOrder.filter(cat => grouped[cat]?.length).map(cat => (
                <div key={cat}>
                  <p className="text-[14px] font-semibold mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                    {CATEGORY_LABELS[cat]}:
                  </p>
                  <div className="space-y-1.5">
                    {grouped[cat]!.map((s, i) => (
                      <div key={i}>
                        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                          · {s.text}
                          {s.source_url && (
                            <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                              className="ml-1 text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
                              [来源]
                            </a>
                          )}
                        </p>
                        {s.context && (
                          <div className="depth-layer-1" data-depth={depth}>
                            <p className="text-[12px] pl-3 mt-0.5" style={{ color: COLOR.context }}>
                              {s.context}
                            </p>
                          </div>
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

      {/* ── Footer ── */}
      {stats && stats.total_facts > 0 && (
        <div className="text-center py-2">
          <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            数据来源: RSS + SEC EDGAR + DeFiLlama · AI 多源交叉验证
          </p>
        </div>
      )}

      {/* ── Section 5: Full Facts (using ContextCard) ── */}
      {allFacts && allFacts.length > 0 && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            全部事实 ({allFacts.length})
          </h2>

          {/* Search + tag filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              type="text"
              value={factSearch}
              onChange={e => setFactSearch(e.target.value)}
              placeholder="搜索事实..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md border text-[13px] outline-none"
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
                  className="px-2 py-0.5 rounded text-[11px] border transition-colors hover:border-[var(--accent-muted)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Facts list using ContextCard */}
          <div className="space-y-2">
            {filteredFacts.slice(0, 50).map((f) => (
              <ContextCard key={f.id} fact={f} />
            ))}
            {filteredFacts.length > 50 && (
              <p className="text-[11px] text-center py-2" style={{ color: 'var(--fg-muted)' }}>
                显示前 50 条，共 {filteredFacts.length} 条
              </p>
            )}
            {filteredFacts.length === 0 && (
              <p className="text-[13px] py-4 text-center" style={{ color: 'var(--fg-muted)' }}>无匹配事实</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Helper: get sector color from tags ── */
function getSectorColor(tags: string[]): string {
  const tagStr = tags.join(' ').toLowerCase()
  if (tagStr.includes('发行') || tagStr.includes('usdc') || tagStr.includes('usdt') || tagStr.includes('stablecoin')) return '#2563eb'
  if (tagStr.includes('支付') || tagStr.includes('payment')) return '#16a34a'
  if (tagStr.includes('监管') || tagStr.includes('regul') || tagStr.includes('法案') || tagStr.includes('sec')) return '#d97706'
  if (tagStr.includes('defi') || tagStr.includes('tvl')) return '#8b5cf6'
  return '#6b7280'
}
