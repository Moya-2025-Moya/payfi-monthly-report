// Cron: Weekly snapshot + distribution (Monday UTC 01:00)
// Generate snapshot → Email + Telegram

import { NextResponse } from 'next/server'
import { runSnapshotAndDistribute } from '@/modules/distributors/scheduler'

export const maxDuration = 120

export async function GET() {
  try {
    await runSnapshotAndDistribute()
    console.log('[Cron] Snapshot + distribution done')
    return NextResponse.json({ status: 'done' })
  } catch (err) {
    console.error('[Cron] Snapshot failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
