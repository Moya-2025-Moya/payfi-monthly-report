export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-10">
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#fff' }}>{title}</h1>
      {description && <p className="text-xs mt-2 font-mono" style={{ color: '#555' }}>{description}</p>}
    </div>
  )
}
