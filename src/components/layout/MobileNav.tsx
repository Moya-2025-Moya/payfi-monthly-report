'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getActiveGroup } from './TopBar'

/* Mobile bottom tab bar — simplified read-only navigation */
const MOBILE_TABS = [
  { href: '/', label: '信息流', group: 'browse' },
  { href: '/entities', label: '实体', group: 'browse' },
  { href: '/search', label: '搜索', group: 'browse' },
  { href: '/chat', label: 'AI', group: 'system' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t"
      style={{ background: 'var(--topbar-bg)', borderColor: 'var(--topbar-border)', height: '52px' }}
    >
      {MOBILE_TABS.map(tab => {
        const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex items-center justify-center py-2 text-[11px] font-medium tracking-wide transition-colors"
            style={{
              color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
