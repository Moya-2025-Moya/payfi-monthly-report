import { PageHeader } from '@/components/ui/PageHeader'

export default function GraphPage() {
  return (
    <div>
      <PageHeader title="Relationship Graph" description="Entity relationship visualization (requires react-force-graph)" />
      <div className="rounded-lg border p-12 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Graph visualization will be rendered here with react-force-graph.</p>
        <p className="text-xs mt-2" style={{ color: 'var(--muted-fg)' }}>Use GET /api/graph?entity=ID&amp;depth=2 to fetch graph data.</p>
      </div>
    </div>
  )
}
