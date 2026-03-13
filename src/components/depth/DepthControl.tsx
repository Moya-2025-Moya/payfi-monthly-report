'use client'

import { useDepth } from './DepthProvider'

const LABELS = [
  { depth: 0 as const, label: '扫描', shortcut: '1' },
  { depth: 1 as const, label: '上下文', shortcut: '2' },
  { depth: 2 as const, label: '验证', shortcut: '3' },
  { depth: 3 as const, label: '证据', shortcut: '4' },
]

export function DepthControl() {
  const { depth, setDepth } = useDepth()

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
      {LABELS.map(item => {
        const isActive = depth === item.depth
        return (
          <button
            key={item.depth}
            onClick={() => setDepth(item.depth)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-150"
            style={{
              background: isActive ? 'var(--surface)' : 'transparent',
              color: isActive ? 'var(--fg-title)' : 'var(--fg-muted)',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {item.label}
            <kbd className="text-[10px] opacity-50 hidden md:inline">{item.shortcut}</kbd>
          </button>
        )
      })}
    </div>
  )
}
