// DEV: Reset all pipeline data — clears facts, snapshots, reports, narratives, and resets raw data flags
import { supabaseAdmin } from '@/db/client'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'

const DUMMY_UUID = '00000000-0000-0000-0000-000000000000'

// Raw tables that have a `processed` flag
const RAW_TABLES = ['raw_news', 'raw_filings', 'raw_product_updates', 'raw_funding', 'raw_tweets', 'raw_regulatory'] as const

export async function POST(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const errors: string[] = []

    // Delete by id column
    async function delById(table: string) {
      const { error } = await supabaseAdmin.from(table).delete().neq('id', DUMMY_UUID)
      if (error) errors.push(`${table}: ${error.message}`)
    }

    // Delete by fact_id column (junction tables without id)
    async function delByFactId(table: string) {
      const { error } = await supabaseAdmin.from(table).delete().neq('fact_id', DUMMY_UUID)
      if (error) errors.push(`${table}: ${error.message}`)
    }

    // Safe delete — try, ignore if table doesn't exist
    async function delSafe(table: string, col: string) {
      const { error } = await supabaseAdmin.from(table).delete().neq(col, DUMMY_UUID)
      if (error && !error.message.includes('does not exist')) {
        errors.push(`${table}: ${error.message}`)
      }
    }

    // 1. Junction tables (composite PK, no id column)
    await delByFactId('fact_contradictions')  // has id but fact_id works too
    await delSafe('timeline_facts', 'fact_id')
    await delByFactId('fact_entities')
    await delSafe('fact_sectors', 'fact_id')
    await delById('entity_relationships')

    // 2. Main pipeline output tables
    await delById('reports')
    await delById('weekly_snapshots')
    await delSafe('narrative_threads', 'id')
    await delById('timelines')
    await delById('atomic_facts')

    // 3. Clear pipeline run history
    await delById('pipeline_runs')

    // 4. Reset `processed` flag on all raw tables so pipeline can re-process
    for (const table of RAW_TABLES) {
      const { error } = await supabaseAdmin
        .from(table)
        .update({ processed: false })
        .eq('processed', true)
      if (error) errors.push(`${table} reset: ${error.message}`)
    }

    if (errors.length > 0) {
      return NextResponse.json({
        status: 'partial',
        message: `重置完成，但有 ${errors.length} 个错误`,
        errors,
      })
    }

    return NextResponse.json({ status: 'ok', message: '所有数据已重置，原始数据已标记为未处理' })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
