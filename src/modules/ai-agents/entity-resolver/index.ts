// B2 Entity Resolver Agent — identifies entities in verified atomic facts
// Input: atomic_facts IDs (verified)
// Output: fact_entities rows linking facts to entities table

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import { WATCHLIST } from '@/config/watchlist'
import type { AtomicFact, Entity, FactEntity, EntityCategory } from '@/lib/types'

// ─── Prompt loading ───

const PROMPTS_DIR = join(process.cwd(), 'src/config/prompts')

function loadPrompt(filename: string): string {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf-8')
}

// ─── Types ───

interface ResolvedEntity {
  name: string
  is_new: boolean
  role: string | null
  category: EntityCategory | null
}

interface EntityResolverOutput {
  entities: ResolvedEntity[]
}

// DB row shape for known entities
interface EntityRow {
  id: string
  name: string
  aliases: string[]
  category: EntityCategory
}

// ─── Fetch fact ───

async function fetchFact(factId: string): Promise<AtomicFact> {
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('id', factId)
    .single()

  if (error) throw new Error(`[B2] Failed to fetch fact ${factId}: ${error.message}`)
  if (!data) throw new Error(`[B2] Fact not found: ${factId}`)
  return data as AtomicFact
}

// ─── Fetch all known entities from DB ───

async function fetchKnownEntities(): Promise<EntityRow[]> {
  const { data, error } = await supabaseAdmin
    .from('entities')
    .select('id, name, aliases, category')

  if (error) throw new Error(`[B2] Failed to fetch entities: ${error.message}`)
  return (data ?? []) as EntityRow[]
}

// ─── Format entity list for prompt ───

function formatKnownEntities(entities: EntityRow[]): string {
  if (entities.length === 0) return '(none)'
  return entities
    .map(e => {
      if (e.aliases && e.aliases.length > 0) {
        return `${e.name} (aliases: ${e.aliases.join(', ')})`
      }
      return e.name
    })
    .join('\n')
}

// ─── Call AI to resolve entities ───

async function callEntityResolver(factContent: string, knownEntities: EntityRow[]): Promise<ResolvedEntity[]> {
  const template = loadPrompt('entity-resolver.md')
  const prompt = template
    .replace('{fact_content}', factContent)
    .replace('{known_entities}', formatKnownEntities(knownEntities))

  const result = await callHaikuJSON<EntityResolverOutput>(prompt)
  return result.entities ?? []
}

// ─── Find matching entity in DB by name (case-insensitive, checks name + aliases) ───

function findEntityInDB(name: string, knownEntities: EntityRow[]): EntityRow | undefined {
  const lower = name.toLowerCase()
  return knownEntities.find(
    e =>
      e.name.toLowerCase() === lower ||
      (e.aliases && e.aliases.some(a => a.toLowerCase() === lower))
  )
}

// ─── Create new entity in DB ───

async function createEntity(name: string, category: EntityCategory | null): Promise<string> {
  // Try to find extra metadata from watchlist for the new entity
  const watchlistMatch = WATCHLIST.find(
    w =>
      w.name.toLowerCase() === name.toLowerCase() ||
      w.aliases.some(a => a.toLowerCase() === name.toLowerCase())
  )

  const row = {
    name: watchlistMatch?.name ?? name,
    aliases: watchlistMatch?.aliases ?? [],
    category: category ?? watchlistMatch?.category ?? 'b2b_infra',
    description_en: null,
    description_zh: null,
    logo_url: null,
    website: watchlistMatch?.website ?? null,
  }

  const { data, error } = await supabaseAdmin
    .from('entities')
    .insert(row)
    .select('id')
    .single()

  if (error) throw new Error(`[B2] Failed to create entity "${name}": ${error.message}`)
  return data.id as string
}

// ─── Insert fact_entity row, skip if already exists ───

async function upsertFactEntity(factId: string, entityId: string, role: string | null): Promise<void> {
  // Check if the pair already exists
  const { data: existing } = await supabaseAdmin
    .from('fact_entities')
    .select('fact_id')
    .eq('fact_id', factId)
    .eq('entity_id', entityId)
    .maybeSingle()

  if (existing) {
    console.log(`[B2] Skipping duplicate fact_entity: fact=${factId} entity=${entityId}`)
    return
  }

  const row: FactEntity = { fact_id: factId, entity_id: entityId, role }

  const { error } = await supabaseAdmin
    .from('fact_entities')
    .insert(row)

  if (error) throw new Error(`[B2] Failed to insert fact_entity (fact=${factId}, entity=${entityId}): ${error.message}`)
}

// ─── Main: resolve entities for a single fact ───

