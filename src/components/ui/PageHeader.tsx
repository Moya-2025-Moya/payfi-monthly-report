export function PageHeader({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-[24px] font-semibold tracking-tight" style={{ color: 'var(--fg-title)' }}>{title}</h1>
    </div>
  )
}
