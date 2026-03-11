import { NextResponse } from 'next/server'
import { generateTimeline } from '@/modules/ai-agents/timeline-generator'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: '请输入公司名或叙事主题' }, { status: 400 })
    }

    const result = await generateTimeline(query.trim())
    return NextResponse.json(result)
  } catch (err) {
    console.error('[API] timeline-generate failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '生成时间线失败' },
      { status: 500 }
    )
  }
}
