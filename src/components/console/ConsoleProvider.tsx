'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface ConsoleContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const ConsoleContext = createContext<ConsoleContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
})

export function useConsole() {
  return useContext(ConsoleContext)
}

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])

  // Cmd+K global shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(v => !v)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <ConsoleContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </ConsoleContext.Provider>
  )
}
