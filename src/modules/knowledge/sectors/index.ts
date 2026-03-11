// ============================================================
// StablePulse — C4 Sector View
// Knowledge module: sector-based fact retrieval and matrix aggregation
// ============================================================

import { supabaseAdmin } from '@/db/client'
import type { AtomicFact } from '@/lib/types'

// ─── Helper Types ───

export interface SectorMatrixRow {
  sector: string
  label_zh: string
  fact_count: number
  high_count: number
  medium_count: number
  low_count: number
}

// ─── Exported Functions ───

/**
 * Retrieve all verified facts for a given sector name.
 * Optionally narrow to a specific week_number.
 * Only returns facts with verification_status 'verified' or 'partially_verified'.
 */
export async function getSectorFacts(sector: string, weekNumber?: string): Promise<AtomicFact[]> {
  // Resolve sector_id from the sectors table by name
  const { data: sectorRow, error: sectorError } = await supabaseAdmin
    .from('sectors')
    .select('id')
    .eq('name', sector)
    .single()

  if (sectorError || !sectorRow) {
    console.log('[getSectorFacts] sector not found:', sector)
    return []
  }

  const sectorId = sectorRow.id

  // Fetch fact_ids linked to this sector
  const { data: factSectorRows, error: fsError } = await supabaseAdmin
    .from('fact_sectors')
    .select('fact_id')
    .eq('sector_id', sectorId)

  if (fsError || !factSectorRows || factSectorRows.length === 0) {
    if (fsError) console.log('[getSectorFacts] fact_sectors query error:', fsError.message)
    return []
  }

  const factIds = factSectorRows.map((r) => r.fact_id)

  // Query atomic_facts filtered to verified status
  let query = supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('id', factIds)
    .in('verification_status', ['verified', 'partially_verified'])
    .order('fact_date', { ascending: false })

  if (weekNumber) {
    query = query.eq('week_number', weekNumber)
  }

  const { data, error } = await query

  if (error) {
    console.log('[getSectorFacts] atomic_facts query error:', error.message)
    return []
  }

  return (data ?? []) as AtomicFact[]
}

/**
 * For each sector, count how many verified facts exist in the given week,
 * broken down by confidence level (high / medium / low).
 * Returns one row per sector.
 */
export async function getSectorMatrix(weekNumber: string): Promise<SectorMatrixRow[]> {
  // Fetch all sectors
  const { data: sectors, error: sectorError } = await supabaseAdmin
    .from('sectors')
    .select('id, name, label_zh')

  if (sectorError || !sectors || sectors.length === 0) {
    console.log('[getSectorMatrix] sectors query error:', sectorError?.message)
    return []
  }

  // Fetch all fact_sectors rows so we can join in-memory
  const { data: factSectorRows, error: fsError } = await supabaseAdmin
    .from('fact_sectors')
    .select('fact_id, sector_id')

  if (fsError) {
    console.log('[getSectorMatrix] fact_sectors query error:', fsError.message)
    return []
  }

  // Fetch all verified facts for the given week
  const { data: facts, error: factsError } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, confidence, verification_status, week_number')
    .eq('week_number', weekNumber)
    .in('verification_status', ['verified', 'partially_verified'])

  if (factsError) {
    console.log('[getSectorMatrix] atomic_facts query error:', factsError.message)
    return []
  }

  // Build a lookup: fact_id -> confidence
  const factConfidenceMap: Record<string, string | null> = {}
  for (const fact of facts ?? []) {
    factConfidenceMap[fact.id] = fact.confidence ?? null
  }

  // Build a lookup: sector_id -> Set of fact_ids (only those in our verified set)
  const sectorFactIds: Record<string, Set<string>> = {}
  for (const row of factSectorRows ?? []) {
    if (!(row.fact_id in factConfidenceMap)) continue
    if (!sectorFactIds[row.sector_id]) {
      sectorFactIds[row.sector_id] = new Set()
    }
    sectorFactIds[row.sector_id].add(row.fact_id)
  }

  // Aggregate counts per sector
  return sectors.map((s) => {
    const factIdSet = sectorFactIds[s.id] ?? new Set<string>()
    let highCount = 0
    let mediumCount = 0
    let lowCount = 0

    for (const fid of factIdSet) {
      const confidence = factConfidenceMap[fid]
      if (confidence === 'high') highCount++
      else if (confidence === 'medium') mediumCount++
      else if (confidence === 'low') lowCount++
    }

    return {
      sector: s.name,
      label_zh: s.label_zh,
      fact_count: factIdSet.size,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
    }
  })
}
