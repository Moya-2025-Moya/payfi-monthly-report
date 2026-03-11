'use client'
import { useState } from 'react'
import type { FactContradiction, AtomicFact } from '@/lib/types'

interface Props {
  contradiction: FactContradiction
  factA?: AtomicFact
  factB?: AtomicFact
  onStatusChange?: (id: string, status: string) => void
}

const TYPE_LABELS: Record<string, string> = { numerical: 'num', textual: 'text', temporal: 'time' }

function statusColor(s: string) {
  if (s === 'unresolved') return 'var(--danger)'
  if (s === 'resolved') return 'var(--success)'
  return 'var(--fg-faint)'
}

export function ContradictionCard({ contradiction, factA, factB, onStatusChange }: Props) {
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState(contradiction.status)

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
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(status) }} />
          <span className="text-[11px] font-mono" style={{ color: statusColor(status) }}>{status}</span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--fg-faint)' }}>{TYPE_LABELS[contradiction.contradiction_type] ?? contradiction.contradiction_type}</span>
        </div>
        {status === 'unresolved' && (
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus('resolved')}
              disabled={updating}
              className="rounded px-2.5 py-1 text-[10px] font-mono border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--success)' }}
            >
              Resolve
            </button>
            <button
              onClick={() => updateStatus('dismissed')}
              disabled={updating}
              className="rounded px-2.5 py-1 text-[10px] font-mono border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      <p className="text-[13px] mb-4" style={{ color: 'var(--fg-secondary)' }}>{contradiction.difference_description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'var(--fg-faint)' }}>Fact A</p>
          <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>{factA?.content_en ?? contradiction.fact_id_a}</p>
          {factA?.source_url && <a href={factA.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono mt-2 block transition-colors" style={{ color: 'var(--fg-faint)' }}>source ↗</a>}
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'var(--fg-faint)' }}>Fact B</p>
          <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>{factB?.content_en ?? contradiction.fact_id_b}</p>
          {factB?.source_url && <a href={factB.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono mt-2 block transition-colors" style={{ color: 'var(--fg-faint)' }}>source ↗</a>}
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
