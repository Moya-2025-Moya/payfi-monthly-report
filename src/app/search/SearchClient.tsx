'use client'
import { useState, useEffect, useRef } from 'react'
import { FactList } from '@/components/facts/FactList'
import type { AtomicFact } from '@/lib/types'

export function SearchClient({ initialQuery, initialResults }: { initialQuery: string; initialResults: AtomicFact[] }) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState(initialResults)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(initialQuery.trim().length > 0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function doSearch(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setHasSearched(true)
    try {
      const res = await fetch(`/api/facts/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) return
    debounceRef.current = setTimeout(() => {
      doSearch(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    doSearch(query)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="输入关键词搜索事实..."
          className="flex-1 rounded-lg border px-4 py-2.5 text-[13px] outline-none font-mono transition-colors"
          style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
        />
        <button
          type="submit"
          className="rounded-lg px-6 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          搜索
        </button>
      </form>

      {hasSearched ? (
        results.length > 0 ? (
          <>
            <div className="flex items-center gap-3">
              <p className="text-[12px] font-mono tracking-wider" style={{ color: 'var(--fg-faint)' }}>
                找到 {results.length} 条结果
              </p>
              {loading && <span className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>更新中...</span>}
            </div>
            <FactList facts={results} />
          </>
        ) : loading ? (
          <p className="text-[13px] font-mono" style={{ color: 'var(--fg-faint)' }}>搜索中...</p>
        ) : (
          <div className="py-16 text-center space-y-2">
            <p className="text-[13px] font-medium" style={{ color: 'var(--fg-secondary)' }}>未找到结果</p>
            <p className="text-[12px] font-mono" style={{ color: 'var(--fg-faint)' }}>
              试试其他关键词，或检查拼写。
            </p>
          </div>
        )
      ) : (
        <p className="text-[13px] font-mono" style={{ color: 'var(--fg-faint)' }}>输入关键词搜索所有已验证的原子事实。</p>
      )}
    </div>
  )
}
