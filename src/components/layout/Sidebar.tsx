'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/components/theme/ThemeProvider'

/* ── Orange Mountain Logo ── */
function MountainLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back peak */}
      <path d="M8 32L20 8L32 32H8Z" fill="#ff6d00" opacity="0.35" />
      {/* Front peak */}
      <path d="M14 32L26 12L38 32H14Z" fill="#ff6d00" />
      {/* Snow cap accent */}
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
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.3 3.3l.7.7M11 11l.7.7M11.7 3.3l-.7.7M4 11l-.7.7" />
          <circle cx="7.5" cy="7.5" r="2.5" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M13 9.5A6 6 0 115.5 2a5 5 0 007.5 7.5z" />
        </svg>
      )}
    </button>
  )
}

const NAV_SECTIONS = [
  {
    label: 'Browse',
    items: [
      { href: '/', label: 'Feed' },
      { href: '/entities', label: 'Entities' },
      { href: '/timelines', label: 'Timelines' },
      { href: '/graph', label: 'Graph' },
      { href: '/search', label: 'Search' },
    ]
  },
  {
    label: 'Analysis',
    items: [
      { href: '/regulatory', label: 'Regulatory' },
      { href: '/twitter', label: 'Twitter' },
      { href: '/diff', label: 'Diff' },
      { href: '/density', label: 'Density' },
      { href: '/blind-spots', label: 'Blind Spots' },
      { href: '/contradictions', label: 'Contradictions' },
    ]
  },
  {
    label: 'System',
    items: [
      { href: '/snapshots', label: 'Snapshots' },
      { href: '/chat', label: 'Chat' },
      { href: '/settings', label: 'Settings' },
    ]
  },
]

function SidebarContent({ pathname, onNavClick }: { pathname: string; onNavClick?: () => void }) {
  return (
    <>
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5" onClick={onNavClick}>
          <MountainLogo />
          <span className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--fg-title)' }}>
            StablePulse
          </span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className="mb-5">
            <p className="px-2 mb-1.5 text-[10px] font-medium tracking-widest uppercase" style={{ color: 'var(--fg-faint)' }}>
              {section.label}
            </p>
            {section.items.map(item => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} onClick={onNavClick}
                  className="block px-2 py-1.5 rounded text-[13px] transition-colors"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--fg-secondary)',
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                  }}>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-[10px] font-mono" style={{ color: 'var(--fg-faint)' }}>v0.1.0</span>
        <ThemeToggle />
      </div>
    </>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) setMobileOpen(false)
  }

  return (
    <>
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-[var(--sidebar-w)] border-r flex-col"
        style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg)' }}>
        <SidebarContent pathname={pathname} />
      </aside>

      <button className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md" style={{ color: 'var(--fg)' }}
        aria-label="Menu" onClick={() => setMobileOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="1" y1="4" x2="17" y2="4" /><line x1="1" y1="9" x2="17" y2="9" /><line x1="1" y1="14" x2="17" y2="14" />
        </svg>
      </button>

      {mobileOpen && (
        <div ref={overlayRef} className="md:hidden fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={handleOverlayClick}>
          <aside className="flex flex-col h-full w-56 border-r" style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg)' }}>
            <button className="absolute top-4 right-4 p-1" style={{ color: 'var(--fg-muted)' }}
              onClick={() => setMobileOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>
            <SidebarContent pathname={pathname} onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
