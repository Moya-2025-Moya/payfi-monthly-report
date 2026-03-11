// ============================================================
// StablePulse — C1 Entity Profile Management
// Knowledge module: entity lookup, fact retrieval, and listing
// ============================================================

import { supabaseAdmin } from '@/db/client'
import type { Entity, AtomicFact } from '@/lib/types'

// ─── Helper Types ───

export interface EntityProfile extends Entity {
  fact_count: number
  timeline_count: number
  last_activity: string | null
}

export interface EntityListItem {
  id: string
  name: string
  category: string
  fact_count: number
  last_activity: string | null
}

// ─── Exported Functions ───

/**
 * Get a single entity by ID with aggregated counts for facts and timelines,
 * plus the date of the most recent associated fact.
 */
export async function getEntityProfile(entityId: string): Promise<EntityProfile | null> {
  const { data: entity, error: entityError } = await supabaseAdmin
    .from('entities')
    .select('*')
    .eq('id', entityId)
    .single()

  if (entityError || !entity) {
    return null
  }

  // Count facts linked to this entity via fact_entities
  const { count: factCount } = await supabaseAdmin
    .from('fact_entities')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', entityId)

  // Count timelines linked to this entity
  const { count: timelineCount } = await supabaseAdmin
    .from('timelines')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', entityId)

  // Find last activity date: most recent fact_date among facts for this entity
  const { data: lastFactRow } = await supabaseAdmin
    .from('fact_entities')
    .select('atomic_facts(fact_date)')
    .eq('entity_id', entityId)
    .order('atomic_facts(fact_date)', { ascending: false })
    .limit(1)

  // Extract the fact_date from the nested join result
  let lastActivity: string | null = null
  if (lastFactRow && lastFactRow.length > 0) {
    const raw = (lastFactRow[0] as unknown as { atomic_facts: { fact_date: string } | { fact_date: string }[] | null }).atomic_facts
    const nested = Array.isArray(raw) ? raw[0] : raw
    if (nested?.fact_date) {
      lastActivity = nested.fact_date
    }
  }

  return {
    ...entity,
    fact_count: factCount ?? 0,
    timeline_count: timelineCount ?? 0,
    last_activity: lastActivity,
  }
}

/**
 * Get all verified (or partially verified) facts for an entity.
 * Optional filters: week_number, fact_type, confidence.
 */
export async function getEntityFacts(
  entityId: string,
  filters?: { week_number?: string; fact_type?: string; confidence?: string }
): Promise<AtomicFact[]> {
  // First fetch the fact IDs linked to this entity
  const { data: factEntityRows, error: feError } = await supabaseAdmin
    .from('fact_entities')
    .select('fact_id')
    .eq('entity_id', entityId)

  if (feError || !factEntityRows || factEntityRows.length === 0) {
    return []
  }

  const factIds = factEntityRows.map((row) => row.fact_id)

  // Build the atomic_facts query with verification filter
  let query = supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('id', factIds)
    .in('verification_status', ['verified', 'partially_verified'])
    .order('fact_date', { ascending: false })

  if (filters?.week_number) {
    query = query.eq('week_number', filters.week_number)
  }
  if (filters?.fact_type) {
    query = query.eq('fact_type', filters.fact_type)
  }
  if (filters?.confidence) {
    query = query.eq('confidence', filters.confidence)
  }

  const { data, error } = await query

  if (error) {
    console.log('[getEntityFacts] query error:', error.message)
    return []
  }

  return (data ?? []) as AtomicFact[]
}

/**
 * List all entities with aggregated fact counts and last activity date.
 * Optional filters: category (exact match), search (ilike on name and aliases).
 */
export async function listEntities(
  filters?: { category?: string; search?: string }
): Promise<EntityListItem[]> {
  let entityQuery = supabaseAdmin
    .from('entities')
    .select('id, name, category, aliases')
    .order('name', { ascending: true })

  if (filters?.category) {
    entityQuery = entityQuery.eq('category', filters.category)
  }
  if (filters?.search) {
    const term = `%${filters.search}%`
    // Search on name; aliases is a text array so we use a raw filter
    entityQuery = entityQuery.or(`name.ilike.${term},aliases.cs.{${filters.search}}`)
  }

  const { data: entities, error } = await entityQuery

  if (error || !entities) {
    console.log('[listEntities] query error:', error?.message)
    return []
  }

  if (entities.length === 0) {
    return []
  }

  // Build a map of entity_id -> { fact_count, last_activity } from fact_entities + atomic_facts
  const entityIds = entities.map((e) => e.id)

  // Fetch all fact_entity rows for these entities with the associated fact_date
  const { data: factEntityRows } = await supabaseAdmin
    .from('fact_entities')
    .select('entity_id, atomic_facts(id, fact_date, verification_status)')
    .in('entity_id', entityIds)

  // Aggregate counts per entity
  const statsMap: Record<string, { fact_count: number; last_activity: string | null }> = {}

  for (const row of factEntityRows ?? []) {
    const eid = row.entity_id
    const rawFact = (row as unknown as { entity_id: string; atomic_facts: { id: string; fact_date: string; verification_status: string } | { id: string; fact_date: string; verification_status: string }[] | null }).atomic_facts
    const fact = Array.isArray(rawFact) ? rawFact[0] : rawFact

    if (!fact) continue

    if (!statsMap[eid]) {
      statsMap[eid] = { fact_count: 0, last_activity: null }
    }

    statsMap[eid].fact_count += 1

    if (
      fact.fact_date &&
      (!statsMap[eid].last_activity || fact.fact_date > statsMap[eid].last_activity!)
    ) {
      statsMap[eid].last_activity = fact.fact_date
    }
  }

  return entities.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    fact_count: statsMap[e.id]?.fact_count ?? 0,
    last_activity: statsMap[e.id]?.last_activity ?? null,
  }))
}
