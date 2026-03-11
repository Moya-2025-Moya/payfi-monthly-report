import Link from 'next/link'

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

export function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-[var(--sidebar-w)] border-r flex flex-col"
      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="text-lg font-bold">StablePulse</Link>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Atomic Knowledge Engine</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item, i) => {
          if ('divider' in item) {
            return <hr key={i} className="my-2" style={{ borderColor: 'var(--border)' }} />
          }
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:opacity-80 transition-opacity"
              style={{ color: 'var(--foreground)' }}>
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
