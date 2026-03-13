'use client'

import { useFocusLens } from './FocusLensProvider'

interface EntityTagProps {
  name: string
  factIds?: string[]
}

export function EntityTag({ name, factIds = [] }: EntityTagProps) {
  const { focusedEntity, setFocus, clearFocus } = useFocusLens()
  const isActive = focusedEntity === name

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (isActive) {
      clearFocus()
    } else {
      setFocus(name, factIds)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="px-1.5 py-0.5 rounded text-[11px] font-medium transition-all duration-200 cursor-pointer"
      style={{
        color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
        border: `1px solid ${isActive ? 'var(--accent-muted)' : 'var(--border)'}`,
        background: isActive ? 'var(--accent-soft)' : 'transparent',
      }}
    >
      {name}
    </button>
  )
}
