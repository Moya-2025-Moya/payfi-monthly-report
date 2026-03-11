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
          placeholder="Search facts by keyword..."
          className="flex-1 rounded border px-4 py-2.5 text-[13px] outline-none font-mono transition-colors focus:border-[#333]"
          style={{ borderColor: '#1a1a1a', background: '#0a0a0a', color: '#e5e5e5' }}
        />
        <button
          type="submit"
          className="rounded px-6 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-80"
          style={{ background: '#fff', color: '#000' }}
        >
          Search
        </button>
      </form>

      {loading ? (
        <p className="text-[13px] font-mono" style={{ color: '#333' }}>Searching...</p>
      ) : hasSearched ? (
        results.length > 0 ? (
          <>
            <p className="text-[12px] font-mono tracking-wider uppercase" style={{ color: '#444' }}>
              {results.length} result{results.length === 1 ? '' : 's'} found
            </p>
            <FactList facts={results} />
          </>
        ) : (
          <div className="py-16 text-center space-y-2">
            <p className="text-[13px] font-medium" style={{ color: '#666' }}>No results found</p>
            <p className="text-[12px] font-mono" style={{ color: '#333' }}>
              Try different keywords, or check for typos.
            </p>
          </div>
        )
      ) : (
        <p className="text-[13px] font-mono" style={{ color: '#333' }}>Enter a keyword to search across all verified atomic facts.</p>
      )}
    </div>
  )
}
