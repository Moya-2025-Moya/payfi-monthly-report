'use client'

import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { NarrativeNodeData } from '@/app/narratives/NarrativesClient'

function MergedNode({ data }: NodeProps) {
  const [open, setOpen] = useState(false)
  const d = data as unknown as NarrativeNodeData

  return (
    <div className="rounded-lg border-2 px-4 py-3 cursor-pointer transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)', minWidth: 280, maxWidth: 360 }}
      onClick={e => { e.stopPropagation(); setOpen(v => !v) }}>
      <Handle type="target" position={Position.Top} style={{ background: 'var(--accent)', width: 10, height: 10 }} />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>{d.date}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>多方事件</span>
      </div>
      <div className="text-[13px] font-medium leading-tight mb-2" style={{ color: 'var(--fg-body)' }}>{d.title}</div>
      {d.participants && (
        <div className="flex flex-wrap gap-1.5">
          {d.participants.map(p => (
            <span key={p.name} className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{ borderColor: 'var(--accent-muted)', color: 'var(--fg-body)' }}>
              {p.name}{p.role && <span className="ml-1" style={{ color: 'var(--fg-muted)' }}>({p.role})</span>}
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--accent-muted)' }}>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--fg-body)' }}>{d.description}</p>
          <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{d.factIds.length} 条事实 · 点击追问</div>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent)', width: 10, height: 10 }} />
    </div>
  )
}

export const NarrativeMergedNode = memo(MergedNode)
