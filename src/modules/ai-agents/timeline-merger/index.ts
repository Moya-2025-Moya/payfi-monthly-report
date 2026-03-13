// B3 Timeline Merger Agent — StablePulse
// Determines whether a fact should be assigned to an existing timeline,
// create a new one, or be left standalone.

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { AtomicFact, Timeline, TimelineFact } from '@/lib/types'

// ─── Prompt Loading ───

const PROMPTS_DIR = join(process.cwd(), 'src/config/prompts')

function loadPrompt(filename: string): string {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf-8')
}

// ─── Types ───

interface AIResponse {
  action: 'assign' | 'create_new' | 'none'
  timeline_id: string | null
  new_timeline: {
    name: string
    description: string
    entity_name: string
  } | null
  reason: string
}

interface TimelineWithContext {
  id: string
  name: string
  description: string | null
  entity_id: string | null
  entity_name: string | null
  last_fact_date: string | null
  updated_at: string
}

// ─── Helpers ───

function formatTimelinesForPrompt(timelines: TimelineWithContext[]): string {
  if (timelines.length === 0) return '（暂无已有时间线）'

  return timelines
    .map((t, i) =>
      [
        `${i + 1}. ID: ${t.id}`,
        `   名称: ${t.name}`,
        `   描述: ${t.description ?? '—'}`,
        `   主实体: ${t.entity_name ?? '—'}`,
        `   最近事实日期: ${t.last_fact_date ?? '—'}`,
      ].join('\n')
    )
    .join('\n\n')
}

// ─── DB Queries ───

async function fetchFact(factId: string): Promise<AtomicFact> {
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('id', factId)
    .single()

  if (error) throw new Error(`[B3] Failed to fetch fact ${factId}: ${error.message}`)
  if (!data) throw new Error(`[B3] Fact ${factId} not found`)
  return data as AtomicFact
}

async function fetchEntityNames(factId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('fact_entities')
    .select('entities(name)')
    .eq('fact_id', factId)

  if (error) {
    console.warn(`[B3] Could not fetch entities for fact ${factId}: ${error.message}`)
    return []
  }

  return (data ?? [])
    .map((row: unknown) => {
      const r = row as { entities: { name: string } | { name: string }[] | null }
      const ent = Array.isArray(r.entities) ? r.entities[0] : r.entities
      return ent?.name
    })
    .filter((name): name is string => !!name)
}

async function fetchActiveTimelines(): Promise<TimelineWithContext[]> {
  // Fetch active timelines with their primary entity name
  const { data: timelines, error: tlError } = await supabaseAdmin
    .from('timelines')
    .select('id, name, description, entity_id, updated_at, entities(name)')
    .eq('status', 'active')

  if (tlError) throw new Error(`[B3] Failed to fetch timelines: ${tlError.message}`)
  if (!timelines || timelines.length === 0) return []

  const timelineIds = timelines.map((t: { id: string }) => t.id)

  // Fetch the latest fact date for each timeline via timeline_facts
  const { data: factLinks, error: flError } = await supabaseAdmin
    .from('timeline_facts')
    .select('timeline_id, atomic_facts(fact_date)')
    .in('timeline_id', timelineIds)
    .order('order_index', { ascending: false })

  if (flError) {
    console.warn(`[B3] Could not fetch timeline fact links: ${flError.message}`)
  }

  // Build a map of timeline_id → latest fact date
  const latestDateMap = new Map<string, string>()
  for (const link of factLinks ?? []) {
    const tId = link.timeline_id as string
    const af = link.atomic_facts as unknown as { fact_date: string } | { fact_date: string }[] | null
    const factDate = af ? (Array.isArray(af) ? af[0]?.fact_date : af.fact_date) : undefined
    if (factDate && !latestDateMap.has(tId)) {
      latestDateMap.set(tId, factDate)
    }
  }

  return timelines.map((t: unknown) => {
    const tl = t as {
      id: string; name: string; description: string | null
      entity_id: string | null; updated_at: string
      entities: { name: string } | { name: string }[] | null
    }
    const ent = Array.isArray(tl.entities) ? tl.entities[0] : tl.entities
    return {
    id: tl.id,
    name: tl.name,
    description: tl.description,
    entity_id: tl.entity_id,
    entity_name: ent?.name ?? null,
    last_fact_date: latestDateMap.get(tl.id) ?? null,
    updated_at: tl.updated_at,
  }})
}

async function getNextOrderIndex(timelineId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('timeline_facts')
    .select('order_index')
    .eq('timeline_id', timelineId)
    .order('order_index', { ascending: false })
    .limit(1)

  if (error) {
    console.warn(`[B3] Could not determine order_index for timeline ${timelineId}: ${error.message}`)
    return 0
  }

  const maxIndex = data?.[0]?.order_index ?? -1
  return (maxIndex as number) + 1
}

async function lookupEntityIdByName(name: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('entities')
    .select('id')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return (data as { id: string }).id
}

// ─── Actions ───

