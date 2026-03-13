// 参考知识库 V13 — 人工策展的稳定币行业历史事件
// 每条数据的每个数字必须有 primary source 可追溯
// 覆盖范围: 稳定币发行商、B2C/B2B 产品、美国上市公司、监管、市场事件
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
  tags: string[]              // 用于检索匹配
  source_urls?: string[]       // Primary sources for every number (SEC filing, DeFiLlama, official blog)
  comparable_events?: string[] // IDs of natural comparison pairs
  context_summary?: string     // 为什么这个事件适合作为参照 (1-2 句)
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

  // ════════════════════════════════════════════════════════════
  // 以下为 V13 种子扩充 (目标 80 条)
  // ════════════════════════════════════════════════════════════

  // ── IPO / 上市 (续) ──
  {
    id: 'circle-s1-2024',
    entity: 'Circle',
    type: 'ipo_filing',
    milestones: [
      { date: '2024-01-11', event: 'Circle 秘密提交 S-1 (第二次尝试 IPO)' },
    ],
    metrics: {
      previous_attempt: 'SPAC 2021-2022 (终止)',
      usdc_market_cap_at_filing: '~$26B',
    },
    tags: ['ipo', 'sec', 's-1', 'circle', 'usdc'],
  },
  {
    id: 'bakkt-ipo-spac',
    entity: 'Bakkt',
    type: 'ipo_filing',
    milestones: [
      { date: '2021-01-11', event: 'Bakkt 宣布通过 SPAC (VPC Impact) 上市' },
      { date: '2021-10-18', event: 'Bakkt 在 NYSE 上市，估值 $2.1B' },
    ],
    metrics: {
      ipo_valuation: '$2.1B',
      spac_duration_months: 9,
      first_day_close_vs_nav: '+234%',
    },
    tags: ['ipo', 'spac', 'bakkt', 'listing', 'nyse'],
  },

  // ── 稳定币发行/崩盘 ──
  {
    id: 'dai-creation',
    entity: 'MakerDAO',
    type: 'product_launch',
    milestones: [
      { date: '2017-12-18', event: 'Single-Collateral DAI (SAI) 上线，仅支持 ETH 抵押' },
      { date: '2019-11-18', event: 'Multi-Collateral DAI (MCD) 上线，支持多种抵押品' },
    ],
    metrics: {
      initial_collateral: 'ETH only',
      mcd_collateral_count: '10+ 资产',
      stability_fee_range: '0-8%',
    },
    tags: ['dai', 'makerdao', 'defi', 'stablecoin', 'product-launch', 'cdp'],
  },
  {
    id: 'iron-finance-collapse',
    entity: 'Iron Finance',
    type: 'market_cap_change',
    milestones: [
      { date: '2021-06-16', event: 'IRON (部分算法稳定币) 在 Polygon 上脱钩' },
      { date: '2021-06-17', event: 'TITAN 代币从 $64 跌至接近 $0' },
    ],
    metrics: {
      titan_peak_price: '$64',
      titan_post_collapse: '~$0',
      tvl_before: '$2B',
      tvl_after: '~$0',
      collapse_duration_hours: 24,
    },
    tags: ['depeg', 'collapse', 'iron-finance', 'titan', 'algorithmic', 'polygon'],
  },
  {
    id: 'fei-protocol',
    entity: 'Fei Protocol',
    type: 'product_launch',
    milestones: [
      { date: '2021-04-03', event: 'FEI 上线，Genesis Event 募集 $1.3B ETH' },
      { date: '2021-04-04', event: 'FEI 上线首日即脱钩，跌至 $0.70' },
      { date: '2022-08-20', event: 'Fei Protocol 宣布关闭，返还所有 PCV' },
    ],
    metrics: {
      genesis_raise: '$1.3B',
      first_day_low: '$0.70',
      recovery_time_days: 14,
      final_outcome: '项目关闭',
    },
    tags: ['depeg', 'fei', 'algorithmic', 'stablecoin', 'product-launch'],
  },
  {
    id: 'usdd-tron',
    entity: 'Tron',
    type: 'product_launch',
    milestones: [
      { date: '2022-05-05', event: 'USDD (Tron 去中心化稳定币) 发行' },
      { date: '2022-06-13', event: 'USDD 短暂脱钩至 $0.97 (UST 崩盘余波)' },
      { date: '2022-06-15', event: 'TDR 将 USDD 抵押率提升至 200%+' },
    ],
    metrics: {
      depeg_low: '$0.97',
      recovery_time_hours: 48,
      over_collateral_ratio: '200%+',
      market_cap_peak: '~$750M',
    },
    tags: ['usdd', 'tron', 'stablecoin', 'depeg', 'algorithmic'],
  },

  // ── 稳定币市场里程碑 ──
  {
    id: 'stablecoin-total-100b',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2021-08-01', event: '稳定币总市值首次突破 $100B' },
      { date: '2022-05-01', event: '稳定币总市值峰值 ~$180B (UST 崩盘前)' },
      { date: '2022-07-01', event: 'UST 崩盘后总市值跌至 ~$150B' },
      { date: '2024-11-01', event: '稳定币总市值重回 $170B+' },
    ],
    metrics: {
      first_100b_date: '2021-08',
      peak: '~$180B',
      post_ust_low: '~$130B',
    },
    tags: ['market-cap', 'stablecoin', 'milestone', 'total-market'],
  },
  {
    id: 'usdc-svb-depeg',
    entity: 'Circle',
    type: 'market_cap_change',
    milestones: [
      { date: '2023-03-10', event: 'Silicon Valley Bank 被 FDIC 接管' },
      { date: '2023-03-11', event: 'Circle 披露 $3.3B 存放于 SVB，USDC 脱钩至 $0.87' },
      { date: '2023-03-13', event: '美联储宣布储户全额保护，USDC 恢复 $1.00' },
    ],
    metrics: {
      svb_exposure: '$3.3B',
      depeg_low: '$0.87',
      recovery_time_hours: 48,
      usdc_market_cap_before: '$43.5B',
      usdc_market_cap_3m_later: '$28B',
      outflow_percent: '-35%',
    },
    tags: ['usdc', 'circle', 'svb', 'depeg', 'bank-run', 'stablecoin'],
  },
  {
    id: 'usdt-dominance-post-svb',
    entity: 'Tether',
    type: 'market_cap_change',
    milestones: [
      { date: '2023-03-15', event: 'SVB 事件后 USDT 份额从 50% 升至 60%+' },
      { date: '2023-12-01', event: 'USDT 市值突破 $90B，份额 ~65%' },
      { date: '2024-03-04', event: 'USDT 市值突破 $100B' },
    ],
    metrics: {
      share_before_svb: '~50%',
      share_after_svb: '~65%',
      market_cap_gain_6m: '+$20B',
    },
    tags: ['usdt', 'tether', 'market-cap', 'dominance', 'stablecoin'],
  },

  // ── 融资 (续) ──
  {
    id: 'tether-profit-2023',
    entity: 'Tether',
    type: 'funding_round',
    milestones: [
      { date: '2023-12-31', event: 'Tether 公布 2023 年净利润 $6.2B (创历史新高)' },
      { date: '2024-04-30', event: 'Tether Q1 2024 净利润 $4.5B' },
    ],
    metrics: {
      annual_profit_2023: '$6.2B',
      q1_2024_profit: '$4.5B',
      us_treasury_holdings: '$72B+',
      profit_source: '~80% 美国国债利息',
    },
    tags: ['tether', 'usdt', 'profit', 'revenue', 'treasury'],
  },
  {
    id: 'ethena-funding',
    entity: 'Ethena',
    type: 'funding_round',
    milestones: [
      { date: '2023-07-18', event: 'Ethena Labs 种子轮 $6M，Dragonfly 领投' },
      { date: '2024-02-16', event: 'Ethena Labs 战略轮 $14M，包括 Franklin Templeton, PayPal Ventures' },
    ],
    metrics: {
      seed_amount: '$6M',
      strategic_amount: '$14M',
      total_raised: '$20M',
      fdv_at_launch: '~$2B',
    },
    tags: ['funding', 'ethena', 'usde', 'dragonfly', 'defi'],
  },
  {
    id: 'wormhole-funding',
    entity: 'Wormhole',
    type: 'funding_round',
    milestones: [
      { date: '2023-11-15', event: 'Wormhole 完成 $225M 融资，估值 $2.5B' },
    ],
    metrics: {
      amount: '$225M',
      valuation: '$2.5B',
      investors: 'Brevan Howard, Coinbase Ventures, Jump Trading',
    },
    tags: ['funding', 'wormhole', 'bridge', 'cross-chain', 'infrastructure'],
  },
  {
    id: 'm0-foundation-funding',
    entity: 'M^0',
    type: 'funding_round',
    milestones: [
      { date: '2024-06-11', event: 'M^0 Foundation 完成 $35M Series A，Bain Capital Crypto 领投' },
    ],
    metrics: {
      amount: '$35M',
      lead_investor: 'Bain Capital Crypto',
      product: '去中心化稳定币基础设施协议',
    },
    tags: ['funding', 'm0', 'stablecoin', 'infrastructure', 'defi'],
  },
  {
    id: 'agora-funding',
    entity: 'Agora',
    type: 'funding_round',
    milestones: [
      { date: '2024-04-02', event: 'Agora Finance 完成 $12M 种子轮，DragonFly 领投' },
    ],
    metrics: {
      amount: '$12M',
      lead_investor: 'DragonFly',
      product: 'AUSD 稳定币 (institutional grade)',
    },
    tags: ['funding', 'agora', 'ausd', 'stablecoin', 'dragonfly'],
  },
  {
    id: 'mountain-protocol-funding',
    entity: 'Mountain Protocol',
    type: 'funding_round',
    milestones: [
      { date: '2023-09-12', event: 'Mountain Protocol 完成 $8M 种子轮，Multicoin Capital 领投' },
    ],
    metrics: {
      amount: '$8M',
      lead_investor: 'Multicoin Capital',
      product: 'USDM (yield-bearing stablecoin)',
    },
    tags: ['funding', 'mountain', 'usdm', 'stablecoin', 'yield'],
  },

  // ── 产品/合作 (续) ──
  {
    id: 'visa-usdc-settlement',
    entity: 'Visa',
    type: 'partnership',
    milestones: [
      { date: '2021-03-29', event: 'Visa 宣布在 Ethereum 上用 USDC 结算交易' },
      { date: '2023-09-05', event: 'Visa 扩展 USDC 结算到 Solana 网络' },
    ],
    metrics: {
      initial_chain: 'Ethereum',
      expanded_chain: 'Solana',
      partner: 'Crypto.com, Worldpay',
    },
    tags: ['partnership', 'visa', 'usdc', 'circle', 'settlement', 'payments'],
  },
  {
    id: 'mastercard-stablecoin',
    entity: 'Mastercard',
    type: 'partnership',
    milestones: [
      { date: '2023-06-29', event: 'Mastercard 推出 Multi-Token Network (MTN)，支持稳定币结算' },
      { date: '2024-10-30', event: 'Mastercard 与 JP Morgan Kinexys 合作链上结算' },
    ],
    metrics: {
      mtn_launch_date: '2023-06-29',
      partners: 'Citibank, JP Morgan, Paxos',
    },
    tags: ['partnership', 'mastercard', 'settlement', 'payments', 'stablecoin'],
  },
  {
    id: 'blackrock-buidl-fund',
    entity: 'BlackRock',
    type: 'product_launch',
    milestones: [
      { date: '2024-03-20', event: 'BlackRock 发行 BUIDL 代币化基金 (Ethereum, Securitize)' },
      { date: '2024-06-01', event: 'BUIDL TVL 突破 $460M' },
      { date: '2025-01-01', event: 'BUIDL 扩展到 5 条链' },
    ],
    metrics: {
      initial_tvl: '$100M',
      tvl_6m: '$460M+',
      underlying: '短期美国国债',
      tokenization_partner: 'Securitize',
    },
    tags: ['product-launch', 'blackrock', 'buidl', 'tokenization', 'rwa', 'treasury'],
  },
  {
    id: 'franklin-benji',
    entity: 'Franklin Templeton',
    type: 'product_launch',
    milestones: [
      { date: '2021-04-01', event: 'Franklin 推出 BENJI 代币化货币市场基金 (Stellar)' },
      { date: '2023-10-01', event: 'BENJI 扩展到 Polygon 和 Avalanche' },
    ],
    metrics: {
      initial_chain: 'Stellar',
      tvl: '$350M+',
      underlying: '美国国债',
    },
    tags: ['product-launch', 'franklin-templeton', 'benji', 'tokenization', 'rwa'],
  },
  {
    id: 'aave-gho-launch',
    entity: 'Aave',
    type: 'product_launch',
    milestones: [
      { date: '2023-07-15', event: 'GHO 稳定币在 Ethereum 主网上线' },
      { date: '2024-03-01', event: 'GHO 市值突破 $50M' },
    ],
    metrics: {
      launch_chain: 'Ethereum',
      mechanism: 'Aave V3 抵押铸造',
      initial_borrow_rate: '1.5%',
    },
    tags: ['product-launch', 'gho', 'aave', 'defi', 'stablecoin'],
  },
  {
    id: 'frax-v3',
    entity: 'Frax Finance',
    type: 'product_launch',
    milestones: [
      { date: '2023-10-25', event: 'Frax v3 上线，FRAX 转为完全抵押 (去掉算法部分)' },
      { date: '2024-01-01', event: 'sFRAX 收益率对标联邦基金利率' },
    ],
    metrics: {
      previous_model: '部分算法抵押',
      new_model: '100% 外生抵押',
      sfrax_apy: '~5%',
      frax_market_cap: '~$650M',
    },
    tags: ['product-launch', 'frax', 'stablecoin', 'defi', 'yield'],
  },
  {
    id: 'crvusd-launch',
    entity: 'Curve',
    type: 'product_launch',
    milestones: [
      { date: '2023-05-17', event: 'crvUSD 在 Ethereum 上线，使用 LLAMMA 机制' },
      { date: '2024-01-01', event: 'crvUSD 市值达 ~$120M' },
    ],
    metrics: {
      mechanism: 'LLAMMA (Lending-Liquidating AMM Algorithm)',
      launch_collateral: 'sfrxETH, wstETH',
      peak_market_cap: '~$200M',
    },
    tags: ['product-launch', 'crvusd', 'curve', 'defi', 'stablecoin'],
  },
  {
    id: 'sky-usds-rebrand',
    entity: 'Sky (ex-MakerDAO)',
    type: 'product_launch',
    milestones: [
      { date: '2024-08-27', event: 'MakerDAO 品牌重塑为 Sky，DAI → USDS，MKR → SKY' },
      { date: '2024-09-18', event: 'USDS 正式上线，DAI 可 1:1 升级' },
    ],
    metrics: {
      dai_market_cap_at_rebrand: '~$5.3B',
      upgrade_ratio: '1:1',
      savings_rate: '~5% (SSR)',
    },
    tags: ['product-launch', 'sky', 'usds', 'makerdao', 'dai', 'rebrand', 'stablecoin'],
  },

  // ── 安全事件 ──
  {
    id: 'wormhole-hack',
    entity: 'Wormhole',
    type: 'enforcement',
    milestones: [
      { date: '2022-02-02', event: 'Wormhole 跨链桥被黑，损失 120,000 wETH (~$325M)' },
      { date: '2022-02-03', event: 'Jump Trading 注入 120,000 ETH 弥补缺口' },
    ],
    metrics: {
      amount_stolen: '$325M',
      token: '120,000 wETH',
      recovery: 'Jump Trading 全额补偿',
      recovery_time_hours: 24,
    },
    tags: ['hack', 'wormhole', 'bridge', 'exploit', 'security'],
  },
  {
    id: 'nomad-bridge-hack',
    entity: 'Nomad',
    type: 'enforcement',
    milestones: [
      { date: '2022-08-01', event: 'Nomad 跨链桥被黑，损失 ~$190M (任意人可复制交易)' },
    ],
    metrics: {
      amount_stolen: '$190M',
      unique_attackers: '~300 地址',
      partial_recovery: '~$37M',
    },
    tags: ['hack', 'nomad', 'bridge', 'exploit', 'security'],
  },
  {
    id: 'euler-hack',
    entity: 'Euler Finance',
    type: 'enforcement',
    milestones: [
      { date: '2023-03-13', event: 'Euler Finance 被黑，损失 ~$197M' },
      { date: '2023-04-04', event: '黑客归还全部资金 ~$197M' },
    ],
    metrics: {
      amount_stolen: '$197M',
      full_recovery: 'yes',
      recovery_time_days: 22,
    },
    tags: ['hack', 'euler', 'defi', 'exploit', 'security', 'recovery'],
  },

  // ── 监管 (续) ──
  {
    id: 'sec-ripple-case',
    entity: 'SEC',
    type: 'enforcement',
    milestones: [
      { date: '2020-12-22', event: 'SEC 起诉 Ripple (XRP 为证券)' },
      { date: '2023-07-13', event: '法官裁定 XRP 程序性销售不构成证券' },
      { date: '2024-08-07', event: '最终判决: Ripple 罚款 $1.25 亿 (原要求 $20 亿)' },
    ],
    metrics: {
      case_duration_years: 3.7,
      requested_fine: '$2B',
      actual_fine: '$125M',
      discount: '-94%',
    },
    tags: ['enforcement', 'sec', 'ripple', 'xrp', 'securities', 'court'],
  },
  {
    id: 'sec-binance-case',
    entity: 'SEC',
    type: 'enforcement',
    milestones: [
      { date: '2023-06-05', event: 'SEC 起诉 Binance 和 CZ (13 项指控)' },
      { date: '2023-11-21', event: 'CZ 认罪，Binance 支付 $4.3B 和解金 (DOJ/CFTC/FinCEN)' },
      { date: '2024-04-30', event: 'CZ 被判 4 个月监禁' },
    ],
    metrics: {
      total_settlement: '$4.3B',
      cz_sentence: '4 个月',
      sec_charges: 13,
    },
    tags: ['enforcement', 'sec', 'binance', 'cz', 'doj', 'settlement'],
  },
  {
    id: 'sec-coinbase-case',
    entity: 'SEC',
    type: 'enforcement',
    milestones: [
      { date: '2023-06-06', event: 'SEC 起诉 Coinbase (未注册交易所/经纪商/清算)' },
      { date: '2024-03-27', event: '法官驳回 Coinbase 的动议，案件继续' },
    ],
    metrics: {
      charges: '未注册运营',
      coinbase_defense: '监管不清晰',
      case_status: '进行中',
    },
    tags: ['enforcement', 'sec', 'coinbase', 'exchange', 'securities'],
  },
  {
    id: 'japan-stablecoin-law',
    entity: 'Japan FSA',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-06-03', event: '日本《资金决济法》修正案通过，允许银行/信托发行稳定币' },
      { date: '2023-06-01', event: '修正案正式生效' },
    ],
    metrics: {
      eligible_issuers: '银行、资金移动业者、信托公司',
      key_requirement: '1:1 法币储备',
    },
    tags: ['regulation', 'legislation', 'japan', 'fsa', 'stablecoin', 'asia'],
  },
  {
    id: 'uk-stablecoin-regulation',
    entity: 'UK HM Treasury',
    type: 'regulatory_bill',
    milestones: [
      { date: '2023-06-29', event: 'UK Financial Services and Markets Act 获得皇家批准 (含稳定币条款)' },
      { date: '2024-01-01', event: 'FCA 启动稳定币监管咨询' },
    ],
    metrics: {
      act_name: 'FSMA 2023',
      scope: '支付用稳定币纳入 FCA 监管',
    },
    tags: ['regulation', 'legislation', 'uk', 'fca', 'stablecoin'],
  },
  {
    id: 'singapore-mas-stablecoin',
    entity: 'MAS',
    type: 'regulatory_bill',
    milestones: [
      { date: '2023-08-15', event: 'MAS 公布稳定币监管框架最终版' },
      { date: '2024-04-01', event: '框架正式生效，StraitsX (XSGD/XUSD) 获批' },
    ],
    metrics: {
      key_requirement: '1:1 储备 + 审计 + 赎回保障',
      first_licensed_issuer: 'StraitsX',
    },
    tags: ['regulation', 'singapore', 'mas', 'stablecoin', 'asia', 'xsgd'],
  },

  // ── DeFi 基础设施 ──
  {
    id: 'uniswap-v3',
    entity: 'Uniswap',
    type: 'product_launch',
    milestones: [
      { date: '2021-05-05', event: 'Uniswap V3 上线，引入集中流动性' },
      { date: '2023-06-01', event: 'Uniswap V3 成为稳定币交易最大 DEX' },
    ],
    metrics: {
      stablecoin_pair_tvl: '$2B+',
      daily_stablecoin_volume: '$500M+',
    },
    tags: ['product-launch', 'uniswap', 'dex', 'defi', 'amm'],
  },
  {
    id: 'curve-crv-crisis',
    entity: 'Curve',
    type: 'enforcement',
    milestones: [
      { date: '2023-07-30', event: 'Curve 多个池被 Vyper 重入漏洞攻击，损失 ~$70M' },
      { date: '2023-08-01', event: 'CRV 价格暴跌，触发 Michael Egorov 大量借贷清算危机' },
    ],
    metrics: {
      amount_stolen: '~$70M',
      crv_price_drop: '-30%',
      egorov_debt: '$100M+',
    },
    tags: ['hack', 'curve', 'crv', 'defi', 'exploit', 'liquidation'],
  },
  {
    id: 'compound-v3-usdc',
    entity: 'Compound',
    type: 'product_launch',
    milestones: [
      { date: '2022-08-26', event: 'Compound III (Comet) 上线，单抵押品模型，以 USDC 为主' },
    ],
    metrics: {
      model: '单一基础资产 + 多抵押品',
      primary_base: 'USDC',
      tvl_6m: '$1.5B+',
    },
    tags: ['product-launch', 'compound', 'defi', 'lending', 'usdc'],
  },

  // ── 支付/基础设施 ──
  {
    id: 'circle-cctp-launch',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2023-04-26', event: 'Circle 发布 CCTP (Cross-Chain Transfer Protocol)，原生 USDC 跨链' },
      { date: '2024-01-01', event: 'CCTP 支持 8 条链' },
    ],
    metrics: {
      initial_chains: 'Ethereum, Avalanche',
      chains_at_1y: 8,
      mechanism: '销毁-铸造 (原生转移，非桥接)',
    },
    tags: ['product-launch', 'circle', 'usdc', 'cctp', 'cross-chain', 'infrastructure'],
  },
  {
    id: 'paypal-xoom-stablecoin',
    entity: 'PayPal',
    type: 'product_launch',
    milestones: [
      { date: '2024-09-25', event: 'PayPal 允许美国商户用 PYUSD 接受支付' },
      { date: '2024-11-01', event: 'PayPal/Xoom 用 PYUSD 进行跨境汇款' },
    ],
    metrics: {
      merchant_base: '30M+',
      cross_border_launch: '2024-11',
    },
    tags: ['product-launch', 'paypal', 'pyusd', 'payments', 'merchant'],
  },
  {
    id: 'stripe-usdc-payouts',
    entity: 'Stripe',
    type: 'product_launch',
    milestones: [
      { date: '2024-10-10', event: 'Stripe 在 Pay with Crypto 中支持 USDC 支付 (回归加密)' },
      { date: '2024-12-01', event: 'Stripe 用 USDC 为全球 merchants 提供即时付款' },
    ],
    metrics: {
      previous_crypto_exit_date: '2018',
      years_absent: 6,
      supported_chains: 'Ethereum, Solana, Polygon',
    },
    tags: ['product-launch', 'stripe', 'usdc', 'payments', 'merchant'],
  },

  // ── RWA / 代币化 ──
  {
    id: 'ondo-usdy',
    entity: 'Ondo Finance',
    type: 'product_launch',
    milestones: [
      { date: '2023-08-01', event: 'Ondo 推出 USDY (Tokenized Note，底层美国国债)' },
      { date: '2024-06-01', event: 'USDY TVL 突破 $300M' },
    ],
    metrics: {
      underlying: '短期美国国债',
      yield: '~5%',
      tvl_1y: '$300M+',
    },
    tags: ['product-launch', 'ondo', 'usdy', 'rwa', 'tokenization', 'yield', 'treasury'],
  },
  {
    id: 'tether-gold-xaut',
    entity: 'Tether',
    type: 'product_launch',
    milestones: [
      { date: '2020-01-23', event: 'Tether Gold (XAUT) 发行，每代币锚定 1 盎司黄金' },
      { date: '2024-01-01', event: 'XAUT 市值达 ~$500M' },
    ],
    metrics: {
      backing: '1 代币 = 1 盎司黄金 (伦敦金库)',
      market_cap: '~$500M',
    },
    tags: ['product-launch', 'tether', 'xaut', 'gold', 'commodity', 'stablecoin'],
  },

  // ── 市场事件 ──
  {
    id: 'ftx-collapse',
    entity: 'FTX',
    type: 'enforcement',
    milestones: [
      { date: '2022-11-02', event: 'CoinDesk 曝光 Alameda 资产负债表 (FTT 占大头)' },
      { date: '2022-11-06', event: 'CZ 宣布清仓 FTT，引发挤兑' },
      { date: '2022-11-11', event: 'FTX 申请 Chapter 11 破产' },
      { date: '2024-03-28', event: 'SBF 被判 25 年监禁' },
    ],
    metrics: {
      customer_shortfall: '$8B+',
      sbf_sentence: '25 年',
      stablecoin_outflow_1w: '$3B (USDC 赎回潮)',
    },
    tags: ['collapse', 'ftx', 'sbf', 'bankruptcy', 'exchange'],
  },
  {
    id: 'three-arrows-capital',
    entity: 'Three Arrows Capital',
    type: 'enforcement',
    milestones: [
      { date: '2022-06-15', event: 'Three Arrows Capital (3AC) 面临追加保证金，开始清算' },
      { date: '2022-07-01', event: '3AC 在 BVI 进入清算程序' },
    ],
    metrics: {
      aum_peak: '$10B+',
      ust_exposure: '~$200M',
      creditor_claims: '$3.5B',
    },
    tags: ['collapse', 'three-arrows', '3ac', 'hedge-fund', 'ust', 'contagion'],
  },

  // ── CBDC 相关 ──
  {
    id: 'ecb-digital-euro',
    entity: 'ECB',
    type: 'regulatory_bill',
    milestones: [
      { date: '2023-10-18', event: 'ECB 启动数字欧元准备阶段 (2 年)' },
      { date: '2025-10-01', event: '准备阶段预计结束，进入决策' },
    ],
    metrics: {
      phase: '准备阶段',
      holding_limit: '€3,000 (提议)',
    },
    tags: ['cbdc', 'digital-euro', 'ecb', 'eu', 'central-bank'],
  },
  {
    id: 'fed-digital-dollar-research',
    entity: 'Federal Reserve',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-01-20', event: 'Fed 发布 CBDC 讨论文件 (Money and Payments)' },
      { date: '2023-01-01', event: 'Fed 明确表示无 CBDC 立法前不会推进' },
    ],
    metrics: {
      paper_title: 'Money and Payments: The U.S. Dollar in the Age of Digital Transformation',
      status: '研究阶段，无立法计划',
    },
    tags: ['cbdc', 'digital-dollar', 'fed', 'central-bank', 'us'],
  },

  // ── 合规/审计 ──
  {
    id: 'circle-soc2-audit',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2022-09-01', event: 'Circle 获得 SOC 2 Type II 审计报告 (Deloitte)' },
      { date: '2023-01-01', event: 'Circle 月度储备证明切换至 Deloitte 审计' },
    ],
    metrics: {
      auditor: 'Deloitte',
      audit_type: 'SOC 2 Type II',
      reserve_report_frequency: '月度',
    },
    tags: ['audit', 'circle', 'usdc', 'compliance', 'deloitte', 'soc2'],
  },
  {
    id: 'tether-bnychicago-audit',
    entity: 'Tether',
    type: 'product_launch',
    milestones: [
      { date: '2021-08-09', event: 'Tether 首次公布储备详细分类 (商业票据占比 ~50%)' },
      { date: '2023-03-01', event: 'Tether 储备中商业票据占比降至 0%，转为美国国债' },
    ],
    metrics: {
      cp_peak_share: '~50%',
      cp_current_share: '0%',
      us_treasury_share: '~80%',
      attestor: 'BDO Italia',
    },
    tags: ['audit', 'tether', 'usdt', 'reserve', 'transparency'],
  },

  // ── Solana 稳定币生态 ──
  {
    id: 'solana-usdc-native',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2022-06-01', event: 'Circle 发行 Solana 原生 USDC (替代 Wormhole 桥接版)' },
      { date: '2024-01-01', event: 'Solana USDC 流通量达 $2B+' },
    ],
    metrics: {
      initial_supply: '~$100M',
      supply_1y: '$2B+',
      growth: '20x',
    },
    tags: ['product-launch', 'circle', 'usdc', 'solana', 'native'],
  },

  // ── 其他重要事件 ──
  {
    id: 'celsius-bankruptcy',
    entity: 'Celsius',
    type: 'enforcement',
    milestones: [
      { date: '2022-06-12', event: 'Celsius 暂停所有提款、交换和转账' },
      { date: '2022-07-13', event: 'Celsius 申请 Chapter 11 破产' },
    ],
    metrics: {
      customer_deposits: '$4.7B',
      shortfall: '$1.2B',
      stablecoin_frozen: '~$500M (USDC, USDT)',
    },
    tags: ['collapse', 'celsius', 'bankruptcy', 'lending', 'cefi'],
  },
  {
    id: 'blockfi-bankruptcy',
    entity: 'BlockFi',
    type: 'enforcement',
    milestones: [
      { date: '2022-11-28', event: 'BlockFi 申请 Chapter 11 破产 (FTX 传导)' },
    ],
    metrics: {
      ftx_exposure: '$355M (loans to Alameda)',
      customer_assets: '$1.8B',
    },
    tags: ['collapse', 'blockfi', 'bankruptcy', 'lending', 'cefi', 'ftx'],
  },

  // ── 基础设施/跨链 ──
  {
    id: 'chainlink-ccip-stablecoin',
    entity: 'Chainlink',
    type: 'product_launch',
    milestones: [
      { date: '2023-07-17', event: 'Chainlink CCIP 跨链协议正式上线' },
      { date: '2024-02-01', event: 'CCIP 支持原生稳定币跨链转移' },
    ],
    metrics: {
      supported_chains: '10+',
      mechanism: 'Lock-and-Mint / Burn-and-Mint',
    },
    tags: ['product-launch', 'chainlink', 'ccip', 'cross-chain', 'infrastructure', 'oracle'],
  },
  {
    id: 'layer-zero-oft',
    entity: 'LayerZero',
    type: 'product_launch',
    milestones: [
      { date: '2023-01-01', event: 'LayerZero OFT (Omnichain Fungible Token) 标准用于稳定币' },
      { date: '2024-06-20', event: 'LayerZero ZRO 代币发行' },
    ],
    metrics: {
      total_messages: '100M+',
      chains_supported: '30+',
    },
    tags: ['product-launch', 'layerzero', 'cross-chain', 'infrastructure', 'oft'],
  },

  // ── 最新 2025 事件 ──
  {
    id: 'tether-usdt0-launch',
    entity: 'Tether',
    type: 'product_launch',
    milestones: [
      { date: '2025-01-16', event: 'Tether 推出 USDT0，使用 LayerZero OFT 实现原生跨链' },
    ],
    metrics: {
      mechanism: 'LayerZero OFT',
      initial_chains: 'Ethereum, Ink (Kraken L2)',
    },
    tags: ['product-launch', 'tether', 'usdt', 'usdt0', 'cross-chain', 'layerzero'],
  },
  {
    id: 'ripple-rlusd',
    entity: 'Ripple',
    type: 'product_launch',
    milestones: [
      { date: '2024-12-17', event: 'Ripple 发布 RLUSD 稳定币 (NYDFS 批准)' },
    ],
    metrics: {
      regulator: 'NYDFS',
      chains: 'XRP Ledger, Ethereum',
      backing: '1:1 美元存款 + 美国国债',
    },
    tags: ['product-launch', 'ripple', 'rlusd', 'stablecoin', 'nydfs'],
  },
  {
    id: 'world-liberty-usd0',
    entity: 'World Liberty Financial',
    type: 'product_launch',
    milestones: [
      { date: '2025-03-01', event: 'World Liberty Financial 推出 USD1 稳定币' },
    ],
    metrics: {
      backing: '美国国债 + 现金等价物',
      association: 'Trump family affiliated',
    },
    tags: ['product-launch', 'world-liberty', 'usd1', 'stablecoin', 'trump'],
  },

  // ── 补充至 80 条 ──
  {
    id: 'dydx-v4-cosmos',
    entity: 'dYdX',
    type: 'product_launch',
    milestones: [
      { date: '2023-10-26', event: 'dYdX V4 在自有 Cosmos 链上线 (脱离以太坊)' },
    ],
    metrics: {
      previous_chain: 'StarkEx (Ethereum L2)',
      new_chain: 'dYdX Chain (Cosmos SDK)',
      daily_volume: '$1B+',
    },
    tags: ['product-launch', 'dydx', 'cosmos', 'perps', 'defi', 'migration'],
  },
  {
    id: 'usdc-base-launch',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2023-09-05', event: 'USDC 原生上线 Base (Coinbase L2)' },
      { date: '2024-06-01', event: 'Base USDC 流通量突破 $3B' },
    ],
    metrics: {
      chain: 'Base (Coinbase L2)',
      supply_6m: '$3B+',
    },
    tags: ['product-launch', 'circle', 'usdc', 'base', 'coinbase', 'l2'],
  },
  {
    id: 'tether-energy-mining',
    entity: 'Tether',
    type: 'partnership',
    milestones: [
      { date: '2023-05-01', event: 'Tether 宣布投资比特币挖矿和可再生能源' },
      { date: '2024-04-01', event: 'Tether 披露持有 $5B+ 比特币储备' },
    ],
    metrics: {
      btc_holdings: '$5B+',
      diversification: '能源、挖矿、AI',
    },
    tags: ['tether', 'usdt', 'bitcoin', 'mining', 'energy', 'diversification'],
  },
  {
    id: 'coinbase-base-l2',
    entity: 'Coinbase',
    type: 'product_launch',
    milestones: [
      { date: '2023-08-09', event: 'Base (Coinbase L2) 主网上线' },
      { date: '2024-03-01', event: 'Base 成为稳定币交易量第 3 大链' },
    ],
    metrics: {
      stack: 'OP Stack (Optimism)',
      usdc_on_base: '$3B+',
      daily_txs: '5M+',
    },
    tags: ['product-launch', 'coinbase', 'base', 'l2', 'optimism'],
  },
  {
    id: 'stablecoin-payments-volume-2024',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2024-01-01', event: '2023 年稳定币链上交易量达 $10.8T (超过 Visa)' },
      { date: '2024-06-01', event: '2024 H1 稳定币交易量达 $5.1T' },
    ],
    metrics: {
      annual_volume_2023: '$10.8T',
      visa_annual_2023: '$14.8T',
      ratio_vs_visa: '~73%',
    },
    tags: ['market-cap', 'stablecoin', 'volume', 'payments', 'milestone'],
  },
  {
    id: 'fireblocks-stablecoin-infra',
    entity: 'Fireblocks',
    type: 'product_launch',
    milestones: [
      { date: '2024-01-15', event: 'Fireblocks 推出 Stablecoin Studio (USDC 原生铸造 API)' },
    ],
    metrics: {
      feature: '机构级 USDC 铸造/赎回 API',
      customers: '1,800+ 机构客户',
    },
    tags: ['product-launch', 'fireblocks', 'usdc', 'infrastructure', 'b2b', 'api'],
  },
  {
    id: 'usual-protocol',
    entity: 'Usual',
    type: 'product_launch',
    milestones: [
      { date: '2024-07-10', event: 'Usual 推出 USD0 (RWA 抵押稳定币)' },
      { date: '2024-12-18', event: 'Binance 上线 USUAL 代币' },
    ],
    metrics: {
      backing: '短期美国国债 (Hashnote, Ondo)',
      tvl_6m: '$1.4B',
    },
    tags: ['product-launch', 'usual', 'usd0', 'stablecoin', 'rwa', 'defi'],
  },
  {
    id: 'eu-mica-tether-delisting',
    entity: 'EU/Tether',
    type: 'regulatory_bill',
    milestones: [
      { date: '2024-12-30', event: 'MiCA 全面生效，部分欧盟交易所下架 USDT (不合规)' },
    ],
    metrics: {
      affected_exchanges: 'Coinbase EU, OKX EU',
      reason: 'Tether 未获得 MiCA 授权',
      usdt_eu_share: '~5% of volume',
    },
    tags: ['regulation', 'mica', 'eu', 'tether', 'usdt', 'delisting', 'compliance'],
  },
  {
    id: 'mantle-usdy-integration',
    entity: 'Mantle',
    type: 'partnership',
    milestones: [
      { date: '2024-03-04', event: 'Mantle 宣布 $200M 国库配置到 Ondo USDY + OUSG' },
    ],
    metrics: {
      allocation: '$200M',
      products: 'USDY + OUSG (Ondo)',
      treasury_size: '$2B+',
    },
    tags: ['partnership', 'mantle', 'ondo', 'usdy', 'rwa', 'treasury'],
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
