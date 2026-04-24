// ============================================================
// $U Daily News — Pipeline Orchestrator
// Simplified: extract → merge → translate → save (with cross-day dedup)
// Runs once daily; realtime push + V1 source-check removed for token savings.
// ============================================================

import { supabaseAdmin } from '@/db/client'
import { extractEvents } from '@/modules/ai-agents/event-extractor'
import { mergeEvents, findSimilarDbEvent, type DbEventLite } from '@/modules/ai-agents/event-merger'
import { translateEvents } from '@/modules/ai-agents/translator'
import type { ExtractedEvent, PipelineStats } from '@/lib/types'
import type { ProgressReporter } from '@/lib/pipeline-progress'
import { isRunCancelled } from '@/lib/pipeline-progress'

// Cross-day dedup window. An event reported over several days (e.g. a multi-
// day incident) shouldn't create a new row each day — we merge into the
// already-saved row instead.
const CROSS_DAY_DEDUP_WINDOW_DAYS = 7

// ─── Save: cross-day dedup, then insert remainder ─────────────────────────

async function loadRecentEventsForDedup(): Promise<DbEventLite[]> {
  const since = new Date(
    Date.now() - CROSS_DAY_DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, title_zh, title_en, entity_names, category, source_urls')
    .gte('published_at', since)
    .limit(1000)

  if (error) {
    console.warn('[orchestrator] Failed to load existing events for dedup:', error.message)
    return []
  }
  return (data ?? []) as DbEventLite[]
}

async function mergeIntoExisting(
  existingId: string,
  existing: DbEventLite,
  incoming: ExtractedEvent,
): Promise<void> {
  const mergedUrls = [...new Set([...(existing.source_urls ?? []), ...incoming.source_urls])]
  const mergedEntities = [...new Set([
    ...(existing.entity_names ?? []).map(n => n.trim()),
    ...incoming.entity_names.map(n => n.trim()),
  ].filter(Boolean))]

  const { error } = await supabaseAdmin
    .from('events')
    .update({
      source_urls: mergedUrls,
      source_count: mergedUrls.length,
      entity_names: mergedEntities,
      // Intentionally don't touch included_in_daily / included_in_weekly /
      // pushed_to_tg — re-pushing a days-old event on every update would
      // spam Telegram.
    })
    .eq('id', existingId)

  if (error) {
    console.error('[orchestrator] Failed to merge into existing event:', error.message)
    return
  }

  // Link newly-seen raw_items. Composite PK (event_id, raw_item_id) handles
  // dedup at the DB layer.
  if (incoming.raw_item_ids.length > 0) {
    const junction = incoming.raw_item_ids.map(raw_item_id => ({
      event_id: existingId,
      raw_item_id,
    }))
    const { error: jErr } = await supabaseAdmin
      .from('event_sources')
      .upsert(junction, { onConflict: 'event_id,raw_item_id', ignoreDuplicates: true })
    if (jErr) {
      console.warn('[orchestrator] event_sources upsert warning:', jErr.message)
    }
  }
}

async function saveEvents(events: ExtractedEvent[]): Promise<{
  insertedIds: string[]
  mergedCount: number
}> {
  if (events.length === 0) return { insertedIds: [], mergedCount: 0 }

  const existingPool = await loadRecentEventsForDedup()
  console.log(`[orchestrator]   → ${existingPool.length} recent events loaded for cross-day dedup`)

  const toInsert: ExtractedEvent[] = []
  let mergedCount = 0

  for (const event of events) {
    const match = await findSimilarDbEvent(event, existingPool)
    if (match) {
      await mergeIntoExisting(match.id, match, event)
      mergedCount++
    } else {
      toInsert.push(event)
    }
  }

  if (toInsert.length === 0) {
    console.log(`[orchestrator]   → All ${events.length} events matched existing rows (no new inserts)`)
    return { insertedIds: [], mergedCount }
  }

  const rows = toInsert.map(e => ({
    title_zh: e.title_zh,
    title_en: e.title_en || null,
    summary_zh: e.summary_zh,
    summary_en: e.summary_en || null,
    category: e.category,
    importance: e.importance,
    entity_names: e.entity_names,
    source_urls: e.source_urls,
    source_count: e.source_urls.length,
    v1_status: null,
    published_at: e.published_at,
  }))

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert(rows)
    .select('id')

  if (error) {
    console.error('[orchestrator] Failed to save events:', error.message)
    return { insertedIds: [], mergedCount }
  }

  const insertedIds = (data ?? []).map((r: { id: string }) => r.id)

  // Save event_sources junction for newly-inserted events
  const junctionRows: { event_id: string; raw_item_id: string }[] = []
  for (let i = 0; i < toInsert.length; i++) {
    const eventId = insertedIds[i]
    if (!eventId) continue
    for (const rawItemId of toInsert[i].raw_item_ids) {
      junctionRows.push({ event_id: eventId, raw_item_id: rawItemId })
    }
  }

  if (junctionRows.length > 0) {
    const { error: jErr } = await supabaseAdmin
      .from('event_sources')
      .upsert(junctionRows, { onConflict: 'event_id,raw_item_id', ignoreDuplicates: true })
    if (jErr) {
      console.error('[orchestrator] Failed to save event_sources:', jErr.message)
    }
  }

  return { insertedIds, mergedCount }
}

// ─── Main Pipeline ─────────────────────────────────────────────────────────

export interface ProcessResult {
  eventIds: string[]
  stats: PipelineStats
}

export async function runProcessingPipeline(
  opts: { reportProgress?: ProgressReporter; runId?: string | null } = {},
): Promise<ProcessResult> {
  const start = Date.now()
  const stats: PipelineStats = {}
  const report = opts.reportProgress ?? (async () => {})
  const runId = opts.runId ?? null

  console.log('[orchestrator] ═══ V2 Processing Pipeline Start ═══')
  await report({ level: 'info', message: 'Processing pipeline start' })

  // Step 1: Extract events from unprocessed raw_items
  await report({ level: 'progress', message: 'Step 1/4: extracting events from raw_items…' })
  const { events: extracted, processedCount } = await extractEvents()
  stats.raw_items_processed = processedCount
  stats.events_extracted = extracted.length
  await report({
    level: 'success',
    message: `Step 1/4: extracted ${extracted.length} events from ${processedCount} raw items`,
    stats: { raw_items_processed: processedCount, events_extracted: extracted.length },
  })

  if (extracted.length === 0) {
    stats.duration_ms = Date.now() - start
    await report({ level: 'info', message: 'No events extracted; pipeline complete.', stats })
    return { eventIds: [], stats }
  }

  if (await isRunCancelled(runId)) {
    await report({ level: 'error', message: 'Cancelled after extract — aborting.' })
    return { eventIds: [], stats: { ...stats, duration_ms: Date.now() - start } }
  }

  // Step 2: Merge duplicate events within this batch
  await report({ level: 'progress', message: 'Step 2/4: intra-batch merge…' })
  const merged = await mergeEvents(extracted)
  stats.events_merged = merged.length
  await report({
    level: 'success',
    message: `Step 2/4: ${extracted.length} → ${merged.length} after intra-batch merge`,
    stats: { events_merged: merged.length },
  })

  if (await isRunCancelled(runId)) {
    await report({ level: 'error', message: 'Cancelled after merge — aborting.' })
    return { eventIds: [], stats: { ...stats, duration_ms: Date.now() - start } }
  }

  // Step 3: Translate (EN→ZH where needed)
  await report({ level: 'progress', message: 'Step 3/4: translating EN→ZH…' })
  await translateEvents(merged)
  await report({ level: 'success', message: `Step 3/4: translation done` })

  if (await isRunCancelled(runId)) {
    await report({ level: 'error', message: 'Cancelled after translate — aborting.' })
    return { eventIds: [], stats: { ...stats, duration_ms: Date.now() - start } }
  }

  // Step 4: Save — with cross-day dedup against events from the last 7 days
  await report({ level: 'progress', message: 'Step 4/4: cross-day dedup + save…' })
  const { insertedIds, mergedCount } = await saveEvents(merged)
  stats.events_pushed = insertedIds.length
  await report({
    level: 'success',
    message: `Step 4/4: ${insertedIds.length} new rows, ${mergedCount} merged into existing`,
    stats: { events_pushed: insertedIds.length },
  })

  stats.duration_ms = Date.now() - start
  await report({
    level: 'success',
    message: `Pipeline complete — ${insertedIds.length} new + ${mergedCount} merged in ${stats.duration_ms}ms`,
    stats: { duration_ms: stats.duration_ms },
  })

  return { eventIds: insertedIds, stats }
}
