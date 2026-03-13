// ============================================================
// StablePulse — Centralized Data Access Layer for Weekly Data
// Decision #12: JSON blob progressive table split
//
// Currently reads/writes from weekly_snapshots.snapshot_data JSON.
// The interface is designed so switching to dedicated tables later
// is a one-line change per function (swap the implementation body).
// ============================================================

import { supabaseAdmin } from '@/db/client'

// ─── Shared Types ───

export interface WeeklyStats {
  total_facts: number
  new_facts: number
  high_confidence: number
  medium_confidence: number
  low_confidence: number
  rejected: number
  new_entities: number
  active_entities: number
}

export interface WeeklySummaryData {
  simple: string | null
  detailed: string | null
}

export interface StoredNarrative {
  topic: string
  summary: string
  branches: { id: string; label: string; side: 'left' | 'right'; color: string }[]
  nodes: {
    id: string; date: string; title: string; description: string
    significance: 'high' | 'medium' | 'low'
    factIds: string[]; entityNames: string[]
    sourceUrl?: string; isExternal?: boolean; externalUrl?: string
    isPrediction?: boolean; branchId: string
  }[]
  edges: { id: string; source: string; target: string; label?: string }[]
}

export interface BreakingAlert {
  title: string
  summary: string
  source_url: string
  urgency: 'breaking' | 'important'
  detected_at: string
  source_name: string
}

export interface WeeklyArchiveEntry {
  week: string
  generatedAt: string
  factCount: number
  narrativeCount: number
}

// ─── Internal: Raw snapshot_data reader ───

async function getRawSnapshotData(
  week: string
): Promise<Record<string, unknown> | null> {
  const { data } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', week)
    .single()
  return (data?.snapshot_data as Record<string, unknown>) ?? null
}

// ─── Read Functions ───

/**
 * Get stats for a given week.
 * Currently reads from snapshot_data JSON fields.
 * Future: SELECT from weekly_stats table.
 */
export async function getWeeklyStats(week: string): Promise<WeeklyStats | null> {
  const sd = await getRawSnapshotData(week)
  if (!sd) return null
  return {
    total_facts: (sd.total_facts as number) ?? 0,
    new_facts: (sd.new_facts as number) ?? 0,
    high_confidence: (sd.high_confidence as number) ?? 0,
    medium_confidence: (sd.medium_confidence as number) ?? 0,
    low_confidence: (sd.low_confidence as number) ?? 0,
    rejected: (sd.rejected as number) ?? 0,
    new_entities: (sd.new_entities as number) ?? 0,
    active_entities: (sd.active_entities as number) ?? 0,
  }
}

/**
 * Get stored narrative threads for a given week.
 * Currently reads from snapshot_data.narratives.
 * Future: SELECT from weekly_narratives table.
 */
export async function getWeeklyNarratives(week: string): Promise<StoredNarrative[]> {
  const sd = await getRawSnapshotData(week)
  if (!sd) return []
  return (sd.narratives as StoredNarrative[]) ?? []
}

/**
 * Get weekly summary (simple + detailed) for a given week.
 * Currently reads from snapshot_data.weekly_summary / weekly_summary_detailed.
 * Future: SELECT from weekly_summaries table.
 */
export async function getWeeklySummary(week: string): Promise<WeeklySummaryData> {
  const sd = await getRawSnapshotData(week)
  if (!sd) return { simple: null, detailed: null }
  return {
    simple: (sd.weekly_summary as string) ?? null,
    detailed: (sd.weekly_summary_detailed as string) ?? null,
  }
}

/**
 * Get all data needed for the homepage/weekly report page in a single query.
 * This is an optimization to avoid multiple DB roundtrips.
 */
export async function getWeeklyPageData(week: string): Promise<{
  stats: WeeklyStats | null
  narratives: StoredNarrative[]
  summarySimple: string | null
  summaryDetailed: string | null
  breakingAlerts: BreakingAlert[]
}> {
  try {
    const sd = await getRawSnapshotData(week)
    if (!sd) return { stats: null, narratives: [], summarySimple: null, summaryDetailed: null, breakingAlerts: [] }

    const stats: WeeklyStats = {
      total_facts: (sd.total_facts as number) ?? 0,
      new_facts: (sd.new_facts as number) ?? 0,
      high_confidence: (sd.high_confidence as number) ?? 0,
      medium_confidence: (sd.medium_confidence as number) ?? 0,
      low_confidence: (sd.low_confidence as number) ?? 0,
      rejected: (sd.rejected as number) ?? 0,
      new_entities: (sd.new_entities as number) ?? 0,
      active_entities: (sd.active_entities as number) ?? 0,
    }

    return {
      stats,
      narratives: (sd.narratives as StoredNarrative[]) ?? [],
      summarySimple: (sd.weekly_summary as string) ?? null,
      summaryDetailed: (sd.weekly_summary_detailed as string) ?? null,
      breakingAlerts: (sd.breaking_alerts as BreakingAlert[]) ?? [],
    }
  } catch {
    return { stats: null, narratives: [], summarySimple: null, summaryDetailed: null, breakingAlerts: [] }
  }
}

/**
 * Get all weekly snapshots for the archive listing page.
 * Currently reads from weekly_snapshots table with snapshot_data.
 * Future: JOIN weekly_stats for counts.
 */
