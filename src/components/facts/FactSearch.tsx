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
        className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
        style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
      />
      <button type="submit"
        className="rounded-md px-4 py-2 text-sm font-medium"
        style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
        Search
      </button>
    </form>
  )
}
