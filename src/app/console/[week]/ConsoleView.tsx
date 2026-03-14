'use client'

import { useState, useMemo } from 'react'
import type { WeeklyStats } from '@/lib/weekly-data'
import type { AtomicFact } from '@/lib/types'
import { ContextCard } from '@/components/facts/ContextCard'
import { DepthControl } from '@/components/depth/DepthControl'
import { useDepth } from '@/components/depth/DepthProvider'
import { BriefingStrip } from '@/components/briefing/BriefingStrip'
import { KnowledgeHeartbeat } from '@/components/briefing/KnowledgeHeartbeat'
import { NarrativeRiver } from '@/components/narrative/NarrativeRiver'
import { useFocusLens } from '@/components/focus/FocusLensProvider'
import { FocusOverlay } from '@/components/focus/FocusOverlay'
import { EntityTag } from '@/components/focus/EntityTag'
import { ConsoleModal } from '@/components/console/ConsoleModal'

/* ── Types matching V12+ format ── */

type ContextItem = string | { event: string; detail: string }

interface NarrativeData {
  topic: string
  last_week: string
  this_week: string
  origin?: string
  timeline?: string
  context?: ContextItem[]
  weekCount?: number
  next_week?: string
  next_week_watch?: string
  facts?: { content: string; date: string; tags?: string[]; source_url?: string }[]
}

interface SignalData {
  category: string
  text: string
  context?: string
  structured_context?: { event: string; detail: string; current_entity?: string; current_value?: string; delta_label?: string; comparison_basis?: string; insight?: string }
  source_url?: string
}

interface Props {
  summaryDetailed: string
  stats: WeeklyStats | null
  allFacts?: AtomicFact[]
  snapshotData?: {
    newContradictions?: number
  }
  knowledgeGrowth?: { week: string; total: number }[]
}

const CATEGORY_ORDER = ['market_structure', 'product', 'onchain_data', 'regulatory', 'funding', 'milestone', 'data']

/* ── Signal dedup helpers (same as WeeklyReader) ── */

function isUsefulDelta(delta: string | undefined): boolean {
  if (!delta) return false
  if (/无.*对比|不同维度|不适用/.test(delta)) return false
  const pctMatch = delta.match(/(\d+)%/)
  if (pctMatch && parseInt(pctMatch[1]) > 80) return false
  return true
}

function isRedundantContext(signalText: string, ctx: { current_value?: string; delta_label?: string; event?: string }): boolean {
  if (ctx.current_value && signalText.includes(ctx.current_value.replace(/\s/g, ''))) return true
  if (ctx.delta_label) {
    const pct = ctx.delta_label.match(/\d+%/)
    if (pct && signalText.includes(pct[0])) return true
  }
  return false
}

function SignalContextInline({ ctx }: { ctx: { event: string; detail?: string; current_entity?: string; current_value?: string; delta_label?: string; comparison_basis?: string; insight?: string } }) {
  // Show only factual comparison line, no insight/评价
  const line = `${ctx.event}${ctx.detail ? ` · ${ctx.detail}` : ''}`
  if (!line.trim()) return null

  return (
    <div className="mt-1.5 pl-3 text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
      <p>{line}</p>
    </div>
  )
}

/* ── Main Component ── */

