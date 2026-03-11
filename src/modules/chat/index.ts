// D4 AI对话模块 — RAG: 检索相关事实 → AI 回答
import { readFileSync } from 'fs'
import { join } from 'path'
import { supabaseAdmin } from '@/db/client'
import { callSonnet } from '@/lib/ai-client'
import type { AtomicFact } from '@/lib/types'

const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'src/config/prompts/chat-system.md'), 'utf-8')

// ─── 检索相关事实 (简易关键词匹配, 后续可升级为 embedding) ───

async function retrieveRelevantFacts(query: string, limit = 20): Promise<AtomicFact[]> {
  // 提取关键词 (>3字符的词)
  const keywords = query
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5)

  if (keywords.length === 0) return []

  const orConditions = keywords.map(kw => `content_en.ilike.%${kw}%`).join(',')

  const { data } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .in('verification_status', ['verified', 'partially_verified'])
    .or(orConditions)
    .order('fact_date', { ascending: false })
    .limit(limit)

  return (data ?? []) as AtomicFact[]
}

// ─── 格式化事实为 context ───

function formatFactsContext(facts: AtomicFact[]): string {
  if (facts.length === 0) return 'No relevant facts found in the database.'

  return facts.map((f, i) => {
    const confidence = f.confidence ?? 'unknown'
    const dot = confidence === 'high' ? '🟢' : confidence === 'medium' ? '🔵' : '🟡'
    const date = new Date(f.fact_date).toISOString().split('T')[0]
    return `[${i + 1}] ${dot} (${confidence}) ${f.content_en}\n    Source: ${f.source_type} — ${f.source_url}\n    Date: ${date} | Tags: ${f.tags.join(', ')}`
  }).join('\n\n')
}

// ─── 主对话函数 ───

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chat(
  messages: ChatMessage[],
  options: { userId?: string } = {}
): Promise<{ content: string; factIds: string[] }> {
  const lastUserMessage = messages.findLast(m => m.role === 'user')?.content ?? ''

  // RAG: 检索
  const facts = await retrieveRelevantFacts(lastUserMessage)
  const context = formatFactsContext(facts)
  const factIds = facts.map(f => f.id)

  // 构建 system prompt
  const system = `${SYSTEM_PROMPT}\n\n# Available Facts (retrieved from database)\n\n${context}`

  // 调用 AI
  const content = await callSonnet(messages, { system })

  // 保存对话记录 (如果有 userId)
  if (options.userId) {
    await saveChatMessages(options.userId, lastUserMessage, content, factIds)
  }

  return { content, factIds }
}

// ─── 保存对话记录 ───

async function saveChatMessages(userId: string, userContent: string, assistantContent: string, contextFactIds: string[]) {
  await supabaseAdmin.from('chat_messages').insert([
    { user_id: userId, role: 'user', content: userContent, context_fact_ids: [] },
    { user_id: userId, role: 'assistant', content: assistantContent, context_fact_ids: contextFactIds },
  ])
}

// ─── 获取对话历史 ───

export async function getChatHistory(userId: string, limit = 50): Promise<ChatMessage[]> {
  const { data } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)

  return (data ?? []) as ChatMessage[]
}
