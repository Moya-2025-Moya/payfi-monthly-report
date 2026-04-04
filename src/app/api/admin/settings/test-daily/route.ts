// POST /api/admin/settings/test-daily
// Triggers an immediate daily news digest send to all configured Telegram channels.

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { sendDailyNewsTelegram } from '@/modules/distributors/telegram'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const result = await sendDailyNewsTelegram()
    if (result.skipped) {
      return NextResponse.json({ ok: false, skipped: result.skipped }, { status: 200 })
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[Admin] test-daily failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
