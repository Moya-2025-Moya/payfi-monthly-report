import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
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
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>No blind spot reports yet. Run the weekly pipeline first.</p>
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
