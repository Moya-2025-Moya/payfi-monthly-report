import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { CoverageMatrix } from '@/components/blind-spots/CoverageMatrix'
import type { BlindSpotReport } from '@/lib/types'

export default async function BlindSpotsPage() {
  const week = getCurrentWeekNumber()
  const { data } = await supabaseAdmin
    .from('blind_spot_reports')
    .select('*')
    .eq('week_number', week)
    .order('entity_type')

  const reports = (data ?? []) as BlindSpotReport[]
  return (
    <div>
      <PageHeader title="Knowledge Blind Spots" description="Coverage gaps across tracked entities" />
      {reports.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">No blind spot reports yet</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Reports are generated weekly. Check back after the pipeline runs, or trigger it manually in Settings.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {reports.map(r => (
            <div key={r.id}>
              <h3 className="text-sm font-semibold mb-2 capitalize">{r.entity_type.replace(/_/g, ' ')}</h3>
              <CoverageMatrix data={r.report_data} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
