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

## STRICT: Specificity preservation
Preserve every concrete name, number, date, and party from the English source. Do NOT replace specific enumerations with vague Chinese quantifiers. Banned in the Chinese output: 几家 / 多家 / 若干 / 数家 / 一些 / 多个 / 一批 / 部分 / 大量 / 不少 / 少数 / 许多 — unless the English source ITSELF used a vague quantifier AND did not enumerate, in which case append "（具体名称未披露）" after the Chinese quantifier.

If EN says "Binance, OKX, and Bybit froze accounts" → ZH must say "Binance、OKX、Bybit 三家交易所冻结账户", NEVER "三家交易所冻结账户".
If EN says "several exchanges froze accounts" (no names) → ZH must say "多家交易所（具体名称未披露）冻结账户".

## STRICT: Number format — output MUST use k / M / B / T, NEVER 千 / 万 / 亿 / 万亿
Chinese readers of crypto/fintech news are fluent in k/M/B/T notation. **All numeric magnitudes in title_zh / summary_zh MUST be expressed in k / M / B / T (English units), regardless of how the English source wrote them.**

If EN source already uses k/M/B/T or million/billion/trillion → keep digits + unit verbatim:
- "$127.5M"     → "127.5M 美元" ✓   (NOT "1.275 亿美元")
- "$4.22B"      → "4.22B 美元"  ✓   (NOT "42.2 亿美元")
- "$900K"       → "900K 美元"   ✓   (NOT "90 万美元")
- "1.2 billion" → "1.2B"          ✓   (NOT "12 亿")
- "3 trillion"  → "3T"            ✓   (NOT "3 万亿")

If EN source uses raw digits → format with the unit that minimizes digits while keeping ≥1 significant figure (e.g. "12,000 users" → "12k 用户"; "1,200,000" → "1.2M").

Decimal precision: 1 decimal place by default; drop trailing ".0" for whole numbers (write "5M" not "5.0M"). Do NOT preserve "万" as an exception — never emit 千 / 万 / 亿 / 万亿 in the Chinese output.

The character "$" becomes "美元" after the number (e.g., "127.5M 美元"). Percentages, counts (other than the magnitude format above), dates, addresses, and statute numbers copy verbatim from EN.

## STRICT: No invented numbers
Every number you output in title_zh or summary_zh MUST appear verbatim in the English title_en or summary_en for that same index. Do not invent a number, do not round to a "cleaner" value, do not infer a number from context. If the English source has no number for a fact, the Chinese output also has no number for that fact — leave it qualitative.

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
