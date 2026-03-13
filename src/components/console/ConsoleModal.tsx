'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConsole } from './ConsoleProvider'
import { ConsoleInput } from './ConsoleInput'
import { ConsoleResultCard } from './ConsoleResultCard'
import { useDepth } from '@/components/depth/DepthProvider'
import { useFocusLens } from '@/components/focus/FocusLensProvider'

interface ResultItem {
  type: 'fact' | 'ai' | 'timeline' | 'error' | 'system'
  content: string
  facts?: { content: string; date?: string; source_url?: string }[]
  timelineEvents?: { date: string; event: string; isPrediction?: boolean }[]
}

export function ConsoleModal() {
  const { isOpen, close } = useConsole()
  const { setDepth } = useDepth()
  const { setFocus } = useFocusLens()
  const [results, setResults] = useState<ResultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, close])

  const handleQuery = useCallback(async (query: string) => {
    const q = query.trim().toLowerCase()

    // Console → Depth synergy: "depth N" command
    const depthMatch = q.match(/^depth\s+([0-3])$/)
    if (depthMatch) {
      const d = parseInt(depthMatch[1], 10) as 0 | 1 | 2 | 3
      setDepth(d)
      setResults(prev => [{ type: 'system', content: `深度已切换至 ${d}（${{ 0: '扫描', 1: '上下文', 2: '验证', 3: '证据' }[d]}模式）` }, ...prev])
      return
    }

    // Console → Focus synergy: "focus EntityName" command
    const focusMatch = q.match(/^focus\s+(.+)$/i)
    if (focusMatch) {
      const entity = focusMatch[1].trim()
      setFocus(entity, [])
      close()
      setResults(prev => [{ type: 'system', content: `已聚焦实体: ${entity}` }, ...prev])
      return
    }

    setIsLoading(true)
    try {
      // Route to /api/narratives/chat
      const res = await fetch('/api/narratives/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      })

      if (!res.ok) {
        setResults(prev => [{ type: 'error', content: `查询失败 (${res.status})` }, ...prev])
        return
      }

      const data = await res.json()
      const result: ResultItem = {
        type: 'ai',
        content: data.response || data.message || JSON.stringify(data),
        facts: data.facts,
      }
      setResults(prev => [result, ...prev])
    } catch (err) {
      setResults(prev => [{ type: 'error', content: `网络错误: ${err}` }, ...prev])
    } finally {
      setIsLoading(false)
    }
  }, [setDepth, setFocus, close])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] md:pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={close} />

      {/* Modal — full width on mobile, capped on desktop */}
      <div
        className="relative w-full max-w-[640px] mx-2 md:mx-4 rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '70vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[12px] font-medium" style={{ color: 'var(--fg-muted)' }}>Intelligence Console</span>
          <div className="flex items-center gap-2">
            <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>ESC</kbd>
          </div>
        </div>

        {/* Input */}
        <ConsoleInput onSubmit={handleQuery} isLoading={isLoading} />

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 100px)' }}>
          {results.length === 0 && !isLoading && (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>
                输入查询开始搜索
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {['Circle IPO timeline', 'compare USDC vs USDT', 'depth 2', 'focus Circle', '这周'].map(hint => (
                  <button key={hint} onClick={() => handleQuery(hint)}
                    className="text-[11px] px-2 py-1 rounded border transition-colors hover:border-[var(--accent-muted)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
          {results.map((r, i) => (
            <div key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
              <ConsoleResultCard result={r} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
