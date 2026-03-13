'use client'
import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
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

interface Props {
  facts: AtomicFact[]
  currentWeek: string
  stats: SnapshotStats | null
  narratives: StoredNarrative[]
  summarySimple: string | null
  summaryDetailed: string | null
  marketMetrics?: MarketMetric[]
}

/* ── Market Overview (replaces DashboardStats) ── */
function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  return `$${value.toLocaleString()}`
}

function MarketOverview({ metrics, factCount, stats }: { metrics?: MarketMetric[]; factCount: number; stats: SnapshotStats | null }) {
  const getMetric = (symbol: string, name: string) => {
    if (!metrics) return null
    return metrics.find(m => m.coin_symbol.toUpperCase() === symbol && m.metric_name === name)
  }

  const usdtCap = getMetric('USDT', 'market_cap')
  const usdcCap = getMetric('USDC', 'market_cap')
  const daiCap = getMetric('DAI', 'market_cap')

  const cards: { label: string; value: string; sub?: string }[] = []

  if (usdtCap) cards.push({ label: 'USDT', value: formatMarketCap(usdtCap.metric_value), sub: '市值' })
  if (usdcCap) cards.push({ label: 'USDC', value: formatMarketCap(usdcCap.metric_value), sub: '市值' })
  if (daiCap) cards.push({ label: 'DAI', value: formatMarketCap(daiCap.metric_value), sub: '市值' })

  // Always show fact count
  const s = stats
  cards.push({ label: '本周事实', value: String(factCount), sub: s ? `${s.high_confidence} 高可信` : undefined })

  // Limit to 4
  const displayCards = cards.slice(0, 4)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {displayCards.map(c => (
        <div key={c.label} className="rounded-lg border px-4 py-3"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[11px] tracking-wider uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>{c.label}</p>
          <p className="text-[20px] font-semibold font-mono" style={{ color: 'var(--fg-title)' }}>
            {c.value}
          </p>
          {c.sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}

/* ── Dashboard Charts ── */
const FACT_TYPE_COLORS: Record<string, string> = {
  event: '#3b82f6',
  metric: '#10b981',
  quote: '#8b5cf6',
  relationship: '#f59e0b',
  status_change: '#ef4444',
}

const FACT_TYPE_LABELS: Record<string, string> = {
  event: '事件',
  metric: '指标',
  quote: '引用',
  relationship: '关系',
  status_change: '状态变更',
}

const OBJECTIVITY_COLORS: Record<string, string> = {
  fact: '#10b981',
  opinion: '#8b5cf6',
  analysis: '#3b82f6',
}

const OBJECTIVITY_LABELS: Record<string, string> = {
  fact: '事实',
  opinion: '观点',
  analysis: '分析',
}

function DashboardCharts({ facts }: { facts: AtomicFact[] }) {
  const barData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of facts) {
      const t = f.fact_type ?? 'event'
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return ['event', 'metric', 'quote', 'relationship', 'status_change']
      .map(key => ({ name: FACT_TYPE_LABELS[key] ?? key, value: counts.get(key) ?? 0, fill: FACT_TYPE_COLORS[key] ?? '#6b7280' }))
      .filter(d => d.value > 0)
  }, [facts])

  const pieData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of facts) {
      const o = f.objectivity ?? 'fact'
      counts.set(o, (counts.get(o) ?? 0) + 1)
    }
    return ['fact', 'opinion', 'analysis']
      .map(key => ({ name: OBJECTIVITY_LABELS[key] ?? key, value: counts.get(key) ?? 0, color: OBJECTIVITY_COLORS[key] ?? '#6b7280' }))
      .filter(d => d.value > 0)
  }, [facts])

  if (facts.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
      {/* Fact type distribution bar chart */}
      <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-[11px] tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>事实类型分布</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}
              labelStyle={{ color: 'var(--fg-title)' }}
              cursor={{ fill: 'var(--surface-alt)' }}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Objectivity breakdown pie chart */}
      <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-[11px] tracking-wider uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>客观性分布</p>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={120}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={48}
                paddingAngle={2}
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--fg-title)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                  {d.name} <span className="font-mono font-medium" style={{ color: 'var(--fg-title)' }}>{d.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Narrative Preview (Q12) ── */
function NarrativePreview({ narratives }: { narratives: StoredNarrative[] }) {
  const [activeIdx, setActiveIdx] = useState(0)

  if (narratives.length === 0) return null

  const active = narratives[activeIdx]
  // Show only high/medium significance nodes, limit to 5
  const keyNodes = active.nodes
    .filter(n => !n.isPrediction && !n.isExternal)
    .sort((a, b) => {
      const sigOrder = { high: 0, medium: 1, low: 2 }
      return (sigOrder[a.significance] ?? 2) - (sigOrder[b.significance] ?? 2)
    })
    .slice(0, 5)

  const SIG_DOT: Record<string, string> = {
    high: '#ef4444', medium: '#f59e0b', low: 'var(--fg-muted)',
  }

  return (
    <div className="mb-6 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--fg-muted)' }}>
          叙事时间线
        </p>
        <a href="/narratives" className="text-[11px] hover:underline" style={{ color: 'var(--accent)' }}>
          查看全部 →
        </a>
      </div>

      {/* Topic tabs if multiple */}
      {narratives.length > 1 && (
        <div className="flex gap-1.5 px-4 pt-3 overflow-x-auto">
          {narratives.map((n, i) => (
            <button key={i} onClick={() => setActiveIdx(i)}
              className="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors border"
              style={{
                background: activeIdx === i ? 'var(--accent-soft)' : 'transparent',
                borderColor: activeIdx === i ? 'var(--accent-muted)' : 'var(--border)',
                color: activeIdx === i ? 'var(--accent)' : 'var(--fg-muted)',
              }}>
              {n.topic}
            </button>
          ))}
        </div>
      )}

      {/* Summary + key nodes */}
      <div className="px-4 py-3">
        {active.summary && (
          <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--fg-secondary)' }}>
            {active.summary}
          </p>
        )}

        {keyNodes.length > 0 && (
          <div className="relative pl-5">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ background: 'var(--border)' }} />
            <div className="space-y-2">
              {keyNodes.map(node => (
                <div key={node.id} className="relative flex items-start gap-2">
                  {/* Dot */}
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
      </div>
    </div>
  )
}

/* ── Fact Section: show first 10 + load more ── */
function FactSection({ facts }: { facts: AtomicFact[] }) {
  const [showCount, setShowCount] = useState(10)

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
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-medium" style={{ color: 'var(--fg-title)' }}>
            事实流
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

/* ── Main Homepage Client ── */
export function FeedClient({ facts, currentWeek, stats, narratives, summarySimple, summaryDetailed, marketMetrics }: Props) {
  return (
    <div>
      {/* Market overview */}
      <MarketOverview metrics={marketMetrics} factCount={facts.length} stats={stats} />

      {/* Dashboard charts */}
      <DashboardCharts facts={facts} />

      {/* Weekly summary (Q7) */}
      {summarySimple && (
        <WeeklySummary simple={summarySimple} detailed={summaryDetailed} weekNumber={currentWeek} />
      )}

      {/* Narrative preview (Q12) */}
      <NarrativePreview narratives={narratives} />

      {/* Facts (Q9/Q10) */}
      <FactSection facts={facts} />
    </div>
  )
}
