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

export const TAB_GROUPS = [
  {
    key: 'browse',
    label: '浏览',
    items: [
      { href: '/', label: '信息流' },
      { href: '/entities', label: '实体' },
      { href: '/search', label: '搜索' },
      { href: '/notes', label: '笔记' },
    ],
  },
  {
    key: 'analysis',
    label: '分析',
    items: [
      { href: '/narratives', label: '叙事时间线' },
      { href: '/regulatory', label: '监管追踪' },
      { href: '/diff', label: '周报对比' },
      { href: '/quality', label: '数据质量' },
    ],
  },
  {
    key: 'system',
    label: '系统',
    items: [
      { href: '/snapshots', label: '周报快照' },
      { href: '/chat', label: 'AI 对话' },
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
        <span className="text-[12px] font-semibold tracking-wider uppercase" style={{ color: 'var(--fg-title)' }}>
          StablePulse
        </span>
      </Link>

      {/* Tab groups */}
      <nav className="flex items-center gap-1 flex-1">
        {TAB_GROUPS.map(group => {
          const isActive = activeGroup === group.key
          return (
            <Link
              key={group.key}
              href={group.items[0].href}
              className="px-3 py-1.5 rounded-md text-[12px] font-medium tracking-wide transition-colors"
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

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono" style={{ color: 'var(--fg-faint)' }}>v0.1.0</span>
        <ThemeToggle />
      </div>
    </header>
  )
}
