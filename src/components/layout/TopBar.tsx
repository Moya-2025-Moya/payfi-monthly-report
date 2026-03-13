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

export function TopBar() {
  const pathname = usePathname()

  const isConsole = pathname.startsWith('/console')
  const isAdmin = pathname.startsWith('/admin')

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

      {/* Console label */}
      {isConsole && (
        <>
          <span className="mx-2 text-[11px]" style={{ color: 'var(--border)' }}>/</span>
          <span className="text-[12px] font-medium" style={{ color: 'var(--fg-muted)' }}>Console</span>
        </>
      )}

      {/* Center spacer */}
      <div className="flex-1" />

      {/* Right side — varies by surface */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Reader: show Console link */}
        {!isConsole && !isAdmin && (
          <Link href="/console"
            className="text-[12px] px-2 py-1 rounded transition-colors hover:underline"
            style={{ color: 'var(--fg-muted)' }}>
            Console
          </Link>
        )}

        {/* Console: show Admin link + Cmd+K hint */}
        {isConsole && (
          <>
            <span className="hidden md:inline text-[11px] px-2 py-0.5 rounded border mr-1"
              style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
              {'\u2318'}K
            </span>
            <Link href="/admin"
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              aria-label="管理后台">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7.5" cy="7.5" r="2" />
                <path d="M12.7 9.5a1.1 1.1 0 00.2 1.2l.04.04a1.33 1.33 0 11-1.88 1.88l-.04-.04a1.1 1.1 0 00-1.2-.2 1.1 1.1 0 00-.67 1.01v.12a1.33 1.33 0 11-2.67 0v-.06a1.1 1.1 0 00-.72-1.01 1.1 1.1 0 00-1.2.2l-.04.04a1.33 1.33 0 11-1.88-1.88l.04-.04a1.1 1.1 0 00.2-1.2 1.1 1.1 0 00-1.01-.67h-.12a1.33 1.33 0 110-2.67h.06a1.1 1.1 0 001.01-.72 1.1 1.1 0 00-.2-1.2l-.04-.04A1.33 1.33 0 114.4 2.32l.04.04a1.1 1.1 0 001.2.2h.05a1.1 1.1 0 00.67-1.01v-.12a1.33 1.33 0 112.67 0v.06a1.1 1.1 0 00.67 1.01 1.1 1.1 0 001.2-.2l.04-.04a1.33 1.33 0 111.88 1.88l-.04.04a1.1 1.1 0 00-.2 1.2v.05a1.1 1.1 0 001.01.67h.12a1.33 1.33 0 110 2.67h-.06a1.1 1.1 0 00-1.01.67z" />
              </svg>
            </Link>
          </>
        )}

        {/* Admin: show back link */}
        {isAdmin && (
          <Link href="/"
            className="text-[12px] px-2 py-1 rounded transition-colors hover:underline"
            style={{ color: 'var(--fg-muted)' }}>
            ← 周报
          </Link>
        )}

        <ThemeToggle />
      </div>
    </header>
  )
}
