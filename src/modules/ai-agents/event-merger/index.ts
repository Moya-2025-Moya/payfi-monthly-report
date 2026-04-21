// Event Merger — Deduplicates and merges extracted events
//
// Two entry points:
//   mergeEvents(events)            — cluster within the current batch
//   findSimilarDbEvent(ev, pool)   — find the best match among existing DB rows
//
// Similarity signals:
//   * Character-bigram Jaccard on titles (works for CJK + Latin)
//   * Entity overlap (proportional, case-insensitive)
// Any cluster of ≥2 events is disambiguated by AI so we never leave obvious
// dupes unmerged and never silently drop distinct events.

import { callHaikuJSON } from '@/lib/ai-client'
import type { ExtractedEvent } from '@/lib/types'

// ─── Config ────────────────────────────────────────────────────────────────

// Character-bigram Jaccard is naturally smaller than word-token Jaccard.
// 0.22 empirically catches same-incident title variants (tested on the
// 11-headline Kelp DAO cluster) while keeping unrelated items apart.
const TITLE_SIM_THRESHOLD = 0.22
const ENTITY_OVERLAP_BOOST = 0.25
// Strong entity match with weak title → suspect same topic, hand to AI.
const ENTITY_ONLY_THRESHOLD = 0.5
// High-confidence direct-merge bar (skip AI round-trip for 2-event clusters).
const DIRECT_MERGE_THRESHOLD = 0.32

// ─── Tokenizer ─────────────────────────────────────────────────────────────

// Lowercased Latin/digit runs (≥2 chars) + CJK character bigrams.
// Punctuation and whitespace are separators, so "KelpDAO" and "Kelp DAO"
// produce the same Latin tokens. CJK lacks word boundaries so we use bigrams
// — the previous word-split tokenizer collapsed entire Chinese sentences into
// a single opaque token, making Jaccard effectively zero for all same-event
// variants.
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>()
  const lower = text.toLowerCase()

  const latinRuns = lower.match(/[a-z0-9]+/g) ?? []
  for (const run of latinRuns) {
    if (run.length >= 2) tokens.add(run)
  }

  const cjkRuns = lower.match(/[一-鿿]+/g) ?? []
  for (const run of cjkRuns) {
    if (run.length === 1) {
      tokens.add(run)
    } else {
      for (let i = 0; i + 1 < run.length; i++) tokens.add(run.slice(i, i + 2))
    }
  }

  return tokens
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const t of a) if (b.has(t)) intersection++
  return intersection / (a.size + b.size - intersection)
}

function entityOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const norm = (n: string) => n.toLowerCase().trim()
  const setB = new Set(b.map(norm))
  const overlap = a.filter(n => setB.has(norm(n))).length
  // min-based: if the smaller set is fully contained in the larger one, that's
  // a strong signal. max-based over-penalizes when a cluster has accumulated
  // many entities while the new candidate only lists its own handful.
  return overlap / Math.min(a.length, b.length)
}

type MatchReason = 'title' | 'entity' | null

function similarity(
  aTokens: Set<string>, bTokens: Set<string>,
  aEntities: string[], bEntities: string[],
): { score: number; titleSim: number; entSim: number; reason: MatchReason } {
  const titleSim = jaccard(aTokens, bTokens)
  const entSim = entityOverlap(aEntities, bEntities)
  const score = titleSim + entSim * ENTITY_OVERLAP_BOOST

  let reason: MatchReason = null
  if (score >= TITLE_SIM_THRESHOLD) reason = 'title'
  else if (entSim >= ENTITY_ONLY_THRESHOLD) reason = 'entity'

  return { score, titleSim, entSim, reason }
}

// ─── Clustering (within a single extraction batch) ─────────────────────────

interface EventCluster {
  events: ExtractedEvent[]
}

interface EventWithTokens {
  event: ExtractedEvent
  tokens: Set<string>
}