export async function getWeeklyArchiveList(limit = 52): Promise<WeeklyArchiveEntry[]> {
  const { data } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('week_number, generated_at, snapshot_data')
    .order('week_number', { ascending: false })
    .limit(limit)

  return (data ?? []).map(row => {
    const sd = row.snapshot_data as Record<string, unknown> | null
    const factCount = (sd?.total_facts as number) ?? 0
    const narrativeCount = Array.isArray(sd?.narratives) ? (sd.narratives as unknown[]).length : 0
    return {
      week: row.week_number as string,
      generatedAt: row.generated_at as string,
      factCount,
      narrativeCount,
    }
  })
}

/**
 * Get knowledge growth stats for the heartbeat visualization.
 * Returns weekly counts of reference events for the last N weeks.
 */
export async function getKnowledgeGrowthStats(weeks = 12): Promise<{ week: string; total: number }[]> {
  try {
    const { data } = await supabaseAdmin
      .from('reference_events')
      .select('created_at')
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) return []

    // Group by ISO week
    const weekCounts = new Map<string, number>()
    for (const row of data) {
      const d = new Date(row.created_at as string)
      const week = getISOWeek(d)
      weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1)
    }

    // Convert to cumulative and take last N weeks
    const allWeeks = [...weekCounts.keys()].sort()
    let cumulative = 0
    const result: { week: string; total: number }[] = []
    for (const w of allWeeks) {
      cumulative += weekCounts.get(w)!
      result.push({ week: w, total: cumulative })
    }

    return result.slice(-weeks)
  } catch {
    return []
  }
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * Get enhanced archive list with one-liner and narrative topics.
 */
export async function getWeeklyArchiveListEnhanced(limit = 52): Promise<(WeeklyArchiveEntry & {
  oneLiner?: string
  narrativeTopics?: string[]
  dateRange?: string
})[]> {
  const { data } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('week_number, generated_at, snapshot_data')
    .order('week_number', { ascending: false })
    .limit(limit)

  return (data ?? []).map(row => {
    const sd = row.snapshot_data as Record<string, unknown> | null
    const factCount = (sd?.total_facts as number) ?? 0
    const narratives = (sd?.narratives as { topic: string }[]) ?? []
    const narrativeCount = narratives.length

    // Parse detailed summary for one-liner
    let oneLiner: string | undefined
    try {
      const detailed = sd?.weekly_summary_detailed as string
      if (detailed) {
        const parsed = JSON.parse(detailed)
        oneLiner = parsed.oneLiner || parsed.one_liner
      }
    } catch { /* ignore */ }

    return {
      week: row.week_number as string,
      generatedAt: row.generated_at as string,
      factCount,
      narrativeCount,
      oneLiner,
      narrativeTopics: narratives.map(n => n.topic),
    }
  })
}

// ─── Write Functions ───

/**
 * Save weekly stats into the snapshot.
 * Currently writes to snapshot_data JSON blob (merge).
 * Future: INSERT/UPSERT into weekly_stats table + keep blob for back-compat.
 */
export async function saveWeeklyStats(week: string, stats: WeeklyStats): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', week)
    .single()

  const existingData = (existing?.snapshot_data ?? {}) as Record<string, unknown>

  const snapshotData = {
    ...existingData,
    total_facts: stats.total_facts,
    new_facts: stats.new_facts,
    high_confidence: stats.high_confidence,
    medium_confidence: stats.medium_confidence,
    low_confidence: stats.low_confidence,
    rejected: stats.rejected,
    new_entities: stats.new_entities,
    active_entities: stats.active_entities,
  }

  await supabaseAdmin
    .from('weekly_snapshots')
    .upsert(
      { week_number: week, snapshot_data: snapshotData, generated_at: new Date().toISOString() },
      { onConflict: 'week_number' }
    )
}

/**
 * Save weekly summary (simple + detailed) into the snapshot.
 * Currently writes to snapshot_data JSON blob (merge).
 * Future: INSERT/UPSERT into weekly_summaries table.
 */
export async function saveWeeklySummary(week: string, data: WeeklySummaryData): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', week)
    .single()

  const existingData = (existing?.snapshot_data ?? {}) as Record<string, unknown>

  const snapshotData = {
    ...existingData,
    weekly_summary: data.simple,
    weekly_summary_detailed: data.detailed,
  }

  await supabaseAdmin
    .from('weekly_snapshots')
    .upsert(
      { week_number: week, snapshot_data: snapshotData, generated_at: new Date().toISOString() },
      { onConflict: 'week_number' }
    )
}

/**
 * Save the full snapshot data in one shot (used by the pipeline).
 * Merges with existing data to preserve fields written by other pipelines.
 * Currently writes to snapshot_data JSON blob.
 * Future: Calls individual save functions + writes remaining fields to blob.
 */
export async function saveWeeklySnapshot(
  week: string,
  snapshotFields: Record<string, unknown>
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', week)
    .single()

  const existingData = (existing?.snapshot_data ?? {}) as Record<string, unknown>

  const snapshotData = {
    ...existingData,
    ...snapshotFields,
  }

  const { error } = await supabaseAdmin
    .from('weekly_snapshots')
    .upsert(
      { week_number: week, snapshot_data: snapshotData, generated_at: new Date().toISOString() },
      { onConflict: 'week_number' }
    )

  if (error) throw new Error(`保存失败: ${error.message}`)
}

/**
 * Read the raw snapshot_data for the current week (used by /api/snapshot).
 * Returns the full row as-is for back-compat with the editorial dashboard.
 */
export async function getWeeklySnapshotRow(week: string): Promise<{
  week_number: string
  snapshot_data: Record<string, unknown>
  generated_at: string
} | null> {
  const { data, error } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('week_number, snapshot_data, generated_at')
    .eq('week_number', week)
    .single()

  if (error || !data) return null
  return data as { week_number: string; snapshot_data: Record<string, unknown>; generated_at: string }
}
