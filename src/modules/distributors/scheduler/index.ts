// ============================================================
// StablePulse — E3 Scheduler
// Coordinates weekly snapshot generation and distribution.
// ============================================================

import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { sendWeeklySnapshotEmail } from '../email'
import { sendWeeklySnapshotTelegram, sendPipelineAlert } from '../telegram'
import { getDensityAnomalies } from '@/modules/knowledge/density'

// ─── generateWeeklySnapshot ───────────────────────────────────────────────────

export async function generateWeeklySnapshot(): Promise<void> {
  const weekNumber = getCurrentWeekNumber()
  console.log(`[E3] Generating snapshot for ${weekNumber}`)

  // ── 1. Total facts this week ──────────────────────────────────────────────
  const { count: totalFacts } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekNumber)

  // ── 2. New facts (non-rejected) ───────────────────────────────────────────
  const { count: newFactsCount } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekNumber)
    .neq('verification_status', 'rejected')

  // ── 3. Confidence breakdown ───────────────────────────────────────────────
  const { count: highCount } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekNumber)
    .eq('confidence', 'high')

  const { count: mediumCount } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekNumber)
    .eq('confidence', 'medium')

  const { count: lowCount } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekNumber)
    .eq('confidence', 'low')

  const { count: rejectedCount } = await supabaseAdmin
    .from('atomic_facts')
    .select('id', { count: 'exact', head: true })
    .eq('week_number', weekNumber)
    .eq('verification_status', 'rejected')

  // ── 4. New entities created this week ─────────────────────────────────────
  // Approximate "this week" using created_at relative to ISO week boundaries.
  const weekStart = isoWeekStart(weekNumber)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { count: newEntities } = await supabaseAdmin
    .from('entities')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString())

  // ── 5. Active entities (appear in at least one fact this week) ────────────
  const { data: activeEntityRows } = await supabaseAdmin
    .from('fact_entities')
    .select('entity_id, atomic_facts!inner(week_number)')
    .eq('atomic_facts.week_number', weekNumber)

  const uniqueActiveEntities = new Set(
    (activeEntityRows ?? []).map((r) => r.entity_id as string)
  )
  const activeEntities = uniqueActiveEntities.size

  // ── 6. New contradictions detected this week ──────────────────────────────
  const { count: newContradictions } = await supabaseAdmin
    .from('fact_contradictions')
    .select('id', { count: 'exact', head: true })
    .gte('detected_at', weekStart.toISOString())
    .lt('detected_at', weekEnd.toISOString())
    .eq('status', 'unresolved')

  // ── 7. Resolved contradictions ────────────────────────────────────────────
  const { count: resolvedContradictions } = await supabaseAdmin
    .from('fact_contradictions')
    .select('id', { count: 'exact', head: true })
    .gte('resolved_at', weekStart.toISOString())
    .lt('resolved_at', weekEnd.toISOString())
    .eq('status', 'resolved')

  // ── 8. Top density anomalies ──────────────────────────────────────────────
  let topDensityAnomalies: string[] = []
  try {
    const anomalies = await getDensityAnomalies(weekNumber)
    topDensityAnomalies = anomalies.slice(0, 5).map((a) => a.topic)
  } catch (err) {
    console.warn('[E3] Could not fetch density anomalies:', err)
  }

  // ── 9. Build snapshot_data ────────────────────────────────────────────────
  const snapshotData = {
    total_facts: totalFacts ?? 0,
    new_facts: newFactsCount ?? 0,
    high_confidence: highCount ?? 0,
    medium_confidence: mediumCount ?? 0,
    low_confidence: lowCount ?? 0,
    rejected: rejectedCount ?? 0,
    new_entities: newEntities ?? 0,
    active_entities: activeEntities,
    new_contradictions: newContradictions ?? 0,
    resolved_contradictions: resolvedContradictions ?? 0,
    blind_spot_changes: [] as string[], // populated by blind-spot module if integrated
    top_density_anomalies: topDensityAnomalies,
  }

  // ── 10. Upsert into weekly_snapshots ──────────────────────────────────────
  const { error } = await supabaseAdmin
    .from('weekly_snapshots')
    .upsert(
      {
        week_number: weekNumber,
        snapshot_data: snapshotData,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'week_number' }
    )

  if (error) {
    throw new Error(`[E3] Failed to upsert weekly snapshot: ${error.message}`)
  }

  console.log(`[E3] Snapshot saved for ${weekNumber}:`, snapshotData)
}

// ─── distributeSnapshot ───────────────────────────────────────────────────────

export async function distributeSnapshot(weekNumber?: string): Promise<void> {
  const targetWeek = weekNumber ?? getCurrentWeekNumber()
  console.log(`[E3] Distributing snapshot for ${targetWeek}`)

  // ── 1. Fetch snapshot ─────────────────────────────────────────────────────
  const { data: snapshot, error: snapshotError } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('*')
    .eq('week_number', targetWeek)
    .single()

  if (snapshotError || !snapshot) {
    throw new Error(
      `[E3] No snapshot found for ${targetWeek}: ${snapshotError?.message ?? 'not found'}`
    )
  }

  // ── 2. Fetch subscriber emails ────────────────────────────────────────────
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('email')

  if (usersError) {
    console.warn('[E3] Could not fetch users:', usersError.message)
  }

  const emails = (users ?? []).map((u: { email: string }) => u.email).filter(Boolean)
  console.log(`[E3] Found ${emails.length} subscriber(s)`)

  // ── 3. Send email ─────────────────────────────────────────────────────────
  if (emails.length > 0) {
    try {
      await sendWeeklySnapshotEmail(emails, {
        week_number: snapshot.week_number as string,
        snapshot_data: snapshot.snapshot_data as Record<string, unknown>,
      })
    } catch (err) {
      console.error('[E3] Email distribution failed:', err)
    }
  } else {
    console.log('[E3] No email recipients, skipping email distribution')
  }

  // ── 4. Send Telegram ──────────────────────────────────────────────────────
  try {
    await sendWeeklySnapshotTelegram({
      week_number: snapshot.week_number as string,
      snapshot_data: snapshot.snapshot_data as Record<string, unknown>,
    })
  } catch (err) {
    console.error('[E3] Telegram distribution failed:', err)
  }

  console.log(`[E3] Distribution complete for ${targetWeek}`)
}

// ─── runSnapshotAndDistribute ─────────────────────────────────────────────────

export async function runSnapshotAndDistribute(): Promise<void> {
  console.log('[E3] Starting snapshot + distribution run')
  try {
    await generateWeeklySnapshot()
    await distributeSnapshot()
    console.log('[E3] Run completed successfully')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[E3] Run failed:', message)
    try {
      await sendPipelineAlert('weekly-snapshot', message)
    } catch (alertErr) {
      console.error('[E3] Failed to send pipeline alert:', alertErr)
    }
    throw err
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the Monday 00:00:00 UTC of a given ISO week string (e.g. '2026-W10').
 */
function isoWeekStart(weekNumber: string): Date {
  const match = weekNumber.match(/^(\d{4})-W(\d{2})$/)
  if (!match) throw new Error(`Invalid week number: ${weekNumber}`)

  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)

  // Jan 4th is always in week 1 of ISO 8601
  const jan4 = new Date(Date.UTC(year, 0, 4))
  // Monday of week containing Jan 4th
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay() // convert Sun=0 → 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1))

  // Advance by (week - 1) weeks
  monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7)

  return monday
}
