'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type Depth = 0 | 1 | 2 | 3

interface DepthContextType {
  depth: Depth
  setDepth: (d: Depth) => void
}

const DepthContext = createContext<DepthContextType>({ depth: 1, setDepth: () => {} })

export function useDepth() {
  return useContext(DepthContext)
}

const STORAGE_KEY = 'stablepulse-depth'

export function DepthProvider({ children }: { children: ReactNode }) {
  const [depth, setDepthState] = useState<Depth>(1)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const val = parseInt(stored, 10)
        if (val >= 0 && val <= 3) setDepthState(val as Depth)
      }
    } catch { /* ignore */ }
  }, [])

  const setDepth = useCallback((d: Depth) => {
    setDepthState(d)
    try { localStorage.setItem(STORAGE_KEY, String(d)) } catch { /* ignore */ }
  }, [])

  // Keyboard shortcuts: 1/2/3/4 → depth 0/1/2/3
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '1') setDepth(0)
      else if (e.key === '2') setDepth(1)
      else if (e.key === '3') setDepth(2)
      else if (e.key === '4') setDepth(3)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [setDepth])

  return (
    <DepthContext.Provider value={{ depth, setDepth }}>
      {children}
    </DepthContext.Provider>
  )
}
