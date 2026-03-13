'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface FocusLensContextType {
  focusedEntity: string | null
  focusedEntityFacts: Set<string>
  setFocus: (entity: string, factIds: string[]) => void
  clearFocus: () => void
}

const FocusLensContext = createContext<FocusLensContextType>({
  focusedEntity: null,
  focusedEntityFacts: new Set(),
  setFocus: () => {},
  clearFocus: () => {},
})

export function useFocusLens() {
  return useContext(FocusLensContext)
}

export function FocusLensProvider({ children }: { children: ReactNode }) {
  const [focusedEntity, setFocusedEntity] = useState<string | null>(null)
  const [focusedEntityFacts, setFocusedEntityFacts] = useState<Set<string>>(new Set())

  const setFocus = useCallback((entity: string, factIds: string[]) => {
    setFocusedEntity(entity)
    setFocusedEntityFacts(new Set(factIds))
  }, [])

  const clearFocus = useCallback(() => {
    setFocusedEntity(null)
    setFocusedEntityFacts(new Set())
  }, [])

  // Escape key to clear focus
  useEffect(() => {
    if (!focusedEntity) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setFocusedEntity(null)
        setFocusedEntityFacts(new Set())
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [focusedEntity])

  return (
    <FocusLensContext.Provider value={{ focusedEntity, focusedEntityFacts, setFocus, clearFocus }}>
      {children}
    </FocusLensContext.Provider>
  )
}
