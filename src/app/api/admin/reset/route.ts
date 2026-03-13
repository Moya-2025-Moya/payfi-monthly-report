// Reset all pipeline data — clears facts, snapshots, reports, narratives, and resets raw data flags
// FK-safe deletion order: children first, then parents
import { supabaseAdmin } from '@/db/client'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'

// FK-safe deletion order: leaf/junction tables first, then parent tables
// This mirrors the complete table list from dev/reset but with auth protection
const TABLES_TO_CLEAR = [
  // 1. Collaboration layer (FK → atomic_facts, entities, timelines)
  'comments',
  'notes',
  'bookmarks',
  'chat_history',
  'shared_views',

  // 2. Junction/leaf tables (FK → atomic_facts, entities, timelines, narrative_threads)
  'fact_sectors',
  'fact_entities',
  'entity_relationships',
  'timeline_facts',
  'fact_contradictions',
  'blind_spot_reports',
  'regulatory_trackers',

  // 3. Narrative children (FK → narrative_threads via ON DELETE CASCADE, but explicit is safer)
  'narrative_thread_entries',
  'narrative_predictions',

  // 4. Parent tables (no remaining FK dependents after above)
  'reports',
  'weekly_snapshots',
  'narrative_threads',
  'timelines',
  'atomic_facts',
  'entities',
  'sectors',

  // 5. Pipeline run history
  'pipeline_runs',
] as const

// Raw tables with `processed` boolean column
const RAW_TABLES = [
  'raw_news',
  'raw_filings',
  'raw_product_updates',
  'raw_funding',
  'raw_tweets',
  'raw_regulatory',
] as const

/**
 * Attempt to delete all rows from a table.
 * Tries multiple key column candidates since junction tables may not have `id`.
 * Returns error message string or null on success.
 */
async function clearTable(table: string): Promise<string | null> {
  const keyCandidates = ['id', 'fact_id', 'user_id', 'timeline_id', 'thread_id']

  for (const key of keyCandidates) {
    const { error } = await supabaseAdmin.from(table).delete().not(key, 'is', null)
    if (!error) return null
    // Column doesn't exist → try next candidate
    if (error.message.includes('column') || error.code === '42703') continue
    // Table doesn't exist → not an error (migration may not have run)
    if (error.message.includes('does not exist') || error.code === '42P01') return null
    return error.message
  }

  return 'no suitable key column found'
}

export async function POST(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const results: { table: string; status: 'ok' | 'error' | 'skipped'; error?: string }[] = []

    // 1. Clear all processed/AI-generated tables in FK-safe order
    for (const table of TABLES_TO_CLEAR) {
      const err = await clearTable(table)
      if (err) {
        results.push({ table, status: 'error', error: err })
      } else {
        results.push({ table, status: 'ok' })
      }
    }

    // 2. Reset `processed` flag on raw tables so pipeline can re-process
    for (const table of RAW_TABLES) {
      const { error } = await supabaseAdmin
        .from(table)
        .update({ processed: false })
        .eq('processed', true)

      if (error) {
        // Table might not exist yet — not fatal
        if (error.message.includes('does not exist') || error.code === '42P01') {
          results.push({ table: `${table} (reset)`, status: 'skipped' })
        } else {
          results.push({ table: `${table} (reset)`, status: 'error', error: error.message })
        }
      } else {
        results.push({ table: `${table} (reset)`, status: 'ok' })
      }
    }

    const okCount = results.filter(r => r.status === 'ok').length
    const errCount = results.filter(r => r.status === 'error').length
    const errors = results.filter(r => r.status === 'error').map(r => `${r.table}: ${r.error}`)

    if (errCount > 0) {
      return NextResponse.json({
        status: 'partial',
        message: `重置完成，但有 ${errCount} 个错误 (成功 ${okCount} 张表)`,
        errors,
        results,
      })
    }

    return NextResponse.json({
      status: 'ok',
      message: `所有数据已重置 (${okCount} 张表)，原始数据已标记为未处理`,
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
