import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'
import { callSonnet } from '@/lib/ai-client'
import { readFileSync } from 'fs'
import { join } from 'path'

const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'src/config/prompts/chat-system.md'), 'utf-8')

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages)) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const userQuery = messages[messages.length - 1]?.content ?? ''

  // RAG: search for relevant facts
  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('content_en, confidence, source_url, source_type, fact_date, tags')
    .in('verification_status', ['verified', 'partially_verified'])
    .or(`content_en.ilike.%${userQuery.slice(0, 50)}%`)
    .order('fact_date', { ascending: false })
    .limit(20)

  const context = (facts ?? []).map((f: { content_en: string; confidence: string; source_url: string; source_type: string }, i: number) =>
    `[${i + 1}] (${f.confidence ?? 'unknown'}) ${f.content_en} — Source: ${f.source_type}, ${f.source_url}`
  ).join('\n')

  const system = `${SYSTEM_PROMPT}\n\n# Available Facts\n\n${context || 'No facts found matching the query.'}`

  try {
    const content = await callSonnet(
      messages.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { system }
    )
    return NextResponse.json({ content })
  } catch (err) {
    return NextResponse.json({ error: 'AI call failed', content: 'Sorry, I encountered an error.' }, { status: 500 })
  }
}
