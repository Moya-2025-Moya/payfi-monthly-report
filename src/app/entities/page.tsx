import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntitiesClient } from './EntitiesClient'
import { WATCHLIST } from '@/config/watchlist'
import type { Entity } from '@/lib/types'

export interface EnrichedEntity extends Entity {
  _factCount: number
  _latestFactDate: string | null
}

export default async function EntitiesPage() {
  const { data } = await supabaseAdmin.from('entities').select('*').order('name')
  let entities: EnrichedEntity[] = []

  // Fetch all verified facts' tags + dates for enrichment
  const { data: allFacts } = await supabaseAdmin
    .from('atomic_facts')
    .select('tags, fact_date')
    .in('verification_status', ['verified', 'partially_verified'])

  const tagCounts = new Map<string, number>()
  const tagLatestDate = new Map<string, string>()
  for (const f of (allFacts ?? []) as { tags: string[]; fact_date: string }[]) {
    for (const tag of f.tags) {
      const key = tag.toLowerCase()
      tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1)
      const existing = tagLatestDate.get(key)
      if (!existing || f.fact_date > existing) {
        tagLatestDate.set(key, f.fact_date)
      }
    }
  }

  if ((data ?? []).length > 0) {
    // DB entities exist — enrich them
    entities = (data as Entity[]).map(e => {
      const names = [e.name, ...e.aliases].map(n => n.toLowerCase())
      const count = names.reduce((sum, n) => sum + (tagCounts.get(n) ?? 0), 0)
      let latestDate: string | null = null
      for (const n of names) {
        const d = tagLatestDate.get(n)
        if (d && (!latestDate || d > latestDate)) latestDate = d
      }
      return { ...e, _factCount: count, _latestFactDate: latestDate }
    })
  } else {
    // Watchlist fallback
    entities = WATCHLIST.map((w, i) => {
      const names = [w.name, ...w.aliases].map(n => n.toLowerCase())
      const count = names.reduce((sum, n) => sum + (tagCounts.get(n) ?? 0), 0)
      let latestDate: string | null = null
      for (const n of names) {
        const d = tagLatestDate.get(n)
        if (d && (!latestDate || d > latestDate)) latestDate = d
      }
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
        _latestFactDate: latestDate,
      }
    })
  }

  // Compute summary stats
  const totalFacts = (allFacts ?? []).length
  const categoryCounts: Record<string, number> = {}
  for (const e of entities) {
    categoryCounts[e.category] = (categoryCounts[e.category] ?? 0) + 1
  }

  return (
    <div>
      <PageHeader title="实体市场地图" />
      <EntitiesClient
        entities={entities}
        totalFacts={totalFacts}
        categoryCounts={categoryCounts}
      />
    </div>
  )
}
