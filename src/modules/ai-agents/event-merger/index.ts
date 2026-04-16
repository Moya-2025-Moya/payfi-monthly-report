// Event Merger — Deduplicates and merges extracted events
//
// Same event reported by multiple sources → merge into one event with combined sources.
// Uses Jaccard similarity on titles + entity overlap.
// Falls back to AI for ambiguous cases.

import { callHaikuJSON } from '@/lib/ai-client'
import type { ExtractedEvent } from '@/lib/types'

// ─── Config ────────────────────────────────────────────────────────────────

const JACCARD_THRESHOLD = 0.35   // title similarity threshold for merging
const ENTITY_OVERLAP_BOOST = 0.2 // bonus if entities overlap

// ─── Jaccard Similarity ────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1)
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }
  return intersection / (a.size + b.size - intersection)
}

function entityOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b.map(n => n.toLowerCase()))
  const overlap = a.filter(n => setB.has(n.toLowerCase())).length
  return overlap / Math.max(a.length, b.length)
}

// ─── Clustering ────────────────────────────────────────────────────────────

interface EventCluster {
  events: ExtractedEvent[]
  titleTokens: Set<string>
}

function shouldMerge(cluster: EventCluster, event: ExtractedEvent): boolean {
  const eventTokens = tokenize(`${event.title_zh} ${event.title_en}`)

  // Check Jaccard similarity with cluster representative
  const titleSim = jaccardSimilarity(cluster.titleTokens, eventTokens)

  // Check entity overlap with any event in cluster
  const maxEntityOverlap = cluster.events.reduce((max, e) => {
    return Math.max(max, entityOverlap(e.entity_names, event.entity_names))
  }, 0)

  const score = titleSim + maxEntityOverlap * ENTITY_OVERLAP_BOOST
  return score >= JACCARD_THRESHOLD
}

function clusterEvents(events: ExtractedEvent[]): EventCluster[] {
  const clusters: EventCluster[] = []

  for (const event of events) {
    const eventTokens = tokenize(`${event.title_zh} ${event.title_en}`)

    // Try to find an existing cluster
    let merged = false
    for (const cluster of clusters) {
      if (shouldMerge(cluster, event)) {
        cluster.events.push(event)
        // Expand cluster tokens
        for (const t of eventTokens) cluster.titleTokens.add(t)
        merged = true
        break
      }
    }

    if (!merged) {
      clusters.push({
        events: [event],
        titleTokens: eventTokens,
      })
    }
  }

  return clusters
}

// ─── Merge Cluster into Single Event ───────────────────────────────────────

function mergeCluster(cluster: EventCluster): ExtractedEvent {
  const events = cluster.events

  // Single event: no merging needed
  if (events.length === 1) return events[0]

  // Pick the event with highest importance (lowest number)
  const best = events.reduce((a, b) => a.importance <= b.importance ? a : b)

  // Combine all source info
  const allRawItemIds = [...new Set(events.flatMap(e => e.raw_item_ids))]
  const allSourceUrls = [...new Set(events.flatMap(e => e.source_urls))]
  const allEntityNames = [...new Set(events.flatMap(e => e.entity_names))]

  // Use earliest published_at
  const earliestDate = events
    .map(e => e.published_at)
    .sort()[0]

  return {
    ...best,
    raw_item_ids: allRawItemIds,
    source_urls: allSourceUrls,
    entity_names: allEntityNames,
    published_at: earliestDate,
  }
}

// ─── AI Disambiguation (for large ambiguous clusters) ──────────────────────

interface AIMergeResponse {
  groups: number[][] // indices into the cluster's events array
}

async function aiDisambiguate(cluster: EventCluster): Promise<ExtractedEvent[]> {
  if (cluster.events.length <= 3) {
    // Small cluster: just merge all
    return [mergeCluster(cluster)]
  }

  // Large cluster: ask AI which events are actually the same
  try {
    const eventDescriptions = cluster.events.map((e, i) =>
      `[${i}] ${e.title_zh} — ${e.summary_zh.slice(0, 100)}`
    ).join('\n')

    const result = await callHaikuJSON<AIMergeResponse>(
      `These events were flagged as potentially the same. Group them by which ones describe the SAME actual event.

${eventDescriptions}

Return JSON: {"groups": [[0,1], [2,3,4]]} — each group is indices of events that are the same event.
Events that are unique should be in their own group: [[0], [1,2], [3]]`,
      { maxTokens: 1024 }
    )

    const groups = result.groups ?? [[...cluster.events.keys()]]
    return groups.map(indices => {
      const subCluster: EventCluster = {
        events: indices.map(i => cluster.events[i]).filter(Boolean),
        titleTokens: cluster.titleTokens,
      }
      return mergeCluster(subCluster)
    })
  } catch {
    // Fallback: merge all
    return [mergeCluster(cluster)]
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

export async function mergeEvents(events: ExtractedEvent[]): Promise<ExtractedEvent[]> {
  if (events.length === 0) return []

  console.log(`[event-merger] Clustering ${events.length} events`)

  const clusters = clusterEvents(events)
  console.log(`[event-merger] Found ${clusters.length} clusters (${clusters.filter(c => c.events.length > 1).length} multi-event)`)

  const merged: ExtractedEvent[] = []

  for (const cluster of clusters) {
    if (cluster.events.length > 3) {
      // Large cluster: AI disambiguation
      const disambiguated = await aiDisambiguate(cluster)
      merged.push(...disambiguated)
    } else {
      // Small cluster: direct merge
      merged.push(mergeCluster(cluster))
    }
  }

  console.log(`[event-merger] Result: ${events.length} → ${merged.length} events`)
  return merged
}
