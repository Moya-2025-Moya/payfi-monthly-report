'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface ConsoleInputProps {
  onSubmit: (query: string) => void
  isLoading: boolean
}

export function ConsoleInput({ onSubmit, isLoading }: ConsoleInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    const q = value.trim()
    if (!q || isLoading) return
    setHistory(h => [q, ...h].slice(0, 50))
    setHistoryIdx(-1)
    onSubmit(q)
    setValue('')
  }, [value, isLoading, onSubmit])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const next = Math.min(historyIdx + 1, history.length - 1)
        setHistoryIdx(next)
        setValue(history[next])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx > 0) {
        const next = historyIdx - 1
        setHistoryIdx(next)
        setValue(history[next])
      } else {
        setHistoryIdx(-1)
        setValue('')
      }
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="text-[14px]" style={{ color: 'var(--fg-muted)' }}>&gt;</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => { setValue(e.target.value); setHistoryIdx(-1) }}
        onKeyDown={handleKeyDown}
        placeholder="输入查询... (timeline, compare, show, 或自然语言)"
        className="flex-1 bg-transparent outline-none text-[14px]"
        style={{ color: 'var(--fg-body)' }}
        disabled={isLoading}
      />
      {isLoading && (
        <span className="text-[12px] animate-pulse" style={{ color: 'var(--fg-muted)' }}>思考中...</span>
      )}
    </div>
  )
}
