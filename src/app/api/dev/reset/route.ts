// Developer-only: Reset database tables for re-testing
// Supports two modes:
//   "processed" — clear AI-generated data, keep raw data but mark as unprocessed
//   "all" — clear everything including raw data

import { supabaseAdmin } from '@/db/client'
import { NextRequest, NextResponse } from 'next/server'

// Tables with an `id` column (delete via id != impossible UUID)
const ID_TABLES_PROCESSED = [
  'fact_contradictions',
  'notes',
  'comments',
  'atomic_facts',
  'timelines',
  'entities',
  'snapshots',
  'pipeline_runs',
]

// Junction tables without `id` — delete via fact_id or timeline_id
const JUNCTION_TABLES = [
  { table: 'timeline_facts', key: 'timeline_id' },
  { table: 'fact_entities', key: 'fact_id' },
]

const RAW_TABLES = [
  'raw_news',
  'raw_filings',
  'raw_product_updates',
  'raw_funding',
  'raw_regulatory',
  'raw_tweets',
  'raw_onchain_metrics',
  'raw_stock_data',
]

async function truncateTable(table: string, key: string): Promise<string | null> {
  // Use gte on the key to match all rows (UUIDs are always >= empty string,
  // timestamps are always >= epoch). For broader compatibility, use gt with a minimal value.
  const { error } = await supabaseAdmin.from(table).delete().gte(key, '')
  return error ? error.message : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const mode: 'processed' | 'all' = body.mode ?? 'processed'

    const results: { table: string; status: 'ok' | 'error'; error?: string }[] = []

    // 1. Clear junction tables first (they reference other tables)
    for (const { table, key } of JUNCTION_TABLES) {
      const err = await truncateTable(table, key)
      results.push(err ? { table, status: 'error', error: err } : { table, status: 'ok' })
    }

    // 2. Clear processed tables
    for (const table of ID_TABLES_PROCESSED) {
      const err = await truncateTable(table, 'id')
      results.push(err ? { table, status: 'error', error: err } : { table, status: 'ok' })
    }

    // 3. If mode is 'all', also clear raw tables
    if (mode === 'all') {
      for (const table of RAW_TABLES) {
        const err = await truncateTable(table, 'id')
        results.push(err ? { table, status: 'error', error: err } : { table, status: 'ok' })
      }
    } else {
      // mode === 'processed': reset raw tables' processed flag so they can be re-processed
      for (const table of RAW_TABLES) {
        const { error } = await supabaseAdmin
          .from(table)
          .update({ processed: false })
          .eq('processed', true)
        if (error) {
          results.push({ table, status: 'error', error: `reset processed flag: ${error.message}` })
        } else {
          results.push({ table, status: 'ok' })
        }
      }
    }

    const okCount = results.filter(r => r.status === 'ok').length
    const errCount = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      message: mode === 'all'
        ? `全部重置完成 — 清空 ${okCount} 张表，失败 ${errCount}`
        : `处理数据重置完成 — 清空 ${okCount} 张表，原始数据已标记为未处理，失败 ${errCount}`,
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
