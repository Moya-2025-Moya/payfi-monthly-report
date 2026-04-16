// ============================================================
// $U Daily News — Pipeline Orchestrator
// Simplified: extract → merge → V1 check → translate → save → push
// ============================================================

import { supabaseAdmin } from '@/db/client'
import { extractEvents } from '@/modules/ai-agents/event-extractor'
import { mergeEvents } from '@/modules/ai-agents/event-merger'
import { checkSources } from '@/modules/ai-agents/source-check'
import { translateEvents } from '@/modules/ai-agents/translator'
import type { ExtractedEvent, PipelineStats, V1Status } from '@/lib/types'

// ─── Save events to DB ────────────────────────────────────────────────────

async function saveEvents(
  events: ExtractedEvent[],
  v1Results: Map<number, { status: V1Status; evidence_quote: string | null; match_score: number }>
): Promise<string[]> {
  if (events.length === 0) return []

  const rows = events.map((e, i) => {
    const v1 = v1Results.get(i)
    return {
      title_zh: e.title_zh,
      title_en: e.title_en || null,
      summary_zh: e.summary_zh,
      summary_en: e.summary_en || null,
      category: e.category,
      importance: e.importance,
      entity_names: e.entity_names,
      source_urls: e.source_urls,
      source_count: e.source_urls.length,
      v1_status: v1?.status ?? null,
      published_at: e.published_at,
    }
  })

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert(rows)
    .select('id')

  if (error) {
    console.error('[orchestrator] Failed to save events:', error.message)
    return []
  }

  const eventIds = (data ?? []).map((r: { id: string }) => r.id)

  // Save event_sources junction
  const junctionRows: { event_id: string; raw_item_id: string }[] = []
  for (let i = 0; i < events.length; i++) {
    const eventId = eventIds[i]
    if (!eventId) continue
    for (const rawItemId of events[i].raw_item_ids) {
      junctionRows.push({ event_id: eventId, raw_item_id: rawItemId })
    }
  }

  if (junctionRows.length > 0) {
    const { error: junctionError } = await supabaseAdmin
      .from('event_sources')
      .insert(junctionRows)

    if (junctionError) {
      console.error('[orchestrator] Failed to save event_sources:', junctionError.message)
    }
  }

  return eventIds
}

// ─── Main Pipeline ─────────────────────────────────────────────────────────

export interface ProcessResult {
  eventIds: string[]
  stats: PipelineStats
}

export async function runProcessingPipeline(): Promise<ProcessResult> {
  const start = Date.now()
  const stats: PipelineStats = {}

  console.log('[orchestrator] ═══ V2 Processing Pipeline Start ═══')

  // Step 1: Extract events from unprocessed raw_items
  console.log('[orchestrator] Step 1: Extracting events...')
  const { events: extracted, processedCount } = await extractEvents()
  stats.raw_items_processed = processedCount
  stats.events_extracted = extracted.length
  console.log(`[orchestrator]   → ${extracted.length} events from ${processedCount} raw items`)

  if (extracted.length === 0) {
    console.log('[orchestrator] ═══ No events extracted, pipeline complete ═══')
    stats.duration_ms = Date.now() - start
    return { eventIds: [], stats }
  }

  // Step 2: Merge duplicate events
  console.log('[orchestrator] Step 2: Merging duplicates...')
  const merged = await mergeEvents(extracted)
  stats.events_merged = merged.length
  console.log(`[orchestrator]   → ${extracted.length} → ${merged.length} after merge`)

  // Step 3: V1 source check (importance 1-2 only)
  console.log('[orchestrator] Step 3: V1 source check...')
  const v1Results = await checkSources(merged)
  stats.v1_checked = v1Results.size
  stats.v1_matched = [...v1Results.values()].filter(r => r.status === 'matched').length
  stats.v1_failed = [...v1Results.values()].filter(r => r.status === 'no_match').length

  // Filter out V1 failures (no_match = likely fabricated)
  const verified = merged.filter((_, i) => {
    const v1 = v1Results.get(i)
    return !v1 || v1.status !== 'no_match'
  })
  console.log(`[orchestrator]   → ${merged.length - verified.length} events rejected by V1`)

  // Step 4: Translate (EN→ZH where needed)
  console.log('[orchestrator] Step 4: Translating...')
  await translateEvents(verified)

  // Step 5: Save to DB
  console.log('[orchestrator] Step 5: Saving events...')
  const eventIds = await saveEvents(verified, v1Results)
  stats.events_pushed = eventIds.length

  stats.duration_ms = Date.now() - start
  console.log(`[orchestrator] ═══ Pipeline Complete — ${eventIds.length} events saved in ${stats.duration_ms}ms ═══`)

  return { eventIds, stats }
}
