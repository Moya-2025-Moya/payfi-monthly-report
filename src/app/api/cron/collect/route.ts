// Cron: Daily data collection (UTC 02:00)
// A1-A5, A7 in parallel

import { NextResponse } from 'next/server'
import { runDailyCollection } from '@/modules/collectors'
import { verifyAdminToken } from '@/lib/admin-auth'

export const maxDuration = 300

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError
  try {
    const { results, duration_ms } = await runDailyCollection()
    console.log('[Cron] Daily collection done:', results, `${duration_ms}ms`)
    return NextResponse.json({ status: 'done', results, duration_ms })
  } catch (err) {
    console.error('[Cron] Daily collection failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
