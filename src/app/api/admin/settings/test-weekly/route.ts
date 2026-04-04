// POST /api/admin/settings/test-weekly
// Triggers an immediate weekly digest send to all configured Telegram channels.
// Body (optional): { week: "2025-W14" }  — defaults to current ISO week.

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { sendWeeklyNewsTelegram } from '@/modules/distributors/telegram'

export const maxDuration = 120

function currentISOWeek(): string {
  const now = new Date()
  const jan4 = new Date(Date.UTC(now.getUTCFullYear(), 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const weekStart = new Date(jan4)
  weekStart.setUTCDate(jan4.getUTCDate() - (dow - 1))

  const diff = now.getTime() - weekStart.getTime()
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
  return `${now.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  let body: { week?: string } = {}
  try { body = await request.json() } catch { /* ok */ }

  const week = body.week?.trim() || currentISOWeek()

  try {
    const result = await sendWeeklyNewsTelegram(week)
    if (result.skipped) {
      return NextResponse.json({ ok: false, week, skipped: result.skipped }, { status: 200 })
    }
    return NextResponse.json({ ok: true, week, ...result })
  } catch (err) {
    console.error('[Admin] test-weekly failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
