// Developer-only: Reset database tables for re-testing
// Supports two modes:
//   "processed" — clear AI-generated data, keep raw data but mark as unprocessed
//   "all" — clear everything including raw data

import { supabaseAdmin } from '@/db/client'
import { NextRequest, NextResponse } from 'next/server'

// Delete order matters: children (FK dependents) before parents
const PROCESSED_TABLES = [
  // FK leaves first
  'comments',
  'notes',
  'chat_history',
  'shared_views',
  'fact_sectors',
  'fact_entities',
  'entity_relationships',
  'timeline_facts',
  'fact_contradictions',
  'blind_spot_reports',
  'regulatory_trackers',
  'narrative_thread_entries',
  'narrative_predictions',
  // Then parents
  'atomic_facts',
  'timelines',
  'sectors',
  'entities',
  'narrative_threads',
  'weekly_snapshots',
  'pipeline_runs',
]

// Tables with a `processed` boolean column that can be reset
const RAW_TABLES_WITH_PROCESSED = [
  'raw_news',
  'raw_filings',
  'raw_product_updates',
  'raw_funding',
  'raw_regulatory',
  'raw_tweets',
]

// Tables without a `processed` column — no flag to reset, just optionally clear
const RAW_TABLES_NO_PROCESSED = [
  'raw_onchain_metrics',
  'raw_stock_data',
]

const RAW_TABLES = [...RAW_TABLES_WITH_PROCESSED, ...RAW_TABLES_NO_PROCESSED]

async function clearTable(table: string): Promise<string | null> {
  // Supabase delete requires a WHERE clause.
  // .not('id', 'is', null) matches all rows where id exists (i.e., all rows).
  // For junction tables without `id`, try alternative key columns.
  const keyCandidates = ['id', 'fact_id', 'user_id', 'timeline_id']

  for (const key of keyCandidates) {
    const { error } = await supabaseAdmin.from(table).delete().not(key, 'is', null)
    if (!error) return null
    // Column doesn't exist → try next
    if (error.message.includes('column') || error.code === '42703') continue
    return error.message
  }

  return `no suitable key column found`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const mode: 'processed' | 'all' = body.mode ?? 'processed'

    const results: { table: string; status: 'ok' | 'error'; error?: string }[] = []

    // 1. Clear processed/AI-generated tables (in FK-safe order)
    for (const table of PROCESSED_TABLES) {
      const err = await clearTable(table)
      results.push(err ? { table, status: 'error', error: err } : { table, status: 'ok' })
    }

    // 2. Handle raw tables
    if (mode === 'all') {
      for (const table of RAW_TABLES) {
        const err = await clearTable(table)
        results.push(err ? { table, status: 'error', error: err } : { table, status: 'ok' })
      }
    } else {
      // mode === 'processed': reset processed flag on tables that have it
      for (const table of RAW_TABLES_WITH_PROCESSED) {
        const { error } = await supabaseAdmin
          .from(table)
          .update({ processed: false })
          .eq('processed', true)
        if (error) {
          results.push({ table, status: 'error', error: error.message })
        } else {
          results.push({ table, status: 'ok' })
        }
      }
      // raw_onchain_metrics & raw_stock_data have no processed flag — skip in processed mode
      for (const table of RAW_TABLES_NO_PROCESSED) {
        results.push({ table, status: 'ok' })
      }
    }

    const okCount = results.filter(r => r.status === 'ok').length
    const errCount = results.filter(r => r.status === 'error').length
    const failedTables = results.filter(r => r.status === 'error').map(r => `${r.table}: ${r.error}`)

    return NextResponse.json({
      message: mode === 'all'
        ? `全部重置完成 — 清空 ${okCount} 张表，失败 ${errCount}${failedTables.length ? '\n失败: ' + failedTables.join('; ') : ''}`
        : `处理数据重置完成 — 清空 ${okCount} 张表，原始数据已标记为未处理，失败 ${errCount}${failedTables.length ? '\n失败: ' + failedTables.join('; ') : ''}`,
      mode,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
