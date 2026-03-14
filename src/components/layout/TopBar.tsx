'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme/ThemeProvider'

/* ── Theme Toggle ── */
function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} className="p-2 rounded-lg transition-colors"
      style={{ color: 'var(--fg-muted)' }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.3 3.3l.7.7M11 11l.7.7M11.7 3.3l-.7.7M4 11l-.7.7" />
          <circle cx="7.5" cy="7.5" r="2.5" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M13 9.5A6 6 0 115.5 2a5 5 0 007.5 7.5z" />
        </svg>
      )}
    </button>
  )
}

export function TopBar() {
  const pathname = usePathname()

  const isConsole = pathname.startsWith('/console')
  const isAdmin = pathname.startsWith('/admin')

  return (
    <header className="fixed top-0 left-0 right-0 z-30 topbar-blur flex items-center h-[var(--topbar-h)] px-5 border-b"
      style={{ background: 'var(--topbar-bg)', borderColor: 'var(--topbar-border)' }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
        <div className="w-[6px] h-[18px] rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="text-[13px] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--fg-title)' }}>
          StablePulse
        </span>
      </Link>

      {/* Breadcrumb */}
      {isConsole && (
        <>
          <span className="mx-2.5 text-[12px]" style={{ color: 'var(--border-hover)' }}>/</span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--fg-muted)' }}>Console</span>
        </>
      )}
      {isAdmin && (
        <>
          <span className="mx-2.5 text-[12px]" style={{ color: 'var(--border-hover)' }}>/</span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--fg-muted)' }}>Admin</span>
        </>
      )}

      {/* Center spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Reader: show Console link */}
        {!isConsole && !isAdmin && (
          <Link href="/console"
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--fg-muted)' }}>
            Console
          </Link>
        )}

        {/* Console: show Admin link */}
        {isConsole && (
          <Link href="/admin"
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--fg-muted)' }}>
            Admin
          </Link>
        )}

        {/* Admin: show back link */}
        {isAdmin && (
          <Link href="/"
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--fg-muted)' }}>
            ← Weekly
          </Link>
        )}

        <ThemeToggle />
      </div>
    </header>
  )
}
