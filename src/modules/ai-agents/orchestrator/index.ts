// ============================================================
// StablePulse — B6 Orchestrator
// Core pipeline coordinator: runs the full daily/weekly processing flow
// ============================================================

import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'

import { processUnprocessedRaw } from '@/modules/ai-agents/fact-splitter'

import { validateSourceTraceback } from '@/modules/ai-agents/validators/source-traceback'
import { validateCrossSource } from '@/modules/ai-agents/validators/cross-source'
import { validateNumericalSanity } from '@/modules/ai-agents/validators/numerical-sanity'
import { validateOnchainAnchor } from '@/modules/ai-agents/validators/onchain-anchor'
import { validateTemporalConsistency } from '@/modules/ai-agents/validators/temporal-consistency'
import { adjudicate, summarizeVerdicts } from '@/modules/ai-agents/validators/adjudicator'
import { getVerifiersForFact } from '@/config/verification-strategy'

import { resolveEntitiesBatch } from '@/modules/ai-agents/entity-resolver'
import { mergeTimelinesBatch } from '@/modules/ai-agents/timeline-merger'
import { detectContradictionsBatch } from '@/modules/ai-agents/contradiction-detector'
import { translateFactsBatch } from '@/modules/ai-agents/translator'

import { getBlindSpotReport } from '@/modules/knowledge/blind-spots'
import { generateDiff } from '@/modules/knowledge/diff'
import { getDensityAnomalies } from '@/modules/knowledge/density'
import { sendPipelineAlert } from '@/modules/distributors/telegram'

import type {
  AtomicFact,
  V1Result,
  V2Result,
  V3Result,
  V4Result,
  V5Result,
  Verdict,
  PipelineStats,
  EntityCategory,
} from '@/lib/types'

// ─── Constants ───

const RAW_TABLES = [
  'raw_news',
  'raw_filings',
  'raw_product_updates',
  'raw_funding',
  'raw_regulatory',
] as const

const VALIDATION_BATCH_SIZE = 20

const ENTITY_CATEGORIES: EntityCategory[] = [
  'stablecoin_issuer',
  'b2c_product',
  'b2b_infra',
  'tradfi',
  'public_company',
  'defi',
  'regulator',
]

// ─── Pipeline run helpers ───

async function createPipelineRun(type: 'daily' | 'weekly'): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({
      pipeline_type: type,
      status: 'running',
      started_at: new Date().toISOString(),
      completed_at: null,
      stats: null,
      error: null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`[B6] Failed to create pipeline_run: ${error?.message ?? 'no data'}`)
  }

  return data.id as string
}

async function completePipelineRun(runId: string, stats: PipelineStats): Promise<void> {
  const { error } = await supabaseAdmin
    .from('pipeline_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      stats,
      error: null,
    })
    .eq('id', runId)

  if (error) {
    console.error(`[B6] Failed to mark pipeline_run ${runId} as completed:`, error.message)
  }
}

async function failPipelineRun(runId: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err)

  const { error } = await supabaseAdmin
    .from('pipeline_runs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: message,
    })
    .eq('id', runId)

  if (error) {
    console.error(`[B6] Failed to mark pipeline_run ${runId} as failed:`, error.message)
  }
}

// ─── Previous week helper ───

function getPreviousWeekNumber(weekNumber: string): string {
  const match = weekNumber.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return weekNumber

  let year = parseInt(match[1], 10)
  let week = parseInt(match[2], 10)

  week--
  if (week === 0) {
    year--
    week = 52
  }

  return `${year}-W${String(week).padStart(2, '0')}`
}

// ─── Phase 2: Validate a single fact (V1-V5 in parallel, then adjudicate) ───

interface ValidationResult {
  factId: string
  verdict: Verdict
  v1: V1Result
  v2: V2Result | null
  v3: V3Result | null
  v4: V4Result | null
  v5: V5Result | null
}

