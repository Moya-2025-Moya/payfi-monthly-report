'use client'
import { useState } from 'react'
import { AggregateView } from '@/components/feed/AggregateView'
import { WeeklySummary } from '@/components/feed/WeeklySummary'
import type { AtomicFact } from '@/lib/types'

/* ── Types ── */
interface SnapshotStats {
  total_facts: number
  new_facts: number
  high_confidence: number
  medium_confidence: number
  low_confidence: number
  rejected: number
  new_entities: number
  active_entities: number
}

interface MarketMetric {
  coin_symbol: string
  metric_name: string
  metric_value: number
  metric_unit: string | null
  fetched_at: string
}

interface StoredNarrative {
  topic: string
  summary: string
  branches: { id: string; label: string; side: 'left' | 'right'; color: string }[]
  nodes: {
    id: string; date: string; title: string; description: string
    significance: 'high' | 'medium' | 'low'
    factIds: string[]; entityNames: string[]
    sourceUrl?: string; isExternal?: boolean; externalUrl?: string
    isPrediction?: boolean; branchId: string
  }[]
  edges: { id: string; source: string; target: string; label?: string }[]
}

interface BreakingAlert {
  title: string
  summary: string
  source_url: string
  urgency: 'breaking' | 'important'
  detected_at: string
  source_name: string
}

interface Props {
  facts: AtomicFact[]
  currentWeek: string
  stats: SnapshotStats | null
  narratives: StoredNarrative[]
  summarySimple: string | null
  summaryDetailed: string | null
  marketMetrics?: MarketMetric[]
  breakingAlerts?: BreakingAlert[]
}

/* ── Helper ── */
function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  return `$${value.toLocaleString()}`
}

/* ── Compact stats bar (replaces old 4-card grid) ── */
function StatsBar({ metrics, factCount, stats }: { metrics?: MarketMetric[]; factCount: number; stats: SnapshotStats | null }) {
  const getMetric = (symbol: string) => metrics?.find(m => m.coin_symbol.toUpperCase() === symbol && m.metric_name === 'market_cap')

  const parts: string[] = []
  const usdt = getMetric('USDT')
  const usdc = getMetric('USDC')
  if (usdt) parts.push(`USDT ${formatMarketCap(usdt.metric_value)}`)
  if (usdc) parts.push(`USDC ${formatMarketCap(usdc.metric_value)}`)
  parts.push(`${factCount} 条事实`)
  if (stats) parts.push(`${stats.high_confidence} 高可信`)

  return (
    <div className="flex items-center gap-3 flex-wrap mb-6 px-1">
      {parts.map((p, i) => (
        <span key={i} className="text-[12px] font-mono" style={{ color: 'var(--fg-muted)' }}>
          {i > 0 && <span className="mr-3" style={{ color: 'var(--border)' }}>·</span>}
          {p}
        </span>
      ))}
    </div>
  )
}

/* ── AI-generated narrative summary (from new pipeline format) ── */
interface AINarrative {
  topic: string
  last_week: string
  this_week: string
  next_week_watch: string
  facts?: { content: string; date: string; tags?: string[] }[]
}

