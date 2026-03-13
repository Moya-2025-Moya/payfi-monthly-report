// 参考知识库 — 人工策展的历史事件，为 Context Engine 提供可比数据
// AI 无法从训练数据中可靠回忆这些数字，必须结构化存储

export interface Milestone {
  date: string          // YYYY-MM-DD
  event: string         // 中文事实描述
}

export interface ReferenceEvent {
  id: string
  entity: string
  type: EventPattern
  milestones: Milestone[]
  metrics: Record<string, string | number>
  tags: string[]        // 用于检索匹配
}

export type EventPattern =
  | 'ipo_filing'
  | 'market_cap_change'
  | 'regulatory_bill'
  | 'product_launch'
  | 'funding_round'
  | 'tvl_milestone'
  | 'partnership'
  | 'enforcement'

export const REFERENCE_EVENTS: ReferenceEvent[] = [
  // ── IPO / 上市 ──
  {
    id: 'coinbase-ipo',
    entity: 'Coinbase',
    type: 'ipo_filing',
    milestones: [
      { date: '2020-12-17', event: 'Coinbase 向 SEC 提交 S-1' },
      { date: '2021-02-25', event: 'S-1 修订版提交，披露 2020 年收入 $12.8 亿' },
      { date: '2021-04-01', event: 'SEC 宣布 S-1 生效' },
      { date: '2021-04-14', event: 'NASDAQ 直接上市，参考价 $250，开盘 $381' },
    ],
    metrics: {
      total_duration_days: 118,
      s1_to_revision_days: 70,
      revision_to_effective_days: 34,
      opening_price: '$381',
      reference_price: '$250',
      first_day_mcap: '$85.8B',
      usdc_market_cap_at_time: '$25B',
      total_stablecoin_market_at_time: '$65B',
    },
    tags: ['ipo', 'sec', 's-1', 'listing', 'coinbase', 'direct-listing'],
  },
  {
    id: 'robinhood-ipo',
    entity: 'Robinhood',
    type: 'ipo_filing',
    milestones: [
      { date: '2021-03-23', event: 'Robinhood 向 SEC 提交 S-1' },
      { date: '2021-07-01', event: '更新 S-1 定价区间 $38-42' },
      { date: '2021-07-29', event: 'NASDAQ IPO，定价 $38' },
    ],
    metrics: {
      total_duration_days: 128,
      ipo_price: '$38',
      first_day_close: '$34.82',
      first_day_change: '-8.4%',
      ipo_valuation: '$32B',
    },
    tags: ['ipo', 'sec', 's-1', 'listing', 'robinhood'],
  },
  {
    id: 'circle-ipo-spac-2022',
    entity: 'Circle',
    type: 'ipo_filing',
    milestones: [
      { date: '2021-07-08', event: 'Circle 宣布通过 SPAC (Concord Acquisition) 上市，估值 $4.5B' },
      { date: '2022-02-17', event: 'SPAC 协议修订，估值上调至 $9B' },
      { date: '2022-12-05', event: 'SPAC 交易终止，SEC 未批准' },
    ],
    metrics: {
      total_duration_days: 515,
      initial_valuation: '$4.5B',
      revised_valuation: '$9B',
      outcome: '终止',
      usdc_market_cap_at_announcement: '$25B',
      usdc_market_cap_at_termination: '$44B',
    },
    tags: ['ipo', 'sec', 'spac', 'circle', 'usdc'],
  },

  // ── 监管法案 ──
  {
    id: 'genius-act',
    entity: 'US Congress',
    type: 'regulatory_bill',
    milestones: [
      { date: '2025-02-04', event: 'GENIUS Act (Guiding and Establishing National Innovation for US Stablecoins) 参议院引入' },
      { date: '2025-03-13', event: '参议院银行委员会 18:6 通过' },
    ],
    metrics: {
      sponsor: 'Sen. Bill Hagerty',
      committee_vote: '18:6',
      key_provision: '联邦+州双轨监管框架',
    },
    tags: ['regulation', 'legislation', 'stablecoin', 'genius-act', 'senate', 'congress'],
  },
  {
    id: 'lummis-gillibrand-2022',
    entity: 'US Congress',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-06-07', event: 'Lummis-Gillibrand 负责任金融创新法案引入参议院' },
      { date: '2022-06-07', event: '法案涵盖稳定币、交易所注册、税务等全面框架' },
    ],
    metrics: {
      outcome: '未进入委员会投票',
      scope: '全面加密监管框架',
      key_difference_vs_genius: 'GENIUS 仅聚焦稳定币; Lummis-Gillibrand 覆盖全加密领域',
    },
    tags: ['regulation', 'legislation', 'lummis-gillibrand', 'senate', 'congress'],
  },
  {
    id: 'mica-eu',
    entity: 'EU',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-06-30', event: 'MiCA (Markets in Crypto-Assets) 欧洲议会/理事会达成协议' },
      { date: '2023-04-20', event: '欧洲议会最终投票通过 MiCA' },
      { date: '2024-06-30', event: '稳定币条款生效 (Title III/IV)' },
      { date: '2024-12-30', event: 'MiCA 全面生效' },
    ],
    metrics: {
      proposal_to_final_vote_days: 660,
      total_implementation_days: 912,
      key_provision: '稳定币发行需 1:1 储备 + 授权许可',
    },
    tags: ['regulation', 'legislation', 'mica', 'eu', 'europe', 'stablecoin'],
  },

  // ── 稳定币里程碑 ──
  {
    id: 'usdt-100b',
    entity: 'Tether',
    type: 'market_cap_change',
    milestones: [
      { date: '2014-10-06', event: 'USDT 发行 (原名 Realcoin)' },
      { date: '2020-01-01', event: 'USDT 市值首次突破 $4B' },
      { date: '2021-04-01', event: 'USDT 市值首次突破 $40B' },
      { date: '2024-03-04', event: 'USDT 市值首次突破 $100B' },
    ],
    metrics: {
      '4b_to_40b_days': 456,
      '40b_to_100b_days': 1069,
      current_dominance: '~65% 稳定币市场',
    },
    tags: ['usdt', 'tether', 'market-cap', 'stablecoin', 'milestone'],
  },
  {
    id: 'usdc-growth-2021-2024',
    entity: 'Circle',
    type: 'market_cap_change',
    milestones: [
      { date: '2018-09-26', event: 'USDC 发行' },
      { date: '2021-01-01', event: 'USDC 市值 ~$4B' },
      { date: '2022-06-01', event: 'USDC 市值峰值 ~$55B' },
      { date: '2023-03-11', event: 'SVB 事件后 USDC 短暂脱钩至 $0.87，市值跌至 ~$37B' },
      { date: '2024-01-01', event: 'USDC 市值恢复至 ~$25B' },
    ],
    metrics: {
      svb_depeg_low: '$0.87',
      svb_recovery_time_hours: 72,
      circle_svb_exposure: '$3.3B',
      peak_market_cap: '$55B',
    },
    tags: ['usdc', 'circle', 'market-cap', 'stablecoin', 'svb'],
  },
  {
    id: 'ust-collapse',
    entity: 'Terra',
    type: 'market_cap_change',
    milestones: [
      { date: '2022-05-07', event: 'UST 开始脱钩，Anchor 协议大额赎回' },
      { date: '2022-05-09', event: 'UST 跌至 $0.35，LUNA 暴跌 96%' },
      { date: '2022-05-13', event: 'Terra 链暂停，UST 市值从 $18B 归零' },
    ],
    metrics: {
      peak_market_cap: '$18B',
      collapse_duration_days: 6,
      luna_peak_price: '$119.18',
      luna_post_collapse: '<$0.01',
      contagion: 'Three Arrows Capital 破产、Celsius/Voyager 破产',
    },
    tags: ['ust', 'terra', 'luna', 'depeg', 'collapse', 'stablecoin'],
  },

  // ── 融资 ──
  {
    id: 'circle-series-f',
    entity: 'Circle',
    type: 'funding_round',
    milestones: [
      { date: '2022-04-12', event: 'Circle 完成 $4 亿 Series F，BlackRock 领投' },
    ],
    metrics: {
      amount: '$400M',
      lead_investor: 'BlackRock',
      other_investors: 'Fidelity, Marshall Wace, Fin Capital',
      post_money_valuation: '$9B',
    },
    tags: ['funding', 'circle', 'usdc', 'blackrock', 'series-f'],
  },
  {
    id: 'stripe-bridge-acquisition',
    entity: 'Stripe',
    type: 'partnership',
    milestones: [
      { date: '2024-10-21', event: 'Stripe 宣布收购 Bridge.xyz，金额 $1.1B' },
      { date: '2025-02-01', event: '收购完成' },
    ],
    metrics: {
      acquisition_price: '$1.1B',
      bridge_annual_revenue: '~$10-15M (估计)',
      revenue_multiple: '~70-100x',
      strategic_rationale: 'Stripe 进入稳定币基础设施',
    },
    tags: ['acquisition', 'stripe', 'bridge', 'b2b', 'infrastructure', 'partnership'],
  },

  // ── 产品发布 ──
  {
    id: 'pyusd-launch',
    entity: 'PayPal',
    type: 'product_launch',
    milestones: [
      { date: '2023-08-07', event: 'PayPal 发布 PYUSD，Paxos 发行，以太坊链' },
      { date: '2024-05-29', event: 'PYUSD 上线 Solana' },
      { date: '2024-08-01', event: 'PYUSD 市值突破 $1B' },
    ],
    metrics: {
      launch_to_1b_days: 360,
      issuer: 'Paxos Trust',
      initial_chain: 'Ethereum',
      expanded_chain: 'Solana',
    },
    tags: ['product-launch', 'pyusd', 'paypal', 'stablecoin', 'paxos'],
  },

  // ── TVL 里程碑 ──
  {
    id: 'dai-tvl-growth',
    entity: 'MakerDAO',
    type: 'tvl_milestone',
    milestones: [
      { date: '2019-11-18', event: 'MakerDAO 上线多抵押 DAI (MCD)' },
      { date: '2021-05-01', event: 'DAI 市值首次突破 $5B' },
      { date: '2022-10-01', event: 'DAI 市值稳定在 $5-6B 区间' },
    ],
    metrics: {
      single_to_multi_collateral_date: '2019-11-18',
      time_to_5b_months: 18,
      peak_market_cap: '$10B (2022-02)',
    },
    tags: ['tvl', 'dai', 'makerdao', 'defi', 'stablecoin', 'milestone'],
  },
  {
    id: 'usde-growth',
    entity: 'Ethena',
    type: 'tvl_milestone',
    milestones: [
      { date: '2024-02-19', event: 'Ethena USDe 主网上线' },
      { date: '2024-07-01', event: 'USDe 市值突破 $3B' },
      { date: '2025-01-01', event: 'USDe 市值突破 $5B' },
    ],
    metrics: {
      launch_to_3b_months: 4.5,
      launch_to_5b_months: 10.5,
      mechanism: 'Delta-neutral 合成美元 (ETH staking + short futures)',
      peak_apr: '~30% (sUSDe)',
    },
    tags: ['tvl', 'usde', 'ethena', 'defi', 'stablecoin', 'synthetic'],
  },

  // ── 执法 ──
  {
    id: 'tether-cftc-settlement',
    entity: 'Tether',
    type: 'enforcement',
    milestones: [
      { date: '2021-02-23', event: 'NY AG 与 Tether/Bitfinex 达成和解，罚款 $18.5M' },
      { date: '2021-10-15', event: 'CFTC 对 Tether 罚款 $41M (储备金误导)' },
    ],
    metrics: {
      ny_ag_fine: '$18.5M',
      cftc_fine: '$41M',
      total_fines: '$59.5M',
      allegation: '储备金构成虚假陈述',
      outcome: '和解 + 季度储备证明',
    },
    tags: ['enforcement', 'tether', 'usdt', 'cftc', 'nyag', 'fine', 'settlement'],
  },
  {
    id: 'sec-paxos-busd',
    entity: 'Paxos',
    type: 'enforcement',
    milestones: [
      { date: '2023-02-13', event: 'SEC 向 Paxos 发出 Wells Notice (BUSD 为证券)' },
      { date: '2023-02-13', event: 'NYDFS 指令 Paxos 停止铸造 BUSD' },
      { date: '2023-02-13', event: 'BUSD 市值当日 $16B，此后持续赎回' },
      { date: '2024-02-01', event: 'BUSD 市值降至 <$100M' },
    ],
    metrics: {
      market_cap_at_notice: '$16B',
      market_cap_1y_later: '<$100M',
      decline_percent: '>99%',
      wind_down_duration_months: 12,
    },
    tags: ['enforcement', 'sec', 'paxos', 'busd', 'binance', 'wells-notice'],
  },

  // ── Hong Kong ──
  {
    id: 'hk-stablecoin-framework',
    entity: 'HKMA',
    type: 'regulatory_bill',
    milestones: [
      { date: '2024-03-12', event: 'HKMA 公布稳定币监管咨询文件' },
      { date: '2024-07-18', event: '沙盒计划启动，首批 3 家获批 (京东、圆币、渣打+安拟集团)' },
      { date: '2025-01-01', event: '正式立法进入立法会审议' },
    ],
    metrics: {
      sandbox_participants: 3,
      key_requirement: '1:1 储备 + 许可证 + 本地托管',
    },
    tags: ['regulation', 'hong-kong', 'hkma', 'stablecoin', 'asia'],
  },
]

// ── 检索辅助函数 ──

/** 按 tags 匹配参考事件 */
export function searchReferenceByTags(queryTags: string[], limit = 5): ReferenceEvent[] {
  const lowerTags = queryTags.map(t => t.toLowerCase())
  const scored = REFERENCE_EVENTS.map(event => {
    const matchCount = event.tags.filter(t => lowerTags.includes(t.toLowerCase())).length
    return { event, score: matchCount }
  })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  return scored.map(s => s.event)
}

/** 按事件类型匹配参考事件 */
export function searchReferenceByType(type: EventPattern, limit = 5): ReferenceEvent[] {
  return REFERENCE_EVENTS.filter(e => e.type === type).slice(0, limit)
}

/** 按实体名匹配参考事件 */
export function searchReferenceByEntity(entity: string, limit = 5): ReferenceEvent[] {
  const lower = entity.toLowerCase()
  return REFERENCE_EVENTS.filter(e =>
    e.entity.toLowerCase().includes(lower) || e.tags.some(t => t.toLowerCase().includes(lower))
  ).slice(0, limit)
}
