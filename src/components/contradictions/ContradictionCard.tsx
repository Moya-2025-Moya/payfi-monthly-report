'use client'
import { useState } from 'react'
import type { FactContradiction, AtomicFact } from '@/lib/types'

interface Props {
  contradiction: FactContradiction
  factA?: AtomicFact
  factB?: AtomicFact
  onStatusChange?: (id: string, status: string) => void
}

const TYPE_LABELS: Record<string, string> = { numerical: '数值', textual: '文本', temporal: '时间' }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unresolved: { label: '未解决', color: 'var(--danger)' },
  resolved: { label: '已解决', color: 'var(--success)' },
  dismissed: { label: '已忽略', color: 'var(--fg-dim)' },
}

/* Highlight contradiction keywords in fact text by bolding & coloring them */
function highlightConflict(text: string, description: string): React.ReactNode {
  if (!text || !description) return text

  const numPattern = /\d[\d,.]*%?/g
  const nums = description.match(numPattern) ?? []
  if (nums.length === 0) return text

  const escaped = nums.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(pattern)

  return parts.map((part, i) => {
    if (pattern.test(part)) {
      pattern.lastIndex = 0
      return <mark key={i} className="px-0.5 rounded font-medium" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{part}</mark>
    }
    pattern.lastIndex = 0
    return <span key={i}>{part}</span>
  })
}

export function ContradictionCard({ contradiction, factA, factB, onStatusChange }: Props) {
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState(contradiction.status)
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.unresolved

  async function updateStatus(newStatus: 'resolved' | 'dismissed' | 'unresolved') {
    setUpdating(true)
    try {
      const res = await fetch('/api/contradictions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contradiction.id, status: newStatus }),
      })
      if (res.ok) {
        setStatus(newStatus)
        onStatusChange?.(contradiction.id, newStatus)
      }
    } finally { setUpdating(false) }
  }

  const contentA = factA?.content_zh || factA?.content_en || contradiction.fact_id_a
  const contentB = factB?.content_zh || factB?.content_en || contradiction.fact_id_b

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Header: status badge + type + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
            style={{ background: `color-mix(in srgb, ${sc.color} 12%, transparent)`, color: sc.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
            {sc.label}
          </span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'var(--surface-alt)', color: 'var(--fg-dim)' }}>
            {TYPE_LABELS[contradiction.contradiction_type] ?? contradiction.contradiction_type}
          </span>
        </div>
        {status === 'unresolved' && (
          <div className="flex gap-2">
            <button onClick={() => updateStatus('resolved')} disabled={updating}
              className="rounded px-2.5 py-1 text-[11px] font-medium border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--success)' }}>
              标记解决
            </button>
            <button onClick={() => updateStatus('dismissed')} disabled={updating}
              className="rounded px-2.5 py-1 text-[11px] font-medium border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              忽略
            </button>
          </div>
        )}
      </div>

      {/* Difference description */}
      <p className="text-[13px] mb-4" style={{ color: 'var(--fg-secondary)' }}>{contradiction.difference_description}</p>

      {/* Side-by-side facts with conflict highlighting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[11px] font-mono tracking-wider uppercase mb-2" style={{ color: 'var(--fg-faint)' }}>事实 A</p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
            {highlightConflict(contentA, contradiction.difference_description)}
          </p>
          {factA?.source_url && (
            <a href={factA.source_url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-mono mt-2 block transition-colors" style={{ color: 'var(--info)' }}>
              查看来源
            </a>
          )}
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[11px] font-mono tracking-wider uppercase mb-2" style={{ color: 'var(--fg-faint)' }}>事实 B</p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
            {highlightConflict(contentB, contradiction.difference_description)}
          </p>
          {factB?.source_url && (
            <a href={factB.source_url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-mono mt-2 block transition-colors" style={{ color: 'var(--info)' }}>
              查看来源
            </a>
          )}
        </div>
      </div>

      {contradiction.resolved_note && (
        <p className="text-[11px] font-mono mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)', color: 'var(--fg-dim)' }}>
          {contradiction.resolved_note}
        </p>
      )}
    </div>
  )
}
