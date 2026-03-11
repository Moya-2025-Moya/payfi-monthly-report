// ============================================================
// StablePulse — C5 Regulatory Tracker
// Knowledge engine module: pure TypeScript + Supabase queries
// ============================================================

import { supabaseAdmin } from '@/db/client'
import type { AtomicFact } from '@/lib/types'

// ─── Local interfaces ───

export interface RegulatoryTrackerItem {
  id: string
  name: string
  region: string
  status: string
  current_stage_date: string | null
  entity_name: string | null
  recent_facts: { id: string; content_en: string; fact_date: string }[]
}

export interface RegionDetail {
  region: string
  trackers: RegulatoryTrackerItem[]
  recent_facts: AtomicFact[]
}

// ─── Helpers ───

/**
 * Fetch up to `limit` recent atomic_facts whose tags overlap with
 * the given search terms (tracker name tokens or entity name).
 */
async function fetchRecentFactsForTracker(
  searchTerms: string[],
  limit = 3
): Promise<{ id: string; content_en: string; fact_date: string }[]> {
  if (searchTerms.length === 0) return []

  // Build a case-insensitive overlap filter across the tags array.
  // Supabase supports `cs` (contains) and `ov` (overlap) on array columns.
  // We use overlaps with a lowercased term list.
  const lowerTerms = searchTerms.map((t) => t.toLowerCase())

  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_en, fact_date, tags')
    .overlaps('tags', lowerTerms)
    .eq('verification_status', 'verified')
    .order('fact_date', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((f) => ({
    id: f.id as string,
    content_en: f.content_en as string,
    fact_date: f.fact_date as string,
  }))
}

// ─── Exported functions ───

/**
 * C5-A: Return all regulatory trackers, each enriched with the
 * associated entity name and up to 3 recent related atomic facts.
 */
export async function getRegulatoryTracker(): Promise<RegulatoryTrackerItem[]> {
  // Join regulatory_trackers → entities
  const { data: trackers, error } = await supabaseAdmin
    .from('regulatory_trackers')
    .select(
      `
      id,
      name,
      region,
      status,
      current_stage_date,
      entity_id,
      entities (
        name
      )
    `
    )
    .order('current_stage_date', { ascending: false })

  if (error || !trackers) {
    console.error('[C5] getRegulatoryTracker error:', error)
    return []
  }

  const results: RegulatoryTrackerItem[] = []

  for (const tracker of trackers) {
    const entityName =
      tracker.entities && !Array.isArray(tracker.entities)
        ? (tracker.entities as { name: string }).name
        : Array.isArray(tracker.entities) && tracker.entities.length > 0
        ? (tracker.entities[0] as { name: string }).name
        : null

    // Build search terms from tracker name words + entity name
    const nameTokens = (tracker.name as string)
      .split(/[\s,/-]+/)
      .filter((t) => t.length > 2)

    const entityTokens = entityName
      ? entityName.split(/[\s,/-]+/).filter((t) => t.length > 2)
      : []

    const searchTerms = [...new Set([...nameTokens, ...entityTokens])]

    const recentFacts = await fetchRecentFactsForTracker(searchTerms, 3)

    results.push({
      id: tracker.id as string,
      name: tracker.name as string,
      region: tracker.region as string,
      status: tracker.status as string,
      current_stage_date: tracker.current_stage_date
        ? String(tracker.current_stage_date)
        : null,
      entity_name: entityName,
      recent_facts: recentFacts,
    })
  }

  return results
}

/**
 * C5-B: Return all trackers for a specific region, together with
 * recent regulatory atomic facts tagged with that region.
 */
export async function getRegionStatus(regionCode: string): Promise<RegionDetail> {
  // 1. Fetch trackers filtered by region (with entity join)
  const { data: trackers, error: trackersError } = await supabaseAdmin
    .from('regulatory_trackers')
    .select(
      `
      id,
      name,
      region,
      status,
      current_stage_date,
      entity_id,
      entities (
        name
      )
    `
    )
    .eq('region', regionCode)
    .order('current_stage_date', { ascending: false })

  if (trackersError) {
    console.error('[C5] getRegionStatus trackers error:', trackersError)
  }

  const trackerItems: RegulatoryTrackerItem[] = []

  for (const tracker of trackers ?? []) {
    const entityName =
      tracker.entities && !Array.isArray(tracker.entities)
        ? (tracker.entities as { name: string }).name
        : Array.isArray(tracker.entities) && tracker.entities.length > 0
        ? (tracker.entities[0] as { name: string }).name
        : null

    const nameTokens = (tracker.name as string)
      .split(/[\s,/-]+/)
      .filter((t) => t.length > 2)
    const entityTokens = entityName
      ? entityName.split(/[\s,/-]+/).filter((t) => t.length > 2)
      : []
    const searchTerms = [...new Set([...nameTokens, ...entityTokens])]

    const recentFacts = await fetchRecentFactsForTracker(searchTerms, 3)

    trackerItems.push({
      id: tracker.id as string,
      name: tracker.name as string,
      region: tracker.region as string,
      status: tracker.status as string,
      current_stage_date: tracker.current_stage_date
        ? String(tracker.current_stage_date)
        : null,
      entity_name: entityName,
      recent_facts: recentFacts,
    })
  }

  // 2. Fetch atomic_facts with source_type='regulatory' that mention the region
  const regionLower = regionCode.toLowerCase()

  const { data: facts, error: factsError } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('source_type', 'regulatory')
    .overlaps('tags', [regionLower, regionCode])
    .order('fact_date', { ascending: false })
    .limit(20)

  if (factsError) {
    console.error('[C5] getRegionStatus facts error:', factsError)
  }

  return {
    region: regionCode,
    trackers: trackerItems,
    recent_facts: (facts ?? []) as unknown as AtomicFact[],
  }
}
