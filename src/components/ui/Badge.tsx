// Simple badge components for V2

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colors: Record<string, string> = {
    running: '#3b82f6',
    completed: '#16a34a',
    failed: '#ef4444',
    cancelled: '#9ca3af',
  }
  const color = colors[status] ?? '#9ca3af'

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ border: `1px solid ${color}40`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label ?? status}
    </span>
  )
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono"
      style={{ color: '#6b7280', border: '1px solid #e5e7eb' }}
    >
      {category}
    </span>
  )
}
