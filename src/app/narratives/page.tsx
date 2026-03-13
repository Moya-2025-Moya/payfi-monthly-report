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

interface ThreadEntry {
  week_number: string
  summary: string
  key_developments: string[]
  node_count: number
  significance: string
}

interface NarrativeThread {
  id: string
  topic: string
  slug: string
  status: string
  first_seen_week: string
  last_updated_week: string
  total_weeks: number
  entries: ThreadEntry[]
}

interface Prediction {
  id: string
  narrative_topic: string
  week_number: string
  title: string
  description: string | null
  watched: boolean
  status: string
  review_note: string | null
  reviewed_week: string | null
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

async function getThreads(): Promise<NarrativeThread[]> {
  const { data: threads } = await supabaseAdmin
    .from('narrative_threads')
    .select('id, topic, slug, status, first_seen_week, last_updated_week, total_weeks')
    .in('status', ['active', 'dormant'])
    .order('last_updated_week', { ascending: false })
    .limit(10)

  if (!threads || threads.length === 0) return []

  const threadIds = threads.map(t => t.id)
  const { data: entries } = await supabaseAdmin
    .from('narrative_thread_entries')
    .select('thread_id, week_number, summary, key_developments, node_count, significance')
    .in('thread_id', threadIds)
    .order('week_number', { ascending: true })

  return threads.map(t => ({
    ...t,
    entries: (entries ?? [])
      .filter(e => e.thread_id === t.id)
      .map(e => ({
        week_number: e.week_number,
        summary: e.summary,
        key_developments: e.key_developments ?? [],
        node_count: e.node_count,
        significance: e.significance,
      })),
  }))
}

async function getPredictions(): Promise<Prediction[]> {
  const { data } = await supabaseAdmin
    .from('narrative_predictions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []) as Prediction[]
}

export default async function NarrativesPage() {
  const [narratives, threads, predictions] = await Promise.all([
    getNarratives(),
    getThreads(),
    getPredictions(),
  ])

  return (
    <div>
      <PageHeader title="叙事时间线" />
      <NarrativesClient narratives={narratives} threads={threads} predictions={predictions} />
    </div>
  )
}
