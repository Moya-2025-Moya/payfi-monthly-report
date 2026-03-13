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

/* ── Thread + Prediction types ── */

interface ThreadEntry {
  week_number: string
  summary: string
  key_developments: string[]
  node_count: number
  significance: string
}

interface NarrativeThread {
  id: string
  topic: string
  slug: string
  status: string
  first_seen_week: string
  last_updated_week: string
  total_weeks: number
  entries: ThreadEntry[]
}

interface Prediction {
  id: string
  narrative_topic: string
  week_number: string
  title: string
  description: string | null
  watched: boolean
  status: string
  review_note: string | null
  reviewed_week: string | null
}

const PRED_STATUS_COLORS: Record<string, { color: string; label: string }> = {
  pending: { color: 'var(--fg-muted)', label: '待验证' },
  confirmed: { color: 'var(--success)', label: '已确认' },
  invalidated: { color: 'var(--danger)', label: '未验证' },
  ongoing: { color: 'var(--info)', label: '持续中' },
}

/* ── Cross-week Thread Timeline ── */
function ThreadTimeline({ threads }: { threads: NarrativeThread[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (threads.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[13px] font-medium" style={{ color: 'var(--fg-title)' }}>跨周叙事线索</h3>
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
          {threads.length}
        </span>
      </div>
      <div className="space-y-2">
        {threads.map(thread => {
          const isExpanded = expandedId === thread.id
          const statusLabel = thread.status === 'active' ? '进行中' : '休眠'
          const statusColor = thread.status === 'active' ? 'var(--success)' : 'var(--warning)'

          return (
            <div key={thread.id} className="rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : thread.id)}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                  <span className="text-[13px] font-medium" style={{ color: 'var(--fg-title)' }}>
                    {thread.topic}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded"
                    style={{ color: statusColor, background: `${statusColor}12` }}>
                    {statusLabel} · 第{thread.total_weeks}周
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                    {thread.first_seen_week} → {thread.last_updated_week}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--fg-muted)" strokeWidth="1.5"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>
                    <path d="M4 2l4 4-4 4" />
                  </svg>
                </div>
              </div>

              {isExpanded && thread.entries.length > 0 && (
                <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  {/* Horizontal week timeline */}
                  <div className="flex gap-3 overflow-x-auto py-3">
                    {thread.entries.map((entry, i) => {
                      const sigColor = entry.significance === 'high' ? '#ef4444' : entry.significance === 'medium' ? '#f59e0b' : 'var(--fg-muted)'
                      return (
                        <div key={i} className="shrink-0 w-[200px] rounded-md border p-3"
                          style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-[6px] h-[6px] rounded-full" style={{ background: sigColor }} />
                            <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--fg-muted)' }}>
                              {entry.week_number}
                            </span>
                            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                              {entry.node_count} 节点
                            </span>
                          </div>
                          <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: 'var(--fg-body)' }}>
                            {entry.summary}
                          </p>
                          {entry.key_developments.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {entry.key_developments.slice(0, 2).map((d, j) => (
                                <p key={j} className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
                                  · {d}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Prediction Tracker ── */
function PredictionTracker({ predictions }: { predictions: Prediction[] }) {
  if (predictions.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[13px] font-medium" style={{ color: 'var(--fg-title)' }}>预测追踪</h3>
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
          {predictions.length}
        </span>
      </div>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {predictions.map((pred, i) => {
          const sc = PRED_STATUS_COLORS[pred.status] ?? PRED_STATUS_COLORS.pending
          return (
            <div key={pred.id}
              className={`px-4 py-3 ${i < predictions.length - 1 ? 'border-b' : ''}`}
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>{pred.week_number}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: sc.color, background: `${sc.color}12` }}>
                      {sc.label}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{pred.narrative_topic}</span>
                  </div>
                  <p className="text-[13px]" style={{ color: 'var(--fg-body)' }}>{pred.title}</p>
                  {pred.description && (
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{pred.description}</p>
                  )}
                  {pred.review_note && (
                    <p className="text-[11px] mt-1 italic" style={{ color: sc.color }}>
                      回顾 ({pred.reviewed_week}): {pred.review_note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Client ── */

export function NarrativesClient({ narratives, threads = [], predictions = [] }: { narratives: StoredNarrative[]; threads?: NarrativeThread[]; predictions?: Prediction[] }) {
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
      {/* Cross-week thread timeline */}
      <ThreadTimeline threads={threads} />

      {/* Prediction tracker */}
      <PredictionTracker predictions={predictions} />

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
