// Event Extractor — V2 AI processing module
//
// Replaces B1 fact-splitter. Instead of atomic facts, extracts events:
// - One raw_item may produce 0-2 events
// - Batches 3-5 raw_items per AI call for efficiency
// - Outputs: title, summary, category, importance, entity_names
// - Chinese-first (title_zh, summary_zh), with English originals preserved

import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import { getActiveEntities } from '@/lib/watchlist'
import type { RawItem, ExtractedEvent, EventCategory, Importance } from '@/lib/types'

// ─── Config ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 5       // raw_items per AI call
const MAX_ITEMS = 200      // max raw_items per run
const MAX_CONTENT_LEN = 4000 // truncate long content per item

// ─── Types ─────────────────────────────────────────────────────────────────

interface AIExtractedEvent {
  title_zh: string
  title_en: string
  summary_zh: string
  summary_en: string
  category: string
  importance: number
  entity_names: string[]
  // Batch-local indices of articles that describe this event. Required so we
  // don't attribute every extracted event to every article in the batch.
  source_indices: number[]
}

interface AIExtractionResponse {
  events: AIExtractedEvent[]
}

// ─── Prompt ────────────────────────────────────────────────────────────────

function buildSystemPrompt(entityNames: string[]): string {
  return `You are a stablecoin/PayFi news analyst. Your job is to extract distinct events from news articles.

## Rules
1. Each event is a SINGLE, self-contained development (not a summary of an article)
2. Merge information that describes the same event across articles into one event — and set source_indices to ALL articles that contribute to it
3. Skip: opinion pieces, price speculation, generic market commentary, duplicate events
4. Title: concise, factual, ≤30 characters in Chinese
5. Summary: 2-3 sentences max, factual only, NO opinions/predictions
6. Language: Chinese for title_zh/summary_zh, English for title_en/summary_en
7. source_indices: REQUIRED — array of article numbers (0-indexed) from the input that describe this event. Never invent indices. Never include articles that don't actually support the event.

## Categories
- regulatory: laws, bills, enforcement, licenses, compliance actions
- partnership: business deals, integrations, collaborations
- product: new features, launches, upgrades, technical changes
- funding: fundraising, investments, acquisitions
- market: market data, TVL, volume, market cap changes
- policy: company policy changes, strategic shifts
- technical: blockchain upgrades, protocol changes, security incidents
- other: anything that doesn't fit above

## Importance
- 1 (critical): Major regulatory action, billion-dollar events, market-moving news
- 2 (high): Significant partnerships, product launches, important policy changes
- 3 (medium): Notable updates, moderate funding rounds, incremental progress
- 4 (low): Minor mentions, routine updates

## Known entities (use these exact names when they appear):
${entityNames.join(', ')}

## Output format
Respond with JSON: {"events": [{"title_zh", "title_en", "summary_zh", "summary_en", "category", "importance", "entity_names", "source_indices": [0,2]}]}
If no events worth extracting, return {"events": []}`
}

function buildUserPrompt(items: RawItem[]): string {
  // Index articles 0..N-1 so AI's source_indices field aligns with batch positions.
  const parts = items.map((item, i) => {
    const title = item.title ?? '(no title)'
    const content = item.content?.slice(0, MAX_CONTENT_LEN) ?? ''
    const fullText = item.full_text?.slice(0, MAX_CONTENT_LEN) ?? ''
    const text = fullText || content
    return `--- Article ${i} [${item.source_type}/${item.source_name}] ---
Title: ${title}
Content: ${text}
URL: ${item.source_url}
Date: ${item.published_at}`
  })

  return `Extract events from these ${items.length} articles (indexed 0..${items.length - 1}):\n\n${parts.join('\n\n')}`
}

// ─── Validation ────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set<string>([
  'regulatory', 'partnership', 'product', 'funding',
  'market', 'policy', 'technical', 'other',
])

