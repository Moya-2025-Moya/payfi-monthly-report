// B5 Translator Agent — Bilingual completion
// Now that B1 outputs Chinese directly:
//   - If content_zh exists and content_en is null → translate ZH→EN
//   - If content_en exists and content_zh is null → translate EN→ZH (legacy)

import { readFileSync } from 'fs'
import { join } from 'path'
import { callHaiku } from '@/lib/ai-client'
import { supabaseAdmin } from '@/db/client'
import type { AtomicFact } from '@/lib/types'

// ─── Prompt 模板 ───

const PROMPTS_DIR = join(process.cwd(), 'src/config/prompts')

function loadPrompt(filename: string): string {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf-8')
}

// ─── 单条翻译 ───

export async function translateFact(factId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('id', factId)
    .single()

  if (error) throw new Error(`[B5] Failed to fetch fact ${factId}: ${error.message}`)

  const fact = data as AtomicFact

  // Both filled → skip
  if (fact.content_zh && fact.content_en) {
    console.log(`[B5] Skipping fact ${factId} — both languages present`)
    return
  }

  // Neither filled → skip
  if (!fact.content_zh && !fact.content_en) {
    console.log(`[B5] Skipping fact ${factId} — no content`)
    return
  }

  if (fact.content_zh && !fact.content_en) {
    // ZH→EN: new path (B1 now outputs Chinese)
    const prompt = [
      'Translate the following Chinese atomic fact into English.',
      'Rules: preserve proper nouns (company names, product names, abbreviations like USDC, SEC, S-1).',
      'Preserve all numbers exactly. Output only the translated text, nothing else.',
      '',
      fact.content_zh,
    ].join('\n')

    const response = await callHaiku(prompt)

    const { error: updateError } = await supabaseAdmin
      .from('atomic_facts')
      .update({ content_en: response.trim() })
      .eq('id', factId)

    if (updateError) throw new Error(`[B5] Failed to update fact ${factId}: ${updateError.message}`)
    console.log(`[B5] Translated ZH→EN for fact ${factId}`)
  } else if (fact.content_en && !fact.content_zh) {
    // EN→ZH: legacy path
    const template = loadPrompt('translator.md')
    const prompt = template.replace('{content_en}', fact.content_en)
    const response = await callHaiku(prompt)

    const { error: updateError } = await supabaseAdmin
      .from('atomic_facts')
      .update({ content_zh: response.trim() })
      .eq('id', factId)

    if (updateError) throw new Error(`[B5] Failed to update fact ${factId}: ${updateError.message}`)
    console.log(`[B5] Translated EN→ZH for fact ${factId}`)
  }
}

// ─── 批量翻译 ───

export async function translateFactsBatch(factIds: string[]): Promise<void> {
  const BATCH_SIZE = 10

  for (let i = 0; i < factIds.length; i += BATCH_SIZE) {
    const batch = factIds.slice(i, i + BATCH_SIZE)
    console.log(`[B5] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} facts)`)

    const results = await Promise.allSettled(batch.map(id => translateFact(id)))

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === 'rejected') {
        console.error(`[B5] Failed to translate fact ${batch[j]}:`, result.reason)
      }
    }
  }

  console.log(`[B5] Batch translation complete — ${factIds.length} facts processed`)
}
