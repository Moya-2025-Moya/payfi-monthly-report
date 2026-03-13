// 标准标签词汇表 — 自动从 watchlist 生成 + 主题白名单
// B1 prompt 和 normalizeTags() 共用

import { WATCHLIST } from './watchlist'

// ── 从 watchlist 自动生成实体标签 ──

function buildEntityTags(): Map<string, string> {
  const map = new Map<string, string>()
  for (const entity of WATCHLIST) {
    const canonical = entity.name.toLowerCase().replace(/\s*\(.*\)/, '').trim()
    map.set(canonical, canonical)
    map.set(entity.name.toLowerCase(), canonical)
    for (const alias of entity.aliases) {
      map.set(alias.toLowerCase(), canonical)
    }
  }
  return map
}

// alias → canonical entity tag
const ENTITY_ALIAS_MAP = buildEntityTags()

// ── 主题白名单 (手动维护) ──

const TOPIC_TAGS = new Set([
  // 业务事件
  'ipo', 'acquisition', 'partnership', 'funding', 'launch', 'listing', 'delisting',
  // 财务指标
  'revenue', 'market_cap', 'tvl', 'volume', 'supply', 'reserves', 'aum',
  // 监管
  'regulation', 'legislation', 'enforcement', 'compliance', 'license', 'audit',
  // 产品
  'payments', 'cross_border', 'remittance', 'wallet', 'custody', 'settlement',
  // 技术
  'defi', 'lending', 'yield', 'bridge', 'l2', 'smart_contract',
  // 赛道
  'issuance', 'infrastructure', 'tradfi', 'cbdc',
  // 文件类型
  's-1', '10-k', '10-q', '8-k',
])

// ── 同义词归一 ──

const SYNONYM_MAP: Record<string, string> = {
  'stablecoin': 'stablecoin',
  'stablecoins': 'stablecoin',
  'stable_coin': 'stablecoin',
  'stable_coins': 'stablecoin',
  'usdc': 'circle',
  'usdt': 'tether',
  'pyusd': 'paypal',
  'usde': 'ethena',
  'dai': 'makerdao',
  'frax': 'frax',
  'ausd': 'agora',
  'sec': 'sec',
  'occ': 'occ',
  'fed': 'federal reserve',
  'frb': 'federal reserve',
  'coin': 'coinbase',
  'sq': 'block',
  'hood': 'robinhood',
  'jpm': 'jpmorgan',
  'blk': 'blackrock',
  'genius_act': 'regulation',
  'mica': 'regulation',
  'cross-border': 'cross_border',
  'cross_border_payments': 'cross_border',
  'market-cap': 'market_cap',
  'marketcap': 'market_cap',
  'total_value_locked': 'tvl',
  'assets_under_management': 'aum',
}

// ── normalizeTags: 清洗 + 归一 + 去重 ──

export function normalizeTags(rawTags: string[]): string[] {
  const result = new Set<string>()

  for (const raw of rawTags) {
    let tag = raw.toLowerCase().trim().replace(/\s+/g, '_')

    // 1. 同义词归一
    if (SYNONYM_MAP[tag]) {
      tag = SYNONYM_MAP[tag]
    }

    // 2. 实体别名归一
    const entityCanonical = ENTITY_ALIAS_MAP.get(tag)
    if (entityCanonical) {
      result.add(entityCanonical)
      continue
    }

    // 3. 白名单主题
    if (TOPIC_TAGS.has(tag)) {
      result.add(tag)
      continue
    }

    // 4. 通用稳定币标签
    if (tag === 'stablecoin') {
      result.add('stablecoin')
      continue
    }

    // 5. 不在白名单中 → 仍然保留（但已经做了归一化）
    // 这样不会丢失信息，同时大部分标签已被标准化
    result.add(tag)
  }

  return [...result].slice(0, 5) // 最多5个标签
}

// ── 导出标签列表（供 B1 prompt 注入） ──

export function getStandardTagList(): string {
  const entityTags = [...new Set(ENTITY_ALIAS_MAP.values())].sort()
  const topicTags = [...TOPIC_TAGS].sort()
  return [
    '实体标签: ' + entityTags.join(', '),
    '主题标签: ' + topicTags.join(', '),
  ].join('\n')
}
