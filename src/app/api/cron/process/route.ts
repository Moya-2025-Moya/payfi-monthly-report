// Cron: Daily AI processing (UTC 03:00)
// B1 → V1-V5 → V0 → B2 → B3 → B4 → B5

import { NextResponse } from 'next/server'
import { runDailyPipeline } from '@/modules/ai-agents/orchestrator'
import { verifyAdminToken } from '@/lib/admin-auth'

export const maxDuration = 300

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError
  try {
    const stats = await runDailyPipeline()
    console.log('[Cron] Daily pipeline done:', stats)
    return NextResponse.json({ status: 'done', stats })
  } catch (err) {
    console.error('[Cron] Daily pipeline failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
