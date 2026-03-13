import { NextResponse } from 'next/server'
import { callHaiku } from '@/lib/ai-client'

export async function POST(req: Request) {
  try {
    const { entity, facts } = await req.json() as { entity: string; facts: string[] }
    if (!entity || !facts?.length) {
      return NextResponse.json({ summary: '' })
    }

    // Sanitize entity name to prevent prompt injection
    const sanitizedEntity = entity.replace(/[#\n\r`]/g, ' ').slice(0, 100).trim()
    const factsText = facts.slice(0, 20).map((f, i) => `${i + 1}. ${f}`).join('\n')
    const summary = await callHaiku(
      `根据以下关于「${sanitizedEntity}」的本周事实，用一句话（30字以内）客观总结本周核心动态。只输出总结，不要解释，不要预测，不要评价。只陈述事实中明确提到的内容。\n\n${factsText}`
    )

    return NextResponse.json({ summary: summary.trim() })
  } catch {
    return NextResponse.json({ summary: '' })
  }
}
