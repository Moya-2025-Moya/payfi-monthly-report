'use client'

import { useMemo } from 'react'
import type { AtomicFact } from '@/lib/types'
import type { WeeklyStats } from '@/lib/weekly-data'
import { ContextCard } from '@/components/facts/ContextCard'
import { NarrativeRiver } from '@/components/narrative/NarrativeRiver'
import { FocusOverlay } from '@/components/focus/FocusOverlay'

/* ── Types ── */

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

const CATEGORY_ORDER = ['market_structure', 'product', 'onchain_data', 'regulatory', 'funding', 'milestone', 'data']

const CATEGORY_ICONS: Record<string, string> = {
  market_structure: '◆',
  product: '▲',
  onchain_data: '●',
  regulatory: '■',
  funding: '◇',
  milestone: '★',
  data: '○',
}

/* ── Context Block (used by narratives) ── */

function ContextBlock({ items }: { items: ContextItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="mt-3 rounded-lg" style={{
      background: 'var(--context-bg)',
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

        return (
          <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t' : ''} style={{ borderColor: 'var(--border)' }}>
            {c.insight ? (
              <p className="text-[12px] leading-[1.7]" style={{ color: 'var(--fg-secondary)' }}>
                {c.insight}
              </p>
            ) : (
              <p className="text-[12px] leading-[1.7]" style={{ color: 'var(--fg-muted)' }}>
                {c.event}{c.detail ? `  ·  ${c.detail}` : ''}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Signal dedup ── */

function isRedundantContext(signalText: string, ctx: { current_value?: string; delta_label?: string; event?: string }): boolean {
  if (ctx.current_value && signalText.includes(ctx.current_value.replace(/\s/g, ''))) return true
  if (ctx.delta_label) {
    const pct = ctx.delta_label.match(/\d+%/)
    if (pct && signalText.includes(pct[0])) return true
  }
  return false
}

/* ── Context cleaning ── */

const CONTEXT_PREFIXES = [
  '相比之下，',
  '此前，',
  '作为参考，',
  '历史上，',
  '值得注意的是，',
  '类似地，',
  '与此对照，',
  '回顾来看，',
  '同一赛道中，',
  '从先例看，',
]

function cleanContextString(ctx: string): string {
  let cleaned = ctx.replace(/\s*[—\-–]\s*(小|大)\s*[\d.,]+\s*倍/g, '')
  cleaned = cleaned.replace(/\s*\|\s*/g, '。')
  cleaned = cleaned.replace(/[。；]+$/g, '').replace(/。{2,}/g, '。').trim()
  // Dedup redundant date ranges
  cleaned = cleaned.replace(/(\([^)]+\))\s*\1/g, '$1')
  cleaned = cleaned.replace(/(\(\d{4}-\d{2}-\d{2}\s*至\s*\d{4}-\d{2}-\d{2}\))\s*\(\d{4}-\d{4}年?\)/g, '$1')
  cleaned = cleaned.replace(/(\(\d{4}年\d{1,2}月[^)]*\))\s*\(\d{4}年?\)/g, '$1')
  return cleaned
}

/* ── Signal Context Inline ── */

function SignalContextInline({ ctx, prefix }: { ctx: { event: string; detail?: string; current_entity?: string; current_value?: string; delta_label?: string; comparison_basis?: string; insight?: string }; prefix: string }) {
  // Show only objective factual comparison — no insight, no multiplier
  const parts: string[] = []
  if (ctx.event) parts.push(ctx.event)
  if (ctx.detail) parts.push(ctx.detail)
  const line = parts.join('，')
  if (!line.trim()) return null

  return (
    <div className="mt-2 pl-3 text-[12.5px] leading-[1.7]" style={{
      color: 'var(--fg-muted)',
      borderLeft: '2px solid var(--accent-muted, var(--border))',
    }}>
      <p>{prefix}{line}</p>
    </div>
  )
}

/* ── Section Header ── */

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="section-divider">
      <span className="section-label">
        {label}
        {count !== undefined && (
          <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>
            {count}
          </span>
        )}
      </span>
    </div>
  )
}

/* ── Main Component ── */

export function WeeklyReader({ week, summaryDetailed, stats, allFacts }: Props) {
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

  const grouped: Record<string, SignalData[]> = {}
  for (const s of signals) {
    const cat = s.category || 'onchain_data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }

  // Assign a unique natural-language prefix to each signal that has context
  const signalPrefixMap = useMemo(() => {
    const map = new Map<number, string>()
    let pi = 0
    const ordered = CATEGORY_ORDER.filter(cat => grouped[cat]?.length).flatMap(cat => grouped[cat]!)
    for (let i = 0; i < ordered.length; i++) {
      const s = ordered[i]
      const hasCtx = (s.structured_context && !isRedundantContext(s.text, s.structured_context)) || (s.context && !s.structured_context)
      if (hasCtx) {
        map.set(i, CONTEXT_PREFIXES[pi % CONTEXT_PREFIXES.length])
        pi++
      }
    }
    return map
  }, [signals, grouped])

  const signalTexts = useMemo(() => new Set(signals.map(s => s.text)), [signals])
  const topFacts = useMemo(() => {
    if (!allFacts) return []
    return allFacts
      .filter(f => !signalTexts.has(f.content_zh || f.content_en))
      .slice(0, 10)
  }, [allFacts, signalTexts])

  return (
    <div className="max-w-[680px] mx-auto">
      {/* ── Hero ── */}
      <div className="mb-10">
        {marketLine && (
          <p className="text-[12px] font-mono tracking-wide mb-3" style={{ color: 'var(--fg-muted)' }}>
            {marketLine}
          </p>
        )}
        {oneLiner && (
          <h1 className="hero-title">
            {oneLiner}
          </h1>
        )}
        {/* Accent line */}
        <div className="mt-5 flex items-center gap-3">
          <div className="w-8 h-[3px] rounded-full" style={{ background: 'var(--accent)' }} />
          {stats && stats.total_facts > 0 && (
            <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
              {stats.total_facts} facts · {stats.total_facts - stats.rejected} verified
            </span>
          )}
        </div>
      </div>

      {/* ── 1. Signals ── */}
      {signals.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="本周精选" count={signals.length} />
          <div>
            {(() => {
              let flatIdx = 0
              return CATEGORY_ORDER.filter(cat => grouped[cat]?.length).flatMap(cat =>
                grouped[cat]!.map((s, si) => {
                  const idx = flatIdx++
                  const prefix = signalPrefixMap.get(idx) || ''
                  return (
                    <div key={`${cat}-${si}`} className="signal-item">
                      <div className="flex items-start gap-3">
                        <span className="mt-[3px] text-[9px] shrink-0 select-none" style={{ color: 'var(--fg-muted)' }}>
                          {CATEGORY_ICONS[cat] || '·'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className="flex-1 text-[14px] font-medium leading-[1.7]" style={{ color: 'var(--fg-title)' }}>
                              {s.text}
                            </p>
                            {s.source_url && (
                              <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 text-[11px] opacity-40 hover:opacity-100 transition-opacity">
                                ↗
                              </a>
                            )}
                          </div>
                          {s.structured_context && !isRedundantContext(s.text, s.structured_context) ? (
                            <SignalContextInline ctx={s.structured_context} prefix={prefix} />
                          ) : s.context && !s.structured_context ? (
                            <div className="mt-2 pl-3 text-[12.5px] leading-[1.7]" style={{
                              color: 'var(--fg-muted)',
                              borderLeft: '2px solid var(--accent-muted, var(--border))',
                            }}>
                              <p>{prefix}{cleanContextString(s.context)}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })
              )
            })()}
          </div>
        </section>
      )}

      {/* ── 2. Narratives ── */}
      {narratives.length > 0 && (
        <section className="mb-10">
          <NarrativeRiver narratives={narratives as unknown as Parameters<typeof NarrativeRiver>[0]['narratives']} />
        </section>
      )}

      {/* ── 3. News Brief ── */}
      {topFacts.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="新闻速览" count={topFacts.length} />
          <div className="space-y-2">
            {topFacts.map(f => (
              <ContextCard key={f.id} fact={f} />
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="pt-8 pb-12 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-[4px] h-[12px] rounded-full" style={{ background: 'var(--accent)', opacity: 0.4 }} />
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--fg-muted)' }}>
            StablePulse
          </span>
          <div className="w-[4px] h-[12px] rounded-full" style={{ background: 'var(--accent)', opacity: 0.4 }} />
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          AI 多源交叉验证 · 人工审核 · 零观点
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)', opacity: 0.6 }}>
          RSS + SEC EDGAR + DeFiLlama
        </p>
        <a href={`/console/${week}`} className="inline-block mt-3 text-[11px] px-4 py-1.5 rounded-full border transition-colors hover:border-[var(--border-hover)]"
          style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
          Console →
        </a>
      </footer>

      <FocusOverlay />
    </div>
  )
}