async function validateFact(fact: AtomicFact): Promise<ValidationResult> {
  // Decision #14: 按事实类型选择需要运行的验证器
  const activeVerifiers = getVerifiersForFact(fact.fact_type)

  const [r1, r2, r3, r4, r5] = await Promise.allSettled([
    validateSourceTraceback(fact),
    activeVerifiers.has('v2') ? validateCrossSource(fact) : Promise.resolve(null),
    activeVerifiers.has('v3') ? validateNumericalSanity(fact) : Promise.resolve(null),
    activeVerifiers.has('v4') ? validateOnchainAnchor(fact) : Promise.resolve(null),
    activeVerifiers.has('v5') ? validateTemporalConsistency(fact) : Promise.resolve(null),
  ])

  // Provide safe fallbacks for any rejected promises; null = verifier not run
  const v1: V1Result = r1.status === 'fulfilled'
    ? r1.value
    : { status: 'source_unavailable', evidence_quote: null, match_score: 0 }

  const v2: V2Result | null = r2.status === 'fulfilled'
    ? r2.value
    : (activeVerifiers.has('v2')
        ? { source_count: 1, consistent_count: 1, cross_validation: 'single_source' as const, is_minority: false, majority_value: null, independent_sources: false, source_urls: [], source_independence_note: null, details: null }
        : null)

  const v3: V3Result | null = r3.status === 'fulfilled'
    ? r3.value
    : (activeVerifiers.has('v3')
        ? { sanity: 'not_applicable' as const, reason: null, historical_reference: null }
        : null)

  const v4: V4Result | null = r4.status === 'fulfilled'
    ? r4.value
    : (activeVerifiers.has('v4')
        ? { anchor_status: 'not_applicable' as const, claimed_value: null, actual_value: null, deviation_pct: null }
        : null)

  const v5: V5Result | null = r5.status === 'fulfilled'
    ? r5.value
    : (activeVerifiers.has('v5')
        ? { temporal_status: 'unchecked' as const, conflict_detail: null }
        : null)

  if (r1.status === 'rejected') console.warn(`[B6] V1 failed for ${fact.id}:`, r1.reason)
  if (activeVerifiers.has('v2') && r2.status === 'rejected') console.warn(`[B6] V2 failed for ${fact.id}:`, r2.reason)
  if (activeVerifiers.has('v3') && r3.status === 'rejected') console.warn(`[B6] V3 failed for ${fact.id}:`, r3.reason)
  if (activeVerifiers.has('v4') && r4.status === 'rejected') console.warn(`[B6] V4 failed for ${fact.id}:`, r4.reason)
  if (activeVerifiers.has('v5') && r5.status === 'rejected') console.warn(`[B6] V5 failed for ${fact.id}:`, r5.reason)

  const verdict = adjudicate({ v1, v2, v3, v4, v5 })

  return { factId: fact.id, verdict, v1, v2, v3, v4, v5 }
}

// ─── Phase 2: Persist validation results to DB ───

