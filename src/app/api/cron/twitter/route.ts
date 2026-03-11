// Cron: Weekly Twitter collection (Sunday UTC 01:00)

import { NextResponse } from 'next/server'
import { runWeeklyTwitterCollection } from '@/modules/collectors'

export const maxDuration = 120

export async function GET() {
  try {
    const { result, duration_ms } = await runWeeklyTwitterCollection()
    console.log('[Cron] Twitter collection done:', result, `${duration_ms}ms`)
    return NextResponse.json({ status: 'done', result, duration_ms })
  } catch (err) {
    console.error('[Cron] Twitter collection failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
