'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TAB_GROUPS, getActiveGroup } from './TopBar'

export function Sidebar() {
  const pathname = usePathname()
  const activeGroup = getActiveGroup(pathname)
  const group = TAB_GROUPS.find(g => g.key === activeGroup) ?? TAB_GROUPS[0]

  return (
    <aside
      className="hidden md:flex fixed left-0 w-[var(--sidebar-w)] border-r flex-col"
      style={{
        top: 'var(--topbar-h)',
        height: 'calc(100vh - var(--topbar-h))',
        borderColor: 'var(--sidebar-border)',
        background: 'var(--sidebar-bg)',
      }}
    >
      <nav className="flex-1 px-3 pt-4">
        <p className="px-2 mb-2 text-[11px] font-medium tracking-widest uppercase" style={{ color: 'var(--fg-faint)' }}>
          {group.label}
        </p>
        {group.items.map(item => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block px-2 py-1.5 rounded text-[13px] transition-colors"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--fg-secondary)',
                background: isActive ? 'var(--accent-soft)' : 'transparent',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