// Match against the max-scoring cluster member (not a growing union) so
// similarity doesn't decay as clusters accumulate members.
function clusterEvents(events: ExtractedEvent[]): EventCluster[] {
  const pre: EventWithTokens[] = events.map(e => ({
    event: e,
    tokens: tokenize(`${e.title_zh} ${e.title_en}`),
  }))

  const clusters: { members: EventWithTokens[] }[] = []

  for (const item of pre) {
    let joined = false
    for (const cluster of clusters) {
      // Cross-category merging is almost always wrong (a hack's technical
      // incident vs its market-data TVL reaction are genuinely different).
      if (cluster.members[0].event.category !== item.event.category) continue

      for (const m of cluster.members) {
        const { reason } = similarity(
          m.tokens, item.tokens,
          m.event.entity_names, item.event.entity_names,
        )
        if (reason !== null) {
          cluster.members.push(item)
          joined = true
          break
        }
      }
      if (joined) break
    }

    if (!joined) clusters.push({ members: [item] })
  }

  return clusters.map(c => ({ events: c.members.map(m => m.event) }))
}

// ─── Merge a set of events into one ────────────────────────────────────────

function mergeInto(events: ExtractedEvent[]): ExtractedEvent {
  if (events.length === 1) return events[0]

  // Pick highest-importance representative (lowest numeric value).
  const best = events.reduce((a, b) => a.importance <= b.importance ? a : b)
  const rawItemIds = [...new Set(events.flatMap(e => e.raw_item_ids))]
  const sourceUrls = [...new Set(events.flatMap(e => e.source_urls))]
  const entityNames = [...new Set(
    events.flatMap(e => e.entity_names.map(n => n.trim())).filter(Boolean),
  )]
  const earliest = events.map(e => e.published_at).sort()[0]

  return {
    ...best,
    raw_item_ids: rawItemIds,
    source_urls: sourceUrls,
    entity_names: entityNames,
    published_at: earliest,
  }
}

// ─── AI disambiguation for multi-event clusters ────────────────────────────

interface AIGroupResponse {
  groups: number[][]
}

async function disambiguate(cluster: EventCluster): Promise<ExtractedEvent[]> {
  const events = cluster.events
  if (events.length === 1) return events

  // 2-event cluster with strong title+entity signal: merge directly, skip AI.
  if (events.length === 2) {
    const [a, b] = events
    const aTok = tokenize(`${a.title_zh} ${a.title_en}`)
    const bTok = tokenize(`${b.title_zh} ${b.title_en}`)
    const { score, reason } = similarity(aTok, bTok, a.entity_names, b.entity_names)
    if (reason === 'title' && score >= DIRECT_MERGE_THRESHOLD) {
      return [mergeInto(events)]
    }
  }

  try {
    const lines = events.map((e, i) =>
      `[${i}] ${e.title_zh} — ${e.summary_zh.slice(0, 150)}`
    ).join('\n')

    const result = await callHaikuJSON<AIGroupResponse>(
      `These news items were clustered by shared entities/topics. Group them by which describe the SAME underlying event (same incident, same action by same actor at roughly the same time). Different angles of one incident (e.g. "hack happened" vs "attacker identified" vs "victim protocol froze market") ARE the same event. Downstream consequences reported as separate market/TVL moves are NOT the same event.

${lines}

Return JSON: {"groups": [[0,1,5], [2,3,4], [6]]} — each group holds indices of the same event. Unique items go in their own single-element group. Every index 0..${events.length - 1} must appear exactly once.`,
      { maxTokens: 1024 }
    )

    const rawGroups = Array.isArray(result.groups) ? result.groups : []
    const validGroups = rawGroups
      .map(g => (Array.isArray(g) ? g.filter(i => Number.isInteger(i) && i >= 0 && i < events.length) : []))
      .filter(g => g.length > 0)

    // Safety: any index not covered by AI gets its own singleton group.
    const covered = new Set(validGroups.flat())
    for (let i = 0; i < events.length; i++) {
      if (!covered.has(i)) validGroups.push([i])
    }

    return validGroups.map(indices => mergeInto(indices.map(i => events[i])))
  } catch (err) {
    // Safer than "merge all": clustering casts a wide net expecting AI to
    // split it. Merging everything on AI failure has caused confirmed false
    // merges in practice (e.g. GENIUS Act rules + Revolut banking license).
    // Keeping them separate preserves original dupes but avoids conflating
    // distinct events.
    console.warn(
      '[event-merger] AI disambiguation failed, keeping cluster members separate:',
      err instanceof Error ? err.message : String(err),
    )
    return events
  }
}

