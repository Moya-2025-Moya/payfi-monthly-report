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
}

/* ── Dashboard Stats (Q6) ── */
function DashboardStats({ stats, factCount }: { stats: SnapshotStats | null; factCount: number }) {
  const s = stats ?? { total_facts: factCount, new_facts: factCount, high_confidence: 0, medium_confidence: 0, low_confidence: 0, rejected: 0, new_entities: 0, active_entities: 0 }

  const cards: { label: string; value: number | string; color?: string }[] = [
    { label: '已验证事实', value: factCount },
    { label: '高可信', value: s.high_confidence, color: 'var(--success)' },
    { label: '中可信', value: s.medium_confidence, color: 'var(--warning)' },
    { label: '活跃实体', value: s.active_entities || s.new_entities },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className="rounded-lg border px-4 py-3"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-[11px] tracking-wider uppercase mb-1" style={{ color: 'var(--fg-muted)' }}>{c.label}</p>
          <p className="text-[22px] font-semibold font-mono" style={{ color: c.color ?? 'var(--fg-title)' }}>
            {c.value}
          </p>
        </div>
      ))}
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

/* ── Fact Section (Q9/Q10: aggregate only, collapsed by default) ── */
function FactSection({ facts }: { facts: AtomicFact[] }) {
  const [expanded, setExpanded] = useState(false)

  if (facts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>本周暂无已验证事实</p>
      </div>
    )
  }

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
        <button onClick={() => setExpanded(e => !e)}
          className="text-[12px] px-3 py-1 rounded-md border transition-colors"
          style={{ borderColor: 'var(--border)', color: expanded ? 'var(--accent)' : 'var(--fg-muted)' }}>
          {expanded ? '收起' : '展开全部'}
        </button>
      </div>

      {/* Collapsed: show top entities as preview */}
      {!expanded ? (
        <CollapsedFactPreview facts={facts} onExpand={() => setExpanded(true)} />
      ) : (
        <AggregateView facts={facts} />
      )}
    </div>
  )
}

/* ── Collapsed preview: show entity names + counts, click to expand ── */
function CollapsedFactPreview({ facts, onExpand }: { facts: AtomicFact[]; onExpand: () => void }) {
  // Compute objectivity breakdown
  const factCount = facts.filter(f => f.objectivity === 'fact' || !f.objectivity).length
  const opinionCount = facts.filter(f => f.objectivity === 'opinion').length
  const analysisCount = facts.filter(f => f.objectivity === 'analysis').length

  // Group by entity (simplified)
  const entityCounts = new Map<string, number>()
  for (const f of facts) {
    const entity = f.tags?.[0] ?? '其他'
    entityCounts.set(entity, (entityCounts.get(entity) ?? 0) + 1)
  }
  const topEntities = [...entityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="rounded-lg border p-4 cursor-pointer transition-colors hover:border-[var(--border-hover)]"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      onClick={onExpand}>
      {/* Objectivity breakdown */}
      <div className="flex items-center gap-4 mb-3 text-[12px]">
        <span style={{ color: 'var(--fg-body)' }}>
          <span className="font-mono font-medium" style={{ color: 'var(--fg-title)' }}>{factCount}</span> 事实
        </span>
        {opinionCount > 0 && (
          <span style={{ color: '#8b5cf6' }}>
            <span className="font-mono font-medium">{opinionCount}</span> 观点
          </span>
        )}
        {analysisCount > 0 && (
          <span style={{ color: '#3b82f6' }}>
            <span className="font-mono font-medium">{analysisCount}</span> 分析
          </span>
        )}
      </div>

      {/* Top entity tags */}
      <div className="flex flex-wrap gap-1.5">
        {topEntities.map(([entity, count]) => (
          <span key={entity} className="px-2 py-1 rounded text-[12px]"
            style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)', border: '1px solid var(--border)' }}>
            {entity} <span className="font-mono text-[11px]" style={{ color: 'var(--fg-muted)' }}>{count}</span>
          </span>
        ))}
      </div>

      {/* Expand hint */}
      <p className="mt-3 text-[11px] text-center" style={{ color: 'var(--fg-muted)' }}>
        点击展开全部事实 →
      </p>
    </div>
  )
}

/* ── Main Homepage Client ── */
export function FeedClient({ facts, currentWeek, stats, narratives, summarySimple, summaryDetailed }: Props) {
  return (
    <div>
      {/* Dashboard stats (Q6) */}
      <DashboardStats stats={stats} factCount={facts.length} />

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
