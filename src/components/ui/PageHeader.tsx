export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-10">
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--fg-title)' }}>{title}</h1>
      {description && <p className="text-xs mt-2 font-mono" style={{ color: 'var(--fg-dim)' }}>{description}</p>}
    </div>
  )
}