// ─── Main entry point (intra-batch) ────────────────────────────────────────

export async function mergeEvents(events: ExtractedEvent[]): Promise<ExtractedEvent[]> {
  if (events.length === 0) return []

  console.log(`[event-merger] Clustering ${events.length} events`)
  const clusters = clusterEvents(events)
  const multi = clusters.filter(c => c.events.length > 1).length
  console.log(`[event-merger] ${clusters.length} clusters (${multi} multi-event)`)

  const merged: ExtractedEvent[] = []
  for (const cluster of clusters) {
    if (cluster.events.length > 1) {
      merged.push(...await disambiguate(cluster))
    } else {
      merged.push(cluster.events[0])
    }
  }

  console.log(`[event-merger] Result: ${events.length} → ${merged.length} events`)
  return merged
}

// ─── Cross-day dedup against already-saved DB events ───────────────────────

export interface DbEventLite {
  id: string
  title_zh: string
  title_en: string | null
  entity_names: string[]
  category: string
  source_urls: string[]
}

// For a new event about to be inserted, find the best-matching existing DB
// event (same category) to merge into. Returns null if no confident match.
export async function findSimilarDbEvent(
  candidate: ExtractedEvent,
  pool: DbEventLite[],
): Promise<DbEventLite | null> {
  const sameCat = pool.filter(e => e.category === candidate.category)
  if (sameCat.length === 0) return null

  const candTok = tokenize(`${candidate.title_zh} ${candidate.title_en}`)

  let bestTitleMatch: { c: DbEventLite; score: number } | null = null
  let bestEntityOnly: { c: DbEventLite; score: number } | null = null

  for (const c of sameCat) {
    const cTok = tokenize(`${c.title_zh} ${c.title_en ?? ''}`)
    const { score, reason } = similarity(candTok, cTok, candidate.entity_names, c.entity_names)
    if (reason === 'title') {
      if (!bestTitleMatch || score > bestTitleMatch.score) bestTitleMatch = { c, score }
    } else if (reason === 'entity') {
      if (!bestEntityOnly || score > bestEntityOnly.score) bestEntityOnly = { c, score }
    }
  }

  // Strong title signal above DIRECT_MERGE_THRESHOLD: confident merge.
  if (bestTitleMatch && bestTitleMatch.score >= DIRECT_MERGE_THRESHOLD) {
    return bestTitleMatch.c
  }

  // Ambiguous — either weak title match or entity-only. AI check to avoid
  // over-merging (two unrelated Kelp stories on different days can share
  // entities/bigrams without describing the same event).
  const ambiguous = bestTitleMatch ?? bestEntityOnly
  if (!ambiguous) return null

  try {
    const result = await callHaikuJSON<{ same: boolean }>(
      `Are these two news items describing the SAME underlying event (same incident, same action by same actor, at roughly the same time)?

A: ${candidate.title_zh} — ${candidate.summary_zh.slice(0, 150)}
B: ${ambiguous.c.title_zh}

Return JSON: {"same": true} or {"same": false}`,
      { maxTokens: 128 },
    )
    return result.same ? ambiguous.c : null
  } catch {
    return null
  }
}
