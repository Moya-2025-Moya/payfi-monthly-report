// ============================================================
// StablePulse — C8 Density Statistics
// Knowledge engine module: pure SQL aggregation
// ============================================================

import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import type { DensityAnomaly } from '@/lib/types'

// ─── Local interfaces ───

export interface DensityStats {
  week_number: string
  total_facts: number
  by_tag: { tag: string; count: number }[]
  by_entity: { entity_id: string; entity_name: string; count: number }[]
  by_sector: { sector: string; count: number }[]
  by_confidence: { confidence: string; count: number }[]
  by_type: { fact_type: string; count: number }[]
}

// ─── Helpers ───

/**
 * Generate an ordered list of the 8 ISO week strings immediately before
 * the given weekNumber, excluding weekNumber itself.
 * e.g. for '2026-W10' → ['2026-W09', '2026-W08', ..., '2026-W02']
 */
function previousEightWeeks(weekNumber: string): string[] {
  const match = weekNumber.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return []
  let year = parseInt(match[1], 10)
  let week = parseInt(match[2], 10)

  const weeks: string[] = []
  for (let i = 0; i < 8; i++) {
    week--
    if (week === 0) {
      year--
      week = 52 // simplified; close enough for anomaly detection
    }
    weeks.push(`${year}-W${String(week).padStart(2, '0')}`)
  }
  return weeks
}

/**
 * Safely compute the population standard deviation of a list of numbers.
 */
function stddev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

// ─── Exported functions ───

/**
 * C8-A: Aggregate density statistics for a given week.
 */
