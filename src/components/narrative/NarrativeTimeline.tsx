'use client'

import { useState } from 'react'
import type { NarrativeBranch, NarrativeNodeData, TimelineNode, TimelineEdge } from '@/app/narratives/NarrativesClient'

interface Props {
  nodes: TimelineNode[]
  edges: TimelineEdge[]
  branches: NarrativeBranch[]
  status: 'idle' | 'streaming' | 'done' | 'error'
  onNodeClick: (data: NarrativeNodeData) => void
}

const SIG_COLORS = {
  high: { dot: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
  medium: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.15)' },
  low: { dot: 'var(--fg-faint)', bg: 'var(--surface-alt)', border: 'var(--border)' },
}

const EXTERNAL_COLORS = {
  dot: '#6366f1',
  bg: 'rgba(99,102,241,0.05)',
  border: 'rgba(99,102,241,0.2)',
}

function EventCard({ data, onClick }: { data: NarrativeNodeData; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const isExt = data.isExternal === true
  const sig = isExt ? EXTERNAL_COLORS : (SIG_COLORS[data.significance] ?? SIG_COLORS.low)

  return (
    <div
      className="rounded-lg border px-4 py-3 cursor-pointer transition-all hover:shadow-sm"
      style={{ borderColor: sig.border, background: sig.bg }}
      onClick={() => { setExpanded(v => !v); if (!isExt) onClick() }}
    >
      {/* Date + badges */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: sig.dot }} />
        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>{data.date}</span>
        {isExt && (
          <span className="text-[11px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>网络来源</span>
        )}
        {!isExt && data.significance === 'high' && (
          <span className="text-[11px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>重要</span>
        )}
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium leading-snug mb-1" style={{ color: 'var(--fg-title)' }}>
        {data.title}
      </p>

      {/* External source URL (always visible) */}
      {isExt && data.externalUrl && (
        <a href={data.externalUrl} target="_blank" rel="noopener noreferrer"
          className="inline-block text-[11px] mt-1 underline truncate max-w-full"
          style={{ color: '#6366f1' }}
          onClick={e => e.stopPropagation()}>
          {data.externalUrl.replace(/^https?:\/\//, '').split('/')[0]}
        </a>
      )}

      {/* Entity tags */}
      {!isExt && data.entityNames?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {data.entityNames.slice(0, 4).map(n => (
            <span key={n} className="text-[11px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
              {n}
            </span>
          ))}
          {data.entityNames.length > 4 && (
            <span className="text-[11px] px-1.5 py-0.5" style={{ color: 'var(--fg-faint)' }}>
              +{data.entityNames.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Participants for merged events */}
      {data.isMerged && data.participants && data.participants.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.participants.map((p, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-muted)' }}>
              {p.name}
              <span className="opacity-60 ml-1">{p.role}</span>
            </span>
          ))}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
            {data.description}
          </p>
          {!isExt && (
            <div className="flex items-center gap-3 mt-2">
              {data.sourceUrl && (
                <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] underline" style={{ color: 'var(--accent)' }}
                  onClick={e => e.stopPropagation()}>
                  查看来源
                </a>
              )}
              <span className="text-[11px]" style={{ color: 'var(--fg-faint)' }}>
                {data.factIds.length} 条事实 · 点击追问
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function NarrativeTimeline({ nodes, branches, status, onNodeClick }: Props) {
  if (nodes.length === 0 && status !== 'streaming') {
    return (
      <div className="flex items-center justify-center py-20 text-[13px]" style={{ color: 'var(--fg-muted)' }}>
        {status === 'idle' ? '输入主题开始生成时间线' : '未找到相关事实'}
      </div>
    )
  }

  // Determine if we have real branches (left/right)
  const hasBranches = branches.length >= 2

  // Group nodes by date for better layout
  const sortedNodes = [...nodes].sort((a, b) => {
    const da = a.data.date
    const db = b.data.date
    return da.localeCompare(db)
  })

  if (!hasBranches) {
    // Simple single-column timeline
    return (
      <div className="relative pl-6 py-6">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-6 bottom-6 w-px" style={{ background: 'var(--border)' }} />

        <div className="space-y-4">
          {sortedNodes.map(node => {
            const data = node.data
            return (
              <div key={node.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-6 top-3 w-[22px] flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      background: data.isExternal ? EXTERNAL_COLORS.dot : data.isMerged ? 'var(--accent)' : SIG_COLORS[data.significance]?.dot ?? 'var(--fg-faint)',
                      borderColor: 'var(--surface)',
                    }} />
                </div>
                <EventCard data={data} onClick={() => onNodeClick(data)} />
              </div>
            )
          })}
        </div>

        {status === 'streaming' && (
          <div className="relative mt-4">
            <div className="absolute -left-6 top-2 w-[22px] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            </div>
            <div className="text-[13px] py-2" style={{ color: 'var(--fg-muted)' }}>生成中...</div>
          </div>
        )}
      </div>
    )
  }

  // Two-column branched timeline
  const leftBranch = branches.find(b => b.side === 'left')
  const rightBranch = branches.find(b => b.side === 'right')

  // Interleave all nodes by date for proper chronological flow
  const allEvents: { node: TimelineNode; column: 'left' | 'right' | 'center' }[] = []
  for (const n of sortedNodes) {
    const d = n.data
    if (d.isMerged || d.branchId === 'center') {
      allEvents.push({ node: n, column: 'center' })
    } else if (d.branchId === leftBranch?.id) {
      allEvents.push({ node: n, column: 'left' })
    } else if (d.branchId === rightBranch?.id) {
      allEvents.push({ node: n, column: 'right' })
    } else {
      allEvents.push({ node: n, column: 'center' })
    }
  }

  return (
    <div className="py-6">
      {/* Branch headers */}
      <div className="grid grid-cols-[1fr_32px_1fr] gap-3 mb-6 px-2">
        <div className="text-right">
          {leftBranch && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {leftBranch.label}
            </span>
          )}
        </div>
        <div />
        <div>
          {rightBranch && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
              {rightBranch.label}
            </span>
          )}
        </div>
      </div>

      {/* Timeline with center line */}
      <div className="relative">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-px" style={{ background: 'var(--border)' }} />

        <div className="space-y-4">
          {allEvents.map(({ node, column }) => {
            const data = node.data
            const dotColor = data.isExternal ? EXTERNAL_COLORS.dot : data.isMerged ? 'var(--accent)' : SIG_COLORS[data.significance]?.dot ?? 'var(--fg-faint)'

            if (column === 'center') {
              return (
                <div key={node.id} className="relative px-[calc(50%-140px)]" style={{ maxWidth: '100%' }}>
                  {/* Center dot */}
                  <div className="absolute left-1/2 top-4 -translate-x-1/2 w-3 h-3 rounded-full border-2 z-10"
                    style={{ background: dotColor, borderColor: 'var(--surface)' }} />
                  <div className="mx-auto" style={{ maxWidth: 480 }}>
                    <EventCard data={data} onClick={() => onNodeClick(data)} />
                  </div>
                </div>
              )
            }

            return (
              <div key={node.id} className="grid grid-cols-[1fr_32px_1fr] gap-3 items-start">
                {column === 'left' ? (
                  <>
                    <div className="pr-2">
                      <EventCard data={data} onClick={() => onNodeClick(data)} />
                    </div>
                    <div className="flex items-center justify-center pt-4">
                      <div className="w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: dotColor, borderColor: 'var(--surface)' }} />
                    </div>
                    <div />
                  </>
                ) : (
                  <>
                    <div />
                    <div className="flex items-center justify-center pt-4">
                      <div className="w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: dotColor, borderColor: 'var(--surface)' }} />
                    </div>
                    <div className="pl-2">
                      <EventCard data={data} onClick={() => onNodeClick(data)} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {status === 'streaming' && (
          <div className="flex items-center justify-center mt-6 gap-2">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            <span className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>生成中...</span>
          </div>
        )}
      </div>
    </div>
  )
}
