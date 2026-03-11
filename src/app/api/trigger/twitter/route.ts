import { NextResponse } from 'next/server'
import { runWeeklyTwitterCollection } from '@/modules/collectors'

export const maxDuration = 120

export async function POST() {
  try {
    const { result, duration_ms } = await runWeeklyTwitterCollection()
    return NextResponse.json({ status: 'done', result, duration_ms })
  } catch (err) {
    console.error('[API] twitter trigger failed:', err)
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 500 }
    )
  }
}
