// B4 Contradiction Detector Agent
// Detects contradictions between verified atomic facts.
// - Numerical: pure code path (±14 days, same metric_name + entity, >10% diff)
// - Textual:   AI path (overlapping tags + same entity + same week/±7 days, event/status_change)

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaikuJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { AtomicFact, FactContradiction } from '@/lib/types'

// ─── Prompt ───

const PROMPTS_DIR = join(process.cwd(), 'src/config/prompts')

function loadPrompt(filename: string): string {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf-8')
}

const PROMPT_TEMPLATE = loadPrompt('contradiction-detector.md')

// ─── AI Response Shape ───

interface ContradictionAIResult {
  is_contradiction: boolean
  contradiction_type: 'numerical' | 'textual' | 'temporal' | null
  difference_description: string | null
}

// ─── Helpers ───

function dateRangeFilter(baseDate: Date, days: number): { gte: string; lte: string } {
  const ms = days * 24 * 60 * 60 * 1000
  return {
    gte: new Date(baseDate.getTime() - ms).toISOString(),
    lte: new Date(baseDate.getTime() + ms).toISOString(),
  }
}

/** Check both orderings to avoid inserting duplicate contradiction pairs. */
async function contradictionExists(factIdA: string, factIdB: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('fact_contradictions')
    .select('id')
    .or(
      `and(fact_id_a.eq.${factIdA},fact_id_b.eq.${factIdB}),and(fact_id_a.eq.${factIdB},fact_id_b.eq.${factIdA})`
    )
    .limit(1)

  return !!(data && data.length > 0)
}

async function insertContradiction(
  payload: Omit<FactContradiction, 'id' | 'resolved_note' | 'resolved_at'>
): Promise<void> {
  const { error } = await supabaseAdmin.from('fact_contradictions').insert({
    fact_id_a: payload.fact_id_a,
    fact_id_b: payload.fact_id_b,
    contradiction_type: payload.contradiction_type,
    difference_description: payload.difference_description,
    status: payload.status,
    detected_at: payload.detected_at,
  })

  if (error) {
    console.error(`[B4] Failed to insert contradiction (${payload.fact_id_a} / ${payload.fact_id_b}):`, error.message)
  }
}

// ─── Entity IDs for a fact ───

async function getEntityIds(factId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('fact_entities')
    .select('entity_id')
    .eq('fact_id', factId)

  return data ? data.map((r: { entity_id: string }) => r.entity_id) : []
}

// ─── Numerical Path ───

async function detectNumericalContradictions(fact: AtomicFact, entityIds: string[]): Promise<void> {
  if (!fact.metric_name || fact.metric_value === null || entityIds.length === 0) return

  const range = dateRangeFilter(new Date(fact.fact_date), 14)

  // Find facts with same metric_name, different source, linked to same entity, within ±14 days
  const { data: candidateFacts } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_zh, content_en, metric_value, source_url, fact_date, source_id')
    .eq('metric_name', fact.metric_name)
    .neq('source_id', fact.source_id)
    .neq('id', fact.id)
    .gte('fact_date', range.gte)
    .lte('fact_date', range.lte)

  if (!candidateFacts || candidateFacts.length === 0) return

  for (const candidate of candidateFacts) {
    if (candidate.metric_value === null) continue

    // Confirm the candidate shares at least one entity with the target fact
    const { data: sharedEntities } = await supabaseAdmin
      .from('fact_entities')
      .select('entity_id')
      .eq('fact_id', candidate.id)
      .in('entity_id', entityIds)
      .limit(1)

    if (!sharedEntities || sharedEntities.length === 0) continue

    const base = Math.abs(fact.metric_value)
    if (base === 0) continue

    const diffPct = Math.abs(candidate.metric_value - fact.metric_value) / base

    if (diffPct <= 0.1) continue

    // Potential contradiction — skip if already recorded
    if (await contradictionExists(fact.id, candidate.id)) continue

    const description = `关于 ${fact.metric_name}，来源A(${fact.source_url}) 称 ${fact.metric_value}，来源B(${candidate.source_url}) 称 ${candidate.metric_value}（差异 ${(diffPct * 100).toFixed(1)}%）`

    console.log(`[B4] Numerical contradiction: ${fact.id} vs ${candidate.id} — ${(diffPct * 100).toFixed(1)}% diff`)

    await insertContradiction({
      fact_id_a: fact.id,
      fact_id_b: candidate.id,
      contradiction_type: 'numerical',
      difference_description: description,
      status: 'unresolved',
      detected_at: new Date(),
    })
  }
}

