// V3 数值合理性验证员 — 数值范围配置
// 超范围标记 anomaly 或 likely_error

export interface SanityRule {
  min?: number
  max?: number
  anomaly_threshold?: number // 与历史数据偏差百分比
}

// 通配符 * 表示默认，精确匹配优先
export const SANITY_RULES: Record<string, SanityRule> = {
  // ── 稳定币市值 (USD) ──
  'market_cap_usdt': { min: 50e9, max: 200e9 },
  'market_cap_usdc': { min: 10e9, max: 100e9 },
  'market_cap_dai': { min: 1e9, max: 20e9 },
  'market_cap_*': { min: 0, max: 50e9 },

  // ── 交易量 (USD) ──
  'daily_volume_*': { min: 0, max: 200e9 },
  'weekly_volume_*': { min: 0, max: 500e9 },

  // ── TVL (USD) ──
  'tvl_*': { min: 0, max: 500e9 },

  // ── 融资金额 (USD) ──
  'funding_seed': { min: 100e3, max: 50e6 },
  'funding_series_a': { min: 1e6, max: 200e6 },
  'funding_series_b': { min: 5e6, max: 500e6 },
  'funding_series_c': { min: 20e6, max: 2e9 },
  'funding_*': { min: 0, max: 5e9 },

  // ── 收入 (USD) ──
  'annual_revenue': { min: 0, max: 50e9 },
  'quarterly_revenue': { min: 0, max: 15e9 },

  // ── 百分比 ──
  'percentage_*': { min: 0, max: 100 },
  'chain_share_*': { min: 0, max: 100 },
  'apy_*': { min: -50, max: 1000 }, // DeFi APY 可能很高

  // ── 周变化率 (%) ──
  'weekly_change_*': { anomaly_threshold: 50 },

  // ── 用户/持有者数 ──
  'holder_count_*': { min: 0, max: 500e6 },
  'active_wallets_*': { min: 0, max: 100e6 },

  // ── 股价 (USD) ──
  'stock_price_*': { min: 0.01, max: 10000 },
}

// 与历史数据偏差的默认阈值
export const HISTORICAL_DEVIATION = {
  anomaly_pct: 30,    // >30% 偏差 → anomaly (异常但未必错)
  likely_error_x: 10, // >10x 偏差 → likely_error (量级错误)
}

// 查找匹配的规则 (精确匹配优先，然后通配符)
export function findSanityRule(metricName: string): SanityRule | undefined {
  // 精确匹配
  if (SANITY_RULES[metricName]) return SANITY_RULES[metricName]

  // 通配符匹配: metric_name 的前缀 + *
  const parts = metricName.split('_')
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('_') + '_*'
    if (SANITY_RULES[prefix]) return SANITY_RULES[prefix]
  }

  return undefined
}
