import { WATCHLIST } from '@/config/watchlist'
import { supabaseAdmin } from '@/db/client'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { AtomicFact } from '@/lib/types'
import { EntityProfile } from './EntityProfile'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function findEntity(slug: string) {
  return WATCHLIST.find(e => slugify(e.name) === slug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const entity = findEntity(slug)
  if (!entity) return { title: '实体未找到 — StablePulse' }
  return {
    title: `${entity.name} — StablePulse`,
    description: `${entity.name} 稳定币行业事实追踪`,
  }
}

export default async function EntityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entity = findEntity(slug)
  if (!entity) notFound()

  // Search for facts matching entity name or aliases
  const searchTerms = [entity.name, ...entity.aliases].map(t => t.toLowerCase())

  const { data: factsRaw } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_zh, content_en, fact_type, objectivity, speaker, tags, source_url, source_type, source_credibility, metric_name, metric_value, metric_unit, metric_period, metric_change, verification_status, confidence, confidence_reasons, v1_result, v2_result, v3_result, v4_result, v5_result, fact_date, week_number, created_at, updated_at, source_id, source_table, collected_at')
    .in('verification_status', ['verified', 'partially_verified'])
    .order('fact_date', { ascending: false })
    .limit(500)

  // Filter facts that match entity tags
  const facts = ((factsRaw ?? []) as unknown as AtomicFact[]).filter(f => {
    const tags = (f.tags ?? []).map(t => t.toLowerCase())
    return searchTerms.some(term => tags.includes(term))
  })

  // Group by week
  const byWeek = new Map<string, AtomicFact[]>()
  for (const f of facts) {
    const week = f.week_number
    if (!byWeek.has(week)) byWeek.set(week, [])
    byWeek.get(week)!.push(f)
  }

  return (
    <EntityProfile
      entity={entity}
      facts={facts}
      factsByWeek={Object.fromEntries(byWeek)}
    />
  )
}
