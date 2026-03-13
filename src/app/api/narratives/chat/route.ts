// Narrative Chat — 基于时间线上下文的追问对话
// 接收用户消息 + 上下文事实 ID，调用 Sonnet 生成回答

import { supabaseAdmin } from '@/db/client'
import { callSonnet } from '@/lib/ai-client'
import { NextResponse } from 'next/server'
import type { AtomicFact } from '@/lib/types'

// ─── Types ───

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  context_fact_ids: string[]
  narrative_query: string
}

interface ChatResponse {
  content: string
  citations: {
    index: number
    fact_id: string
    date: string
    content: string
    source_url: string
  }[]
}

// ─── POST handler ───

export async function POST(request: Request) {
  try {
    const body = await request.json() as ChatRequest
    const { messages, context_fact_ids, narrative_query } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing messages' },
        { status: 400 }
      )
    }

    if (!narrative_query) {
      return NextResponse.json(
        { error: 'Missing narrative_query' },
        { status: 400 }
      )
    }

    // Step 1: Fetch context facts by IDs
    let contextFacts: AtomicFact[] = []
    if (context_fact_ids && context_fact_ids.length > 0) {
      const { data } = await supabaseAdmin
        .from('atomic_facts')
        .select('*')
        .in('id', context_fact_ids)
        .order('fact_date', { ascending: true })

      contextFacts = (data ?? []) as AtomicFact[]
    }

    // Step 2: Build context string
    const contextLines = contextFacts.map((f, i) => {
      const date = f.fact_date instanceof Date
        ? f.fact_date.toISOString().split('T')[0]
        : String(f.fact_date).split('T')[0]
      const content = f.content_zh || f.content_en
      return `[${i + 1}] ${date} — ${content}（来源: ${f.source_url}）`
    })

    const contextString = contextLines.join('\n')

    // Step 3: Build system prompt
    const system = `你是稳定币行业分析助手。用户正在查看关于「${narrative_query}」的时间线。

# 核心规则
1. 只基于下方事实回答，不引入事实列表以外的任何信息
2. 不给投资建议，不说"该投/不该投"、"看好/看空"
3. 不做预测，不说"未来可能"、"预计将会"
4. 如果事实之间有矛盾，指出矛盾但不判断谁对
5. 引用事实时使用 [1] [2] 等编号
6. 如果事实不足以回答，明确告知"当前数据中没有足够信息"

# 可用事实
${contextString}`

    // Step 4: Call Sonnet
    const aiContent = await callSonnet(messages, { system, maxTokens: 2048 })

    // Step 5: Build citations from context facts
    const citations = contextFacts.map((f, i) => {
      const date = f.fact_date instanceof Date
        ? f.fact_date.toISOString().split('T')[0]
        : String(f.fact_date).split('T')[0]
      return {
        index: i + 1,
        fact_id: f.id,
        date,
        content: f.content_zh || f.content_en,
        source_url: f.source_url,
      }
    })

    const response: ChatResponse = {
      content: aiContent,
      citations,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[narratives/chat] Error:', err)
    return NextResponse.json(
      { error: `Chat failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
