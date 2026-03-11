import { NextResponse } from 'next/server'
import { runDailyCollection } from '@/modules/collectors'

export const maxDuration = 300 // 5 min for Vercel

export async function POST() {
  try {
    const { results, duration_ms } = await runDailyCollection()
    return NextResponse.json({ status: 'done', results, duration_ms })
  } catch (err) {
    console.error('[API] collect trigger failed:', err)
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 500 }
    )
  }
}
