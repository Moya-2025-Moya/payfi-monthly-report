'use client'
import { useState } from 'react'

interface FactSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export function FactSearch({ onSearch, placeholder = 'Search facts...' }: FactSearchProps) {
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none font-mono transition-colors focus:border-[var(--border-hover)]"
        style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
      />
      <button type="submit"
        className="rounded-lg px-5 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
        style={{ background: 'var(--fg-title)', color: 'var(--bg)' }}>
        Search
      </button>
    </form>
  )
}
