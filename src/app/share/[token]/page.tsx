import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { FactList } from '@/components/facts/FactList'
import type { SharedView, AtomicFact } from '@/lib/types'

export default async function SharedViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { data: view } = await supabaseAdmin.from('shared_views').select('*').eq('token', token).single()
  if (!view) return <p className="p-6">Shared view not found or expired.</p>
  const sv = view as SharedView

  if (new Date(sv.expires_at) < new Date()) return <p className="p-6">This shared link has expired.</p>

  // Increment view count
  await supabaseAdmin.from('shared_views').update({ view_count: sv.view_count + 1 }).eq('id', sv.id)

  // Fetch facts based on query_params
  const factIds = (sv.query_params.fact_ids as string[]) ?? []
  let facts: AtomicFact[] = []
  if (factIds.length > 0) {
    const { data } = await supabaseAdmin.from('atomic_facts').select('*').in('id', factIds)
    facts = (data ?? []) as AtomicFact[]
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <PageHeader title={sv.title ?? 'Shared Facts'} description="Shared from StablePulse" />
      <FactList facts={facts} />
      <p className="text-xs mt-6 text-center" style={{ color: 'var(--fg-muted)' }}>
        Shared via StablePulse · Expires {new Date(sv.expires_at).toLocaleDateString()}
      </p>
    </div>
  )
}
