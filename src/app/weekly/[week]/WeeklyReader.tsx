'use client'

import { useMemo } from 'react'
import type { AtomicFact } from '@/lib/types'
import type { WeeklyStats } from '@/lib/weekly-data'
import { ContextCard } from '@/components/facts/ContextCard'
import { NarrativeRiver } from '@/components/narrative/NarrativeRiver'
import { FocusOverlay } from '@/components/focus/FocusOverlay'

/* ── Types ── */

// Context can be string[] (legacy) or structured objects (V12+ / V14)
type ContextItem = string | {
  event: string
  detail: string
  current_entity?: string
  current_value?: string
  delta_label?: string
  comparison_basis?: string
  insight?: string
}

interface SignalData {
  category: string
  text: string
  context?: string
  structured_context?: { event: string; detail: string; current_entity?: string; current_value?: string; delta_label?: string; comparison_basis?: string; insight?: string }
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

/* ── Context Block (used by narratives) ── */

function ContextBlock({ items }: { items: ContextItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="mt-3" style={{
      background: 'var(--context-bg)',
      borderRadius: '6px',
      padding: '14px 16px',
    }}>
      {items.map((c, i) => {
        if (typeof c === 'string') {
          return (
            <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
              {c}
            </p>
          )
        }

        const hasDelta = c.current_entity && c.current_value && c.delta_label
        const useful = isUsefulDelta(c.delta_label)

        return (
          <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t' : ''} style={{ borderColor: 'var(--border)' }}>
            {/* Comparison basis — why these two are comparable */}
            {c.comparison_basis && (
              <p className="text-[11px] mb-1" style={{ color: 'var(--fg-muted)' }}>
                {c.comparison_basis}
              </p>
            )}

            {/* Reference event */}
            <p className="text-[12px] leading-relaxed mb-1" style={{ color: 'var(--fg-muted)' }}>
              {c.event}{c.detail ? `  ·  ${c.detail}` : ''}
            </p>

            {/* Insight — what this comparison reveals */}
            {c.insight && (
              <p className="text-[12px] mt-1" style={{ color: 'var(--fg-secondary)' }}>
                {c.insight}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Signal dedup: skip context if signal text already contains the comparison data ── */

function isRedundantContext(signalText: string, ctx: { current_value?: string; delta_label?: string; insight?: string }): boolean {
  // If insight exists, always show (it adds new info)
  if (ctx.insight) return false
  // If the signal text already mentions the current_value, context is redundant
  if (ctx.current_value && signalText.includes(ctx.current_value.replace(/\s/g, ''))) return true
  // If delta is already in signal text
  if (ctx.delta_label) {
    const pct = ctx.delta_label.match(/\d+%/)
    if (pct && signalText.includes(pct[0])) return true
  }
  return false
}

/* ── Signal Context Inline (compact, filters junk deltas) ── */

function isUsefulDelta(delta: string | undefined): boolean {
  if (!delta) return false
  // Filter out: 无对比, 不同维度, 不适用
  if (/无.*对比|不同维度|不适用/.test(delta)) return false
  // Filter extreme deltas (>80%) — meaningless comparison
  const pctMatch = delta.match(/(\d+)%/)
  if (pctMatch && parseInt(pctMatch[1]) > 80) return false
  return true
}

function SignalContextInline({ ctx }: { ctx: { event: string; detail?: string; current_entity?: string; current_value?: string; delta_label?: string; comparison_basis?: string; insight?: string } }) {
  const useful = isUsefulDelta(ctx.delta_label)
  // Use insight if available, otherwise fall back to raw fields
  const hasInsight = ctx.insight || ctx.comparison_basis

  return (
    <div className="mt-1.5 pl-3 text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
      {hasInsight ? (
        <>
          {ctx.comparison_basis && (
            <p>{ctx.comparison_basis}</p>
          )}
          {ctx.insight && (
            <p style={{ color: 'var(--fg-secondary)' }}>{ctx.insight}</p>
          )}
        </>
      ) : (
        <p>
          {ctx.event}{ctx.detail ? ` · ${ctx.detail}` : ''}
        </p>
      )}
    </div>
  )
}

/* ── Main Component ── */

export function WeeklyReader({ week, summaryDetailed, stats, allFacts }: Props) {
  // factSearch/factTagFilter removed — replaced by curated 速报 section

  // Parse summary
  let oneLiner = ''
  let marketLine = ''
  let narratives: Record<string, unknown>[] = []
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


  // Top 10 facts for 速报 section (exclude facts already covered by signals)
  const signalTexts = useMemo(() => new Set(signals.map(s => s.text)), [signals])
  const topFacts = useMemo(() => {
    if (!allFacts) return []
    return allFacts
      .filter(f => !signalTexts.has(f.content_zh || f.content_en))
      .slice(0, 10)
  }, [allFacts, signalTexts])

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
      {narratives.length > 0 && (
        <NarrativeRiver narratives={narratives as unknown as Parameters<typeof NarrativeRiver>[0]['narratives']} />
      )}

      {/* ── 3. 新闻速览 (Top 10 facts, compact) ── */}
      {topFacts.length > 0 && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-[12px] font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            新闻速览
          </h2>
          <div className="space-y-2">
            {topFacts.map(f => (
              <ContextCard key={f.id} fact={f} />
            ))}
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

      {/* Entity Focus Overlay */}
      <FocusOverlay />
    </div>
  )
}
