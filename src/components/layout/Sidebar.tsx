'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const NAV_SECTIONS = [
  {
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
      <div className="px-5 py-6">
        <Link href="/" className="block" onClick={onNavClick}>
          <span className="text-sm font-semibold tracking-wider uppercase" style={{ color: '#fff' }}>StablePulse</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className="mb-6">
            {section.label && (
              <p className="px-2 mb-2 text-[10px] font-medium tracking-widest uppercase" style={{ color: '#444' }}>
                {section.label}
              </p>
            )}
            {section.items.map(item => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} onClick={onNavClick}
                  className="block px-2 py-1.5 rounded text-[13px] transition-colors"
                  style={{
                    color: isActive ? '#fff' : '#888',
                    background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 text-[10px]" style={{ color: '#333' }}>
        v0.1.0
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
        style={{ borderColor: 'var(--border)', background: '#000' }}>
        <SidebarContent pathname={pathname} />
      </aside>

      <button className="md:hidden fixed top-4 left-4 z-50 p-2" style={{ color: '#fff' }}
        aria-label="Menu" onClick={() => setMobileOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="1" y1="4" x2="17" y2="4" /><line x1="1" y1="9" x2="17" y2="9" /><line x1="1" y1="14" x2="17" y2="14" />
        </svg>
      </button>

      {mobileOpen && (
        <div ref={overlayRef} className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={handleOverlayClick}>
          <aside className="flex flex-col h-full w-56 border-r" style={{ borderColor: 'var(--border)', background: '#000' }}>
            <button className="absolute top-4 right-4 p-1" style={{ color: '#666' }}
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
