// 赛道分类定义

import type { Sector } from '@/lib/types'

export interface SectorDefinition {
  name: Sector
  label_en: string
  label_zh: string
  description: string
  keywords: string[] // 用于自动归类的关键词
}

export const SECTOR_DEFINITIONS: SectorDefinition[] = [
  {
    name: 'issuance',
    label_en: 'Issuance',
    label_zh: '发行',
    description: '稳定币发行、储备管理、审计',
    keywords: ['mint', 'redeem', 'reserve', 'audit', 'peg', 'backing', 'issuance', 'supply', 'circulation'],
  },
  {
    name: 'payments',
    label_en: 'Payments',
    label_zh: '支付',
    description: 'B2C支付、B2B结算、跨境汇款',
    keywords: ['payment', 'settlement', 'remittance', 'cross-border', 'merchant', 'POS', 'checkout', 'transfer'],
  },
  {
    name: 'defi',
    label_en: 'DeFi',
    label_zh: '去中心化金融',
    description: '借贷、DEX、收益、合成资产',
    keywords: ['lending', 'borrowing', 'yield', 'AMM', 'DEX', 'liquidity', 'pool', 'vault', 'staking', 'farming'],
  },
  {
    name: 'infrastructure',
    label_en: 'Infrastructure',
    label_zh: '基础设施',
    description: '跨链桥、预言机、合规工具、托管',
    keywords: ['bridge', 'oracle', 'compliance', 'custody', 'KYC', 'AML', 'API', 'SDK', 'protocol', 'chain'],
  },
  {
    name: 'regulatory',
    label_en: 'Regulatory',
    label_zh: '监管',
    description: '立法、执法、牌照、银行合作',
    keywords: ['regulation', 'bill', 'act', 'SEC', 'license', 'compliance', 'enforcement', 'legislation', 'hearing'],
  },
  {
    name: 'capital_markets',
    label_en: 'Capital Markets',
    label_zh: '资本市场',
    description: 'IPO、融资、并购、战略投资',
    keywords: ['IPO', 'funding', 'fundraise', 'acquisition', 'merger', 'investment', 'valuation', 'series', 'seed'],
  },
]
