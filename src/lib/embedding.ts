// Voyage AI embedding client — voyage-3-lite (512 dimensions)
// Used by: fact-splitter (after save), context-engine (retrieval), reference-events (seed)

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3-lite'
const EMBEDDING_DIM = 512

interface VoyageResponse {
  data: { embedding: number[] }[]
  usage: { total_tokens: number }
}

/**
 * Generate embeddings for 1+ texts via Voyage AI.
 * Returns null if VOYAGE_API_KEY is not configured (graceful degradation).
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][] | null> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    console.warn('[embedding] VOYAGE_API_KEY not set, skipping embeddings')
    return null
  }

  if (texts.length === 0) return []

  // Voyage API supports up to 128 texts per batch
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += 128) {
    const batch = texts.slice(i, i + 128)

    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: batch,
        input_type: 'document',
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[embedding] Voyage API error ${res.status}: ${errText}`)
      return null
    }

    const data: VoyageResponse = await res.json()
    for (const item of data.data) {
      allEmbeddings.push(item.embedding)
    }
  }

  return allEmbeddings
}

/**
 * Generate a single embedding for a query text.
 * Uses input_type='query' for better retrieval performance.
 */
export async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) return null

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: [text],
      input_type: 'query',
    }),
  })

  if (!res.ok) return null

  const data: VoyageResponse = await res.json()
  return data.data[0]?.embedding ?? null
}

export { EMBEDDING_DIM }
