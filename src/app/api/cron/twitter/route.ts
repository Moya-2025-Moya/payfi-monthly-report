// Cron: Weekly Twitter collection (Sunday UTC 01:00)

import { NextResponse } from 'next/server'
import { runWeeklyTwitterCollection } from '@/modules/collectors'
import { verifyAdminToken } from '@/lib/admin-auth'

export const maxDuration = 120

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError
  try {
    const { result, duration_ms } = await runWeeklyTwitterCollection()
    console.log('[Cron] Twitter collection done:', result, `${duration_ms}ms`)
    return NextResponse.json({ status: 'done', result, duration_ms })
  } catch (err) {
    console.error('[Cron] Twitter collection failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
