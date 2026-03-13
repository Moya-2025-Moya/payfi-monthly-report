// DEV: Reset all data — clears atomic_facts, weekly_snapshots, reports
import { supabaseAdmin } from '@/db/client'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Delete in order to respect potential FK constraints
    await supabaseAdmin.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('weekly_snapshots').delete().neq('week_number', '')
    await supabaseAdmin.from('atomic_facts').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ status: 'ok', message: '所有数据已重置' })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
