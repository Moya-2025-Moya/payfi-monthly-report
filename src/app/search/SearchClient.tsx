'use client'
import { useState, useEffect, useRef } from 'react'
import { FactList } from '@/components/facts/FactList'
import type { AtomicFact } from '@/lib/types'

const FACT_TYPES = [
  { key: '', label: '全部类型' },
  { key: 'event', label: '事件' },
  { key: 'metric', label: '指标' },
  { key: 'quote', label: '引述' },
  { key: 'relationship', label: '关系' },
  { key: 'status_change', label: '状态变更' },
]

const TIME_RANGES = [
  { key: '', label: '全部时间' },
  { key: '7', label: '最近7天' },
  { key: '30', label: '最近30天' },
  { key: '90', label: '最近90天' },
]

export function SearchClient({ initialQuery, initialResults }: { initialQuery: string; initialResults: AtomicFact[] }) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState(initialResults)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(initialQuery.trim().length > 0)
  const [factType, setFactType] = useState('')
  const [timeRange, setTimeRange] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function filterResults(facts: AtomicFact[]): AtomicFact[] {
    let filtered = facts
    if (factType) {
      filtered = filtered.filter(f => f.fact_type === factType)
    }
    if (timeRange) {
      const days = parseInt(timeRange, 10)
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      filtered = filtered.filter(f => new Date(f.fact_date).toISOString() >= cutoff)
    }
    return filtered
  }

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

  const filteredResults = filterResults(results)

  const selectStyle = {
    borderColor: 'var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--fg)',
  }

  return (
    <div className="space-y-4">
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={factType}
          onChange={e => setFactType(e.target.value)}
          className="rounded-md border px-2.5 py-1.5 text-[12px] outline-none font-mono"
          style={selectStyle}
        >
          {FACT_TYPES.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
          className="rounded-md border px-2.5 py-1.5 text-[12px] outline-none font-mono"
          style={selectStyle}
        >
          {TIME_RANGES.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      {hasSearched ? (
        filteredResults.length > 0 ? (
          <>
            <div className="flex items-center gap-3">
              <p className="text-[12px] font-mono tracking-wider" style={{ color: 'var(--fg-faint)' }}>
                找到 {filteredResults.length} 条结果
                {filteredResults.length !== results.length && ` (共 ${results.length} 条，已过滤)`}
              </p>
              {loading && <span className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>更新中...</span>}
            </div>
            <FactList facts={filteredResults} />
          </>
        ) : loading ? (
          <p className="text-[13px] font-mono" style={{ color: 'var(--fg-faint)' }}>搜索中...</p>
        ) : (
          <div className="py-16 text-center space-y-2">
            <p className="text-[13px] font-medium" style={{ color: 'var(--fg-secondary)' }}>未找到结果</p>
            <p className="text-[12px] font-mono" style={{ color: 'var(--fg-faint)' }}>
              试试其他关键词或调整过滤条件。
            </p>
          </div>
        )
      ) : (
        <p className="text-[13px] font-mono" style={{ color: 'var(--fg-faint)' }}>输入关键词搜索所有已验证的原子事实。</p>
      )}
    </div>
  )
}