export async function getDensityStats(weekNumber: string): Promise<DensityStats> {
  // ── total_facts ──────────────────────────────────────────────────────────
  const { count: totalCount } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekNumber)

  const total_facts = totalCount ?? 0

  // ── by_type ──────────────────────────────────────────────────────────────
  const { data: typesData } = await supabaseAdmin
    .from('atomic_facts')
    .select('fact_type')
    .eq('week_number', weekNumber)

  const typeMap = new Map<string, number>()
  for (const row of typesData ?? []) {
    const t = row.fact_type as string
    typeMap.set(t, (typeMap.get(t) ?? 0) + 1)
  }
  const by_type = Array.from(typeMap.entries())
    .map(([fact_type, count]) => ({ fact_type, count }))
    .sort((a, b) => b.count - a.count)

  // ── by_confidence ────────────────────────────────────────────────────────
  const { data: confData } = await supabaseAdmin
    .from('atomic_facts')
    .select('confidence')
    .eq('week_number', weekNumber)

  const confMap = new Map<string, number>()
  for (const row of confData ?? []) {
    const c = (row.confidence as string | null) ?? 'unknown'
    confMap.set(c, (confMap.get(c) ?? 0) + 1)
  }
  const by_confidence = Array.from(confMap.entries())
    .map(([confidence, count]) => ({ confidence, count }))
    .sort((a, b) => b.count - a.count)

  // ── by_tag ───────────────────────────────────────────────────────────────
  // Unnest the tags array to count per-tag occurrences
  const { data: tagsData } = await supabaseAdmin
    .from('atomic_facts')
    .select('tags')
    .eq('week_number', weekNumber)

  const tagMap = new Map<string, number>()
  for (const row of tagsData ?? []) {
    for (const tag of (row.tags as string[] | null) ?? []) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
    }
  }
  const by_tag = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50) // cap at top 50 tags

  // ── by_entity ────────────────────────────────────────────────────────────
  // Join fact_entities → atomic_facts → entities
  const { data: entityFactData } = await supabaseAdmin
    .from('fact_entities')
    .select(
      `
      entity_id,
      entities ( name ),
      atomic_facts!inner ( week_number )
    `
    )
    .eq('atomic_facts.week_number', weekNumber)

  const entityMap = new Map<string, { entity_name: string; count: number }>()
  for (const row of entityFactData ?? []) {
    const eid = row.entity_id as string
    const entityEntry = row.entities
    const entityName = entityEntry
      ? Array.isArray(entityEntry)
        ? (entityEntry[0] as { name: string })?.name ?? eid
        : (entityEntry as { name: string }).name
      : eid

    const existing = entityMap.get(eid)
    if (existing) {
      existing.count++
    } else {
      entityMap.set(eid, { entity_name: entityName, count: 1 })
    }
  }
  const by_entity = Array.from(entityMap.entries())
    .map(([entity_id, v]) => ({ entity_id, entity_name: v.entity_name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)

  // ── by_sector ────────────────────────────────────────────────────────────
  // Join fact_sectors → atomic_facts → sectors
  const { data: sectorFactData } = await supabaseAdmin
    .from('fact_sectors')
    .select(
      `
      sector_id,
      sectors ( name ),
      atomic_facts!inner ( week_number )
    `
    )
    .eq('atomic_facts.week_number', weekNumber)

  const sectorMap = new Map<string, number>()
  for (const row of sectorFactData ?? []) {
    const sectorEntry = row.sectors
    const sectorName = sectorEntry
      ? Array.isArray(sectorEntry)
        ? (sectorEntry[0] as { name: string })?.name ?? (row.sector_id as string)
        : (sectorEntry as { name: string }).name
      : (row.sector_id as string)
    sectorMap.set(sectorName, (sectorMap.get(sectorName) ?? 0) + 1)
  }
  const by_sector = Array.from(sectorMap.entries())
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count)

  return {
    week_number: weekNumber,
    total_facts,
    by_tag,
    by_entity,
    by_sector,
    by_confidence,
    by_type,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * C8-B: Detect density anomalies for the given week.
 *
 * Algorithm:
 *  1. Get current week's fact counts by tag / entity / sector.
 *  2. Get counts for each of the previous 8 weeks.
 *  3. Compute mean + stddev for each grouping key across those 8 weeks.
 *  4. Flag as anomaly if current > mean + 2 * stddev.
 */
export async function getDensityAnomalies(weekNumber: string): Promise<DensityAnomaly[]> {
  const historicalWeeks = previousEightWeeks(weekNumber)

  // ── Fetch current week stats ──────────────────────────────────────────────
  const currentStats = await getDensityStats(weekNumber)

  // ── Fetch historical stats for each of the 8 prior weeks ─────────────────
  // To avoid N+1 per week, fetch all facts for the 8 weeks at once and
  // aggregate in memory.

  // By-tag historical
  const { data: histTagData } = await supabaseAdmin
    .from('atomic_facts')
    .select('tags, week_number')
    .in('week_number', historicalWeeks)

  // Build: tag → weekNumber → count
  const histTagWeekMap = new Map<string, Map<string, number>>()
  for (const row of histTagData ?? []) {
    const wk = row.week_number as string
    for (const tag of (row.tags as string[] | null) ?? []) {
      if (!histTagWeekMap.has(tag)) histTagWeekMap.set(tag, new Map())
      const wkMap = histTagWeekMap.get(tag)!
      wkMap.set(wk, (wkMap.get(wk) ?? 0) + 1)
    }
  }

  // By-entity historical
  const { data: histEntityData } = await supabaseAdmin
    .from('fact_entities')
    .select(
      `
      entity_id,
      entities ( name ),
      atomic_facts!inner ( week_number )
    `
    )
    .in('atomic_facts.week_number', historicalWeeks)

  // entity_id → weekNumber → count
  const histEntityWeekMap = new Map<string, { name: string; weeks: Map<string, number> }>()
  for (const row of histEntityData ?? []) {
    const eid = row.entity_id as string
    const wk = (row.atomic_facts as unknown as { week_number: string }).week_number
    const entityEntry = row.entities
    const entityName = entityEntry
      ? Array.isArray(entityEntry)
        ? (entityEntry[0] as { name: string })?.name ?? eid
        : (entityEntry as { name: string }).name
      : eid

    if (!histEntityWeekMap.has(eid)) {
      histEntityWeekMap.set(eid, { name: entityName, weeks: new Map() })
    }
    const entry = histEntityWeekMap.get(eid)!
    entry.weeks.set(wk, (entry.weeks.get(wk) ?? 0) + 1)
  }

  // By-sector historical
  const { data: histSectorData } = await supabaseAdmin
    .from('fact_sectors')
    .select(
      `
      sector_id,
      sectors ( name ),
      atomic_facts!inner ( week_number )
    `
    )
    .in('atomic_facts.week_number', historicalWeeks)

  const histSectorWeekMap = new Map<string, Map<string, number>>()
  for (const row of histSectorData ?? []) {
    const sectorEntry = row.sectors
    const sectorName = sectorEntry
      ? Array.isArray(sectorEntry)
        ? (sectorEntry[0] as { name: string })?.name ?? (row.sector_id as string)
        : (sectorEntry as { name: string }).name
      : (row.sector_id as string)
    const wk = (row.atomic_facts as unknown as { week_number: string }).week_number

    if (!histSectorWeekMap.has(sectorName)) histSectorWeekMap.set(sectorName, new Map())
    const wkMap = histSectorWeekMap.get(sectorName)!
    wkMap.set(wk, (wkMap.get(wk) ?? 0) + 1)
  }

  // ── Compute anomalies ─────────────────────────────────────────────────────

  const anomalies: DensityAnomaly[] = []

  const classifyTrend = (
    current: number,
    avg: number,
    sd: number
  ): 'spike' | 'sustained_high' | 'declining' | 'normal' => {
    if (current > avg + 2 * sd) return 'spike'
    if (current > avg + sd) return 'sustained_high'
    if (current < avg - sd) return 'declining'
    return 'normal'
  }

  // Helper: get counts for each of the 8 historical weeks for a weekMap
  const weekCounts = (weekMap: Map<string, number>): number[] =>
    historicalWeeks.map((w) => weekMap.get(w) ?? 0)

  // Tags
  for (const { tag, count: currentCount } of currentStats.by_tag) {
    const weekMap = histTagWeekMap.get(tag) ?? new Map<string, number>()
    const counts = weekCounts(weekMap)
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length
    const sd = stddev(counts)

    if (currentCount > avg + 2 * sd && avg > 0) {
      anomalies.push({
        topic: tag,
        topic_type: 'tag',
        current_count: currentCount,
        previous_count: counts[0] ?? 0,
        avg_count: Math.round(avg * 100) / 100,
        multiple: avg > 0 ? Math.round((currentCount / avg) * 100) / 100 : currentCount,
        trend: classifyTrend(currentCount, avg, sd),
        related_entities: [],
      })
    }
  }

  // Entities
  for (const { entity_id, entity_name, count: currentCount } of currentStats.by_entity) {
    const entry = histEntityWeekMap.get(entity_id)
    const weekMap = entry?.weeks ?? new Map<string, number>()
    const counts = weekCounts(weekMap)
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length
    const sd = stddev(counts)

    if (currentCount > avg + 2 * sd && avg > 0) {
      anomalies.push({
        topic: entity_name,
        topic_type: 'entity',
        current_count: currentCount,
        previous_count: counts[0] ?? 0,
        avg_count: Math.round(avg * 100) / 100,
        multiple: avg > 0 ? Math.round((currentCount / avg) * 100) / 100 : currentCount,
        trend: classifyTrend(currentCount, avg, sd),
        related_entities: [entity_id],
      })
    }
  }

  // Sectors
  for (const { sector, count: currentCount } of currentStats.by_sector) {
    const weekMap = histSectorWeekMap.get(sector) ?? new Map<string, number>()
    const counts = weekCounts(weekMap)
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length
    const sd = stddev(counts)

    if (currentCount > avg + 2 * sd && avg > 0) {
      anomalies.push({
        topic: sector,
        topic_type: 'sector',
        current_count: currentCount,
        previous_count: counts[0] ?? 0,
        avg_count: Math.round(avg * 100) / 100,
        multiple: avg > 0 ? Math.round((currentCount / avg) * 100) / 100 : currentCount,
        trend: classifyTrend(currentCount, avg, sd),
        related_entities: [],
      })
    }
  }

  // Sort by multiple descending (biggest spikes first)
  return anomalies.sort((a, b) => b.multiple - a.multiple)
}
