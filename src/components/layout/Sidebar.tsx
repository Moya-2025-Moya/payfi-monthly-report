'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const NAV_ITEMS = [
  { href: '/', label: 'Feed', icon: '📡' },
  { href: '/entities', label: 'Entities', icon: '🏢' },
  { href: '/timelines', label: 'Timelines', icon: '📅' },
  { href: '/graph', label: 'Graph', icon: '🕸' },
  { href: '/search', label: 'Search', icon: '🔍' },
  { divider: true },
  { href: '/regulatory', label: 'Regulatory', icon: '⚖' },
  { href: '/twitter', label: 'Twitter Voices', icon: '🐦' },
  { href: '/diff', label: 'Weekly Diff', icon: '±' },
  { href: '/density', label: 'Density', icon: '📊' },
  { href: '/blind-spots', label: 'Blind Spots', icon: '🔦' },
  { href: '/contradictions', label: 'Contradictions', icon: '⚡' },
  { divider: true },
  { href: '/snapshots', label: 'Snapshots', icon: '📸' },
  { href: '/chat', label: 'AI Chat', icon: '💬' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
] as const

function SidebarContent({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  return (
    <>
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="text-lg font-bold" onClick={onNavClick}>StablePulse</Link>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Atomic Knowledge Engine</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item, i) => {
          if ('divider' in item) {
            return <hr key={i} className="my-2" style={{ borderColor: 'var(--border)' }} />
          }
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              onClick={onNavClick}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:opacity-80 transition-opacity"
              style={{
                color: 'var(--foreground)',
                background: isActive ? 'var(--muted)' : 'transparent',
                fontWeight: isActive ? 600 : undefined,
              }}>
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close when clicking outside the drawer panel
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) {
      setMobileOpen(false)
    }
  }

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className="hidden md:flex fixed top-0 left-0 h-screen w-[var(--sidebar-w)] border-r flex-col"
        style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
      >
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md"
        style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="5" x2="18" y2="5" />
          <line x1="2" y1="10" x2="18" y2="10" />
          <line x1="2" y1="15" x2="18" y2="15" />
        </svg>
      </button>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={handleOverlayClick}
        >
          <aside
            className="flex flex-col h-full w-64 border-r"
            style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
          >
            {/* Close button */}
            <button
              className="absolute top-3 right-3 p-2 rounded-md"
              style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="2" x2="14" y2="14" />
                <line x1="14" y1="2" x2="2" y2="14" />
              </svg>
            </button>

            <SidebarContent pathname={pathname} onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
