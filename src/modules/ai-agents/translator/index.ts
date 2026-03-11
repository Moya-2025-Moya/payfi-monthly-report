// B5 Translator Agent — English atomic facts → Chinese
// Input: atomic_facts IDs with content_en filled
// Output: atomic_facts.content_zh updated

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
  // 1. Fetch atomic fact
  const { data, error } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('id', factId)
    .single()

  if (error) throw new Error(`[B5] Failed to fetch fact ${factId}: ${error.message}`)

  const fact = data as AtomicFact

  // 2. Skip if content_zh already filled
  if (fact.content_zh !== null && fact.content_zh !== '') {
    console.log(`[B5] Skipping fact ${factId} — content_zh already present`)
    return
  }

  // 3. Build prompt
  const template = loadPrompt('translator.md')
  const prompt = template.replace('{content_en}', fact.content_en)

  // 4. Call Haiku — response is the translated text directly
  const response = await callHaiku(prompt)

  // 5. Update content_zh
  const { error: updateError } = await supabaseAdmin
    .from('atomic_facts')
    .update({ content_zh: response.trim() })
    .eq('id', factId)

  if (updateError) throw new Error(`[B5] Failed to update fact ${factId}: ${updateError.message}`)

  console.log(`[B5] Translated fact ${factId}`)
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