function validateEvent(e: AIExtractedEvent): { event: ExtractedEvent; sourceIndices: number[] } | null {
  if (!e.title_zh || !e.summary_zh) return null
  if (e.title_zh.length < 3 || e.summary_zh.length < 10) return null

  const category = VALID_CATEGORIES.has(e.category)
    ? (e.category as EventCategory)
    : 'other'

  const importance = (e.importance >= 1 && e.importance <= 4)
    ? (e.importance as Importance)
    : 3

  const sourceIndices = Array.isArray(e.source_indices)
    ? e.source_indices.filter(i => Number.isInteger(i) && i >= 0)
    : []

  return {
    event: {
      title_zh: e.title_zh,
      title_en: e.title_en || '',
      summary_zh: e.summary_zh,
      summary_en: e.summary_en || '',
      category,
      importance,
      entity_names: Array.isArray(e.entity_names) ? e.entity_names : [],
      raw_item_ids: [], // filled by caller from sourceIndices
      source_urls: [],  // filled by caller from sourceIndices
      published_at: new Date().toISOString(), // overridden by caller
    },
    sourceIndices,
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

export async function extractEvents(rawItemIds?: string[]): Promise<{
  events: ExtractedEvent[]
  processedCount: number
}> {
  // Fetch unprocessed raw_items
  let query = supabaseAdmin
    .from('raw_items')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(MAX_ITEMS)

  if (rawItemIds && rawItemIds.length > 0) {
    query = query.in('id', rawItemIds)
  } else {
    query = query.eq('processed', false)
  }

  const { data: rawItems, error } = await query

  if (error) throw new Error(`Failed to fetch raw_items: ${error.message}`)
  if (!rawItems || rawItems.length === 0) {
    console.log('[event-extractor] No unprocessed items')
    return { events: [], processedCount: 0 }
  }

  console.log(`[event-extractor] Processing ${rawItems.length} raw items`)

  // Get entity names for the prompt
  const entities = await getActiveEntities()
  const entityNames = entities.map(e => e.name)

  const systemPrompt = buildSystemPrompt(entityNames)
  const allEvents: ExtractedEvent[] = []

  // Process in batches
  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE) as RawItem[]
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(rawItems.length / BATCH_SIZE)

    console.log(`[event-extractor] Batch ${batchNum}/${totalBatches} (${batch.length} items)`)

    try {
      const result = await callHaikuJSON<AIExtractionResponse>(
        buildUserPrompt(batch),
        { system: systemPrompt, maxTokens: 4096, cacheSystem: true }
      )

      const events = result.events ?? []
      let validCount = 0
      for (const rawEvent of events) {
        const validated = validateEvent(rawEvent)
        if (!validated) continue
        const { event, sourceIndices } = validated

        // Resolve source_indices → actual articles. If AI didn't supply valid
        // indices, fall back to the whole batch (old behavior) with a warning,
        // since dropping the event silently would hide extraction bugs.
        const inRange = sourceIndices.filter(i => i < batch.length)
        const cited = inRange.length > 0 ? inRange.map(i => batch[i]) : batch
        if (inRange.length === 0) {
          console.warn(
            `[event-extractor] Event "${event.title_zh}" missing valid source_indices; ` +
            `attributing to whole batch of ${batch.length}.`,
          )
        }

        event.raw_item_ids = cited.map(item => item.id)
        event.source_urls = [...new Set(cited.map(item => item.source_url))]
        event.published_at = cited.map(item => item.published_at).sort()[0]

        allEvents.push(event)
        validCount++
      }

      console.log(`[event-extractor]   → ${events.length} events extracted, ${validCount} valid`)
    } catch (err) {
      console.error(`[event-extractor] Batch ${batchNum} failed:`, err instanceof Error ? err.message : String(err))
    }

    // Mark batch as processed
    const batchIds = batch.map(item => item.id)
    await supabaseAdmin
      .from('raw_items')
      .update({ processed: true })
      .in('id', batchIds)
  }

  console.log(`[event-extractor] Total: ${allEvents.length} events from ${rawItems.length} raw items`)
  return { events: allEvents, processedCount: rawItems.length }
}
