'use client'

import { useState, useRef, useCallback } from 'react'
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

/* ── Detail Panel ── */

function DetailPanel({ data, onClose }: { data: NarrativeNodeData; onClose: () => void }) {
  const sigLabel = { high: '高', medium: '中', low: '低' }[data.significance]
  const sigColor = { high: '#ef4444', medium: '#f59e0b', low: 'var(--fg-muted)' }[data.significance]

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface)',
        minWidth: 280,
        maxWidth: 340,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>节点详情</span>
        <button
          onClick={onClose}
          className="text-[12px] px-1.5 py-0.5 rounded hover:opacity-70 transition-opacity"
          style={{ color: 'var(--fg-muted)' }}
        >
          关闭
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Title */}
        <p className="text-[14px] font-medium leading-snug" style={{ color: 'var(--fg-title)' }}>
          {data.title}
        </p>

        {/* Description */}
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
          {data.description}
        </p>

        {/* Significance */}
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>重要性:</span>
          <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: sigColor }} />
          <span className="text-[11px]" style={{ color: sigColor }}>{sigLabel}</span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>日期:</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--fg-body)' }}>{data.date}</span>
        </div>

        {/* Fact IDs */}
        {data.factIds.length > 0 && (
          <div>
            <span className="text-[11px] block mb-1" style={{ color: 'var(--fg-muted)' }}>
              关联事实 ({data.factIds.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {data.factIds.slice(0, 6).map(id => (
                <span
                  key={id}
                  className="text-[11px] px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: 'var(--surface-alt, rgba(0,0,0,0.04))',
                    color: 'var(--fg-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {id.slice(0, 8)}
                </span>
              ))}
              {data.factIds.length > 6 && (
                <span className="text-[11px] px-1.5 py-0.5" style={{ color: 'var(--fg-muted)' }}>
                  +{data.factIds.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Entity names */}
        {data.entityNames.length > 0 && (
          <div>
            <span className="text-[11px] block mb-1" style={{ color: 'var(--fg-muted)' }}>关联实体</span>
            <div className="flex flex-wrap gap-1">
              {data.entityNames.map(name => (
                <span
                  key={name}
                  className="text-[11px] px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--accent-soft, rgba(0,0,0,0.04))',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-muted, var(--border))',
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source URL */}
        {data.sourceUrl && (
          <div>
            <span className="text-[11px] block mb-1" style={{ color: 'var(--fg-muted)' }}>来源</span>
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] underline break-all"
              style={{ color: 'var(--accent)' }}
            >
              {data.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          </div>
        )}

        {/* External URL */}
        {data.externalUrl && (
          <div>
            <span className="text-[11px] block mb-1" style={{ color: 'var(--fg-muted)' }}>外部链接</span>
            <a
              href={data.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] underline break-all"
              style={{ color: '#6366f1' }}
            >
              {data.externalUrl.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Add Topic Input ── */

function AddTopicButton({ onAdd }: { onAdd: (topic: string) => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(() => {
    const topic = value.trim()
    if (!topic || loading) return

    setLoading(true)
    setStatus('正在搜索...')

    const evtSource = new EventSource(`/api/narratives/search?query=${encodeURIComponent(topic)}`)

    evtSource.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        if (data.type === 'status') {
          setStatus(data.message ?? '')
        } else if (data.type === 'done') {
          evtSource.close()
          setLoading(false)
          setStatus('')
          setValue('')
          setOpen(false)
          onAdd(topic)
        } else if (data.type === 'error') {
          evtSource.close()
          setLoading(false)
          setStatus(data.message ?? '生成失败')
        }
      } catch { /* ignore parse errors */ }
    }

    evtSource.onerror = () => {
      evtSource.close()
      setLoading(false)
      setStatus('连接失败')
    }
  }, [value, loading, onAdd])

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="shrink-0 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors border"
        style={{
          borderColor: 'var(--border)',
          borderStyle: 'dashed',
          color: 'var(--fg-muted)',
          background: 'transparent',
        }}
      >
        + 追加主题
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        placeholder="输入主题..."
        disabled={loading}
        className="px-3 py-1.5 rounded-lg border text-[13px] outline-none transition-colors"
        style={{
          borderColor: 'var(--accent)',
          background: 'var(--surface)',
          color: 'var(--fg-body)',
          width: 160,
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !value.trim()}
        className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity"
        style={{
          background: 'var(--accent)',
          color: '#fff',
          opacity: loading || !value.trim() ? 0.5 : 1,
        }}
      >
        {loading ? '生成中' : '搜索'}
      </button>
      {!loading && (
        <button
          onClick={() => { setOpen(false); setValue(''); setStatus('') }}
          className="text-[12px] px-1.5 py-1"
          style={{ color: 'var(--fg-muted)' }}
        >
          取消
        </button>
      )}
      {status && (
        <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{status}</span>
      )}
    </div>
  )
}

/* ── Main Client ── */

export function NarrativesClient({ narratives }: { narratives: StoredNarrative[] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [selectedNode, setSelectedNode] = useState<NarrativeNodeData | null>(null)

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
  const allNodes = toTimelineNodes(active.nodes)
  const factNodes = allNodes.filter(n => !n.data.isPrediction)
  const predictionNodes = allNodes.filter(n => n.data.isPrediction)

  return (
    <div>
      {/* Topic tabs + Add topic button */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 items-center">
        {narratives.map((n, i) => (
          <button
            key={i}
            onClick={() => { setActiveIdx(i); setSelectedNode(null) }}
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
        <AddTopicButton onAdd={() => { /* page will re-fetch narratives on next load */ }} />
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

      {/* Timeline + Detail Panel */}
      <div className="flex gap-4 items-start">
        {/* Timeline (main area) */}
        <div
          className="flex-1 min-w-0 rounded-lg border overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <NarrativeTimeline
            nodes={factNodes}
            edges={active.edges}
            branches={active.branches}
            status="done"
            onNodeClick={(data) => setSelectedNode(data)}
          />

          {/* Prediction section */}
          {predictionNodes.length > 0 && (
            <div className="border-t px-4 py-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-block w-2 h-2 rounded-full border-2 border-dashed"
                  style={{ borderColor: 'var(--fg-muted)' }}
                />
                <span className="text-[11px] font-medium" style={{ color: 'var(--fg-muted)' }}>
                  后续关注 / 预测
                </span>
                <span className="text-[11px]" style={{ color: 'var(--fg-muted)', opacity: 0.6 }}>
                  ({predictionNodes.length})
                </span>
              </div>
              <div className="space-y-2">
                {predictionNodes.map(node => (
                  <div
                    key={node.id}
                    className="rounded-lg border px-4 py-3 cursor-pointer transition-all hover:shadow-sm"
                    style={{
                      borderColor: 'var(--border)',
                      borderStyle: 'dashed',
                      background: 'transparent',
                      opacity: 0.7,
                    }}
                    onClick={() => setSelectedNode(node.data)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                        {node.data.date}
                      </span>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}
                      >
                        后续关注
                      </span>
                    </div>
                    <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--fg-title)' }}>
                      {node.data.title}
                    </p>
                    <p className="text-[12px] mt-1 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                      {node.data.description}
                    </p>
                    {node.data.entityNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {node.data.entityNames.slice(0, 3).map(n => (
                          <span key={n} className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--surface)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                            {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right-side detail panel */}
        {selectedNode && (
          <div className="shrink-0 sticky top-4">
            <DetailPanel data={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
