'use client'

import type { NarrativeTab } from '@/app/narratives/NarrativesClient'

interface Props {
  tabs: NarrativeTab[]
  activeTabId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  mergedView: boolean
  onToggleMerge: () => void
}

const STATUS_DOT: Record<string, string> = {
  streaming: '#3b82f6',
  done: '#22c55e',
  error: '#ef4444',
  idle: 'var(--fg-muted)',
}

export function NarrativeTabBar({ tabs, activeTabId, onSelect, onClose, mergedView, onToggleMerge }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto flex-1">
      {tabs.map(tab => {
        const active = tab.id === activeTabId
        return (
          <button key={tab.id} onClick={() => onSelect(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] whitespace-nowrap transition-colors"
            style={{
              background: active ? 'var(--accent-soft)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--fg-muted)',
              border: active ? '1px solid var(--accent-muted)' : '1px solid transparent',
            }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: STATUS_DOT[tab.status] ?? STATUS_DOT.idle }} />
            <span className="max-w-[120px] truncate">{tab.query}</span>
            <span onClick={e => { e.stopPropagation(); onClose(tab.id) }}
              className="ml-1 hover:opacity-100 opacity-50 text-[15px]">&times;</span>
          </button>
        )
      })}
      {tabs.length >= 2 && (
        <button onClick={onToggleMerge}
          className="ml-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          style={{
            background: mergedView ? 'var(--accent)' : 'var(--bg-card)',
            color: mergedView ? '#fff' : 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}>
          {mergedView ? '合并视图' : '合并'}
        </button>
      )}
    </div>
  )
}
