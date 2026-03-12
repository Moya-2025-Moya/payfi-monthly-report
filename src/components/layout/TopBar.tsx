'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useState, useRef, useEffect, useCallback } from 'react'

/* ── Orange Mountain Logo ── */
function MountainLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 32L20 8L32 32H8Z" fill="#ff6d00" opacity="0.35" />
      <path d="M14 32L26 12L38 32H14Z" fill="#ff6d00" />
      <path d="M26 12L23 18L26 16.5L29 18L26 12Z" fill="#ff8a33" opacity="0.6" />
    </svg>
  )
}

/* ── Theme Toggle ── */
function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} className="p-1.5 rounded-md transition-colors"
      style={{ color: 'var(--fg-muted)' }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? (
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.3 3.3l.7.7M11 11l.7.7M11.7 3.3l-.7.7M4 11l-.7.7" />
          <circle cx="7.5" cy="7.5" r="2.5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M13 9.5A6 6 0 115.5 2a5 5 0 007.5 7.5z" />
        </svg>
      )}
    </button>
  )
}

/* ── Search Icon ── */
function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l3.5 3.5" />
    </svg>
  )
}

/* ── Search Result Type ── */
interface SearchResult {
  id: string
  content_en: string
  content_zh: string | null
  fact_date: string
  source_url: string
}

/* ── Extract domain from URL ── */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/* ── Truncate text ── */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

/* ── Global Search Bar ── */
function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const closeDropdown = useCallback(() => {
    setOpen(false)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [closeDropdown])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDropdown()
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [closeDropdown])

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setOpen(true)
    try {
      const res = await fetch(`/api/facts/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Search failed')
      const data: SearchResult[] = await res.json()
      setResults(data.slice(0, 8))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div ref={containerRef} className="relative" style={{ marginLeft: 'auto', marginRight: '12px' }}>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md border"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <span style={{ color: 'var(--fg-faint)', display: 'flex', alignItems: 'center' }}>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search facts..."
          className="bg-transparent border-none outline-none text-[12px]"
          style={{
            color: 'var(--fg-body)',
            width: '140px',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-1 rounded-lg border shadow-lg overflow-hidden"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            width: '380px',
            maxHeight: '420px',
            overflowY: 'auto',
            zIndex: 50,
          }}
        >
          {loading && (
            <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--fg-muted)' }}>
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--fg-muted)' }}>
              No results found
            </div>
          )}
          {!loading && results.map(fact => (
            <button
              key={fact.id}
              className="w-full text-left px-3 py-2.5 border-b transition-colors"
              style={{
                borderColor: 'var(--border)',
                cursor: 'pointer',
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover, var(--border))')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => closeDropdown()}
            >
              <div className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-body)' }}>
                {truncate(fact.content_en, 120)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px]" style={{ color: 'var(--fg-faint)' }}>
                  {fact.fact_date ? new Date(fact.fact_date).toLocaleDateString() : '--'}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--fg-faint)' }}>
                  {getDomain(fact.source_url)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const TAB_GROUPS = [
  {
    key: 'browse',
    label: '浏览',
    items: [
      { href: '/', label: '周报' },
      { href: '/entities', label: '实体' },
      { href: '/notes', label: '笔记' },
    ],
  },
  {
    key: 'analysis',
    label: '分析',
    items: [
      { href: '/narratives', label: '叙事时间线' },
    ],
  },
  {
    key: 'system',
    label: '系统',
    items: [
      { href: '/snapshots', label: '历史周报' },
      { href: '/settings', label: '设置' },
    ],
  },
] as const

export function getActiveGroup(pathname: string): string {
  for (const group of TAB_GROUPS) {
    for (const item of group.items) {
      if (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) {
        return group.key
      }
    }
  }
  return 'browse'
}

export function TopBar() {
  const pathname = usePathname()
  const activeGroup = getActiveGroup(pathname)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center h-[var(--topbar-h)] px-4 border-b"
      style={{ background: 'var(--topbar-bg)', borderColor: 'var(--topbar-border)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-6 shrink-0">
        <MountainLogo />
        <span className="text-[13px] font-semibold tracking-wider uppercase" style={{ color: 'var(--fg-title)' }}>
          StablePulse
        </span>
      </Link>

      {/* Tab groups */}
      <nav className="flex items-center gap-1">
        {TAB_GROUPS.map(group => {
          const isActive = activeGroup === group.key
          return (
            <Link
              key={group.key}
              href={group.items[0].href}
              className="px-3 py-1.5 rounded-md text-[13px] font-medium tracking-wide transition-colors"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
                background: isActive ? 'var(--accent-soft)' : 'transparent',
              }}
            >
              {group.label}
            </Link>
          )
        })}
      </nav>

      {/* Search bar - fills remaining space, pushed right */}
      <SearchBar />

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-faint)' }}>v0.1.0</span>
        <ThemeToggle />
      </div>
    </header>
  )
}
