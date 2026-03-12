'use client'

import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { NarrativeNodeData } from '@/app/narratives/NarrativesClient'

const SIG = {
  high: { border: '#ef4444', bg: '#ef444415', dot: '#ef4444' },
  medium: { border: '#f59e0b', bg: '#f59e0b10', dot: '#f59e0b' },
  low: { border: 'var(--border)', bg: 'var(--bg-card)', dot: 'var(--fg-muted)' },
}

function Node({ data }: NodeProps) {
  const [open, setOpen] = useState(false)
  const d = data as unknown as NarrativeNodeData
  const c = SIG[d.significance] ?? SIG.low

  return (
    <div className="rounded-lg border px-3 py-2 cursor-pointer transition-shadow hover:shadow-md"
      style={{ borderColor: c.border, background: c.bg, minWidth: 200, maxWidth: 280 }}
      onClick={e => { e.stopPropagation(); setOpen(v => !v) }}>
      <Handle type="target" position={Position.Top} style={{ background: c.dot, width: 8, height: 8 }} />
      <div className="text-[10px] font-mono mb-1" style={{ color: 'var(--fg-muted)' }}>{d.date}</div>
      <div className="text-[12px] font-medium leading-tight mb-1" style={{ color: 'var(--fg-body)' }}>{d.title}</div>
      {d.entityNames?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {d.entityNames.map(n => (
            <span key={n} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{n}</span>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--fg-body)' }}>{d.description}</p>
          {d.sourceUrl && (
            <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] underline"
              style={{ color: 'var(--accent)' }} onClick={e => e.stopPropagation()}>查看来源</a>
          )}
          <div className="mt-1 text-[10px]" style={{ color: 'var(--fg-muted)' }}>{d.factIds.length} 条事实 · 点击追问</div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: c.dot, width: 8, height: 8 }} />
    </div>
  )
}

export const NarrativeNode = memo(Node)
