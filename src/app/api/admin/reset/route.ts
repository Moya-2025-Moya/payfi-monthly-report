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

    async function del(table: string) {
      const { error } = await supabaseAdmin.from(table).delete().neq('id', DUMMY_UUID)
      if (error) errors.push(`${table}: ${error.message}`)
    }

    // 1. Delete dependent junction tables first (FK CASCADE would handle it, but be explicit)
    await del('fact_contradictions')
    await del('timeline_facts')
    await del('fact_entities')
    await del('fact_sectors')
    await del('entity_relationships')

    // 2. Delete main pipeline output tables
    await del('reports')
    await del('weekly_snapshots')
    await del('narrative_threads')
    await del('timelines')
    await del('atomic_facts')

    // 3. Clear pipeline run history
    await del('pipeline_runs')

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