export async function resolveEntities(factId: string): Promise<void> {
  console.log(`[B2] Resolving entities for fact: ${factId}`)

  // 1. Fetch the atomic fact
  const fact = await fetchFact(factId)

  // 2. Fetch all known entities from DB
  const knownEntities = await fetchKnownEntities()

  // 3. Build prompt and call AI (prefer content_zh since B1 now outputs Chinese)
  const factContent = fact.content_zh || fact.content_en
  if (!factContent) {
    console.log(`[B2] No content for fact: ${factId}, skipping`)
    return
  }
  const resolved = await callEntityResolver(factContent, knownEntities)

  if (resolved.length === 0) {
    console.log(`[B2] No entities found for fact: ${factId}`)
    return
  }

  console.log(`[B2] Found ${resolved.length} entity reference(s) for fact: ${factId}`)

  // 4 & 5. For each resolved entity, find or create in DB
  for (const entity of resolved) {
    try {
      let entityId: string

      if (!entity.is_new) {
        // Find existing entity by name/alias (case-insensitive)
        const match = findEntityInDB(entity.name, knownEntities)
        if (!match) {
          console.log(`[B2] Known entity not found in DB, skipping: "${entity.name}"`)
          continue
        }
        entityId = match.id
      } else {
        // Create new entity
        console.log(`[B2] Creating new entity: "${entity.name}" (category: ${entity.category})`)
        entityId = await createEntity(entity.name, entity.category)
      }

      // 6. Insert into fact_entities, skip duplicates
      await upsertFactEntity(factId, entityId, entity.role)
      console.log(`[B2] Linked entity "${entity.name}" (role: ${entity.role}) to fact: ${factId}`)
    } catch (err) {
      console.log(`[B2] Error processing entity "${entity.name}" for fact ${factId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`[B2] Done resolving entities for fact: ${factId}`)
}

// ─── Batch version: resolves entities for multiple facts with per-fact error isolation ───

export async function resolveEntitiesBatch(
  factIds: string[],
  onCancelCheck?: () => Promise<void>,
  onProgress?: (current: number, total: number) => void
): Promise<{ succeeded: number; failed: number }> {
  console.log(`[B2] Starting batch entity resolution for ${factIds.length} fact(s)`)

  // Pre-fetch known entities once (instead of per-fact)
  let knownEntities = await fetchKnownEntities()

  let succeeded = 0
  let failed = 0

  for (let i = 0; i < factIds.length; i++) {
    if (onCancelCheck && i > 0 && i % 5 === 0) await onCancelCheck()

    // Report progress every 5 facts
    if (onProgress && i % 5 === 0) onProgress(i, factIds.length)

    try {
      await resolveEntitiesWithCache(factIds[i], knownEntities)
      succeeded++
    } catch (err) {
      failed++
      console.log(`[B2] Failed to resolve entities for fact ${factIds[i]}: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Refresh entity cache every 10 facts (picks up newly created entities)
    if ((i + 1) % 10 === 0) {
      knownEntities = await fetchKnownEntities()
    }
  }

  // Final progress
  if (onProgress) onProgress(factIds.length, factIds.length)

  console.log(`[B2] Batch complete — succeeded: ${succeeded}, failed: ${failed}`)
  return { succeeded, failed }
}

// Variant that accepts pre-fetched entities to avoid N+1 queries
async function resolveEntitiesWithCache(factId: string, knownEntities: EntityRow[]): Promise<void> {
  console.log(`[B2] Resolving entities for fact: ${factId}`)

  const fact = await fetchFact(factId)
  const factContent = fact.content_zh || fact.content_en
  if (!factContent) {
    console.log(`[B2] No content for fact: ${factId}, skipping`)
    return
  }

  const resolved = await callEntityResolver(factContent, knownEntities)
  if (resolved.length === 0) {
    console.log(`[B2] No entities found for fact: ${factId}`)
    return
  }

  console.log(`[B2] Found ${resolved.length} entity reference(s) for fact: ${factId}`)

  for (const entity of resolved) {
    try {
      let entityId: string
      if (!entity.is_new) {
        const match = findEntityInDB(entity.name, knownEntities)
        if (!match) {
          console.log(`[B2] Known entity not found in DB, skipping: "${entity.name}"`)
          continue
        }
        entityId = match.id
      } else {
        console.log(`[B2] Creating new entity: "${entity.name}" (category: ${entity.category})`)
        entityId = await createEntity(entity.name, entity.category)
      }
      await upsertFactEntity(factId, entityId, entity.role)
      console.log(`[B2] Linked entity "${entity.name}" (role: ${entity.role}) to fact: ${factId}`)
    } catch (err) {
      console.log(`[B2] Error processing entity "${entity.name}" for fact ${factId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
