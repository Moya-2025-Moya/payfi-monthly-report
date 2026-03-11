import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntitiesClient } from './EntitiesClient'
import { WATCHLIST } from '@/config/watchlist'
import type { Entity } from '@/lib/types'

export default async function EntitiesPage() {
  const { data } = await supabaseAdmin.from('entities').select('*').order('name')
  let entities = (data ?? []) as Entity[]

  // Watchlist fallback: if DB has no entities, render from watchlist
  if (entities.length === 0) {
    // Count facts per entity by matching tags
    const { data: allFacts } = await supabaseAdmin
      .from('atomic_facts')
      .select('tags')
      .in('verification_status', ['verified', 'partially_verified'])

    const tagCounts = new Map<string, number>()
    for (const f of (allFacts ?? []) as { tags: string[] }[]) {
      for (const tag of f.tags) {
        tagCounts.set(tag.toLowerCase(), (tagCounts.get(tag.toLowerCase()) ?? 0) + 1)
      }
    }

    entities = WATCHLIST.map((w, i) => {
      // Sum fact counts for name + all aliases
      const names = [w.name, ...w.aliases].map(n => n.toLowerCase())
      const count = names.reduce((sum, n) => sum + (tagCounts.get(n) ?? 0), 0)
      return {
        id: `watchlist-${i}`,
        name: w.name,
        aliases: w.aliases,
        category: w.category,
        description_en: null,
        description_zh: null,
        logo_url: null,
        website: w.website ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        _factCount: count,
      } as Entity & { _factCount: number }
    })
  }

  return (
    <div>
      <PageHeader title="实体" description={`共 ${entities.length} 个追踪实体`} />
      <EntitiesClient entities={entities} />
    </div>
  )
}