// ─── Textual Path ───

async function detectTextualContradictions(fact: AtomicFact, entityIds: string[]): Promise<void> {
  if (
    fact.tags.length === 0 ||
    entityIds.length === 0 ||
    !['event', 'status_change'].includes(fact.fact_type)
  ) return

  const range = dateRangeFilter(new Date(fact.fact_date), 7)

  // Query facts with overlapping tags, same entity (via fact_entities join), same fact_type, ±7 days
  // Supabase: array overlap operator is `cs` (contains) — use `ov` for overlap on arrays
  const { data: candidateFacts } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_en, content_zh, source_url, fact_date, fact_type, tags, week_number')
    .neq('id', fact.id)
    .neq('source_id', fact.source_id)
    .in('fact_type', ['event', 'status_change'])
    .gte('fact_date', range.gte)
    .lte('fact_date', range.lte)
    .overlaps('tags', fact.tags)

  if (!candidateFacts || candidateFacts.length === 0) return

  for (const candidate of candidateFacts) {
    // Confirm shared entity
    const { data: sharedEntities } = await supabaseAdmin
      .from('fact_entities')
      .select('entity_id')
      .eq('fact_id', candidate.id)
      .in('entity_id', entityIds)
      .limit(1)

    if (!sharedEntities || sharedEntities.length === 0) continue

    // Skip if contradiction already recorded
    if (await contradictionExists(fact.id, candidate.id)) continue

    // Call AI
    const factDate = new Date(fact.fact_date).toISOString().split('T')[0]
    const candidateDate = new Date(candidate.fact_date).toISOString().split('T')[0]

    const factContentA = fact.content_zh || fact.content_en
    const factContentB = candidate.content_zh || candidate.content_en
    if (!factContentA || !factContentB) continue

    const prompt = PROMPT_TEMPLATE
      .replace('{fact_a_content}', factContentA)
      .replace('{fact_a_source}', fact.source_url)
      .replace('{fact_a_date}', factDate)
      .replace('{fact_b_content}', factContentB)
      .replace('{fact_b_source}', candidate.source_url)
      .replace('{fact_b_date}', candidateDate)

    let result: ContradictionAIResult
    try {
      result = await callHaikuJSON<ContradictionAIResult>(prompt)
    } catch (err) {
      console.error(`[B4] AI call failed for pair (${fact.id} / ${candidate.id}):`, err)
      continue
    }

    if (!result.is_contradiction || !result.contradiction_type || !result.difference_description) continue

    console.log(`[B4] Textual contradiction (${result.contradiction_type}): ${fact.id} vs ${candidate.id}`)

    await insertContradiction({
      fact_id_a: fact.id,
      fact_id_b: candidate.id,
      contradiction_type: result.contradiction_type,
      difference_description: result.difference_description,
      status: 'unresolved',
      detected_at: new Date(),
    })
  }
}

// ─── Main Export ───

export async function detectContradictions(factId: string): Promise<void> {
  console.log(`[B4] Detecting contradictions for fact: ${factId}`)

  // 1. Fetch target fact
  const { data: fact, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('id', factId)
    .single()

  if (error || !fact) {
    console.error(`[B4] Fact not found: ${factId}`, error?.message)
    return
  }

  // 2. Resolve entity IDs for this fact
  const entityIds = await getEntityIds(factId)

  // 3. Numerical path (pure code)
  await detectNumericalContradictions(fact as AtomicFact, entityIds)

  // 4. Textual path (AI-assisted)
  await detectTextualContradictions(fact as AtomicFact, entityIds)

  console.log(`[B4] Done for fact: ${factId}`)
}

export async function detectContradictionsBatch(factIds: string[]): Promise<{ checked: number; failed: number }> {
  console.log(`[B4] Batch detecting contradictions for ${factIds.length} facts`)

  let checked = 0
  let failed = 0

  for (const factId of factIds) {
    try {
      await detectContradictions(factId)
      checked++
    } catch (err) {
      failed++
      console.error(`[B4] Error processing fact ${factId}:`, err)
    }
  }

  console.log(`[B4] Batch complete — checked: ${checked}, failed: ${failed}`)
  return { checked, failed }
}
