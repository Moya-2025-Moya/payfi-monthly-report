'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MOBILE_TABS = [
  { href: '/', label: '周报' },
  { href: '/weekly', label: '历史' },
  { href: '/admin', label: '管理' },
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
            className="flex-1 flex items-center justify-center py-2 text-[12px] font-medium tracking-wide transition-colors"
            style={{ color: isActive ? 'var(--accent)' : 'var(--fg-muted)' }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