/* ── Narrative Section — the hero of the homepage ── */
function NarrativeSection({ narratives, summaryDetailed }: { narratives: StoredNarrative[]; summaryDetailed: string | null }) {
  // Parse AI-generated narratives from new format
  let aiNarratives: AINarrative[] = []
  if (summaryDetailed) {
    try {
      const parsed = JSON.parse(summaryDetailed)
      if (parsed.narratives && Array.isArray(parsed.narratives)) {
        aiNarratives = parsed.narratives
      }
    } catch { /* ignore */ }
  }

  // Use AI narratives if available, fall back to stored narratives
  const hasAINarratives = aiNarratives.length > 0
  const hasStoredNarratives = narratives.length > 0

  if (!hasAINarratives && !hasStoredNarratives) return null

  const SIG_DOT: Record<string, string> = {
    high: '#ef4444', medium: '#f59e0b', low: 'var(--fg-muted)',
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-medium tracking-wider uppercase" style={{ color: '#3b82f6' }}>
          叙事追踪
        </h2>
        <a href="/narratives" className="text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
          查看全部 →
        </a>
      </div>

      <div className="space-y-4">
        {/* AI-generated narratives (new format) */}
        {hasAINarratives && aiNarratives.slice(0, 3).map((n, idx) => (
          <div key={`ai-${idx}`} className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="px-4 py-3">
              <h3 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--fg-title)' }}>
                {n.topic}
              </h3>

              {/* Last week → This week progression */}
              {n.last_week && n.last_week !== '首次追踪' && (
                <p className="text-[12px] leading-relaxed mb-1 pl-3 border-l-2" style={{ color: 'var(--fg-muted)', borderColor: 'var(--border)' }}>
                  上周: {n.last_week}
                </p>
              )}
              <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--fg-secondary)' }}>
                {n.this_week}
              </p>

              {/* Grouped facts under this narrative */}
              {n.facts && n.facts.length > 0 && (
                <div className="relative pl-5 mb-2">
                  <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ background: 'var(--border)' }} />
                  <div className="space-y-2">
                    {n.facts.map((f, fi) => (
                      <div key={fi} className="relative flex items-start gap-2">
                        <div className="absolute -left-5 top-1.5 w-[14px] flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-mono mr-2" style={{ color: 'var(--fg-muted)' }}>{f.date}</span>
                          <span className="text-[13px]" style={{ color: 'var(--fg-body)' }}>{f.content}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next week watch */}
              {n.next_week_watch && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-medium" style={{ color: '#f59e0b' }}>
                    → 下周关注: <span style={{ color: 'var(--fg-muted)' }}>{n.next_week_watch}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Stored narratives (fallback for weeks without AI narratives) */}
        {!hasAINarratives && narratives.slice(0, 3).map((narrative, idx) => {
          const factNodes = narrative.nodes
            .filter(n => !n.isPrediction && !n.isExternal)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 4)
          const predictions = narrative.nodes.filter(n => n.isPrediction).slice(0, 2)

          return (
            <div key={idx} className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="px-4 py-3">
                <h3 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--fg-title)' }}>
                  {narrative.topic}
                </h3>
                {narrative.summary && (
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--fg-secondary)' }}>
                    {narrative.summary}
                  </p>
                )}
                {factNodes.length > 0 && (
                  <div className="relative pl-5 mb-2">
                    <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ background: 'var(--border)' }} />
                    <div className="space-y-2">
                      {factNodes.map(node => (
                        <div key={node.id} className="relative flex items-start gap-2">
                          <div className="absolute -left-5 top-1.5 w-[14px] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full" style={{ background: SIG_DOT[node.significance] ?? 'var(--fg-muted)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-mono mr-2" style={{ color: 'var(--fg-muted)' }}>{node.date}</span>
                            <span className="text-[13px]" style={{ color: 'var(--fg-body)' }}>{node.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {predictions.length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[11px] font-medium mb-1" style={{ color: '#f59e0b' }}>→ 下周关注</p>
                    {predictions.map(p => (
                      <p key={p.id} className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                        {p.title}
                      </p>
                    ))}
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

/* ── Fact Section: show first 10 + load more ── */
function FactSection({ facts }: { facts: AtomicFact[] }) {
  const [showCount, setShowCount] = useState(20)

  if (facts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>本周暂无已验证事实</p>
      </div>
    )
  }

  const visibleFacts = facts.slice(0, showCount)
  const remaining = facts.length - showCount

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--fg-muted)' }}>
            全部事实
          </h2>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
            {facts.length}
          </span>
        </div>
      </div>

      <AggregateView facts={visibleFacts} />

      {remaining > 0 && (
        <div className="mt-4 text-center">
          <button onClick={() => setShowCount(s => s + 20)}
            className="text-[13px] px-5 py-2 rounded-md border transition-colors hover:border-[var(--accent-muted)]"
            style={{ borderColor: 'var(--border)', color: 'var(--accent)', background: 'var(--surface)' }}>
            加载更多 ({remaining} 条)
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Breaking Alerts (速报) — only visible when alerts exist ── */
function BreakingAlertsBar({ alerts }: { alerts: BreakingAlert[] }) {
  if (alerts.length === 0) return null

  // Show breaking first, then important, max 5
  const sorted = [...alerts].sort((a, b) => {
    if (a.urgency === 'breaking' && b.urgency !== 'breaking') return -1
    if (a.urgency !== 'breaking' && b.urgency === 'breaking') return 1
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
  }).slice(0, 5)

  return (
    <div className="mb-4 rounded-lg border" style={{ borderColor: '#ef444440', background: '#ef444408' }}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#ef4444' }} />
          <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: '#ef4444' }}>
            速报
          </span>
        </div>
        <div className="space-y-1.5">
          {sorted.map((alert, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 text-[10px] font-mono px-1 rounded"
                style={{
                  background: alert.urgency === 'breaking' ? '#ef444420' : '#f59e0b20',
                  color: alert.urgency === 'breaking' ? '#ef4444' : '#f59e0b',
                }}>
                {alert.urgency === 'breaking' ? 'BREAKING' : 'IMPORTANT'}
              </span>
              <div className="flex-1 min-w-0">
                <a href={alert.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-[13px] hover:underline" style={{ color: 'var(--fg-body)' }}>
                  {alert.title}
                </a>
                <span className="text-[11px] ml-2" style={{ color: 'var(--fg-muted)' }}>
                  {alert.source_name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Main Homepage Client ── */
export function FeedClient({ facts, currentWeek, stats, narratives, summarySimple, summaryDetailed, marketMetrics, breakingAlerts }: Props) {
  return (
    <div>
      {/* Breaking alerts (速报) — above everything, only shown when alerts exist */}
      <BreakingAlertsBar alerts={breakingAlerts ?? []} />

      {/* Compact stats bar */}
      <StatsBar metrics={marketMetrics} factCount={facts.length} stats={stats} />

      {/* Section 1: Narrative tracking — hero of the homepage */}
      <NarrativeSection narratives={narratives} summaryDetailed={summaryDetailed} />

      {/* Section 2: Weekly news summary (10 items) */}
      {summarySimple && (
        <div className="mb-8">
          <WeeklySummary simple={summarySimple} detailed={summaryDetailed} weekNumber={currentWeek} />
        </div>
      )}

      {/* Section 3: Full fact stream */}
      <FactSection facts={facts} />
    </div>
  )
}
