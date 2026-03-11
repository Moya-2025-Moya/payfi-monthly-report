// ============================================================
// StablePulse — C2 Timeline Management
// Knowledge module: timeline detail, listing, and entity timelines
// ============================================================

import { supabaseAdmin } from '@/db/client'
import type { Timeline, AtomicFact } from '@/lib/types'

// ─── Helper Types ───

export interface TimelineDetail extends Timeline {
  facts: (AtomicFact & { order_index: number; attribution_status: string })[]
  entity_name: string | null
}

export interface TimelineListItem {
  id: string
  name: string
  description: string | null
  entity_name: string | null
  status: string
  fact_count: number
  last_updated: string
}

// ─── Exported Functions ───

/**
 * Get full detail for a single timeline: its metadata, associated entity name,
 * and all linked atomic facts ordered by order_index.
 */
export async function getTimeline(timelineId: string): Promise<TimelineDetail | null> {
  const { data: timeline, error: tlError } = await supabaseAdmin
    .from('timelines')
    .select('*')
    .eq('id', timelineId)
    .single()

  if (tlError || !timeline) {
    return null
  }

  // Resolve entity name if entity_id is set
  let entityName: string | null = null
  if (timeline.entity_id) {
    const { data: entityRow } = await supabaseAdmin
      .from('entities')
      .select('name')
      .eq('id', timeline.entity_id)
      .single()
    entityName = entityRow?.name ?? null
  }

  // Fetch timeline_facts joined with atomic_facts, ordered by order_index
  const { data: timelineFacts, error: tfError } = await supabaseAdmin
    .from('timeline_facts')
    .select('order_index, attribution_status, atomic_facts(*)')
    .eq('timeline_id', timelineId)
    .order('order_index', { ascending: true })

  if (tfError) {
    console.log('[getTimeline] timeline_facts query error:', tfError.message)
  }

  type TimelineFactRow = {
    order_index: number
    attribution_status: string
    atomic_facts: AtomicFact | null
  }

  const facts = (timelineFacts ?? [])
    .map((row) => {
      const r = row as unknown as TimelineFactRow
      if (!r.atomic_facts) return null
      return {
        ...r.atomic_facts,
        order_index: r.order_index,
        attribution_status: r.attribution_status,
      }
    })
    .filter((f): f is AtomicFact & { order_index: number; attribution_status: string } => f !== null)

  return {
    ...timeline,
    entity_name: entityName,
    facts,
  }
}

/**
 * List timelines with optional filters on entity_id and status.
 * Returns summary rows including fact count and last updated timestamp.
 */
export async function listTimelines(
  filters?: { entity_id?: string; status?: string }
): Promise<TimelineListItem[]> {
  let query = supabaseAdmin
    .from('timelines')
    .select('id, name, description, status, entity_id, updated_at')
    .order('updated_at', { ascending: false })

  if (filters?.entity_id) {
    query = query.eq('entity_id', filters.entity_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data: timelines, error } = await query

  if (error || !timelines || timelines.length === 0) {
    if (error) console.log('[listTimelines] query error:', error.message)
    return []
  }

  const timelineIds = timelines.map((t) => t.id)
  const entityIds = [...new Set(timelines.map((t) => t.entity_id).filter(Boolean))] as string[]

  // Batch fetch entity names
  const entityNameMap: Record<string, string> = {}
  if (entityIds.length > 0) {
    const { data: entityRows } = await supabaseAdmin
      .from('entities')
      .select('id, name')
      .in('id', entityIds)
    for (const e of entityRows ?? []) {
      entityNameMap[e.id] = e.name
    }
  }

  // Count facts per timeline
  const { data: countRows } = await supabaseAdmin
    .from('timeline_facts')
    .select('timeline_id')
    .in('timeline_id', timelineIds)

  const factCountMap: Record<string, number> = {}
  for (const row of countRows ?? []) {
    factCountMap[row.timeline_id] = (factCountMap[row.timeline_id] ?? 0) + 1
  }

  return timelines.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? null,
    entity_name: t.entity_id ? (entityNameMap[t.entity_id] ?? null) : null,
    status: t.status,
    fact_count: factCountMap[t.id] ?? 0,
    last_updated: t.updated_at,
  }))
}

/**
 * Get all timelines associated with a specific entity.
 * Returns raw Timeline records ordered by most recently updated.
 */
export async function getEntityTimelines(entityId: string): Promise<Timeline[]> {
  const { data, error } = await supabaseAdmin
    .from('timelines')
    .select('*')
    .eq('entity_id', entityId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.log('[getEntityTimelines] query error:', error.message)
    return []
  }

  return (data ?? []) as Timeline[]
}
