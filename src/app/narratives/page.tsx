import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { NarrativesClient } from './NarrativesClient'

interface StoredNarrative {
  topic: string
  summary: string
  branches: { id: string; label: string; side: 'left' | 'right'; color: string }[]
  nodes: {
    id: string; date: string; title: string; description: string
    significance: 'high' | 'medium' | 'low'
    factIds: string[]; entityNames: string[]
    sourceUrl?: string; isExternal?: boolean; externalUrl?: string
    isPrediction?: boolean; branchId: string
  }[]
  edges: { id: string; source: string; target: string; label?: string }[]
}

async function getNarratives(): Promise<StoredNarrative[]> {
  const weekNumber = getCurrentWeekNumber()
  const { data } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', weekNumber)
    .single()

  return (data?.snapshot_data as { narratives?: StoredNarrative[] })?.narratives ?? []
}

export default async function NarrativesPage() {
  const narratives = await getNarratives()

  return (
    <div>
      <PageHeader title="叙事时间线" />
      <NarrativesClient narratives={narratives} />
    </div>
  )
}
