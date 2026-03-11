// 各实体类型的事实维度模板 — C6 盲区探测器使用
// 对比同类实体，缺失的维度 = 盲区

import type { EntityCategory } from '@/lib/types'

export interface DimensionTemplate {
  category: EntityCategory
  dimensions: {
    name: string
    label_zh: string
    // 用哪些 tag/metric_name 判断是否有覆盖
    matching_tags: string[]
    matching_metrics: string[]
  }[]
}

export const DIMENSION_TEMPLATES: DimensionTemplate[] = [
  {
    category: 'stablecoin_issuer',
    dimensions: [
      { name: 'market_cap', label_zh: '市值', matching_tags: ['market_cap', '市值'], matching_metrics: ['market_cap'] },
      { name: 'volume', label_zh: '交易量', matching_tags: ['volume', '交易量'], matching_metrics: ['weekly_volume', 'daily_volume'] },
      { name: 'chain_distribution', label_zh: '链分布', matching_tags: ['chain', '链分布', 'multichain'], matching_metrics: ['chain_share'] },
      { name: 'revenue', label_zh: '收入数据', matching_tags: ['revenue', '收入', 'earnings'], matching_metrics: ['annual_revenue', 'quarterly_revenue'] },
      { name: 'reserve', label_zh: '储备构成', matching_tags: ['reserve', '储备', 'backing', 'audit'], matching_metrics: ['reserve_total'] },
      { name: 'users', label_zh: '用户数', matching_tags: ['users', '用户', 'holders', 'wallets'], matching_metrics: ['holder_count', 'active_wallets'] },
      { name: 'compliance', label_zh: '合规牌照', matching_tags: ['license', '牌照', 'compliance', 'regulation'], matching_metrics: [] },
      { name: 'team', label_zh: '团队信息', matching_tags: ['team', '团队', 'hire', 'CEO', 'CTO'], matching_metrics: [] },
      { name: 'funding', label_zh: '融资历史', matching_tags: ['funding', '融资', 'investment', 'series'], matching_metrics: ['funding_total'] },
      { name: 'product', label_zh: '产品动态', matching_tags: ['product', '产品', 'launch', 'update', 'feature'], matching_metrics: [] },
      { name: 'partnerships', label_zh: '合作关系', matching_tags: ['partnership', '合作', 'integration'], matching_metrics: [] },
    ],
  },
  {
    category: 'b2b_infra',
    dimensions: [
      { name: 'product', label_zh: '产品动态', matching_tags: ['product', '产品', 'launch', 'API'], matching_metrics: [] },
      { name: 'funding', label_zh: '融资历史', matching_tags: ['funding', '融资'], matching_metrics: ['funding_total'] },
      { name: 'team', label_zh: '团队信息', matching_tags: ['team', '团队', 'hire'], matching_metrics: [] },
      { name: 'clients', label_zh: '客户/合作方', matching_tags: ['client', 'partner', '合作', 'integration'], matching_metrics: [] },
      { name: 'compliance', label_zh: '合规牌照', matching_tags: ['license', '牌照', 'compliance'], matching_metrics: [] },
      { name: 'volume', label_zh: '处理量', matching_tags: ['volume', 'processed', 'throughput'], matching_metrics: ['processed_volume'] },
    ],
  },
  {
    category: 'tradfi',
    dimensions: [
      { name: 'crypto_strategy', label_zh: '加密策略', matching_tags: ['crypto', 'stablecoin', 'digital', 'blockchain'], matching_metrics: [] },
      { name: 'revenue', label_zh: '收入/财报', matching_tags: ['revenue', 'earnings', '财报'], matching_metrics: ['annual_revenue'] },
      { name: 'partnerships', label_zh: '合作关系', matching_tags: ['partnership', '合作'], matching_metrics: [] },
      { name: 'product', label_zh: '产品动态', matching_tags: ['product', 'launch'], matching_metrics: [] },
      { name: 'stock', label_zh: '股价', matching_tags: ['stock', 'share'], matching_metrics: ['stock_price'] },
    ],
  },
  {
    category: 'public_company',
    dimensions: [
      { name: 'revenue', label_zh: '收入/财报', matching_tags: ['revenue', 'earnings'], matching_metrics: ['annual_revenue', 'quarterly_revenue'] },
      { name: 'stock', label_zh: '股价', matching_tags: ['stock', 'share'], matching_metrics: ['stock_price'] },
      { name: 'product', label_zh: '产品动态', matching_tags: ['product', 'launch'], matching_metrics: [] },
      { name: 'stablecoin_integration', label_zh: '稳定币集成', matching_tags: ['stablecoin', 'USDC', 'USDT'], matching_metrics: [] },
      { name: 'funding', label_zh: '融资/并购', matching_tags: ['funding', 'acquisition', 'merger'], matching_metrics: [] },
      { name: 'compliance', label_zh: '合规', matching_tags: ['compliance', 'SEC', 'regulation'], matching_metrics: [] },
    ],
  },
  {
    category: 'defi',
    dimensions: [
      { name: 'tvl', label_zh: 'TVL', matching_tags: ['TVL', 'liquidity'], matching_metrics: ['tvl'] },
      { name: 'volume', label_zh: '交易量', matching_tags: ['volume'], matching_metrics: ['daily_volume', 'weekly_volume'] },
      { name: 'product', label_zh: '协议更新', matching_tags: ['product', 'upgrade', 'governance', 'proposal'], matching_metrics: [] },
      { name: 'security', label_zh: '安全审计', matching_tags: ['audit', 'security', 'hack', 'exploit'], matching_metrics: [] },
      { name: 'governance', label_zh: '治理', matching_tags: ['governance', 'vote', 'proposal', 'DAO'], matching_metrics: [] },
      { name: 'stablecoin_pools', label_zh: '稳定币池子', matching_tags: ['stablecoin', 'pool', 'yield'], matching_metrics: ['pool_tvl', 'apy'] },
    ],
  },
  {
    category: 'regulator',
    dimensions: [
      { name: 'legislation', label_zh: '立法动态', matching_tags: ['bill', 'act', 'legislation'], matching_metrics: [] },
      { name: 'enforcement', label_zh: '执法行动', matching_tags: ['enforcement', 'fine', 'penalty', 'action'], matching_metrics: [] },
      { name: 'guidance', label_zh: '指导文件', matching_tags: ['guidance', 'framework', 'policy'], matching_metrics: [] },
      { name: 'licensing', label_zh: '牌照发放', matching_tags: ['license', 'charter', 'approval'], matching_metrics: [] },
    ],
  },
]
