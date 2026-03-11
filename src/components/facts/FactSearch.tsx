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
        className="flex-1 rounded border px-3 py-2 text-[13px] outline-none font-mono transition-colors focus:border-[#333]"
        style={{ borderColor: '#1a1a1a', background: '#0a0a0a', color: '#e5e5e5' }}
      />
      <button type="submit"
        className="rounded px-5 py-2 text-[13px] font-medium transition-opacity hover:opacity-80"
        style={{ background: '#fff', color: '#000' }}>
        Search
      </button>
    </form>
  )
}
