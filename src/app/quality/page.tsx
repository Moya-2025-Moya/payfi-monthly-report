import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { QualityClient } from './QualityClient'
import type { BlindSpotReport, FactContradiction, AtomicFact } from '@/lib/types'

export default async function QualityPage() {
  const week = getCurrentWeekNumber()

  // Fetch blind spot reports
  const { data: bsData } = await supabaseAdmin
    .from('blind_spot_reports')
    .select('*')
    .eq('week_number', week)
    .order('entity_type')
  const blindSpotReports = (bsData ?? []) as BlindSpotReport[]

  // Fetch contradictions
  const { data: cData } = await supabaseAdmin
    .from('fact_contradictions')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(50)
  const contradictions = (cData ?? []) as FactContradiction[]

  // Build facts map for contradictions
  const factIds = [...new Set(contradictions.flatMap(c => [c.fact_id_a, c.fact_id_b]))]
  const factsMap: Record<string, AtomicFact> = {}
  if (factIds.length > 0) {
    const { data: facts } = await supabaseAdmin.from('atomic_facts').select('*').in('id', factIds)
    for (const f of (facts ?? []) as AtomicFact[]) factsMap[f.id] = f
  }

  return (
    <div>
      <PageHeader title="数据质量" description="盲区检测与矛盾检测" />
      <QualityClient
        blindSpotReports={blindSpotReports}
        contradictions={contradictions}
        factsMap={factsMap}
      />
    </div>
  )
}