async function assignToTimeline(timelineId: string, factId: string): Promise<void> {
  const orderIndex = await getNextOrderIndex(timelineId)

  const { error: insertError } = await supabaseAdmin
    .from('timeline_facts')
    .insert({
      timeline_id: timelineId,
      fact_id: factId,
      order_index: orderIndex,
      attribution_status: 'confirmed',
      v6_result: null,
    } satisfies TimelineFact)

  if (insertError) throw new Error(`[B3] Failed to insert timeline_fact: ${insertError.message}`)

  const { error: updateError } = await supabaseAdmin
    .from('timelines')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', timelineId)

  if (updateError) {
    console.warn(`[B3] Could not update timeline updated_at for ${timelineId}: ${updateError.message}`)
  }
}

async function createTimelineAndAssign(
  aiTimeline: NonNullable<AIResponse['new_timeline']>,
  factId: string
): Promise<string> {
  // Resolve entity_name to entity_id UUID
  let entityId: string | null = null
  const entityName = aiTimeline.entity_name || null

  if (entityName) {
    const resolved = await lookupEntityIdByName(entityName)
    if (resolved) {
      entityId = resolved
    } else {
      console.warn(`[B3] Could not resolve entity name "${entityName}" — creating timeline without entity_id`)
    }
  }

  const { data: newTimeline, error: createError } = await supabaseAdmin
    .from('timelines')
    .insert({
      name: aiTimeline.name,
      description: aiTimeline.description,
      entity_id: entityId,
      status: 'active',
    })
    .select('id')
    .single()

  if (createError || !newTimeline) {
    throw new Error(`[B3] Failed to create new timeline: ${createError?.message ?? 'no data returned'}`)
  }

  const newTimelineId = (newTimeline as { id: string }).id
  console.log(`[B3] Created new timeline "${aiTimeline.name}" (${newTimelineId})`)

  await assignToTimeline(newTimelineId, factId)

  return newTimelineId
}

// ─── Main Export ───

export async function mergeTimeline(
  factId: string
): Promise<{ action: string; timelineId: string | null }> {
  console.log(`[B3] Processing fact ${factId}`)

  // 1. Fetch the atomic fact
  const fact = await fetchFact(factId)

  // 2. Fetch entity names linked to this fact
  const entityNames = await fetchEntityNames(factId)

  // 3. Fetch all active timelines with context
  const timelines = await fetchActiveTimelines()

  // 4. Build prompt
  const template = loadPrompt('timeline-merger.md')
  const factDate = fact.fact_date instanceof Date
    ? fact.fact_date.toISOString().split('T')[0]
    : String(fact.fact_date)

  const factContent = fact.content_zh || fact.content_en
  if (!factContent) {
    console.log(`[B3] No content for fact ${factId}, skipping`)
    return { action: 'none', timelineId: null }
  }

  const prompt = template
    .replace('{fact_content}', factContent)
    .replace('{fact_date}', factDate)
    .replace('{entity_names}', entityNames.length > 0 ? entityNames.join(', ') : '（无）')
    .replace('{existing_timelines}', formatTimelinesForPrompt(timelines))

  // 5. Call AI
  const aiResult = await callHaikuJSON<AIResponse>(prompt)
  console.log(`[B3] AI decision for fact ${factId}: action="${aiResult.action}", reason="${aiResult.reason}"`)

  // 6. Handle action
  let resolvedTimelineId: string | null = null

  if (aiResult.action === 'assign') {
    if (!aiResult.timeline_id) {
      console.warn(`[B3] Action is "assign" but no timeline_id provided — skipping`)
    } else {
      await assignToTimeline(aiResult.timeline_id, factId)
      resolvedTimelineId = aiResult.timeline_id
      console.log(`[B3] Fact ${factId} assigned to existing timeline ${resolvedTimelineId}`)
    }
  } else if (aiResult.action === 'create_new') {
    if (!aiResult.new_timeline) {
      console.warn(`[B3] Action is "create_new" but no new_timeline data provided — skipping`)
    } else {
      resolvedTimelineId = await createTimelineAndAssign(aiResult.new_timeline, factId)
      console.log(`[B3] Fact ${factId} assigned to new timeline ${resolvedTimelineId}`)
    }
  } else {
    // action === 'none'
    console.log(`[B3] Fact ${factId} left standalone — no timeline assigned`)
  }

  return { action: aiResult.action, timelineId: resolvedTimelineId }
}

export async function mergeTimelinesBatch(
  factIds: string[],
  onCancelCheck?: () => Promise<void>
): Promise<{ assigned: number; created: number; standalone: number; failed: number }> {
  console.log(`[B3] Starting batch timeline merge for ${factIds.length} fact(s)`)

  let assigned = 0
  let created = 0
  let standalone = 0
  let failed = 0

  for (let i = 0; i < factIds.length; i++) {
    if (onCancelCheck && i > 0 && i % 5 === 0) await onCancelCheck()
    try {
      const result = await mergeTimeline(factIds[i])
      if (result.action === 'assign') assigned++
      else if (result.action === 'create_new') created++
      else standalone++
    } catch (err) {
      failed++
      console.error(`[B3] Error processing fact ${factIds[i]}:`, err)
    }
  }

  console.log(`[B3] Batch complete — assigned: ${assigned}, created: ${created}, standalone: ${standalone}, failed: ${failed}`)
  return { assigned, created, standalone, failed }
}