export function ConsoleView({ summaryDetailed, stats, allFacts, snapshotData, knowledgeGrowth }: Props) {
  const { depth } = useDepth()
  const { focusedEntity } = useFocusLens()
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

    if (!oneLiner && parsed.news && Array.isArray(parsed.news)) {
      const news = parsed.news as { simple_zh?: string; what_happened_zh?: string; tags?: string[]; source_url?: string | null }[]
      oneLiner = news.slice(0, 2).map(n => n.simple_zh || '').filter(Boolean).join('; ')
      signals = news.slice(0, 5).map(n => ({
        category: 'onchain_data',
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

  // Signal texts for dedup
  const signalTexts = useMemo(() => new Set(signals.map(s => s.text)), [signals])

  // Build entity → factIds map for Focus Lens
  const entityFactMap = useMemo(() => {
    if (!allFacts) return new Map<string, string[]>()
    const map = new Map<string, string[]>()
    for (const f of allFacts) {
      for (const tag of f.tags ?? []) {
        if (!map.has(tag)) map.set(tag, [])
        map.get(tag)!.push(f.id)
      }
    }
    return map
  }, [allFacts])

  const entityTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    for (const f of allFacts ?? []) {
      for (const tag of f.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }
    }
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag)
  }, [allFacts])

  // Focus lens
  const focusedFactIds = useMemo(() => {
    if (!focusedEntity || !allFacts) return null
    const ids = new Set<string>()
    for (const f of allFacts) {
      const tags = (f.tags ?? []).map(t => t.toLowerCase())
      if (tags.includes(focusedEntity.toLowerCase())) ids.add(f.id)
    }
    return ids
  }, [focusedEntity, allFacts])

  // Facts search/filter (console keeps full browser)
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

  function getFocusClass(factId: string): string {
    if (!focusedFactIds) return ''
    return focusedFactIds.has(factId) ? 'focus-highlighted' : 'focus-receded'
  }

  return (
    <div className="space-y-6">
      {/* ── Briefing Strip ── */}
      <BriefingStrip
        facts={allFacts ?? []}
        oneLiner={oneLiner}
        marketLine={marketLine}
        rejectedCount={stats?.rejected}
        contradictionCount={snapshotData?.newContradictions}
      />

      {/* ── Knowledge Heartbeat ── */}
      {knowledgeGrowth && knowledgeGrowth.length > 0 && (
        <KnowledgeHeartbeat data={knowledgeGrowth} />
      )}

      {/* ── Depth Control ── */}
      <div className="depth-control-sticky sticky z-20 py-2 flex items-center justify-between gap-3"
        style={{ top: 'var(--topbar-h)', background: 'var(--bg)' }}>
        <DepthControl />
        <span className="text-[11px] hidden md:inline" style={{ color: 'var(--fg-muted)' }}>
          按 1-4 切换深度 · {'\u2318'}K 搜索
        </span>
      </div>

      {/* ── Entity Tags ── */}
      {entityTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entityTags.map(tag => (
            <EntityTag key={tag} name={tag} factIds={entityFactMap.get(tag) ?? []} />
          ))}
        </div>
      )}

      {/* ── 1. 本周精选 (Signals — no category labels) ── */}
      {signals.length > 0 && (
        <div>
          <h2 className="text-[12px] font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            本周精选
          </h2>
          <div className="space-y-1.5">
            {CATEGORY_ORDER.filter(cat => grouped[cat]?.length).flatMap(cat =>
              grouped[cat]!.map((s, si) => (
                <div key={`${cat}-${si}`}>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
                    · {s.text}
                    {s.source_url && (
                      <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                        className="ml-1 text-[11px] hover:underline" style={{ color: 'var(--info)' }}>
                        [来源]
                      </a>
                    )}
                  </p>
                  {s.structured_context && !isRedundantContext(s.text, s.structured_context) ? (
                    <SignalContextInline ctx={s.structured_context} />
                  ) : s.context && !s.structured_context ? (
                    <p className="text-[12px] mt-0.5 pl-3" style={{ color: 'var(--fg-muted)' }}>
                      {s.context}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── 2. 本周叙事 (NarrativeRiver) ── */}
      <NarrativeRiver narratives={narratives} />

      {/* ── 3. 新闻速览 (Top 10 facts, then full browser) ── */}
      {allFacts && allFacts.length > 0 && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-[12px] font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            新闻速览
          </h2>

          {/* Search + tag filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <label htmlFor="console-fact-search" className="sr-only">搜索事实</label>
            <input
              id="console-fact-search"
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

          {/* Facts list */}
          <div className="space-y-2">
            {filteredFacts.slice(0, 50).map((f) => (
              <ContextCard key={f.id} fact={f} focusClassName={getFocusClass(f.id)} />
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

      {/* ── Footer ── */}
      {stats && stats.total_facts > 0 && (
        <div className="text-center py-2">
          <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            数据来源: RSS + SEC EDGAR + DeFiLlama · AI 多源交叉验证
          </p>
        </div>
      )}

      {/* Focus Overlay */}
      <FocusOverlay entityInfo={focusedEntity ? {
        factCount: focusedFactIds?.size,
      } : undefined} />

      {/* Console Modal (Cmd+K) */}
      <ConsoleModal />
    </div>
  )
}
