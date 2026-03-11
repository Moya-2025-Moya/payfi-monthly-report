// ============================================================
// StablePulse — C6 Blind Spot Detector
// Knowledge engine module: pure TypeScript + Supabase queries
// ============================================================

import { supabaseAdmin } from '@/db/client'
import { DIMENSION_TEMPLATES } from '@/config/fact-dimensions'
import type { EntityCategory } from '@/lib/types'

// ─── Local interfaces ───

export interface BlindSpotReportResult {
  category: string
  template_dimensions: string[]
  entities: {
    entity_id: string
    entity_name: string
    coverage: Record<string, 'covered' | 'sparse' | 'missing'>
  }[]
}

export interface EntityCoverageResult {
  entity_id: string
  entity_name: string
  category: string
  dimensions: {
    name: string
    label_zh: string
    status: 'covered' | 'sparse' | 'missing'
    fact_count: number
  }[]
}

// ─── Helpers ───

type CoverageLevel = 'covered' | 'sparse' | 'missing'

function classifyCoverage(count: number): CoverageLevel {
  if (count >= 3) return 'covered'
  if (count >= 1) return 'sparse'
  return 'missing'
}

/**
 * Given a list of verified AtomicFact-shaped rows, compute how many facts
 * match a single dimension's matching_tags / matching_metrics criteria.
 */
function countMatchingFacts(
  facts: { tags: string[] | null; metric_name: string | null }[],
  matchingTags: string[],
  matchingMetrics: string[]
): number {
  const tagSet = new Set(matchingTags.map((t) => t.toLowerCase()))
  const metricSet = new Set(matchingMetrics.map((m) => m.toLowerCase()))

  return facts.filter((f) => {
    const factTags = (f.tags ?? []).map((t) => t.toLowerCase())
    const hasTagMatch = factTags.some((t) => tagSet.has(t))

    const metricName = f.metric_name ? f.metric_name.toLowerCase() : null
    const hasMetricMatch = metricName ? metricSet.has(metricName) : false

    return hasTagMatch || hasMetricMatch
  }).length
}

/**
 * Fetch all verified atomic facts for a given entity (via fact_entities join).
 * Returns minimal fields needed for coverage computation.
 */
async function getVerifiedFactsForEntity(
  entityId: string
): Promise<{ tags: string[] | null; metric_name: string | null }[]> {
  // fact_entities → atomic_facts (verified only)
  const { data, error } = await supabaseAdmin
    .from('fact_entities')
    .select(
      `
      atomic_facts!inner (
        tags,
        metric_name,
        verification_status
      )
    `
    )
    .eq('entity_id', entityId)
    .eq('atomic_facts.verification_status', 'verified')

  if (error || !data) return []

  return data.flatMap((row) => {
    const af = row.atomic_facts
    if (!af) return []
    if (Array.isArray(af)) {
      return af.map((f) => ({ tags: f.tags ?? null, metric_name: f.metric_name ?? null }))
    }
    const f = af as { tags: string[] | null; metric_name: string | null; verification_status: string }
    return [{ tags: f.tags ?? null, metric_name: f.metric_name ?? null }]
  })
}

// ─── Exported functions ───

/**
 * C6-A: Build the coverage matrix for all entities of a given category.
 */
export async function getBlindSpotReport(
  entityCategory: string
): Promise<BlindSpotReportResult> {
  // 1. Find the dimension template for this category
  const template = DIMENSION_TEMPLATES.find(
    (t) => t.category === (entityCategory as EntityCategory)
  )

  if (!template) {
    return {
      category: entityCategory,
      template_dimensions: [],
      entities: [],
    }
  }

  const dimensionNames = template.dimensions.map((d) => d.name)

  // 2. Fetch all entities of this category
  const { data: entities, error: entitiesError } = await supabaseAdmin
    .from('entities')
    .select('id, name')
    .eq('category', entityCategory)
    .order('name')

  if (entitiesError || !entities) {
    console.error('[C6] getBlindSpotReport entities error:', entitiesError)
    return {
      category: entityCategory,
      template_dimensions: dimensionNames,
      entities: [],
    }
  }

  const entityRows: BlindSpotReportResult['entities'] = []

  // 3. For each entity, compute per-dimension coverage
  for (const entity of entities) {
    const facts = await getVerifiedFactsForEntity(entity.id as string)

    const coverage: Record<string, CoverageLevel> = {}

    for (const dim of template.dimensions) {
      const count = countMatchingFacts(facts, dim.matching_tags, dim.matching_metrics)
      coverage[dim.name] = classifyCoverage(count)
    }

    entityRows.push({
      entity_id: entity.id as string,
      entity_name: entity.name as string,
      coverage,
    })
  }

  return {
    category: entityCategory,
    template_dimensions: dimensionNames,
    entities: entityRows,
  }
}

/**
 * C6-B: Return dimension-level coverage detail for a single entity.
 */
export async function getEntityCoverage(entityId: string): Promise<EntityCoverageResult> {
  // Fetch entity info
  const { data: entity, error: entityError } = await supabaseAdmin
    .from('entities')
    .select('id, name, category')
    .eq('id', entityId)
    .single()

  if (entityError || !entity) {
    console.error('[C6] getEntityCoverage entity error:', entityError)
    return {
      entity_id: entityId,
      entity_name: '',
      category: '',
      dimensions: [],
    }
  }

  const category = entity.category as EntityCategory

  // Find template
  const template = DIMENSION_TEMPLATES.find((t) => t.category === category)

  if (!template) {
    return {
      entity_id: entityId,
      entity_name: entity.name as string,
      category,
      dimensions: [],
    }
  }

  // Fetch verified facts
  const facts = await getVerifiedFactsForEntity(entityId)

  // Build dimension results
  const dimensions = template.dimensions.map((dim) => {
    const factCount = countMatchingFacts(facts, dim.matching_tags, dim.matching_metrics)
    return {
      name: dim.name,
      label_zh: dim.label_zh,
      status: classifyCoverage(factCount),
      fact_count: factCount,
    }
  })

  return {
    entity_id: entityId,
    entity_name: entity.name as string,
    category,
    dimensions,
  }
}
