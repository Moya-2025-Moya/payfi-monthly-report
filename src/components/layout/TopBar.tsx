'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme/ThemeProvider'

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

/* ── Nav link ── */
function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link href={href}
      className="px-2 py-1 rounded text-[12px] font-medium tracking-wide transition-colors"
      style={{ color: isActive ? 'var(--accent)' : 'var(--fg-muted)' }}>
      {label}
    </Link>
  )
}

export function TopBar() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center h-[var(--topbar-h)] px-4 border-b"
      style={{ background: 'var(--topbar-bg)', borderColor: 'var(--topbar-border)' }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <MountainLogo />
        <span className="text-[13px] font-semibold tracking-wider uppercase" style={{ color: 'var(--fg-title)' }}>
          StablePulse
        </span>
      </Link>

      {/* Separator */}
      <span className="mx-3 hidden md:inline" style={{ color: 'var(--border)' }}>—</span>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-1">
        <NavLink href="/" label="周报" pathname={pathname} />
        <NavLink href="/entities" label="实体" pathname={pathname} />
      </nav>

      {/* Center spacer */}
      <div className="flex-1" />

      {/* Zero-Opinion Badge */}
      <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded mr-2"
        style={{ color: 'var(--success)', background: 'var(--success-soft)' }}>
        0 opinions
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <Link href="/admin"
          className="p-1.5 rounded-md transition-colors"
          style={{ color: pathname.startsWith('/admin') ? 'var(--accent)' : 'var(--fg-muted)' }}
          aria-label="管理后台">
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="7.5" r="2" />
            <path d="M12.7 9.5a1.1 1.1 0 00.2 1.2l.04.04a1.33 1.33 0 11-1.88 1.88l-.04-.04a1.1 1.1 0 00-1.2-.2 1.1 1.1 0 00-.67 1.01v.12a1.33 1.33 0 11-2.67 0v-.06a1.1 1.1 0 00-.72-1.01 1.1 1.1 0 00-1.2.2l-.04.04a1.33 1.33 0 11-1.88-1.88l.04-.04a1.1 1.1 0 00.2-1.2 1.1 1.1 0 00-1.01-.67h-.12a1.33 1.33 0 110-2.67h.06a1.1 1.1 0 001.01-.72 1.1 1.1 0 00-.2-1.2l-.04-.04A1.33 1.33 0 114.4 2.32l.04.04a1.1 1.1 0 001.2.2h.05a1.1 1.1 0 00.67-1.01v-.12a1.33 1.33 0 112.67 0v.06a1.1 1.1 0 00.67 1.01 1.1 1.1 0 001.2-.2l.04-.04a1.33 1.33 0 111.88 1.88l-.04.04a1.1 1.1 0 00-.2 1.2v.05a1.1 1.1 0 001.01.67h.12a1.33 1.33 0 110 2.67h-.06a1.1 1.1 0 00-1.01.67z" />
          </svg>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
