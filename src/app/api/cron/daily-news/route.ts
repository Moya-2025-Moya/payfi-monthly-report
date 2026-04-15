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

  // Skip on Monday — weekly report runs instead (UTC 01:00 Mon = same slot)
  const dayOfWeek = new Date().getUTCDay() // 0=Sun, 1=Mon
  if (dayOfWeek === 1) {
    console.log('[Cron] Daily news: skipping Monday (weekly report day)')
    return NextResponse.json({ status: 'skipped', reason: 'monday' })
  }

  try {
    const result = await sendDailyNewsTelegram()
    if (result.skipped) {
      console.log('[Cron] Daily news skipped:', result.skipped)
      return NextResponse.json({ status: 'skipped', ...result })
    }
    console.log('[Cron] Daily news sent:', result)
    return NextResponse.json({ status: 'done', ...result })
  } catch (err) {
    console.error('[Cron] Daily news failed:', err)
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
