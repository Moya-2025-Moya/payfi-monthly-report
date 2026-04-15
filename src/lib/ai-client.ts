// AI Client — 封装 Anthropic API 调用
// 所有 AI Agent 通过此文件调用模型

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const API_URL = 'https://api.anthropic.com/v1/messages'

// Rate limit retry config
const MAX_RETRIES = 3
const BASE_DELAY_MS = 3_000 // 3s base delay for rate limits
const FETCH_TIMEOUT_MS = 60_000 // 60s per request timeout

// Global concurrency limiter — prevents thundering herd on Anthropic's 50k token/min limit.
// All callAI() calls share this semaphore regardless of which module calls them.
const MAX_CONCURRENT_AI_CALLS = 6
let activeAICalls = 0
const aiCallQueue: Array<() => void> = []

function acquireAISlot(): Promise<void> {
  if (activeAICalls < MAX_CONCURRENT_AI_CALLS) {
    activeAICalls++
    return Promise.resolve()
  }
  return new Promise(resolve => { aiCallQueue.push(resolve) })
}

function releaseAISlot(): void {
  const next = aiCallQueue.shift()
  if (next) {
    next() // passes slot directly to next waiter — activeAICalls stays same
  } else {
    activeAICalls--
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

  await acquireAISlot()
  try {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeout)
      if (attempt < MAX_RETRIES) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt)
        console.warn(`[ai-client] Request failed (${err instanceof Error ? err.message : 'timeout'}), retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(delayMs / 1000)}s`)
        await sleep(delayMs)
        continue
      }
      throw new Error(`Anthropic API request failed after ${MAX_RETRIES} retries: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      clearTimeout(timeout)
    }

    if (res.ok) {
      const data = await res.json()
      return data.content[0].text
    }

    const err = await res.text()

    // Retry on 429 (rate limit) and 529 (overloaded)
    if ((res.status === 429 || res.status === 529) && attempt < MAX_RETRIES) {
      // Use retry-after header if available, otherwise exponential backoff
      const retryAfter = res.headers.get('retry-after')
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 2000
      console.warn(
        `[ai-client] ${res.status} rate limited, retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(delayMs / 1000)}s`
      )
      await sleep(delayMs)
      continue
    }

    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  throw new Error('Exhausted retries — should not reach here')
  } finally {
    releaseAISlot()
  }
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
  options: { system?: string; maxTokens?: number } = {}
): Promise<T> {
  const { system, maxTokens } = options
  const response = await callHaiku(prompt, {
    maxTokens,
    system: (system || '') + '\n\nYou MUST respond with valid JSON only. No markdown, no explanation.',
  })

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  let jsonStr = response.trim()
  const fenceMatch = jsonStr.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/m)
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim()
  } else if (jsonStr.startsWith('```')) {
    // Fallback: strip leading ```json and trailing ```
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '').trim()
  }

  try {
    return JSON.parse(jsonStr) as T
  } catch (e) {
    console.error('[ai-client] JSON parse failed. Raw response:', response.slice(0, 500))
    throw new Error(`JSON parse failed: ${(e as Error).message}`)
  }
}
