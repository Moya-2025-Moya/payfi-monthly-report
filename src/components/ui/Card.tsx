export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border p-5 ${className}`}
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {children}
    </div>
  )
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex items-center justify-between">{children}</div>
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--fg-muted)' }}>{children}</h3>
}
