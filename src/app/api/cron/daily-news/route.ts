// Cron: Daily Telegram news digest (UTC 01:00, Tue–Sun)
// Sends yesterday's top-10 facts to CN and EN Telegram topics.
// Monday is intentionally excluded — weekly report runs instead.

import { NextResponse } from 'next/server'
import { sendDailyNewsTelegram } from '@/modules/distributors/telegram'
import { verifyAdminToken } from '@/lib/admin-auth'

export const maxDuration = 120

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    await sendDailyNewsTelegram()
    console.log('[Cron] Daily news sent')
    return NextResponse.json({ status: 'done' })
  } catch (err) {
    console.error('[Cron] Daily news failed:', err)
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
