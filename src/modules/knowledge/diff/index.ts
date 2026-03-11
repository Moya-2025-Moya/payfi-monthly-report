// ============================================================
// StablePulse — C7 Diff Generator
// Knowledge engine module: pure TypeScript + Supabase queries
// ============================================================

import { supabaseAdmin } from '@/db/client'
import type { DiffResult } from '@/lib/types'

// ─── Helpers ───

/** Convert a week string like '2026-W10' to a Monday ISO date string. */
function weekToMondayDate(weekStr: string): string {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/)
  if (!match) throw new Error(`Invalid week string: ${weekStr}`)
  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)

  // ISO 8601: Week 1 is the week containing the first Thursday of the year.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7 // 1=Mon, 7=Sun
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (week - 1) * 7)
  return monday.toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

/** Return the Sunday (end of week) for a given Monday ISO date string. */
function sundayOfWeek(mondayIso: string): string {
  const d = new Date(mondayIso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}

/**
 * Safe percentage change. Returns 0 when both values are 0.
 */
function pctChange(oldVal: number, newVal: number): number {
  if (oldVal === 0 && newVal === 0) return 0
  if (oldVal === 0) return 100
  return Math.round(((newVal - oldVal) / Math.abs(oldVal)) * 10000) / 100
}

// ─── Exported function ───

/**
 * C7: Generate a diff between two week snapshots.
 *
 * @param weekA - Earlier week, e.g. '2026-W09'
 * @param weekB - Later week,   e.g. '2026-W10'
 */
export async function generateDiff(weekA: string, weekB: string): Promise<DiffResult> {
  const mondayA = weekToMondayDate(weekA)
  const sundayA = sundayOfWeek(mondayA)
  const mondayB = weekToMondayDate(weekB)
  const sundayB = sundayOfWeek(mondayB)

  // ── 1. new_entities ──────────────────────────────────────────────────────
  const { data: newEntitiesData } = await supabaseAdmin
    .from('entities')
    .select('id, name, created_at')
    .gte('created_at', mondayB)
    .lte('created_at', sundayB + 'T23:59:59Z')
    .order('created_at')

  const newEntities = (newEntitiesData ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
  }))

  // ── 2. metric_changes ────────────────────────────────────────────────────
  const KEY_METRICS = ['market_cap', 'volume', 'tvl', 'price', 'revenue']

  // Fetch metric facts for weekA
  const { data: metricsA } = await supabaseAdmin
    .from('atomic_facts')
    .select(
      `
      id,
      metric_name,
      metric_value,
      fact_entities (
        entity_id,
        entities ( name )
      )
    `
    )
    .eq('fact_type', 'metric')
    .eq('week_number', weekA)
    .in('metric_name', KEY_METRICS)
    .eq('verification_status', 'verified')

  // Fetch metric facts for weekB
  const { data: metricsB } = await supabaseAdmin
    .from('atomic_facts')
    .select(
      `
      id,
      metric_name,
      metric_value,
      fact_entities (
        entity_id,
        entities ( name )
      )
    `
    )
    .eq('fact_type', 'metric')
    .eq('week_number', weekB)
    .in('metric_name', KEY_METRICS)
    .eq('verification_status', 'verified')

  type MetricRow = {
    id: string
    metric_name: string | null
    metric_value: number | null
    fact_entities: { entity_id: string; entities: { name: string } | { name: string }[] | null }[]
  }

  const buildMetricMap = (
    rows: MetricRow[]
  ): Map<string, { entity_name: string; metric_value: number }> => {
    const map = new Map<string, { entity_name: string; metric_value: number }>()
    for (const row of rows) {
      if (!row.metric_name || row.metric_value == null) continue
      const fe = row.fact_entities?.[0]
      if (!fe) continue
      const entityEntry = fe.entities
      const entityName = entityEntry
        ? Array.isArray(entityEntry)
          ? (entityEntry[0] as { name: string })?.name
          : (entityEntry as { name: string }).name
        : null
      if (!entityName) continue
      const key = `${entityName}::${row.metric_name}`
      // Keep latest (last row wins; rows ordered by default)
      map.set(key, { entity_name: entityName, metric_value: row.metric_value })
    }
    return map
  }

  const mapA = buildMetricMap((metricsA ?? []) as unknown as MetricRow[])
  const mapB = buildMetricMap((metricsB ?? []) as unknown as MetricRow[])

  const metricChanges: DiffResult['metric_changes'] = []
  for (const [key, bVal] of mapB) {
    const aVal = mapA.get(key)
    if (!aVal) continue
    const diff = pctChange(aVal.metric_value, bVal.metric_value)
    if (Math.abs(diff) < 1) continue // skip negligible changes
    const [entityName, metric] = key.split('::')
    metricChanges.push({
      entity_name: entityName,
      metric,
      old_value: aVal.metric_value,
      new_value: bVal.metric_value,
      change_pct: diff,
    })
  }

  // ── 3. timeline_updates ──────────────────────────────────────────────────
  // Count new timeline_facts added in weekB, grouped by timeline
  const { data: tlFactsB } = await supabaseAdmin
    .from('timeline_facts')
    .select(
      `
      timeline_id,
      fact_id,
      timelines ( name ),
      atomic_facts!inner ( week_number )
    `
    )
    .eq('atomic_facts.week_number', weekB)

  const tlCountMap = new Map<string, { name: string; count: number }>()
  for (const row of tlFactsB ?? []) {
    const tlName =
      row.timelines && !Array.isArray(row.timelines)
        ? (row.timelines as { name: string }).name
        : Array.isArray(row.timelines) && row.timelines.length > 0
        ? (row.timelines[0] as { name: string }).name
        : row.timeline_id as string
    const existing = tlCountMap.get(row.timeline_id as string)
    if (existing) {
      existing.count++
    } else {
      tlCountMap.set(row.timeline_id as string, { name: tlName, count: 1 })
    }
  }

  const timelineUpdates: DiffResult['timeline_updates'] = Array.from(tlCountMap.values()).map(
    (v) => ({ timeline_name: v.name, new_nodes: v.count })
  )

  // ── 4. fact_count ────────────────────────────────────────────────────────
  const { count: countA } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekA)

  const { count: countB } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekB)

  const factCountA = countA ?? 0
  const factCountB = countB ?? 0

  const factCount: DiffResult['fact_count'] = {
    week_a: factCountA,
    week_b: factCountB,
    change_pct: pctChange(factCountA, factCountB),
  }

  // ── 5. new_contradictions / resolved_contradictions ──────────────────────
  const { count: newContraCount } = await supabaseAdmin
    .from('fact_contradictions')
    .select('id', { count: 'exact', head: true })
    .gte('detected_at', mondayB)
    .lte('detected_at', sundayB + 'T23:59:59Z')

  const { count: resolvedContraCount } = await supabaseAdmin
    .from('fact_contradictions')
    .select('id', { count: 'exact', head: true })
    .gte('resolved_at', mondayB)
    .lte('resolved_at', sundayB + 'T23:59:59Z')

  // ── 6. blind_spot_changes ────────────────────────────────────────────────
  const { data: bsA } = await supabaseAdmin
    .from('blind_spot_reports')
    .select('report_data')
    .eq('week_number', weekA)
    .limit(1)
    .single()

  const { data: bsB } = await supabaseAdmin
    .from('blind_spot_reports')
    .select('report_data')
    .eq('week_number', weekB)
    .limit(1)
    .single()

  const blindSpotChanges: DiffResult['blind_spot_changes'] = { newly_covered: [], new_gaps: [] }

  if (bsA?.report_data && bsB?.report_data) {
    type BSData = {
      entities: { entity_id: string; entity_name: string; coverage: Record<string, string> }[]
    }
    const rdA = bsA.report_data as BSData
    const rdB = bsB.report_data as BSData

    const mapAe = new Map(rdA.entities.map((e) => [e.entity_id, e.coverage]))
    const mapBe = new Map(rdB.entities.map((e) => [e.entity_id, e.coverage]))

    for (const [eid, covB] of mapBe) {
      const covA = mapAe.get(eid)
      if (!covA) continue
      for (const dim of Object.keys(covB)) {
        const prev = covA[dim]
        const curr = covB[dim]
        if (prev === 'missing' && curr !== 'missing') {
          blindSpotChanges.newly_covered.push(`${eid}:${dim}`)
        } else if (prev !== 'missing' && curr === 'missing') {
          blindSpotChanges.new_gaps.push(`${eid}:${dim}`)
        }
      }
    }
  }

  // ── 7. relationship_changes ──────────────────────────────────────────────
  const { data: newRels } = await supabaseAdmin
    .from('entity_relationships')
    .select(
      `
      id,
      relationship_type,
      description,
      entity_a_id,
      entity_b_id,
      entities_a:entities!entity_a_id ( name ),
      entities_b:entities!entity_b_id ( name )
    `
    )
    .eq('week_number', weekB)
    .order('created_at')

  const relationshipChanges: DiffResult['relationship_changes'] = (newRels ?? []).map((r) => {
    const nameA =
      r.entities_a && !Array.isArray(r.entities_a)
        ? (r.entities_a as { name: string }).name
        : Array.isArray(r.entities_a) && r.entities_a.length > 0
        ? (r.entities_a[0] as { name: string }).name
        : r.entity_a_id

    const nameB =
      r.entities_b && !Array.isArray(r.entities_b)
        ? (r.entities_b as { name: string }).name
        : Array.isArray(r.entities_b) && r.entities_b.length > 0
        ? (r.entities_b[0] as { name: string }).name
        : r.entity_b_id

    const desc = r.description
      ? String(r.description)
      : `${nameA} —[${r.relationship_type}]→ ${nameB}`

    return { type: 'added' as const, description: desc }
  })

  // ── 8. status_changes ────────────────────────────────────────────────────
  // Regulatory trackers updated in weekB that changed status vs weekA.
  // We approximate by looking at trackers updated in weekB alongside a
  // simple before/after comparison using updated_at timestamp boundaries.
  const { data: trackersB } = await supabaseAdmin
    .from('regulatory_trackers')
    .select('id, name, status, updated_at, entities ( name )')
    .gte('updated_at', mondayB)
    .lte('updated_at', sundayB + 'T23:59:59Z')

  // Fetch prior state from a snapshotted view or historic table is not
  // available; instead, compare trackers updated in weekA to those in weekB.
  const { data: trackersA } = await supabaseAdmin
    .from('regulatory_trackers')
    .select('id, status')
    .gte('updated_at', mondayA)
    .lte('updated_at', sundayA + 'T23:59:59Z')

  const statusMapA = new Map((trackersA ?? []).map((t) => [t.id as string, t.status as string]))

  const statusChanges: DiffResult['status_changes'] = []
  for (const t of trackersB ?? []) {
    const prevStatus = statusMapA.get(t.id as string)
    if (prevStatus && prevStatus !== t.status) {
      const entityEntry = t.entities
      const entityName = entityEntry
        ? Array.isArray(entityEntry)
          ? (entityEntry[0] as { name: string })?.name
          : (entityEntry as { name: string }).name
        : (t.name as string)

      statusChanges.push({
        entity_name: entityName ?? (t.name as string),
        from: prevStatus,
        to: t.status as string,
      })
    }
  }

  // ── 9. entity_count ──────────────────────────────────────────────────────
  const { count: totalEntitiesA } = await supabaseAdmin
    .from('entities')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', sundayA + 'T23:59:59Z')

  const { count: totalEntitiesB } = await supabaseAdmin
    .from('entities')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', sundayB + 'T23:59:59Z')

  // ── Assemble result ───────────────────────────────────────────────────────
  return {
    week_a: weekA,
    week_b: weekB,
    new_entities: newEntities,
    status_changes: statusChanges,
    relationship_changes: relationshipChanges,
    metric_changes: metricChanges,
    timeline_updates: timelineUpdates,
    fact_count: factCount,
    entity_count: {
      week_a: totalEntitiesA ?? 0,
      week_b: totalEntitiesB ?? 0,
    },
    new_contradictions: newContraCount ?? 0,
    resolved_contradictions: resolvedContraCount ?? 0,
    blind_spot_changes: blindSpotChanges,
  }
}
