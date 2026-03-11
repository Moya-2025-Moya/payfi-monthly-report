import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { TimelineDisplay } from '@/components/timeline/TimelineDisplay'
import type { Timeline, AtomicFact, TimelineFact } from '@/lib/types'

export default async function TimelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: timeline } = await supabaseAdmin.from('timelines').select('*').eq('id', id).single()
  if (!timeline) return <p>Timeline not found</p>

  const { data: tf } = await supabaseAdmin.from('timeline_facts').select('*').eq('timeline_id', id).order('order_index')
  const timelineFacts = (tf ?? []) as TimelineFact[]

  const factIds = timelineFacts.map(t => t.fact_id)
  let factsMap = new Map<string, AtomicFact>()
  if (factIds.length > 0) {
    const { data } = await supabaseAdmin.from('atomic_facts').select('*').in('id', factIds)
    for (const f of (data ?? []) as AtomicFact[]) factsMap.set(f.id, f)
  }

  const nodes = timelineFacts
    .filter(tf => factsMap.has(tf.fact_id))
    .map(tf => ({ fact: factsMap.get(tf.fact_id)!, attribution_status: tf.attribution_status as 'confirmed' | 'uncertain' | 'rejected' }))

  return (
    <div>
      <PageHeader title={(timeline as Timeline).name} />
      <TimelineDisplay timeline={timeline as Timeline} nodes={nodes} />
    </div>
  )
}
