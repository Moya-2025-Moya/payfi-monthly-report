// Voyage AI embeddings — used for cross-day dedup top-K retrieval.
//
// Returns null (per text) when VOYAGE_API_KEY is unset so callers can fall
// back to the legacy full-pool scan. Network/HTTP failures also return null
// rather than throwing, so a single hiccup doesn't kill the whole pipeline
// run.

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const MODEL = 'voyage-3.5-lite'
const EMBED_DIM = 1024

const MAX_BATCH = 128
const FETCH_TIMEOUT_MS = 30_000
const MAX_RETRIES = 5
// Voyage's free tier is 3 RPM. Default 429 backoff has to be ≥20s to fit
// inside that envelope without hammering. Server respects Retry-After when
// the API returns it, so this is just the floor for blind retries.
const BASE_429_DELAY_MS = 22_000
const BASE_5XX_DELAY_MS = 2_000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const EMBEDDING_DIMENSIONS = EMBED_DIM
export const isEmbeddingsConfigured = () => Boolean(VOYAGE_API_KEY)

interface VoyageResponse {
  data: { embedding: number[]; index: number }[]
}

async function callVoyage(
  inputs: string[],
  inputType: 'document' | 'query',
): Promise<number[][] | null> {
  if (!VOYAGE_API_KEY) return null
  if (inputs.length === 0) return []

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(VOYAGE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          input: inputs,
          input_type: inputType,
          output_dimension: EMBED_DIM,
        }),
        signal: controller.signal,
      })

      if (res.ok) {
        const data = (await res.json()) as VoyageResponse
        const ordered = new Array<number[]>(inputs.length)
        for (const item of data.data) ordered[item.index] = item.embedding
        return ordered
      }

      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = res.headers.get('retry-after')
          const base = res.status === 429 ? BASE_429_DELAY_MS : BASE_5XX_DELAY_MS
          const delayMs = retryAfter
            ? Math.max(parseInt(retryAfter, 10) * 1000, 1000)
            : base + Math.random() * 2000
          console.warn(`[embeddings] Voyage ${res.status}, retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(delayMs / 1000)}s`)
          await sleep(delayMs)
          continue
        }
      }

      const errBody = await res.text().catch(() => '')
      console.warn(`[embeddings] Voyage ${res.status}: ${errBody.slice(0, 200)}`)
      return null
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_5XX_DELAY_MS * Math.pow(2, attempt))
        continue
      }
      console.warn('[embeddings] Voyage request failed:', err instanceof Error ? err.message : String(err))
      return null
    } finally {
      clearTimeout(timeout)
    }
  }
  return null
}

// Embed a single text. Returns null if embeddings are disabled or the call
// failed — callers must handle the null case (typically by falling back to
// the legacy lexical scan for that one event).
export async function embedDocument(text: string): Promise<number[] | null> {
  const result = await callVoyage([text], 'document')
  return result?.[0] ?? null
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const result = await callVoyage([text], 'query')
  return result?.[0] ?? null
}

// Batched document embedding. Splits into chunks of MAX_BATCH; on partial
// failure, fills the failed chunk's slots with null so the caller can still
// process the successful ones.
export async function embedDocuments(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return []
  const out: (number[] | null)[] = new Array(texts.length).fill(null)
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const chunk = texts.slice(i, i + MAX_BATCH)
    const result = await callVoyage(chunk, 'document')
    if (!result) continue
    for (let j = 0; j < chunk.length; j++) out[i + j] = result[j] ?? null
  }
  return out
}

// Build the text we feed to the embedder for an event. We concatenate title
// (both languages) and entity names — the same signal the lexical merger uses
// — so the vector neighborhood matches the lexical neighborhood. Trimmed to
// stay well under any per-input token cap.
export function eventEmbeddingText(parts: {
  title_zh: string
  title_en?: string | null
  entity_names?: string[] | null
}): string {
  const en = (parts.title_en ?? '').trim()
  const ents = (parts.entity_names ?? []).filter(Boolean).join(', ')
  return [parts.title_zh, en, ents].filter(Boolean).join(' | ').slice(0, 2000)
}
