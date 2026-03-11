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

  // Debounced auto-search: fires 300ms after user stops typing
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
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search facts by keyword..."
          className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
        />
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          Search
        </button>
      </form>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Searching...</p>
      ) : hasSearched ? (
        results.length > 0 ? (
          <>
            <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
              {results.length} result{results.length === 1 ? '' : 's'} found
            </p>
            <FactList facts={results} />
          </>
        ) : (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium">No results found</p>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              Try different keywords, or check for typos. Results are limited to verified and partially verified facts.
            </p>
          </div>
        )
      ) : (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Enter a keyword to search across all verified atomic facts.</p>
      )}
    </div>
  )
}
