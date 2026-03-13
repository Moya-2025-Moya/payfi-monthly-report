// Phase 2F: Adversarial validation — secondary AI check on free-text fields
// Catches opinion/prediction that slipped through the primary prompt
// Uses a separate Haiku call as an independent reviewer

import { callHaikuJSON } from '@/lib/ai-client'

interface CheckResult {
  field: string
  original: string
  cleaned: string | null  // null = passed, string = rewritten version
  violation: string | null
}

const OPINION_PATTERN = /可能|或许|预计|看好|利空|建议|值得关注|重大|利好|趋势|前景|有望|显著|意义|令人|震撼|突破性|革命/

/**
 * Check free-text fields for opinion/prediction violations.
 * Fast regex pre-check → AI review only if regex flags something.
 */
export async function adversarialCheck(fields: { name: string; value: string }[]): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  // Collect fields that fail regex pre-check
  const flagged: { name: string; value: string }[] = []

  for (const f of fields) {
    if (!f.value) continue
    if (OPINION_PATTERN.test(f.value)) {
      flagged.push(f)
    } else {
      results.push({ field: f.name, original: f.value, cleaned: null, violation: null })
    }
  }

  if (flagged.length === 0) return results

  // AI review for flagged fields
  try {
    const fieldsText = flagged.map((f, i) => `[${i}] ${f.name}: "${f.value}"`).join('\n')

    const aiResult = await callHaikuJSON<{
      checks: Array<{
        index: number
        has_violation: boolean
        violation_type: string | null  // "opinion" | "prediction" | "evaluation"
        rewritten: string | null       // cleaned version without opinion
      }>
    }>(
      `你是事实纯度检查器。检查以下文本是否包含主观意见、预测或评价。

文本:
${fieldsText}

规则:
- "可能""预计""有望" = 预测 → 违规
- "值得关注""重大""利好" = 评价 → 违规
- "突破 $60B""提交了 S-1" = 事实 → 通过
- 如果违规，提供一个只保留事实部分的重写版本

输出 JSON:
{
  "checks": [
    { "index": 0, "has_violation": false, "violation_type": null, "rewritten": null },
    { "index": 1, "has_violation": true, "violation_type": "prediction", "rewritten": "..." }
  ]
}`,
      { system: '事实纯度检查器。输出严格 JSON。', maxTokens: 500 }
    )

    for (const check of aiResult.checks ?? []) {
      if (check.index < 0 || check.index >= flagged.length) continue
      const f = flagged[check.index]
      results.push({
        field: f.name,
        original: f.value,
        cleaned: check.has_violation ? (check.rewritten ?? null) : null,
        violation: check.has_violation ? check.violation_type : null,
      })
    }

    // Any flagged fields not covered by AI response → keep original
    for (let i = 0; i < flagged.length; i++) {
      if (!results.some(r => r.field === flagged[i].name)) {
        results.push({ field: flagged[i].name, original: flagged[i].value, cleaned: null, violation: null })
      }
    }
  } catch {
    // AI check failed → pass all through (don't block pipeline)
    for (const f of flagged) {
      results.push({ field: f.name, original: f.value, cleaned: null, violation: null })
    }
  }

  return results
}
