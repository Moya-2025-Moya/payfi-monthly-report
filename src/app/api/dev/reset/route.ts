// Developer-only: Reset database tables for re-testing
// Supports two modes:
//   "processed" — clear AI-generated data, keep raw data but mark as unprocessed
//   "all" — clear everything including raw data

import { supabaseAdmin } from '@/db/client'
import { NextRequest, NextResponse } from 'next/server'

// Dependency order matters: delete children before parents
const PROCESSED_TABLES = [
  'timeline_facts',
  'fact_entities',
  'fact_contradictions',
  'notes',
  'comments',
  'atomic_facts',
  'timelines',
  'entities',
  'snapshots',
  'pipeline_runs',
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

async function clearTable(table: string): Promise<string | null> {
  // Supabase delete requires a filter. Use a tautology: delete where id is not null.
  // For junction tables without `id`, try common key columns.
  const keyCandidates = ['id', 'fact_id', 'timeline_id']

  for (const key of keyCandidates) {
    const { error } = await supabaseAdmin.from(table).delete().not(key, 'is', null)
    if (!error) return null
    // If column doesn't exist, try next candidate
    if (error.message.includes('column') && error.message.includes('does not exist')) continue
    // Other error — return it
    return error.message
  }

  return `No suitable key column found for table ${table}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const mode: 'processed' | 'all' = body.mode ?? 'processed'

    const results: { table: string; status: 'ok' | 'error'; error?: string }[] = []

    // 1. Clear processed/AI-generated tables
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
      // mode === 'processed': reset processed flag so raw data can be re-processed
      for (const table of RAW_TABLES) {
        const { error } = await supabaseAdmin
          .from(table)
          .update({ processed: false })
          .eq('processed', true)
        if (error) {
          results.push({ table, status: 'error', error: `reset flag: ${error.message}` })
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
