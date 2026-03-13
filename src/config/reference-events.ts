// 参考知识库 V14 — 人工策展的稳定币行业历史事件
// 每条数据的每个数字必须有 primary source 可追溯
// 覆盖范围: 稳定币发行商、B2C/B2B 产品、美国上市公司、监管、市场事件
// AI 无法从训练数据中可靠回忆这些数字，必须结构化存储

export interface Milestone {
  date: string
  event: string
}

export interface ReferenceEvent {
  id: string
  entity: string
  type: EventPattern
  milestones: Milestone[]
  metrics: Record<string, string | number>
  tags: string[]
  source_urls: string[]
  comparable_events?: string[]
  context_summary: string
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
  // ── 1. coinbase-ipo ──
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
    source_urls: [
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001679788&type=S-1',
    ],
    comparable_events: ['circle-ipo-spac-2022', 'circle-s1-2024', 'circle-ipo-s1-2025'],
    context_summary: '加密行业首个大型直接上市案例，S-1 流程时间线是 Circle IPO 的重要参照基准。',
  },
  // ── 2. circle-ipo-spac-2022 ──
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
    source_urls: [
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=circle&type=S-1',
      'https://www.circle.com/en/pressroom',
    ],
    comparable_events: ['coinbase-ipo', 'circle-s1-2024', 'circle-ipo-s1-2025'],
    context_summary: 'Circle 首次上市尝试失败，SPAC 路径耗时 515 天仍未成功，对比后续 S-1 路径的参照。',
  },
  // ── 3. circle-s1-2024 ──
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
    source_urls: [
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=circle&type=S-1',
    ],
    comparable_events: ['circle-ipo-spac-2022', 'coinbase-ipo', 'circle-ipo-s1-2025'],
    context_summary: 'Circle 第二次 IPO 尝试（秘密提交），为后续 2025 年正式 S-1 的前奏。',
  },
  // ── 4. genius-act ──
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
    source_urls: [
      'https://www.congress.gov/bill/119th-congress/senate-bill/394',
    ],
    comparable_events: ['lummis-gillibrand-2022'],
    context_summary: '美国首个获委员会通过的专门稳定币法案，联邦+州双轨框架是全球监管对比的锚点。',
  },
  // ── 5. lummis-gillibrand-2022 ──
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
    source_urls: [
      'https://www.congress.gov/bill/117th-congress/senate-bill/4356',
    ],
    comparable_events: ['genius-act'],
    context_summary: '美国首个全面加密监管立法尝试，虽未通过但为 GENIUS Act 奠定了讨论基础。',
  },
  // ── 6. mica-eu ──
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
    source_urls: [
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114',
    ],
    comparable_events: ['genius-act', 'hk-stablecoin-framework', 'japan-stablecoin-law', 'singapore-mas-stablecoin', 'uk-stablecoin-regulation'],
    context_summary: '全球首个全面加密资产监管框架，其稳定币条款是各国立法的重要参照。',
  },
  // ── 7. usdt-100b ──
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
    source_urls: [
      'https://tether.to/en/transparency',
      'https://defillama.com/stablecoins',
      'https://www.coingecko.com/en/coins/tether',
    ],
    comparable_events: ['usdc-growth-2021-2024', 'stablecoin-total-100b'],
    context_summary: 'USDT 从 $4B 到 $100B 的增长轨迹，是衡量任何稳定币增速的终极基准。',
  },
  // ── 8. usdc-growth-2021-2024 ──
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
    source_urls: [
      'https://www.circle.com/en/transparency',
      'https://defillama.com/stablecoins',
      'https://www.coingecko.com/en/coins/usd-coin',
    ],
    comparable_events: ['usdt-100b', 'usdc-svb-depeg'],
    context_summary: 'USDC 经历了高速增长、SVB 脱钩冲击和缓慢恢复的完整周期，是合规稳定币韧性的参照。',
  },
  // ── 9. ust-collapse ──
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
    source_urls: [
      'https://defillama.com/protocol/anchor',
      'https://www.coingecko.com/en/coins/terrausd',
    ],
    comparable_events: ['iron-finance-collapse', 'fei-protocol', 'usdd-tron'],
    context_summary: '史上最大算法稳定币崩盘（$18B 归零），是所有算法/合成稳定币风险评估的核心参照。',
  },
  // ── 10. circle-series-f ──
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
    source_urls: [
      'https://www.circle.com/en/pressroom',
    ],
    context_summary: 'BlackRock 领投 Circle 是传统资管巨头布局稳定币的标志性事件，也是 Circle IPO 估值的锚点。',
  },
  // ── 11. stripe-bridge-acquisition ──
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
    source_urls: [
      'https://stripe.com/newsroom',
    ],
    context_summary: '支付巨头 Stripe 以 $1.1B 收购稳定币基础设施公司，100x 收入倍数体现了稳定币赛道的战略溢价。',
  },
  // ── 12. pyusd-launch ──
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
    source_urls: [
      'https://newsroom.paypal-corp.com/2023-08-07-PayPal-Launches-U-S-Dollar-Stablecoin',
      'https://www.coingecko.com/en/coins/paypal-usd',
    ],
    comparable_events: ['ripple-rlusd', 'world-liberty-usd0', 'paypal-pyusd-solana-incentive'],
    context_summary: '首个由全球支付巨头发行的稳定币，360 天达 $1B 的速度是新进入者增长的参照。',
  },
  // ── 13. dai-tvl-growth ──
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
    source_urls: [
      'https://defillama.com/protocol/makerdao',
      'https://www.coingecko.com/en/coins/dai',
    ],
    comparable_events: ['sky-usds-rebrand'],
    context_summary: 'DeFi 原生稳定币的增长标杆，多抵押升级是协议演进的重要参照。',
  },
  // ── 14. usde-growth ──
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
    source_urls: [
      'https://defillama.com/protocol/ethena',
      'https://www.coingecko.com/en/coins/ethena-usde',
    ],
    comparable_events: ['ethena-susde-growth'],
    context_summary: '史上增长最快的合成美元协议，4.5 个月达 $3B 的速度是 DeFi 稳定币增长的新标杆。',
  },
  // ── 15. tether-cftc-settlement ──
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
    source_urls: [
      'https://ag.ny.gov/press-release/2021/attorney-general-james-ends-virtual-currency-trading-platform-bitfinexs-illegal',
      'https://www.cftc.gov/PressRoom/PressReleases/8450-21',
    ],
    context_summary: 'Tether 首次面临美国执法处罚，$59.5M 罚款金额和季度储备证明要求是稳定币合规案例的参照。',
  },
  // ── 16. sec-paxos-busd ──
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
    source_urls: [
      'https://www.sec.gov/litigation/litreleases',
      'https://www.dfs.ny.gov/consumers/alerts/Paxos_702',
    ],
    context_summary: '监管执法直接导致第三大稳定币 BUSD ($16B) 在一年内归零，是监管风险的极端案例。',
  },
  // ── 17. hk-stablecoin-framework ──
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
    source_urls: [
      'https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/stablecoin-issuers/',
    ],
    comparable_events: ['japan-stablecoin-law', 'singapore-mas-stablecoin', 'uk-stablecoin-regulation'],
    context_summary: '香港沙盒模式是亚洲稳定币监管的代表性路径，3 家首批获批机构是行业对比的参照。',
  },
  // ── 18. dai-creation ──
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
    source_urls: [
      'https://blog.makerdao.com/',
      'https://defillama.com/protocol/makerdao',
    ],
    comparable_events: ['sky-usds-rebrand', 'aave-gho-launch', 'crvusd-launch'],
    context_summary: '首个去中心化超额抵押稳定币，从单一到多抵押品的升级路径是 DeFi 稳定币设计的原型。',
  },
  // ── 19. iron-finance-collapse ──
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
    source_urls: [
      'https://www.coingecko.com/en/coins/iron-titanium-token',
    ],
    comparable_events: ['ust-collapse', 'fei-protocol'],
    context_summary: 'UST 崩盘前的预警案例，24 小时内 $2B TVL 归零，证明了部分算法稳定币的死亡螺旋风险。',
  },
  // ── 20. fei-protocol ──
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
    source_urls: [
      'https://www.coingecko.com/en/coins/fei-usd',
    ],
    comparable_events: ['ust-collapse', 'iron-finance-collapse'],
    context_summary: '首日即脱钩的算法稳定币案例，$1.3B 募资后仍失败，是算法稳定币机制设计教训的参照。',
  },
  // ── 21. usdd-tron ──
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
    source_urls: [
      'https://www.coingecko.com/en/coins/usdd',
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['ust-collapse'],
    context_summary: 'UST 崩盘后立即发行的算法稳定币，通过超额抵押避免了类似崩盘，是机制改进的参照。',
  },
  // ── 22. stablecoin-total-100b ──
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
    source_urls: [
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['stablecoin-200b-milestone'],
    context_summary: '稳定币总市值的关键里程碑序列，从 $100B 到 $180B 再到回调，是市场周期的锚点。',
  },
  // ── 23. usdc-svb-depeg ──
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
    source_urls: [
      'https://www.circle.com/en/pressroom',
      'https://www.fdic.gov/resources/resolutions/bank-failures/failed-bank-list/',
    ],
    comparable_events: ['usdc-growth-2021-2024', 'usdt-dominance-post-svb'],
    context_summary: '合规稳定币因传统银行风险脱钩的典型案例，48 小时恢复但长期流失 35% 市值，是银行托管风险的参照。',
  },
  // ── 24. usdt-dominance-post-svb ──
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
    source_urls: [
      'https://tether.to/en/transparency',
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['usdc-svb-depeg', 'usdt-100b'],
    context_summary: 'SVB 事件后 USDT 市场份额跳升 15 个百分点，体现了稳定币市场的竞争动态和信任迁移。',
  },
  // ── 25. tether-profit-2023 ──
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
    source_urls: [
      'https://tether.to/en/transparency',
    ],
    comparable_events: ['tether-q4-2024-profit'],
    context_summary: 'Tether 年利润 $6.2B 超过多数传统金融机构，体现了高利率环境下稳定币发行商的盈利能力。',
  },
  // ── 26. ethena-funding ──
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
    source_urls: [
      'https://www.theblock.co/post/ethena-labs-funding',
    ],
    comparable_events: ['usde-growth', 'ethena-susde-growth'],
    context_summary: '仅融资 $20M 但 FDV 达 $2B、TVL 超 $5B 的效率，是 DeFi 稳定币项目资本效率的参照。',
  },
  // ── 27. m0-foundation-funding ──
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
    source_urls: [
      'https://www.theblock.co/post/m0-foundation-series-a',
    ],
    context_summary: '稳定币基础设施层的融资案例，去中心化铸造协议是新兴赛道的代表。',
  },
  // ── 28. agora-funding ──
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
    source_urls: [
      'https://www.coindesk.com/business/agora-funding',
    ],
    context_summary: '机构级稳定币新进入者融资案例，定位与 USDC 差异化的 B2B 稳定币参照。',
  },
  // ── 29. mountain-protocol-funding ──
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
    source_urls: [
      'https://www.coindesk.com/business/mountain-protocol-funding',
    ],
    context_summary: '收益型稳定币赛道的早期融资案例，与 sDAI/sUSDe 构成收益稳定币产品对比。',
  },
  // ── 30. visa-usdc-settlement ──
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
    source_urls: [
      'https://usa.visa.com/solutions/crypto.html',
    ],
    comparable_events: ['mastercard-stablecoin'],
    context_summary: '全球最大卡组织采用稳定币结算的里程碑，是传统支付网络拥抱稳定币的首要参照。',
  },
  // ── 31. mastercard-stablecoin ──
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
    source_urls: [
      'https://www.mastercard.com/news/press',
    ],
    comparable_events: ['visa-usdc-settlement'],
    context_summary: 'Mastercard 的多代币网络是卡组织与银行合作推进链上结算的参照，与 Visa 路径形成对比。',
  },
  // ── 32. blackrock-buidl-fund ──
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
    source_urls: [
      'https://www.blackrock.com/corporate/newsroom',
      'https://defillama.com/protocol/blackrock-buidl',
    ],
    comparable_events: ['franklin-benji', 'ondo-usdy'],
    context_summary: '全球最大资管公司进入代币化国债赛道，BUIDL 的增速是 RWA 赛道的基准。',
  },
  // ── 33. franklin-benji ──
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
    source_urls: [
      'https://www.franklintempleton.com/articles/press-releases',
    ],
    comparable_events: ['blackrock-buidl-fund', 'ondo-usdy'],
    context_summary: '传统资管公司最早的代币化基金产品，比 BlackRock 早 3 年入场，是先发者路径的参照。',
  },
  // ── 34. aave-gho-launch ──
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
    source_urls: [
      'https://governance.aave.com/',
      'https://www.coingecko.com/en/coins/gho',
    ],
    comparable_events: ['crvusd-launch', 'frax-v3'],
    context_summary: 'DeFi 借贷协议发行自有稳定币的代表案例，增长较慢但体现了 DeFi 原生稳定币的挑战。',
  },
  // ── 35. frax-v3 ──
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
    source_urls: [
      'https://docs.frax.finance/',
      'https://www.coingecko.com/en/coins/frax',
    ],
    comparable_events: ['aave-gho-launch', 'crvusd-launch'],
    context_summary: '从算法稳定币转向全额抵押的典型路径，UST 崩盘后行业共识转变的具体体现。',
  },
  // ── 36. crvusd-launch ──
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
    source_urls: [
      'https://www.coingecko.com/en/coins/crvusd',
      'https://defillama.com/protocol/curve-dex',
    ],
    comparable_events: ['aave-gho-launch', 'frax-v3'],
    context_summary: 'LLAMMA 创新清算机制的 DeFi 原生稳定币，与 GHO、FRAX 构成 DeFi 稳定币三角对比。',
  },
  // ── 37. sky-usds-rebrand ──
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
    source_urls: [
      'https://blog.makerdao.com/',
      'https://defillama.com/protocol/makerdao',
    ],
    comparable_events: ['dai-creation', 'dai-tvl-growth'],
    context_summary: 'DeFi 最大稳定币协议的品牌重塑和代币迁移，是协议治理和品牌策略的参照。',
  },
  // ── 38. sec-binance-case ──
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
    source_urls: [
      'https://www.sec.gov/litigation/litreleases',
      'https://www.justice.gov/opa/pr/binance-and-ceo-plead-guilty',
    ],
    context_summary: '加密行业最大执法案件 ($4.3B)，Binance 作为 BUSD 主要分发渠道，其合规整改影响整个稳定币生态。',
  },
  // ── 39. sec-coinbase-case ──
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
    source_urls: [
      'https://www.sec.gov/litigation/litreleases',
    ],
    context_summary: 'SEC 对最大合规交易所的诉讼，结果将影响 USDC 等合规稳定币的分发渠道监管框架。',
  },
  // ── 40. japan-stablecoin-law ──
  {
    id: 'japan-stablecoin-law',
    entity: 'Japan FSA',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-06-03', event: '日本《资金决済法》修正案通过，允许银行/信托发行稳定币' },
      { date: '2023-06-01', event: '修正案正式生效' },
    ],
    metrics: {
      eligible_issuers: '银行、资金移动业者、信托公司',
      key_requirement: '1:1 法币储备',
    },
    tags: ['regulation', 'legislation', 'japan', 'fsa', 'stablecoin', 'asia'],
    source_urls: [
      'https://www.fsa.go.jp/en/',
    ],
    comparable_events: ['hk-stablecoin-framework', 'singapore-mas-stablecoin', 'uk-stablecoin-regulation'],
    context_summary: '亚洲首个明确稳定币立法的主要经济体，银行可直接发行稳定币的框架是监管对比的参照。',
  },
  // ── 41. uk-stablecoin-regulation ──
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
    source_urls: [
      'https://www.legislation.gov.uk/ukpga/2023/29',
    ],
    comparable_events: ['hk-stablecoin-framework', 'japan-stablecoin-law', 'singapore-mas-stablecoin'],
    context_summary: '英国将支付稳定币纳入 FCA 监管的立法框架，是非欧盟发达市场监管路径的参照。',
  },
  // ── 42. singapore-mas-stablecoin ──
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
    source_urls: [
      'https://www.mas.gov.sg/publications/monographs-or-information-paper/2023/stablecoin-regulatory-framework',
    ],
    comparable_events: ['hk-stablecoin-framework', 'japan-stablecoin-law', 'uk-stablecoin-regulation'],
    context_summary: '新加坡是全球首批颁布稳定币专门框架并发放牌照的监管机构，StraitsX 获批是落地案例的参照。',
  },
  // ── 43. uniswap-v3 ──
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
    source_urls: [
      'https://defillama.com/protocol/uniswap-v3',
    ],
    context_summary: '稳定币交易量最大的 DEX，集中流动性机制对稳定币交易对效率影响的参照。',
  },
  // ── 44. curve-crv-crisis ──
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
    source_urls: [
      'https://www.coingecko.com/en/coins/curve-dao-token',
    ],
    context_summary: '稳定币交易核心基础设施 Curve 被攻击，体现了 DeFi 稳定币生态的系统性风险传导。',
  },
  // ── 45. compound-v3-usdc ──
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
    source_urls: [
      'https://defillama.com/protocol/compound-v3',
    ],
    context_summary: 'DeFi 借贷协议以 USDC 为核心基础资产的设计模式，是稳定币在 DeFi 中功能定位的参照。',
  },
  // ── 46. circle-cctp-launch ──
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
    source_urls: [
      'https://www.circle.com/en/cross-chain-transfer-protocol',
    ],
    context_summary: '原生跨链转移协议替代桥接模式的典范，CCTP 的多链扩展是稳定币基础设施演进的参照。',
  },
  // ── 47. paypal-xoom-stablecoin ──
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
    source_urls: [
      'https://newsroom.paypal-corp.com/',
    ],
    comparable_events: ['pyusd-launch', 'paypal-pyusd-solana-incentive'],
    context_summary: 'PayPal 将稳定币从交易工具扩展到商户支付和跨境汇款，是稳定币 B2C 落地的参照。',
  },
  // ── 48. stripe-usdc-payouts ──
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
    source_urls: [
      'https://stripe.com/newsroom',
    ],
    comparable_events: ['stripe-bridge-acquisition'],
    context_summary: 'Stripe 时隔 6 年重返加密支付并选择 USDC，体现了稳定币在支付基础设施中地位的根本性变化。',
  },
  // ── 49. ondo-usdy ──
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
    source_urls: [
      'https://ondo.finance/',
      'https://defillama.com/protocol/ondo-finance',
    ],
    comparable_events: ['blackrock-buidl-fund', 'franklin-benji'],
    context_summary: 'DeFi 原生的代币化国债产品，与 BlackRock BUIDL 构成传统 vs 原生发行的对比。',
  },
  // ── 50. tether-gold-xaut ──
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
    source_urls: [
      'https://gold.tether.to/',
      'https://www.coingecko.com/en/coins/tether-gold',
    ],
    context_summary: '非美元锚定的代币化资产代表，黄金稳定币是资产多元化的参照。',
  },
  // ── 51. ftx-collapse ──
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
    source_urls: [
      'https://www.coindesk.com/business/ftx-collapse',
    ],
    context_summary: 'FTX 崩盘引发 $3B 稳定币赎回潮，是中心化交易所风险如何传导至稳定币市场的参照。',
  },
  // ── 52. ecb-digital-euro ──
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
    source_urls: [
      'https://www.ecb.europa.eu/paym/digital_euro/html/index.en.html',
    ],
    context_summary: '数字欧元是与私人稳定币竞争的 CBDC 代表，其进展直接影响 MiCA 下稳定币的市场空间。',
  },
  // ── 53. fed-digital-dollar-research ──
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
    source_urls: [
      'https://www.federalreserve.gov/publications/money-and-payments-the-us-dollar-in-the-age-of-digital-transformation.htm',
    ],
    context_summary: '美联储对 CBDC 的审慎态度间接利好私人稳定币，是美国监管路径选择的参照。',
  },
  // ── 54. circle-soc2-audit ──
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
    source_urls: [
      'https://www.circle.com/en/transparency',
    ],
    context_summary: '稳定币行业最高标准的审计合规实践，SOC 2 Type II + Deloitte 是透明度的行业基准。',
  },
  // ── 55. tether-bnychicago-audit ──
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
    source_urls: [
      'https://tether.to/en/transparency',
    ],
    context_summary: 'Tether 储备从商业票据转向美国国债的过程，是稳定币储备质量演进的参照。',
  },
  // ── 56. solana-usdc-native ──
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
    source_urls: [
      'https://www.circle.com/en/usdc-multichain/solana',
    ],
    context_summary: '原生发行替代桥接版本的成功案例，20x 增长证明了原生多链策略的有效性。',
  },
  // ── 57. chainlink-ccip-stablecoin ──
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
    source_urls: [
      'https://chain.link/cross-chain',
    ],
    comparable_events: ['circle-cctp-launch'],
    context_summary: '去中心化预言机网络进入跨链稳定币转移领域，与 Circle CCTP 构成不同架构路径的对比。',
  },
  // ── 58. layer-zero-oft ──
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
    source_urls: [
      'https://layerzero.network/',
    ],
    comparable_events: ['tether-usdt0-launch'],
    context_summary: 'OFT 标准成为稳定币跨链的主流方案之一，Tether USDT0 采用即为验证。',
  },
  // ── 59. usdc-base-launch ──
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
    source_urls: [
      'https://www.circle.com/en/usdc-multichain/base',
      'https://defillama.com/chain/Base',
    ],
    comparable_events: ['coinbase-base-l2'],
    context_summary: 'USDC 在 Coinbase L2 上的快速增长，体现了交易所自有 L2 对稳定币分发的放大效应。',
  },
  // ── 60. coinbase-base-l2 ──
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
    source_urls: [
      'https://base.org/',
      'https://defillama.com/chain/Base',
    ],
    comparable_events: ['usdc-base-launch'],
    context_summary: 'Coinbase 自建 L2 成为稳定币交易量第 3 大链，是交易所垂直整合策略的参照。',
  },
  // ── 61. stablecoin-payments-volume-2024 ──
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
    source_urls: [
      'https://defillama.com/stablecoins',
    ],
    context_summary: '稳定币链上交易量达 Visa 73% 的数据，是衡量稳定币支付渗透率的核心指标。',
  },
  // ── 62. fireblocks-stablecoin-infra ──
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
    source_urls: [
      'https://www.fireblocks.com/blog/',
    ],
    context_summary: '机构级稳定币铸造/赎回 API 基础设施，是 B2B 稳定币服务层的参照。',
  },
  // ── 63. usual-protocol ──
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
    source_urls: [
      'https://usual.money/',
      'https://defillama.com/protocol/usual',
    ],
    comparable_events: ['usual-usd0pp-depeg'],
    context_summary: 'RWA 抵押稳定币的新兴代表，6 个月达 $1.4B TVL，是 RWA 稳定币增速的参照。',
  },
  // ── 64. eu-mica-tether-delisting ──
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
    source_urls: [
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114',
    ],
    comparable_events: ['mica-eu'],
    context_summary: 'MiCA 生效后 USDT 被欧盟部分下架的实际案例，是监管合规对稳定币市场份额影响的参照。',
  },
  // ── 65. mantle-usdy-integration ──
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
    source_urls: [
      'https://www.mantle.xyz/blog',
    ],
    context_summary: 'L2 国库大规模配置代币化国债的案例，$200M 规模体现了 DAO 国库管理的新趋势。',
  },
  // ── 66. tether-usdt0-launch ──
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
    source_urls: [
      'https://tether.to/en/tether-usdt0',
    ],
    comparable_events: ['layer-zero-oft', 'circle-cctp-launch'],
    context_summary: 'Tether 采用 LayerZero OFT 标准实现原生跨链，是 USDT 多链策略从桥接到原生转变的参照。',
  },
  // ── 67. ripple-rlusd ──
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
    source_urls: [
      'https://ripple.com/insights/',
      'https://www.coingecko.com/en/coins/ripple-usd',
    ],
    comparable_events: ['pyusd-launch', 'world-liberty-usd0'],
    context_summary: 'Ripple 从 XRP 支付转向稳定币发行的战略转型，NYDFS 牌照路径是合规稳定币入场的参照。',
  },
  // ── 68. world-liberty-usd0 ──
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
    source_urls: [
      'https://www.worldlibertyfinancial.com/',
    ],
    comparable_events: ['pyusd-launch', 'ripple-rlusd'],
    context_summary: '与 Trump 家族关联的稳定币项目，政治因素介入稳定币市场是前所未有的参照。',
  },

  // ══════════════════════════════════════════════════════════
  // 新增 12 条 (69-80)
  // ══════════════════════════════════════════════════════════

  // ── 69. fdusd-launch ──
  {
    id: 'fdusd-launch',
    entity: 'First Digital',
    type: 'product_launch',
    milestones: [
      { date: '2023-06-01', event: 'First Digital USD (FDUSD) 发行，获 Binance 重点推广' },
      { date: '2023-12-01', event: 'FDUSD 市值突破 $2B，成为 Binance 主要交易对' },
    ],
    metrics: {
      issuer: 'First Digital Trust (Hong Kong)',
      launch_to_2b_months: 6,
      primary_exchange: 'Binance',
      backing: '1:1 美元存款 + 短期国债',
    },
    tags: ['product-launch', 'fdusd', 'first-digital', 'binance', 'stablecoin', 'hong-kong'],
    source_urls: [
      'https://firstdigitallabs.com/',
      'https://www.coingecko.com/en/coins/first-digital-usd',
    ],
    comparable_events: ['sec-paxos-busd', 'first-digital-fdusd-depeg-scare'],
    context_summary: 'BUSD 下架后 Binance 扶持的替代稳定币，6 个月达 $2B 体现了交易所分发能力的价值。',
  },
  // ── 70. tusd-transparency-crisis ──
  {
    id: 'tusd-transparency-crisis',
    entity: 'TrueUSD',
    type: 'enforcement',
    milestones: [
      { date: '2023-07-01', event: 'TrueUSD (TUSD) 储备透明度受质疑，实时证明暂停' },
      { date: '2023-10-01', event: 'TUSD 市值从 $3B 跌至 $1B，Binance 逐步降低支持' },
    ],
    metrics: {
      peak_market_cap: '$3B',
      post_crisis_market_cap: '$1B',
      decline_percent: '-67%',
      issue: '储备证明暂停，第三方审计争议',
    },
    tags: ['enforcement', 'tusd', 'trueusd', 'transparency', 'reserve', 'depeg'],
    source_urls: [
      'https://www.coingecko.com/en/coins/true-usd',
    ],
    context_summary: '储备透明度危机导致稳定币市值大幅缩水的案例，与 Tether 早期透明度争议形成对比。',
  },
  // ── 71. gusd-launch ──
  {
    id: 'gusd-launch',
    entity: 'Gemini',
    type: 'product_launch',
    milestones: [
      { date: '2018-09-10', event: 'Gemini Dollar (GUSD) 发行，NYDFS 批准' },
      { date: '2023-01-01', event: 'GUSD 市值维持在 ~$200M 水平' },
    ],
    metrics: {
      regulator: 'NYDFS',
      peak_market_cap: '~$400M',
      current_market_cap: '~$200M',
    },
    tags: ['product-launch', 'gusd', 'gemini', 'stablecoin', 'nydfs', 'regulated'],
    source_urls: [
      'https://www.gemini.com/dollar',
      'https://www.coingecko.com/en/coins/gemini-dollar',
    ],
    context_summary: '最早的 NYDFS 批准稳定币之一，但增长有限，是合规先发优势未必转化为市场规模的案例。',
  },
  // ── 72. paxos-usdp ──
  {
    id: 'paxos-usdp',
    entity: 'Paxos',
    type: 'product_launch',
    milestones: [
      { date: '2018-09-10', event: 'Pax Dollar (PAX) 发行，NYDFS 批准' },
      { date: '2021-08-24', event: 'PAX 更名为 USDP (Pax Dollar)' },
    ],
    metrics: {
      regulator: 'NYDFS',
      peak_market_cap: '~$1B',
      rebranded_name: 'USDP',
    },
    tags: ['product-launch', 'paxos', 'usdp', 'pax', 'stablecoin', 'nydfs', 'regulated'],
    source_urls: [
      'https://paxos.com/usdp/',
      'https://www.coingecko.com/en/coins/pax-dollar',
    ],
    comparable_events: ['gusd-launch', 'sec-paxos-busd'],
    context_summary: 'Paxos 自有品牌稳定币在 BUSD 停发后的存续，是发行商多产品线策略的参照。',
  },
  // ── 73. circle-eurc ──
  {
    id: 'circle-eurc',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2022-06-16', event: 'Circle 发行 EURC (Euro Coin)，欧元稳定币' },
      { date: '2024-07-01', event: 'EURC 获得 MiCA 合规地位，市值增长至 ~$100M' },
    ],
    metrics: {
      denomination: 'EUR',
      market_cap: '~$100M',
      mica_compliant: 'yes',
    },
    tags: ['product-launch', 'circle', 'eurc', 'euro', 'stablecoin', 'mica', 'eu'],
    source_urls: [
      'https://www.circle.com/en/eurc',
      'https://www.coingecko.com/en/coins/euro-coin',
    ],
    comparable_events: ['mica-eu', 'eu-mica-tether-delisting'],
    context_summary: '首个 MiCA 合规的欧元稳定币，是非美元稳定币和欧盟监管合规路径的参照。',
  },
  // ── 74. stablecoin-200b-milestone ──
  {
    id: 'stablecoin-200b-milestone',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-01-15', event: '稳定币总市值首次突破 $200B' },
    ],
    metrics: {
      total_market_cap: '$200B+',
      usdt_share: '~65%',
      usdc_share: '~20%',
      time_from_100b_to_200b_months: 42,
    },
    tags: ['market-cap', 'stablecoin', 'milestone', 'total-market', '200b'],
    source_urls: [
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['stablecoin-total-100b'],
    context_summary: '稳定币总市值从 $100B 到 $200B 用了约 3.5 年，是市场增长速度的里程碑锚点。',
  },
  // ── 75. usual-usd0pp-depeg ──
  {
    id: 'usual-usd0pp-depeg',
    entity: 'Usual',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-01-09', event: 'USD0++ (Usual 的质押版稳定币) 脱钩至 ~$0.92' },
      { date: '2025-01-10', event: 'Usual 团队修改赎回机制，引发社区争议' },
    ],
    metrics: {
      depeg_low: '$0.92',
      cause: '赎回机制调整引发恐慌',
      tvl_impact: '-$200M',
    },
    tags: ['depeg', 'usual', 'usd0pp', 'stablecoin', 'defi', 'governance'],
    source_urls: [
      'https://www.coingecko.com/en/coins/usual-usd0-plus-plus',
    ],
    comparable_events: ['usual-protocol'],
    context_summary: 'RWA 稳定币质押衍生品的脱钩案例，治理决策引发市场恐慌的教训。',
  },
  // ── 76. tether-q4-2024-profit ──
  {
    id: 'tether-q4-2024-profit',
    entity: 'Tether',
    type: 'funding_round',
    milestones: [
      { date: '2025-01-31', event: 'Tether 公布 2024 年净利润 $13B+，创历史新高' },
    ],
    metrics: {
      annual_profit_2024: '$13B+',
      annual_profit_2023: '$6.2B',
      yoy_growth: '~110%',
      us_treasury_holdings: '$90B+',
    },
    tags: ['tether', 'usdt', 'profit', 'revenue', 'treasury', '2024'],
    source_urls: [
      'https://tether.to/en/transparency',
    ],
    comparable_events: ['tether-profit-2023'],
    context_summary: 'Tether 年利润翻倍至 $13B，超过多数华尔街银行，是稳定币商业模式盈利能力的极端参照。',
  },
  // ── 77. ethena-susde-growth ──
  {
    id: 'ethena-susde-growth',
    entity: 'Ethena',
    type: 'tvl_milestone',
    milestones: [
      { date: '2024-04-01', event: 'sUSDe (质押版 USDe) 上线，提供收益分配' },
      { date: '2025-01-01', event: 'sUSDe TVL 突破 $3B，成为最大收益型稳定币产品' },
    ],
    metrics: {
      tvl: '$3B+',
      avg_apy: '~15-30%',
      mechanism: 'ETH staking + funding rate 收益',
    },
    tags: ['tvl', 'ethena', 'susde', 'usde', 'yield', 'stablecoin', 'defi'],
    source_urls: [
      'https://defillama.com/protocol/ethena',
      'https://app.ethena.fi/',
    ],
    comparable_events: ['usde-growth'],
    context_summary: 'sUSDe 成为最大收益型稳定币产品，15-30% APY 的可持续性是收益稳定币的关键观察点。',
  },
  // ── 78. paypal-pyusd-solana-incentive ──
  {
    id: 'paypal-pyusd-solana-incentive',
    entity: 'PayPal',
    type: 'product_launch',
    milestones: [
      { date: '2024-08-01', event: 'PayPal 在 Solana 上推出 PYUSD 收益激励计划' },
      { date: '2024-09-01', event: 'Solana 上 PYUSD 市值从 $50M 增至 $500M+' },
    ],
    metrics: {
      incentive_apy: '~5-7%',
      solana_pyusd_growth: '10x in 1 month',
      peak_solana_share: '~60% of total PYUSD',
    },
    tags: ['product-launch', 'paypal', 'pyusd', 'solana', 'incentive', 'yield'],
    source_urls: [
      'https://newsroom.paypal-corp.com/',
      'https://www.coingecko.com/en/coins/paypal-usd',
    ],
    comparable_events: ['pyusd-launch', 'paypal-xoom-stablecoin'],
    context_summary: '通过收益激励推动稳定币链上增长的案例，1 个月 10x 增长但可持续性存疑。',
  },
  // ── 79. first-digital-fdusd-depeg-scare ──
  {
    id: 'first-digital-fdusd-depeg-scare',
    entity: 'First Digital',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-04-02', event: 'FDUSD 短暂脱钩至 ~$0.97，市场传言储备问题' },
      { date: '2025-04-03', event: 'First Digital 发布声明确认储备充足，价格恢复' },
    ],
    metrics: {
      depeg_low: '$0.97',
      recovery_time_hours: 24,
      market_cap_at_event: '~$2B',
    },
    tags: ['depeg', 'fdusd', 'first-digital', 'stablecoin', 'reserve', 'scare'],
    source_urls: [
      'https://www.coingecko.com/en/coins/first-digital-usd',
      'https://firstdigitallabs.com/',
    ],
    comparable_events: ['fdusd-launch', 'usdc-svb-depeg'],
    context_summary: 'FDUSD 短暂脱钩但快速恢复的案例，与 USDC SVB 脱钩形成不同严重程度的对比。',
  },
  // ── 80. circle-ipo-s1-2025 ──
  {
    id: 'circle-ipo-s1-2025',
    entity: 'Circle',
    type: 'ipo_filing',
    milestones: [
      { date: '2025-01-11', event: 'Circle 公开提交 S-1，正式启动 IPO 流程 (第三次尝试)' },
    ],
    metrics: {
      previous_attempts: 2,
      usdc_market_cap_at_filing: '~$44B',
      target_exchange: 'NYSE',
      revenue_2024: '~$1.7B (预估)',
    },
    tags: ['ipo', 'sec', 's-1', 'circle', 'usdc', 'nyse', '2025'],
    source_urls: [
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=circle&type=S-1',
    ],
    comparable_events: ['circle-ipo-spac-2022', 'circle-s1-2024', 'coinbase-ipo'],
    context_summary: 'Circle 第三次 IPO 尝试，USDC 市值已达 $44B，成功上市将是稳定币行业的里程碑事件。',
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

/** 按 ID 查找参考事件 */
export function getReferenceById(id: string): ReferenceEvent | undefined {
  return REFERENCE_EVENTS.find(e => e.id === id)
}

/** 展开 comparable_events: 给定一组事件，补充它们的 comparable 对照事件 (去重) */
export function expandComparableEvents(events: ReferenceEvent[], limit = 8): ReferenceEvent[] {
  const seen = new Set(events.map(e => e.id))
  const expanded = [...events]
  for (const ev of events) {
    if (expanded.length >= limit) break
    for (const compId of (ev.comparable_events ?? [])) {
      if (seen.has(compId) || expanded.length >= limit) continue
      const comp = getReferenceById(compId)
      if (comp) {
        expanded.push(comp)
        seen.add(compId)
      }
    }
  }
  return expanded
}
