// Decision #14: 验证层按事实类型选策略
// Instead of running ALL verifiers (V1-V5) on every fact,
// select which to run based on fact_type to reduce unnecessary AI calls.

import type { FactType } from '@/lib/types'

export type Verifier = 'v1' | 'v2' | 'v3' | 'v4' | 'v5'

export const VERIFICATION_STRATEGY: Record<FactType, Verifier[]> = {
  metric:        ['v1', 'v3', 'v4'],       // source traceback + numerical sanity + on-chain anchoring
  event:         ['v1', 'v2'],              // source traceback + cross-source verification
  quote:         ['v1'],                    // source traceback only
  relationship:  ['v1', 'v2'],              // source traceback + cross-source verification
  status_change: ['v1', 'v2', 'v5'],        // source traceback + cross-source + temporal consistency
}

// Fallback: if fact_type is unknown or missing, run v1 + v2
export const DEFAULT_VERIFIERS: Verifier[] = ['v1', 'v2']

export function getVerifiersForFact(factType: string | null | undefined): Set<Verifier> {
  const verifiers = VERIFICATION_STRATEGY[factType as FactType] ?? DEFAULT_VERIFIERS
  return new Set(verifiers)
}
