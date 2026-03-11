// V0 裁决器 — 纯TypeScript代码，不用AI
// 汇总V1-V5投票结果，计算最终confidence + verification_status

import type {
  V1Result,
  V2Result,
  V3Result,
  V4Result,
  V5Result,
  Verdict,
  Confidence,
  VerificationStatus,
} from '@/lib/types'

interface AdjudicatorInput {
  v1: V1Result
  v2: V2Result
  v3: V3Result
  v4: V4Result
  v5: V5Result
}

// ─── 主裁决函数 ───

export function adjudicate(input: AdjudicatorInput): Verdict {
  const { v1, v2, v3, v4, v5 } = input

  // ═══ 硬性否决 — 任一条件触发则rejected ═══

  if (v1.status === 'no_match') {
    return reject('来源原文中无依据')
  }

  if (v3.sanity === 'likely_error') {
    return reject('数值明显错误')
  }

  if (v4.anchor_status === 'mismatch') {
    return reject('与链上实际数据严重不符')
  }

  if (v2.cross_validation === 'inconsistent' && v2.is_minority) {
    return reject('多来源中处于少数方')
  }

  // ═══ 高置信度 — 必须有独立信息源的交叉验证 ═══

  if (
    v1.status === 'matched' &&
    v2.source_count >= 2 &&
    v2.independent_sources === true &&
    v2.cross_validation === 'consistent' &&
    v3.sanity === 'normal' &&
    v5.temporal_status === 'consistent'
  ) {
    return verified('high', buildReasons(input))
  }

  // ═══ 中置信度 — 来源已验证但无独立交叉验证 ═══

  if (
    v1.status === 'matched' &&
    v3.sanity === 'normal'
  ) {
    return verified('medium', buildReasons(input))
  }

  // ═══ 低置信度 — 其余通过的情况 ═══

  return {
    status: 'partially_verified',
    confidence: 'low',
    reason: buildReasons(input).join('; '),
  }
}

// ─── 辅助函数 ───

function reject(reason: string): Verdict {
  return { status: 'rejected', confidence: null, reason }
}

function verified(confidence: Confidence, reasons: string[]): Verdict {
  return {
    status: 'verified',
    confidence,
    reason: reasons.join('; '),
  }
}

function buildReasons(input: AdjudicatorInput): string[] {
  const { v1, v2, v3, v4, v5 } = input
  const reasons: string[] = []

  // V1
  if (v1.status === 'matched') reasons.push('source_matched')
  else if (v1.status === 'partial') reasons.push('source_partial_match')
  else if (v1.status === 'source_unavailable') reasons.push('source_unavailable')

  // V2
  if (v2.source_count >= 2 && v2.independent_sources && v2.cross_validation === 'consistent') {
    reasons.push('multi_source_verified')
  } else if (v2.source_count >= 2 && !v2.independent_sources) {
    reasons.push('multi_source_not_independent')
  } else if (v2.cross_validation === 'single_source') {
    reasons.push('single_source')
  } else if (v2.cross_validation === 'partially_consistent') {
    reasons.push('cross_source_partial')
  }

  // V3
  if (v3.sanity === 'normal') reasons.push('numerical_sane')
  else if (v3.sanity === 'anomaly') reasons.push('numerical_anomaly')
  else if (v3.sanity === 'not_applicable') reasons.push('non_metric')

  // V4
  if (v4.anchor_status === 'anchored') reasons.push('onchain_anchored')
  else if (v4.anchor_status === 'deviation') reasons.push('onchain_deviation')
  else if (v4.anchor_status === 'no_anchor_data') reasons.push('no_onchain_anchor')
  else if (v4.anchor_status === 'not_applicable') reasons.push('non_onchain')

  // V5
  if (v5.temporal_status === 'consistent') reasons.push('temporally_consistent')
  else if (v5.temporal_status === 'conflict') reasons.push('temporal_conflict')
  else if (v5.temporal_status === 'unchecked') reasons.push('temporal_unchecked')

  return reasons
}

// ─── 批量裁决 ───

export interface FactVerificationBundle {
  factId: string
  v1: V1Result
  v2: V2Result
  v3: V3Result
  v4: V4Result
  v5: V5Result
}

export function adjudicateBatch(bundles: FactVerificationBundle[]): Map<string, Verdict> {
  const results = new Map<string, Verdict>()
  for (const bundle of bundles) {
    results.set(bundle.factId, adjudicate({
      v1: bundle.v1,
      v2: bundle.v2,
      v3: bundle.v3,
      v4: bundle.v4,
      v5: bundle.v5,
    }))
  }
  return results
}

// ─── 统计辅助 (给F4监控用) ───

export function summarizeVerdicts(verdicts: Map<string, Verdict>) {
  let verifiedHigh = 0
  let verifiedMedium = 0
  let partiallyVerifiedLow = 0
  let rejected = 0
  const rejectionReasons: Record<string, number> = {}

  for (const v of verdicts.values()) {
    if (v.status === 'rejected') {
      rejected++
      rejectionReasons[v.reason] = (rejectionReasons[v.reason] ?? 0) + 1
    } else if (v.status === 'verified' && v.confidence === 'high') {
      verifiedHigh++
    } else if (v.status === 'verified' && v.confidence === 'medium') {
      verifiedMedium++
    } else {
      partiallyVerifiedLow++
    }
  }

  return { verifiedHigh, verifiedMedium, partiallyVerifiedLow, rejected, rejectionReasons }
}
