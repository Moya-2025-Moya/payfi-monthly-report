'use client'

import { useState } from 'react'
import { NarrativeTimeline } from '@/components/narrative/NarrativeTimeline'

export interface NarrativeBranch {
  id: string; label: string; side: 'left' | 'right'; color: string
}

export interface NarrativeNodeData {
  date: string; title: string; description: string
  significance: 'high' | 'medium' | 'low'
  factIds: string[]; branchId: string; entityNames: string[]
  sourceUrl?: string
  participants?: { name: string; role: string }[]
  isMerged?: boolean
  isExternal?: boolean
  externalUrl?: string
  isPrediction?: boolean
}

export interface TimelineNode {
  id: string; type: string
  position: { x: number; y: number }
  data: NarrativeNodeData
}

export interface TimelineEdge {
  id: string; source: string; target: string; label?: string
}

interface StoredNarrative {
  topic: string
  summary: string
  branches: NarrativeBranch[]
  nodes: {
    id: string; date: string; title: string; description: string
    significance: 'high' | 'medium' | 'low'
    factIds: string[]; entityNames: string[]
    sourceUrl?: string; isExternal?: boolean; externalUrl?: string
    isPrediction?: boolean; branchId: string
  }[]
  edges: TimelineEdge[]
}

function toTimelineNodes(nodes: StoredNarrative['nodes']): TimelineNode[] {
  return nodes.map(n => ({
    id: n.id,
    type: 'narrative',
    position: { x: 0, y: 0 },
    data: {
      date: n.date,
      title: n.title,
      description: n.description,
      significance: n.significance,
      factIds: n.factIds,
      branchId: n.branchId,
      entityNames: n.entityNames,
      sourceUrl: n.sourceUrl,
      isExternal: n.isExternal,
      externalUrl: n.externalUrl,
      isPrediction: n.isPrediction,
    },
  }))
}

export function NarrativesClient({ narratives }: { narratives: StoredNarrative[] }) {
  const [activeIdx, setActiveIdx] = useState(0)

  if (narratives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[13px] mb-2" style={{ color: 'var(--fg-muted)' }}>
          本周尚未生成叙事时间线
        </p>
        <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          前往 设置 → 流水线操作 → 生成叙事时间线
        </p>
      </div>
    )
  }

  const active = narratives[activeIdx]

  return (
    <div>
      {/* Topic tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {narratives.map((n, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className="shrink-0 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors border"
            style={{
              background: activeIdx === i ? 'var(--accent-soft)' : 'transparent',
              borderColor: activeIdx === i ? 'var(--accent-muted)' : 'var(--border)',
              color: activeIdx === i ? 'var(--accent)' : 'var(--fg-muted)',
            }}
          >
            {n.topic}
          </button>
        ))}
      </div>

      {/* Summary */}
      {active.summary && (
        <div className="mb-4 px-4 py-3 rounded-lg border text-[13px] leading-relaxed"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)', color: 'var(--fg-secondary)' }}>
          <span className="font-medium" style={{ color: 'var(--fg-title)' }}>摘要: </span>
          {active.summary}
          <span className="ml-2 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            ({active.nodes.length} 个节点)
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
          事实来源
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#6366f1' }} />
          网络补充
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full border-2 border-dashed" style={{ borderColor: 'var(--fg-muted)' }} />
          后续关注
        </span>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <NarrativeTimeline
          nodes={toTimelineNodes(active.nodes)}
          edges={active.edges}
          branches={active.branches}
          status="done"
          onNodeClick={() => {}}
        />
      </div>
    </div>
  )
}
