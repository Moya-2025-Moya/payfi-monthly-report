// Translator — Batch EN→ZH translation for events
// V2 simplified: only translates events that have EN but no ZH content

import { callHaikuJSON } from '@/lib/ai-client'
import type { ExtractedEvent } from '@/lib/types'

const BATCH_SIZE = 5

interface TranslationInput {
  index: number
  title_en: string
  summary_en: string
}

interface TranslationOutput {
  translations: { index: number; title_zh: string; summary_zh: string }[]
}

export async function translateEvents(events: ExtractedEvent[]): Promise<void> {
  // Find events that need ZH translation (have EN but weak/missing ZH)
  const needsTranslation: TranslationInput[] = events
    .map((e, i) => ({ event: e, index: i }))
    .filter(({ event }) => {
      // If ZH already looks good (not just a copy of EN), skip
      if (event.title_zh && event.title_zh !== event.title_en && /[\u4e00-\u9fff]/.test(event.title_zh)) {
        return false
      }
      return event.title_en && event.title_en.length > 0
    })
    .map(({ event, index }) => ({
      index,
      title_en: event.title_en,
      summary_en: event.summary_en,
    }))

  if (needsTranslation.length === 0) {
    console.log('[translator] All events already have Chinese content')
    return
  }

  console.log(`[translator] Translating ${needsTranslation.length} events`)

  for (let i = 0; i < needsTranslation.length; i += BATCH_SIZE) {
    const batch = needsTranslation.slice(i, i + BATCH_SIZE)

    const items = batch.map(t =>
      `[${t.index}] Title: ${t.title_en}\nSummary: ${t.summary_en}`
    ).join('\n\n')

    try {
      const result = await callHaikuJSON<TranslationOutput>(
        `Translate these news items to Chinese. Keep entity names (company names, product names, regulatory bodies) in English. Be concise and natural.

${items}

Return JSON: {"translations": [{"index": N, "title_zh": "...", "summary_zh": "..."}]}`,
        { maxTokens: 2048 }
      )

      for (const t of result.translations ?? []) {
        if (t.index >= 0 && t.index < events.length) {
          events[t.index].title_zh = t.title_zh
          events[t.index].summary_zh = t.summary_zh
        }
      }
    } catch (err) {
      console.error(`[translator] Batch failed:`, err instanceof Error ? err.message : String(err))
    }
  }
}
