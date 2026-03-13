'use client'

import { useFocusLens } from './FocusLensProvider'

interface FocusOverlayProps {
  entityInfo?: {
    category?: string
    factCount?: number
  }
}

export function FocusOverlay({ entityInfo }: FocusOverlayProps) {
  const { focusedEntity, clearFocus } = useFocusLens()

  if (!focusedEntity) return null

  return (
    <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-lg shadow-lg"
      style={{ background: 'var(--surface)', border: '1px solid var(--accent-muted)' }}>
      <div className="flex items-center gap-3">
        <span className="text-[14px] font-semibold" style={{ color: 'var(--fg-title)' }}>
          {focusedEntity}
        </span>
        {entityInfo?.category && (
          <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            {entityInfo.category}
          </span>
        )}
        {entityInfo?.factCount != null && (
          <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
            {entityInfo.factCount} 条事实
          </span>
        )}
        <button
          onClick={clearFocus}
          className="px-2 py-0.5 rounded text-[11px] font-medium"
          style={{ color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
        >
          ESC 退出
        </button>
      </div>
    </div>
  )
}