async function persistValidationResult(result: ValidationResult): Promise<void> {
  const { error } = await supabaseAdmin
    .from('atomic_facts')
    .update({
      v1_result: result.v1,
      v2_result: result.v2,
      v3_result: result.v3,
      v4_result: result.v4,
      v5_result: result.v5,
      verification_status: result.verdict.status,
      confidence: result.verdict.confidence,
      confidence_reasons: result.verdict.reason
        ? result.verdict.reason.split('; ').filter(Boolean)
        : [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', result.factId)

  if (error) {
    console.error(`[B6] Failed to persist validation for fact ${result.factId}:`, error.message)
  }
}

// ─── Phase 2: Validate all pending facts in batches ───

interface ValidationPhaseResult {
  verdicts: Map<string, Verdict>
  v1Matched: number
  v1Partial: number
  v1NoMatch: number
  v1Unavailable: number
  v2Consistent: number
  v2Inconsistent: number
  v2SingleSource: number
  v3Normal: number
  v3Anomaly: number
  v3LikelyError: number
  v4Anchored: number
  v4Deviation: number
  v4Mismatch: number
  v5Consistent: number
  v5Conflict: number
}

async function runValidationPhase(): Promise<ValidationPhaseResult> {
  // Fetch all pending facts
  const { data: pendingFacts, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('verification_status', 'pending_verification')

  if (error) throw new Error(`[B6] Failed to fetch pending facts: ${error.message}`)

  const facts = (pendingFacts ?? []) as AtomicFact[]
  console.log(`[B6] Phase 2: Validating ${facts.length} pending fact(s)`)

  const verdicts = new Map<string, Verdict>()

  // Per-validator stats
  let v1Matched = 0, v1Partial = 0, v1NoMatch = 0, v1Unavailable = 0
  let v2Consistent = 0, v2Inconsistent = 0, v2SingleSource = 0
  let v3Normal = 0, v3Anomaly = 0, v3LikelyError = 0
  let v4Anchored = 0, v4Deviation = 0, v4Mismatch = 0
  let v5Consistent = 0, v5Conflict = 0

  // Process in batches
  for (let i = 0; i < facts.length; i += VALIDATION_BATCH_SIZE) {
    const batch = facts.slice(i, i + VALIDATION_BATCH_SIZE)
    const batchNum = Math.floor(i / VALIDATION_BATCH_SIZE) + 1
    const totalBatches = Math.ceil(facts.length / VALIDATION_BATCH_SIZE)
    console.log(`[B6] Validation batch ${batchNum}/${totalBatches} (${batch.length} facts)`)

    const results = await Promise.allSettled(batch.map(fact => validateFact(fact)))

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[B6] Fact validation threw unexpectedly:', result.reason)
        continue
      }

      const r = result.value
      verdicts.set(r.factId, r.verdict)

      // Tally per-validator stats
      switch (r.v1.status) {
        case 'matched': v1Matched++; break
        case 'partial': v1Partial++; break
        case 'no_match': v1NoMatch++; break
        case 'source_unavailable': v1Unavailable++; break
      }

      if (r.v2) switch (r.v2.cross_validation) {
        case 'consistent':
        case 'partially_consistent': v2Consistent++; break
        case 'inconsistent': v2Inconsistent++; break
        case 'single_source': v2SingleSource++; break
      }

      if (r.v3) switch (r.v3.sanity) {
        case 'normal': v3Normal++; break
        case 'anomaly': v3Anomaly++; break
        case 'likely_error': v3LikelyError++; break
      }

      if (r.v4) switch (r.v4.anchor_status) {
        case 'anchored': v4Anchored++; break
        case 'deviation': v4Deviation++; break
        case 'mismatch': v4Mismatch++; break
      }

      if (r.v5) switch (r.v5.temporal_status) {
        case 'consistent': v5Consistent++; break
        case 'conflict': v5Conflict++; break
      }

      // Persist to DB
      await persistValidationResult(r)
    }
  }

  return {
    verdicts,
    v1Matched, v1Partial, v1NoMatch, v1Unavailable,
    v2Consistent, v2Inconsistent, v2SingleSource,
    v3Normal, v3Anomaly, v3LikelyError,
    v4Anchored, v4Deviation, v4Mismatch,
    v5Consistent, v5Conflict,
  }
}

// ─── Main: runDailyPipeline ───

export async function runDailyPipeline(): Promise<PipelineStats> {
  console.log('[B6] Starting daily pipeline')
  const runId = await createPipelineRun('daily')
  const weekNumber = getCurrentWeekNumber()
  console.log(`[B6] Pipeline run ID: ${runId}, week: ${weekNumber}`)

  try {
    // ── Phase 1: B1 — Fact splitting ──────────────────────────────────────
    console.log('[B6] Phase 1: Fact splitting across raw tables')

    let rawItemsProcessed = 0
    let candidatesExtracted = 0
    const allB1FactIds: string[] = []

    for (const table of RAW_TABLES) {
      console.log(`[B6] Phase 1: Processing table ${table}`)
      try {
        const result = await processUnprocessedRaw(table, weekNumber)
        rawItemsProcessed += result.total
        candidatesExtracted += result.factIds.length
        allB1FactIds.push(...result.factIds)
        console.log(
          `[B6] Phase 1: ${table} — processed ${result.total} raw items, ` +
          `extracted ${result.factIds.length} facts, dropped ${result.dropped}`
        )
      } catch (err) {
        console.error(
          `[B6] Phase 1: Error processing ${table}:`,
          err instanceof Error ? err.message : String(err)
        )
      }
    }

    console.log(
      `[B6] Phase 1 complete — total raw items: ${rawItemsProcessed}, ` +
      `total facts extracted: ${candidatesExtracted}`
    )

    // ── Phase 2: V1-V5 — Validation ───────────────────────────────────────
    console.log('[B6] Phase 2: Running validators on pending facts')

    const validationPhase = await runValidationPhase()
    const verdictSummary = summarizeVerdicts(validationPhase.verdicts)

    console.log(
      `[B6] Phase 2 complete — verified_high: ${verdictSummary.verifiedHigh}, ` +
      `verified_medium: ${verdictSummary.verifiedMedium}, ` +
      `partially_verified: ${verdictSummary.partiallyVerifiedLow}, ` +
      `rejected: ${verdictSummary.rejected}`
    )

    // ── Phases 3-6: B2-B5 — Post-verification processing ─────────────────
    // Fetch verified/partially_verified fact IDs
    const { data: verifiedRows, error: verifiedError } = await supabaseAdmin
      .from('atomic_facts')
      .select('id')
      .in('verification_status', ['verified', 'partially_verified'])

    if (verifiedError) {
      throw new Error(`[B6] Failed to fetch verified facts: ${verifiedError.message}`)
    }

    const verifiedFactIds = (verifiedRows ?? []).map((r: { id: string }) => r.id)
    console.log(`[B6] Phases 3-6: ${verifiedFactIds.length} verified/partially_verified facts to process`)

    // ── Phase 3: B2 — Entity resolution ───────────────────────────────────
    console.log('[B6] Phase 3: Entity resolution')
    let entitiesCreated = 0
    try {
      await resolveEntitiesBatch(verifiedFactIds)
      console.log('[B6] Phase 3 complete')
    } catch (err) {
      console.error('[B6] Phase 3 error:', err instanceof Error ? err.message : String(err))
    }

    // ── Phase 4: B3 — Timeline merging ────────────────────────────────────
    console.log('[B6] Phase 4: Timeline merging')
    let timelinesUpdated = 0
    try {
      await mergeTimelinesBatch(verifiedFactIds)
      console.log('[B6] Phase 4 complete')
    } catch (err) {
      console.error('[B6] Phase 4 error:', err instanceof Error ? err.message : String(err))
    }

    // ── Phase 5: B4 — Contradiction detection ─────────────────────────────
    console.log('[B6] Phase 5: Contradiction detection')
    let contradictionsFound = 0
    try {
      await detectContradictionsBatch(verifiedFactIds)
      console.log('[B6] Phase 5 complete')
    } catch (err) {
      console.error('[B6] Phase 5 error:', err instanceof Error ? err.message : String(err))
    }

    // ── Phase 6: B5 — Translation ─────────────────────────────────────────
    console.log('[B6] Phase 6: Translation')
    try {
      await translateFactsBatch(verifiedFactIds)
      console.log('[B6] Phase 6 complete')
    } catch (err) {
      console.error('[B6] Phase 6 error:', err instanceof Error ? err.message : String(err))
    }

    // ── Assemble stats ─────────────────────────────────────────────────────
    const stats: PipelineStats = {
      raw_items_processed: rawItemsProcessed,
      candidates_extracted: candidatesExtracted,

      // V0 adjudicator summary
      verified_high: verdictSummary.verifiedHigh,
      verified_medium: verdictSummary.verifiedMedium,
      partially_verified_low: verdictSummary.partiallyVerifiedLow,
      rejected: verdictSummary.rejected,
      rejection_reasons: verdictSummary.rejectionReasons,

      // Per-validator tallies
      v1_matched: validationPhase.v1Matched,
      v1_partial: validationPhase.v1Partial,
      v1_no_match: validationPhase.v1NoMatch,
      v1_unavailable: validationPhase.v1Unavailable,
      v2_consistent: validationPhase.v2Consistent,
      v2_inconsistent: validationPhase.v2Inconsistent,
      v2_single_source: validationPhase.v2SingleSource,
      v3_normal: validationPhase.v3Normal,
      v3_anomaly: validationPhase.v3Anomaly,
      v3_likely_error: validationPhase.v3LikelyError,
      v4_anchored: validationPhase.v4Anchored,
      v4_deviation: validationPhase.v4Deviation,
      v4_mismatch: validationPhase.v4Mismatch,
      v5_consistent: validationPhase.v5Consistent,
      v5_conflict: validationPhase.v5Conflict,

      entities_created: entitiesCreated,
      timelines_updated: timelinesUpdated,
      contradictions_found: contradictionsFound,
    }

    await completePipelineRun(runId, stats)
    console.log('[B6] Daily pipeline complete')
    return stats
  } catch (err) {
    console.error('[B6] Daily pipeline failed:', err instanceof Error ? err.message : String(err))
    await failPipelineRun(runId, err)
    sendPipelineAlert('daily', err instanceof Error ? err.message : String(err)).catch(() => {})
    throw err
  }
}

// ─── Main: runWeeklyKnowledge ───

export async function runWeeklyKnowledge(): Promise<void> {
  console.log('[B6] Starting weekly knowledge computation')
  const runId = await createPipelineRun('weekly')
  const weekNumber = getCurrentWeekNumber()
  const previousWeek = getPreviousWeekNumber(weekNumber)
  console.log(`[B6] Weekly run ID: ${runId}, current week: ${weekNumber}, previous week: ${previousWeek}`)

  try {
    // ── Step 1: Blind spot reports for each entity category ────────────────
    console.log('[B6] Weekly Step 1: Generating blind spot reports')

    for (const category of ENTITY_CATEGORIES) {
      console.log(`[B6] Blind spot report for category: ${category}`)
      try {
        const report = await getBlindSpotReport(category)

        const { error } = await supabaseAdmin
          .from('blind_spot_reports')
          .upsert({
            entity_type: category,
            week_number: weekNumber,
            report_data: {
              template_dimensions: report.template_dimensions,
              template_source_entity_id: category,
              entities: report.entities,
            },
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'entity_type,week_number',
          })

        if (error) {
          console.error(`[B6] Failed to save blind spot report for ${category}:`, error.message)
        } else {
          console.log(
            `[B6] Blind spot report saved for ${category}: ` +
            `${report.entities.length} entities, ${report.template_dimensions.length} dimensions`
          )
        }
      } catch (err) {
        console.error(
          `[B6] Blind spot report failed for ${category}:`,
          err instanceof Error ? err.message : String(err)
        )
      }
    }

    // ── Step 2: Weekly diff (previous vs current week) ────────────────────
    console.log(`[B6] Weekly Step 2: Generating diff ${previousWeek} → ${weekNumber}`)
    try {
      const diff = await generateDiff(previousWeek, weekNumber)
      console.log(
        `[B6] Diff complete — new entities: ${diff.new_entities.length}, ` +
        `metric changes: ${diff.metric_changes.length}, ` +
        `new contradictions: ${diff.new_contradictions}, ` +
        `blind spot newly covered: ${diff.blind_spot_changes.newly_covered.length}, ` +
        `new gaps: ${diff.blind_spot_changes.new_gaps.length}`
      )
    } catch (err) {
      console.error(
        '[B6] Weekly diff failed:',
        err instanceof Error ? err.message : String(err)
      )
    }

    // ── Step 3: Density anomalies ─────────────────────────────────────────
    console.log(`[B6] Weekly Step 3: Detecting density anomalies for ${weekNumber}`)
    try {
      const anomalies = await getDensityAnomalies(weekNumber)
      console.log(`[B6] Density anomalies detected: ${anomalies.length}`)

      for (const anomaly of anomalies.slice(0, 10)) {
        console.log(
          `[B6]   Anomaly — ${anomaly.topic_type}:"${anomaly.topic}" ` +
          `current=${anomaly.current_count}, avg=${anomaly.avg_count}, ` +
          `multiple=${anomaly.multiple}x, trend=${anomaly.trend}`
        )
      }
    } catch (err) {
      console.error(
        '[B6] Density anomaly detection failed:',
        err instanceof Error ? err.message : String(err)
      )
    }

    // Mark pipeline run as completed (no detailed stats for weekly)
    const weeklyStats: PipelineStats = {
      raw_items_processed: 0,
      candidates_extracted: 0,
      verified_high: 0,
      verified_medium: 0,
      partially_verified_low: 0,
      rejected: 0,
      rejection_reasons: {},
      v1_matched: 0,
      v1_partial: 0,
      v1_no_match: 0,
      v1_unavailable: 0,
      v2_consistent: 0,
      v2_inconsistent: 0,
      v2_single_source: 0,
      v3_normal: 0,
      v3_anomaly: 0,
      v3_likely_error: 0,
      v4_anchored: 0,
      v4_deviation: 0,
      v4_mismatch: 0,
      v5_consistent: 0,
      v5_conflict: 0,
      entities_created: 0,
      timelines_updated: 0,
      contradictions_found: 0,
    }

    await completePipelineRun(runId, weeklyStats)
    console.log('[B6] Weekly knowledge computation complete')
  } catch (err) {
    console.error('[B6] Weekly knowledge computation failed:', err instanceof Error ? err.message : String(err))
    await failPipelineRun(runId, err)
    sendPipelineAlert('weekly', err instanceof Error ? err.message : String(err)).catch(() => {})
    throw err
  }
}
