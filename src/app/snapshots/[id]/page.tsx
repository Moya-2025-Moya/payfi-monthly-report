import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import type { WeeklySnapshot } from '@/lib/types'

export default async function SnapshotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabaseAdmin.from('weekly_snapshots').select('*').eq('id', id).single()
  if (!data) return <p>Snapshot not found</p>
  const s = data as WeeklySnapshot
  const d = s.snapshot_data
  return (
    <div>
      <PageHeader title={`Snapshot: ${s.week_number}`} description={`Generated ${new Date(s.generated_at).toLocaleDateString()}`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['Total Facts', d.total_facts], ['New Facts', d.new_facts],
          ['High Confidence', d.high_confidence], ['Medium', d.medium_confidence],
          ['Low', d.low_confidence], ['Rejected', d.rejected],
          ['New Entities', d.new_entities], ['Active Entities', d.active_entities],
        ].map(([label, val]) => (
          <Card key={label as string}>
            <p className="text-2xl font-bold">{val as number}</p>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{label as string}</p>
          </Card>
        ))}
      </div>
      {d.top_density_anomalies.length > 0 && (
        <Card className="mb-3">
          <p className="text-xs font-semibold mb-1">Density Anomalies</p>
          <ul className="text-sm space-y-1">{d.top_density_anomalies.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </Card>
      )}
      {d.blind_spot_changes.length > 0 && (
        <Card>
          <p className="text-xs font-semibold mb-1">Blind Spot Changes</p>
          <ul className="text-sm space-y-1">{d.blind_spot_changes.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </Card>
      )}
    </div>
  )
}
