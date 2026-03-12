import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'
import { callSonnet } from '@/lib/ai-client'
import { readFileSync } from 'fs'
import { join } from 'path'

const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'src/config/prompts/chat-system.md'), 'utf-8')

interface Citation {
  index: number
  content: string
  source_url: string | null
  source_type: string | null
  fact_date: string | null
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages)) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const userQuery = messages[messages.length - 1]?.content ?? ''

  // RAG: search for relevant facts (Chinese content preferred)
  const searchTerm = userQuery.slice(0, 50)
  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_zh, content_en, confidence, source_url, source_type, fact_date, tags')
    .in('verification_status', ['verified', 'partially_verified'])
    .or(`content_zh.ilike.%${searchTerm}%,content_en.ilike.%${searchTerm}%`)
    .order('fact_date', { ascending: false })
    .limit(20)

  const citations: Citation[] = (facts ?? []).map((f: Record<string, unknown>, i: number) => ({
    index: i + 1,
    content: (f.content_zh || f.content_en || '') as string,
    source_url: (f.source_url ?? null) as string | null,
    source_type: (f.source_type ?? null) as string | null,
    fact_date: (f.fact_date ?? null) as string | null,
  }))

  const context = citations.map(c =>
    `[${c.index}] ${c.content} — 来源: ${c.source_type ?? '未知'}, ${c.source_url ?? '无链接'}`
  ).join('\n')

  const system = `${SYSTEM_PROMPT}\n\n# 可用事实\n\n${context || '未找到匹配的事实。'}\n\n重要：回答时用 [1] [2] 等编号引用上面的事实。`

  try {
    const content = await callSonnet(
      messages.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { system }
    )
    return NextResponse.json({ content, citations })
  } catch {
    return NextResponse.json({ error: 'AI call failed', content: '抱歉，发生错误，请稍后重试。', citations: [] }, { status: 500 })
  }
}
