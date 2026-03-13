// Cron: Weekly knowledge computation (Sunday UTC 05:00)
// C6 blind spots + C7 diff + C8 density anomalies

import { NextResponse } from 'next/server'
import { runWeeklyKnowledge } from '@/modules/ai-agents/orchestrator'
import { verifyAdminToken } from '@/lib/admin-auth'

export const maxDuration = 300

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError
  try {
    await runWeeklyKnowledge()
    console.log('[Cron] Weekly knowledge done')
    return NextResponse.json({ status: 'done' })
  } catch (err) {
    console.error('[Cron] Weekly knowledge failed:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
