// AI Client — 封装 Anthropic API 调用
// 所有 AI Agent 通过此文件调用模型

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const API_URL = 'https://api.anthropic.com/v1/messages'

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AICallOptions {
  model?: 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6-20250514'
  maxTokens?: number
  temperature?: number
  system?: string
}

export async function callAI(
  messages: AIMessage[],
  options: AICallOptions = {}
): Promise<string> {
  const {
    model = 'claude-haiku-4-5-20251001',
    maxTokens = 4096,
    temperature = 0,
    system,
  } = options

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
  }
  if (system) body.system = system

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content[0].text
}

// 便捷方法: 单轮调用 Haiku (大部分 Agent 用)
export async function callHaiku(
  prompt: string,
  options: { system?: string; maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  return callAI(
    [{ role: 'user', content: prompt }],
    { model: 'claude-haiku-4-5-20251001', ...options }
  )
}

// 便捷方法: 单轮调用 Sonnet (D4 对话用)
export async function callSonnet(
  messages: AIMessage[],
  options: { system?: string; maxTokens?: number } = {}
): Promise<string> {
  return callAI(messages, { model: 'claude-sonnet-4-6-20250514', ...options })
}

// 便捷方法: 调用 AI 返回 JSON
export async function callHaikuJSON<T>(
  prompt: string,
  options: { system?: string } = {}
): Promise<T> {
  const response = await callHaiku(prompt, {
    ...options,
    system: (options.system || '') + '\n\nYou MUST respond with valid JSON only. No markdown, no explanation.',
  })

  // 尝试提取 JSON (可能被包在 ```json ... ``` 中)
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
  const jsonStr = jsonMatch ? jsonMatch[1] : response.trim()

  return JSON.parse(jsonStr) as T
}
