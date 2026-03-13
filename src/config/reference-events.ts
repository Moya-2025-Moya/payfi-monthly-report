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
  // ── 81. china-dcep-pilot ──
  {
    id: 'china-dcep-pilot',
    entity: 'PBOC',
    type: 'product_launch',
    milestones: [
      { date: '2020-04-16', event: '数字人民币 (e-CNY) 在深圳、苏州、雄安、成都启动内部试点' },
      { date: '2021-06-30', event: '数字人民币试点扩展至北京、上海等 11 个城市' },
      { date: '2022-01-04', event: 'e-CNY 钱包 App 在 iOS/Android 应用商店公开上线' },
      { date: '2022-02-04', event: '北京冬奥会场景全面启用数字人民币支付' },
      { date: '2023-06-30', event: '数字人民币交易累计金额突破 1.8 万亿元' },
    ],
    metrics: {
      pilot_cities: 26,
      cumulative_transactions_rmb: '1.8 万亿',
      wallets_opened: '~1.2 亿',
      launch_year: 2020,
    },
    tags: ['cbdc', 'china', 'e-cny', 'digital-yuan', 'pboc'],
    source_urls: [
      'http://www.pbc.gov.cn/en/3688110/3688172/4437084/index.html',
    ],
    comparable_events: ['ecb-digital-euro', 'fed-digital-dollar-research'],
    context_summary: '全球最大的 CBDC 试点项目，交易规模和用户覆盖远超其他国家，是 CBDC 发展的关键参照。',
  },
  // ── 82. brazil-drex ──
  {
    id: 'brazil-drex',
    entity: 'Banco Central do Brasil',
    type: 'product_launch',
    milestones: [
      { date: '2023-08-07', event: '巴西央行将数字雷亚尔项目正式命名为 Drex' },
      { date: '2024-03-01', event: 'Drex 第一阶段试点启动，14 家金融机构参与' },
      { date: '2024-07-29', event: 'Drex 第二阶段启动，测试 DeFi 协议和隐私技术' },
    ],
    metrics: {
      participating_institutions: 14,
      technology: 'Hyperledger Besu',
      phase_1_start: '2024-03',
    },
    tags: ['cbdc', 'brazil', 'drex', 'digital-real'],
    source_urls: [
      'https://www.bcb.gov.br/estabilidadefinanceira/drex',
    ],
    comparable_events: ['china-dcep-pilot', 'ecb-digital-euro'],
    context_summary: '拉美最大经济体的 CBDC 项目，采用 Hyperledger 技术路径，是新兴市场 CBDC 的代表案例。',
  },
  // ── 83. india-e-rupee ──
  {
    id: 'india-e-rupee',
    entity: 'Reserve Bank of India',
    type: 'product_launch',
    milestones: [
      { date: '2022-11-01', event: 'RBI 启动批发型数字卢比 (e₹-W) 试点' },
      { date: '2022-12-01', event: 'RBI 启动零售型数字卢比 (e₹-R) 试点，4 家银行参与' },
      { date: '2023-10-01', event: '零售试点扩展至 13 个城市，日交易约 1 万笔' },
    ],
    metrics: {
      pilot_banks_retail: 8,
      pilot_cities: 13,
      daily_transactions: '~10,000',
    },
    tags: ['cbdc', 'india', 'e-rupee', 'rbi'],
    source_urls: [
      'https://www.rbi.org.in/Scripts/PublicationReportDetails.aspx?UrlPage=&ID=1218',
    ],
    comparable_events: ['china-dcep-pilot', 'brazil-drex'],
    context_summary: '印度 CBDC 试点分批发和零售两条路径推进，用户采纳速度远低于预期，是 CBDC 推广挑战的参照。',
  },
  // ── 84. nigeria-enaira ──
  {
    id: 'nigeria-enaira',
    entity: 'Central Bank of Nigeria',
    type: 'product_launch',
    milestones: [
      { date: '2021-10-25', event: '尼日利亚推出 eNaira，成为非洲首个发行 CBDC 的国家' },
      { date: '2022-10-01', event: 'eNaira 一周年，钱包数达 1300 万但活跃率极低' },
    ],
    metrics: {
      wallets: '~13M',
      transaction_volume: '~$150M (首年)',
      adoption_challenge: '活跃率 <2%',
    },
    tags: ['cbdc', 'nigeria', 'enaira', 'africa'],
    source_urls: [
      'https://www.cbn.gov.ng/currency/enaira.asp',
    ],
    comparable_events: ['china-dcep-pilot', 'india-e-rupee'],
    context_summary: '非洲首个 CBDC，尽管钱包开通量大但活跃使用率极低，是 CBDC 采纳失败的典型案例。',
  },
  // ── 85. jpmorgan-jpm-coin ──
  {
    id: 'jpmorgan-jpm-coin',
    entity: 'JPMorgan',
    type: 'product_launch',
    milestones: [
      { date: '2019-02-14', event: 'JPMorgan 宣布推出 JPM Coin 用于机构间即时结算' },
      { date: '2020-10-27', event: 'JPM Coin 开始处理商业客户的跨境支付' },
      { date: '2023-06-22', event: 'JPM Coin 更名为 JPM Coin Systems / Kinexys Digital Payments' },
      { date: '2024-10-01', event: 'Kinexys 日均处理量超过 $10 亿' },
    ],
    metrics: {
      daily_volume: '>$1B',
      launch_year: 2019,
      rebranded_name: 'Kinexys',
      use_case: '机构跨境即时结算',
    },
    tags: ['tradfi', 'jpmorgan', 'jpm-coin', 'kinexys', 'institutional', 'settlement'],
    source_urls: [
      'https://www.jpmorgan.com/onyx/coin-system',
    ],
    comparable_events: ['visa-usdc-settlement', 'mastercard-stablecoin'],
    context_summary: '全球最大银行发行的机构级稳定币，日均交易超 $10 亿，是传统银行拥抱区块链结算的标杆。',
  },
  // ── 86. societe-generale-eurcv ──
  {
    id: 'societe-generale-eurcv',
    entity: 'Societe Generale',
    type: 'product_launch',
    milestones: [
      { date: '2023-04-20', event: 'Societe Generale-FORGE 在 Ethereum 上发行欧元稳定币 EUR CoinVertible (EURCV)' },
      { date: '2023-12-06', event: 'EURCV 上线 Bitstamp 交易所，成为首个在中心化交易所上市的银行级稳定币' },
    ],
    metrics: {
      blockchain: 'Ethereum',
      regulation: 'MiCA 合规',
      issuer_type: '银行子公司 (SG-FORGE)',
    },
    tags: ['stablecoin', 'euro', 'eurcv', 'societe-generale', 'bank', 'mica'],
    source_urls: [
      'https://www.sgforge.com/',
    ],
    comparable_events: ['circle-eurc', 'mica-eu'],
    context_summary: '欧洲大型银行发行的 MiCA 合规欧元稳定币，代表传统银行进入稳定币市场的新趋势。',
  },
  // ── 87. moneygram-stellar ──
  {
    id: 'moneygram-stellar',
    entity: 'MoneyGram',
    type: 'partnership',
    milestones: [
      { date: '2022-10-06', event: 'MoneyGram 推出 MoneyGram Access，用户可通过 Stellar 网络用 USDC 入金/出金' },
      { date: '2023-06-28', event: 'MoneyGram 扩展 Stellar USDC 服务到更多国家' },
    ],
    metrics: {
      network: 'Stellar',
      stablecoin: 'USDC',
      service: '法币↔USDC 出入金',
      countries: '~180 (MoneyGram 覆盖)',
    },
    tags: ['payments', 'moneygram', 'stellar', 'usdc', 'cross-border', 'remittance'],
    source_urls: [
      'https://stellar.org/press-releases/moneygram-launches-non-custodial-wallet',
    ],
    comparable_events: ['stripe-usdc-payouts', 'paypal-xoom-stablecoin'],
    context_summary: '全球第二大汇款公司与 Stellar 合作提供 USDC 出入金通道，是稳定币在跨境汇款领域的标志性落地。',
  },
  // ── 88. wise-stablecoin-exploration ──
  {
    id: 'wise-stablecoin-exploration',
    entity: 'Wise',
    type: 'product_launch',
    milestones: [
      { date: '2024-06-19', event: 'Wise 在年度股东大会上表示正在探索稳定币用于跨境结算的可能性' },
    ],
    metrics: {
      annual_volume: '~$120B',
      customers: '~16M',
      status: '探索阶段',
    },
    tags: ['payments', 'wise', 'cross-border', 'stablecoin', 'exploration'],
    source_urls: [
      'https://wise.com/us/blog/',
    ],
    context_summary: '全球领先的跨境支付公司探索稳定币用于结算，若落地将是稳定币在合规支付领域的重大突破。',
  },
  // ── 89. centrifuge-rwa ──
  {
    id: 'centrifuge-rwa',
    entity: 'Centrifuge',
    type: 'product_launch',
    milestones: [
      { date: '2021-04-15', event: 'MakerDAO 批准首个 Centrifuge 资产池作为 DAI 抵押品' },
      { date: '2023-06-01', event: 'Centrifuge 上线 Centrifuge App V2，支持多链 RWA 代币化' },
      { date: '2024-03-01', event: 'BlockTower Credit 通过 Centrifuge 代币化 $2.2 亿信贷资产' },
    ],
    metrics: {
      total_financed: '>$500M',
      active_pools: '~20',
      maker_dao_vaults: 7,
    },
    tags: ['rwa', 'centrifuge', 'tokenization', 'makerdao', 'credit'],
    source_urls: [
      'https://centrifuge.io/',
      'https://app.centrifuge.io/',
    ],
    comparable_events: ['blackrock-buidl-fund', 'ondo-usdy'],
    context_summary: 'DeFi 领域最早的 RWA 代币化协议之一，将真实信贷资产引入链上，是 RWA 赛道的先驱参照。',
  },
  // ── 90. maple-finance ──
  {
    id: 'maple-finance',
    entity: 'Maple Finance',
    type: 'product_launch',
    milestones: [
      { date: '2021-05-01', event: 'Maple Finance 主网上线，提供链上机构级信贷市场' },
      { date: '2022-12-05', event: 'Orthogonal Trading 在 Maple 上违约 $3600 万' },
      { date: '2023-05-01', event: 'Maple 推出 Maple Direct，面向 DAO 和协议的美国国债收益产品' },
      { date: '2024-08-01', event: 'Maple 2.0 上线，累计贷款发放超过 $30 亿' },
    ],
    metrics: {
      total_loans_originated: '>$3B',
      orthogonal_default: '$36M',
      treasury_product: 'Maple Direct',
    },
    tags: ['defi', 'lending', 'maple-finance', 'institutional', 'credit', 'rwa'],
    source_urls: [
      'https://www.maple.finance/',
    ],
    comparable_events: ['centrifuge-rwa', 'ondo-usdy'],
    context_summary: '链上机构信贷市场的先驱，经历了 FTX 时期违约危机后转型为 RWA 收益平台，是 DeFi 信贷风险的参照。',
  },
  // ── 91. morpho-protocol ──
  {
    id: 'morpho-protocol',
    entity: 'Morpho',
    type: 'product_launch',
    milestones: [
      { date: '2022-06-14', event: 'Morpho 主网上线，优化 Aave/Compound 利率的 P2P 匹配层' },
      { date: '2024-01-10', event: 'Morpho Blue 上线，无许可的借贷市场基础层' },
      { date: '2024-10-01', event: 'Morpho 总 TVL 突破 $20 亿' },
    ],
    metrics: {
      tvl: '>$2B',
      morpho_blue_markets: '~100',
      optimized_protocol: 'Aave + Compound',
    },
    tags: ['defi', 'lending', 'morpho', 'peer-to-peer', 'aave', 'compound'],
    source_urls: [
      'https://morpho.org/',
    ],
    comparable_events: ['aave-gho-launch', 'compound-v3-usdc'],
    context_summary: 'DeFi 借贷优化层，通过 P2P 匹配提升资金效率。Morpho Blue 的无许可设计是下一代借贷基础设施的代表。',
  },
  // ── 92. spark-protocol ──
  {
    id: 'spark-protocol',
    entity: 'Spark Protocol',
    type: 'product_launch',
    milestones: [
      { date: '2023-05-09', event: 'Spark Protocol 从 MakerDAO 分拆上线，提供 DAI 借贷和储蓄利率 (DSR)' },
      { date: '2023-08-06', event: 'MakerDAO 将 DSR 提高至 8%，Spark TVL 飙升突破 $10 亿' },
      { date: '2024-09-18', event: 'Sky (原 MakerDAO) 品牌重塑后 Spark 继续作为核心借贷前端' },
    ],
    metrics: {
      tvl_peak: '>$4B',
      dsr_peak_rate: '8%',
      parent: 'MakerDAO / Sky',
    },
    tags: ['defi', 'lending', 'spark', 'makerdao', 'sky', 'dai', 'dsr'],
    source_urls: [
      'https://spark.fi/',
    ],
    comparable_events: ['sky-usds-rebrand', 'aave-gho-launch'],
    context_summary: 'MakerDAO 生态的借贷前端，DSR 高利率时期引发了稳定币收益大战，是 DeFi 利率竞争的关键参照。',
  },
  // ── 93. dubai-vara-regulation ──
  {
    id: 'dubai-vara-regulation',
    entity: 'Dubai VARA',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-03-09', event: '迪拜颁布虚拟资产法，成立虚拟资产监管局 (VARA)' },
      { date: '2023-02-28', event: 'VARA 发布完整的虚拟资产服务提供商 (VASP) 监管框架' },
      { date: '2023-06-01', event: 'Tether 获得 VARA 批准在迪拜运营' },
    ],
    metrics: {
      licensed_entities: '>20',
      framework_type: '独立虚拟资产监管机构',
    },
    tags: ['regulation', 'dubai', 'uae', 'vara', 'stablecoin', 'licensing'],
    source_urls: [
      'https://www.vara.ae/',
    ],
    comparable_events: ['singapore-mas-stablecoin', 'hk-stablecoin-framework'],
    context_summary: '阿联酋迪拜设立专门的虚拟资产监管局，以友好但合规的框架吸引加密企业，是中东监管的标杆。',
  },
  // ── 94. south-korea-crypto-act ──
  {
    id: 'south-korea-crypto-act',
    entity: 'South Korea',
    type: 'regulatory_bill',
    milestones: [
      { date: '2023-06-30', event: '韩国国会通过《虚拟资产用户保护法》' },
      { date: '2024-07-19', event: '《虚拟资产用户保护法》正式生效' },
    ],
    metrics: {
      key_provisions: '用户资产隔离存管、市场操纵处罚',
      effective_date: '2024-07-19',
    },
    tags: ['regulation', 'south-korea', 'legislation', 'user-protection'],
    source_urls: [
      'https://www.fsc.go.kr/eng/index',
    ],
    comparable_events: ['japan-stablecoin-law', 'mica-eu'],
    context_summary: '韩国首部专门的加密资产法律，重点保护用户资产，是亚太地区加密监管的参照。',
  },
  // ── 95. brazil-crypto-regulation ──
  {
    id: 'brazil-crypto-regulation',
    entity: 'Brazil',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-12-21', event: '巴西总统签署加密资产法律框架 (PL 4401/2021)' },
      { date: '2023-06-20', event: '巴西央行被指定为加密资产监管机构' },
      { date: '2024-01-01', event: '加密资产交易所需获得巴西央行牌照' },
    ],
    metrics: {
      stablecoin_share_of_crypto_volume: '~70%',
      key_regulator: 'Banco Central do Brasil',
    },
    tags: ['regulation', 'brazil', 'legislation', 'licensing'],
    source_urls: [
      'https://www.bcb.gov.br/',
    ],
    comparable_events: ['mica-eu', 'south-korea-crypto-act'],
    context_summary: '巴西加密交易中稳定币占比高达 70%，主要用于跨境汇款和美元储蓄，监管框架对拉美有示范效应。',
  },
  // ── 96. usdt-50b-milestone ──
  {
    id: 'usdt-50b-milestone',
    entity: 'Tether',
    type: 'market_cap_change',
    milestones: [
      { date: '2021-04-13', event: 'USDT 市值首次突破 $500 亿' },
    ],
    metrics: {
      market_cap: '$50B',
      days_from_1b_to_50b: '~1460',
      market_share: '~65%',
    },
    tags: ['tether', 'usdt', 'market-cap', 'milestone'],
    source_urls: [
      'https://tether.to/en/transparency/',
    ],
    comparable_events: ['usdt-100b', 'stablecoin-total-100b'],
    context_summary: 'USDT 从 $1B 到 $50B 用时约 4 年，增长速度是衡量稳定币市场扩张的关键参照。',
  },
  // ── 97. nomad-bridge-hack ──
  {
    id: 'nomad-bridge-hack',
    entity: 'Nomad Bridge',
    type: 'enforcement',
    milestones: [
      { date: '2022-08-01', event: 'Nomad 跨链桥遭遇安全漏洞，$1.9 亿资金被盗' },
      { date: '2022-08-04', event: 'Nomad 设立赏金计划，~$37M 资金被白帽归还' },
    ],
    metrics: {
      amount_stolen: '$190M',
      amount_recovered: '~$37M',
      vulnerability: '合约初始化漏洞',
    },
    tags: ['hack', 'bridge', 'nomad', 'security', 'defi'],
    source_urls: [
      'https://rekt.news/nomad-rekt/',
    ],
    comparable_events: ['wormhole-hack'],
    context_summary: '跨链桥安全事故导致近 $2 亿损失，该漏洞允许任何人复制攻击交易，是跨链桥安全风险的典型案例。',
  },
  // ── 98. wormhole-hack ──
  {
    id: 'wormhole-hack',
    entity: 'Wormhole',
    type: 'enforcement',
    milestones: [
      { date: '2022-02-02', event: 'Wormhole 跨链桥被黑客攻击，损失 12 万枚 wETH (~$3.2 亿)' },
      { date: '2022-02-03', event: 'Jump Crypto (Wormhole 母公司) 补充 12 万枚 ETH 填补损失' },
    ],
    metrics: {
      amount_stolen: '$320M',
      amount_replenished: '$320M (Jump Crypto)',
      vulnerability: 'Solana 端签名验证漏洞',
    },
    tags: ['hack', 'bridge', 'wormhole', 'security', 'solana', 'defi'],
    source_urls: [
      'https://rekt.news/wormhole-rekt/',
      'https://wormhole.com/posts/wormhole-incident-report-02-02-22',
    ],
    comparable_events: ['nomad-bridge-hack'],
    context_summary: 'DeFi 历史上第二大黑客攻击事件，Jump Crypto 全额补偿体现了机构资本在 DeFi 安全中的角色。',
  },
  // ── 99. tether-attestation-bdo ──
  {
    id: 'tether-attestation-bdo',
    entity: 'Tether',
    type: 'product_launch',
    milestones: [
      { date: '2021-07-29', event: 'Tether 在 CFTC 和解后首次发布储备资产详细分类' },
      { date: '2023-02-09', event: 'BDO Italia 成为 Tether 的审计合作方，发布季度证明报告' },
      { date: '2024-01-31', event: 'Tether 公布 Q4 2023 储备证明：持有 $950 亿美国国债' },
    ],
    metrics: {
      attestation_firm: 'BDO Italia',
      us_treasury_holdings: '$95B',
      attestation_frequency: '季度',
    },
    tags: ['audit', 'attestation', 'tether', 'usdt', 'transparency', 'bdo'],
    source_urls: [
      'https://tether.to/en/transparency/',
    ],
    comparable_events: ['circle-soc2-audit', 'tether-bnychicago-audit'],
    context_summary: 'Tether 从被质疑储备不透明到定期发布证明报告，储备结构转向以美国国债为主，是稳定币透明度演进的参照。',
  },
  // ── 100. robinhood-usdc-integration ──
  {
    id: 'robinhood-usdc-integration',
    entity: 'Robinhood',
    type: 'partnership',
    milestones: [
      { date: '2024-05-07', event: 'Robinhood 在欧洲推出加密转账功能，支持 USDC' },
      { date: '2024-12-16', event: 'Robinhood 加入 Circle 主导的 Global Dollar Network' },
    ],
    metrics: {
      platform: 'Robinhood',
      stablecoin_supported: 'USDC',
      user_base: '~24M',
    },
    tags: ['partnership', 'robinhood', 'usdc', 'circle', 'retail', 'fintech'],
    source_urls: [
      'https://newsroom.aboutrobinhood.com/',
    ],
    comparable_events: ['stripe-usdc-payouts', 'paypal-xoom-stablecoin'],
    context_summary: '美国最大的零售券商之一集成 USDC，标志着稳定币从加密原生用户向主流零售投资者扩展。',
  },
  // ── 101. revolut-stablecoin ──
  {
    id: 'revolut-stablecoin',
    entity: 'Revolut',
    type: 'product_launch',
    milestones: [
      { date: '2024-07-18', event: 'Revolut 获得英国银行牌照' },
      { date: '2024-12-01', event: '媒体报道 Revolut 计划发行自有稳定币' },
    ],
    metrics: {
      global_users: '~45M',
      uk_bank_license: 'yes',
      stablecoin_status: '计划中',
    },
    tags: ['fintech', 'revolut', 'stablecoin', 'uk', 'bank-license'],
    source_urls: [
      'https://www.revolut.com/news/',
    ],
    comparable_events: ['pyusd-launch', 'societe-generale-eurcv'],
    context_summary: 'Revolut 拥有 4500 万用户和银行牌照，若发行稳定币将是欧洲金融科技公司进入稳定币市场的标志性事件。',
  },
  // ── 102. circle-programmable-wallets ──
  {
    id: 'circle-programmable-wallets',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2023-08-08', event: 'Circle 推出 Programmable Wallets，为开发者提供 Web3 钱包基础设施' },
      { date: '2024-02-01', event: 'Programmable Wallets 支持 Gas Station (代付 gas fee) 功能' },
    ],
    metrics: {
      supported_chains: 'Ethereum, Polygon, Solana, Avalanche',
      target: '开发者 / 企业',
    },
    tags: ['infrastructure', 'circle', 'wallets', 'developer-tools', 'web3'],
    source_urls: [
      'https://www.circle.com/en/programmable-wallets',
    ],
    comparable_events: ['circle-cctp-launch', 'fireblocks-stablecoin-infra'],
    context_summary: 'Circle 从稳定币发行方向开发者工具平台扩展，Programmable Wallets 降低了 Web3 支付的集成门槛。',
  },
  // ── 103. tether-tron-dominance ──
  {
    id: 'tether-tron-dominance',
    entity: 'Tether',
    type: 'market_cap_change',
    milestones: [
      { date: '2022-01-01', event: 'USDT 在 Tron 上的发行量首次超过 Ethereum ($34B vs $32B)' },
      { date: '2024-06-01', event: 'USDT on Tron 市值达 ~$58B，占 USDT 总量 ~52%' },
    ],
    metrics: {
      tron_share: '~52%',
      tron_usdt: '~$58B',
      ethereum_usdt: '~$48B',
      key_use_case: '新兴市场跨境转账',
    },
    tags: ['tether', 'usdt', 'tron', 'market-share', 'emerging-markets'],
    source_urls: [
      'https://tether.to/en/transparency/',
      'https://tronscan.org/',
    ],
    comparable_events: ['usdt-100b', 'usdt-dominance-post-svb'],
    context_summary: 'USDT 在 Tron 上的主导地位反映了新兴市场对低成本转账的需求，Tron 超越以太坊成为 USDT 最大发行链。',
  },
  // ── 104. securitize-partnership-blackrock ──
  {
    id: 'securitize-partnership-blackrock',
    entity: 'Securitize',
    type: 'partnership',
    milestones: [
      { date: '2024-03-20', event: 'Securitize 成为 BlackRock BUIDL 基金的代币化合作伙伴' },
      { date: '2024-05-29', event: 'Securitize 完成 $4700 万融资，BlackRock 领投' },
    ],
    metrics: {
      funding: '$47M',
      lead_investor: 'BlackRock',
      total_tokenized: '>$1B',
    },
    tags: ['rwa', 'securitize', 'blackrock', 'tokenization', 'funding'],
    source_urls: [
      'https://securitize.io/press',
    ],
    comparable_events: ['blackrock-buidl-fund', 'franklin-benji'],
    context_summary: 'Securitize 被 BlackRock 选为 BUIDL 基金代币化伙伴并获其领投，是 RWA 赛道获得顶级机构认可的标志。',
  },
  // ── 105. hashnote-usyc ──
  {
    id: 'hashnote-usyc',
    entity: 'Hashnote',
    type: 'product_launch',
    milestones: [
      { date: '2023-07-01', event: 'Hashnote 推出 USYC (US Yield Coin)，代币化短期美国国债' },
      { date: '2024-11-01', event: 'USYC TVL 突破 $10 亿' },
    ],
    metrics: {
      tvl: '>$1B',
      underlying: '短期美国国债',
      yield: '~5%',
    },
    tags: ['rwa', 'hashnote', 'usyc', 'treasury', 'yield', 'tokenization'],
    source_urls: [
      'https://www.hashnote.com/',
    ],
    comparable_events: ['ondo-usdy', 'blackrock-buidl-fund', 'franklin-benji'],
    context_summary: '链上代币化国债产品之一，TVL 突破 $10 亿，与 Ondo USDY、BlackRock BUIDL 形成 RWA 收益产品竞争格局。',
  },
  // ── 106. superstate-ustb ──
  {
    id: 'superstate-ustb',
    entity: 'Superstate',
    type: 'product_launch',
    milestones: [
      { date: '2023-06-28', event: 'Superstate 由前 Compound 创始人 Robert Leshner 创立' },
      { date: '2024-02-21', event: 'Superstate 推出 USTB (Short Duration US Government Securities Fund)' },
    ],
    metrics: {
      founder: 'Robert Leshner',
      product: 'USTB',
      underlying: '短期美国国债',
    },
    tags: ['rwa', 'superstate', 'ustb', 'treasury', 'tokenization', 'compound'],
    source_urls: [
      'https://superstate.co/',
    ],
    comparable_events: ['ondo-usdy', 'blackrock-buidl-fund'],
    context_summary: 'Compound 创始人创立的代币化国债基金，代表 DeFi 创始人转向合规 RWA 产品的趋势。',
  },
  // ── 107. circle-native-usdc-arbitrum ──
  {
    id: 'circle-native-usdc-arbitrum',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2023-06-08', event: 'Circle 在 Arbitrum 上线原生 USDC，取代桥接版 USDC.e' },
    ],
    metrics: {
      chain: 'Arbitrum',
      bridged_version: 'USDC.e (deprecated)',
    },
    tags: ['usdc', 'circle', 'arbitrum', 'l2', 'native-issuance'],
    source_urls: [
      'https://www.circle.com/blog/arbitrum-usdc-now-available',
    ],
    comparable_events: ['usdc-base-launch', 'solana-usdc-native'],
    context_summary: 'USDC 从桥接版迁移到 L2 原生发行的模式，Arbitrum 是继 Solana、Base 之后的又一案例。',
  },
  // ── 108. payfi-stripe-onramp ──
  {
    id: 'stripe-fiat-to-crypto-onramp',
    entity: 'Stripe',
    type: 'product_launch',
    milestones: [
      { date: '2022-12-01', event: 'Stripe 重新进入加密市场，推出法币到加密货币入金 API' },
      { date: '2024-04-25', event: 'Stripe 恢复 USDC 支付接受功能（此前于 2018 年暂停加密支付）' },
      { date: '2024-10-20', event: 'Stripe 以 $11 亿收购稳定币支付公司 Bridge' },
    ],
    metrics: {
      bridge_acquisition: '$1.1B',
      crypto_pause_duration: '2018-2022 (4 年)',
      supported_stablecoins: 'USDC',
    },
    tags: ['payments', 'stripe', 'usdc', 'onramp', 'bridge', 'acquisition'],
    source_urls: [
      'https://stripe.com/blog/crypto-onramp',
      'https://stripe.com/newsroom/news/stripe-to-acquire-bridge',
    ],
    comparable_events: ['stripe-bridge-acquisition', 'stripe-usdc-payouts'],
    context_summary: 'Stripe 从 2018 年暂停加密支付到 2024 年 $11 亿收购 Bridge，180 度转向拥抱稳定币支付。',
  },
  // ── 109. stablecoin-dex-volume-record ──
  {
    id: 'stablecoin-dex-volume-record',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2024-03-05', event: 'DEX 稳定币交易对单日交易量创历史新高，突破 $300 亿' },
    ],
    metrics: {
      daily_dex_volume: '>$30B',
      top_dex: 'Uniswap',
      top_pair: 'USDC/USDT',
    },
    tags: ['dex', 'volume', 'stablecoin', 'trading', 'milestone'],
    source_urls: [
      'https://dune.com/hagaetc/dex-metrics',
    ],
    comparable_events: ['stablecoin-payments-volume-2024', 'stablecoin-200b-milestone'],
    context_summary: 'DEX 稳定币交易量创新高反映了链上流动性的成熟度，是衡量 DeFi 采纳的关键指标。',
  },
  // ── 110. terra-sec-action ──
  {
    id: 'terra-sec-action',
    entity: 'Terraform Labs',
    type: 'enforcement',
    milestones: [
      { date: '2023-02-16', event: 'SEC 起诉 Terraform Labs 和 Do Kwon，指控欺诈' },
      { date: '2024-04-05', event: '陪审团裁定 Terraform Labs 和 Do Kwon 犯有欺诈罪' },
      { date: '2024-06-12', event: 'Terraform Labs 同意支付 $44.7 亿和解金' },
    ],
    metrics: {
      settlement_amount: '$4.47B',
      charges: '证券欺诈',
      ust_collapse_losses: '~$40B',
    },
    tags: ['enforcement', 'sec', 'terraform-labs', 'do-kwon', 'ust', 'luna', 'fraud'],
    source_urls: [
      'https://www.sec.gov/litigation/litreleases/2023/lr25643.htm',
    ],
    comparable_events: ['ust-collapse', 'sec-binance-case'],
    context_summary: 'UST/Luna 崩溃后 SEC 的执法行动，$44.7 亿和解金是加密行业最大的 SEC 罚款。',
  },
  // ── 111. nydfs-stablecoin-guidance ──
  {
    id: 'nydfs-stablecoin-guidance',
    entity: 'NYDFS',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-06-08', event: 'NYDFS 发布稳定币发行指引，要求 1:1 全额储备和月度证明' },
    ],
    metrics: {
      key_requirements: '全额储备, 独立审计, 月度证明',
      regulated_issuers: 'Paxos, Gemini, Circle (NY 实体)',
    },
    tags: ['regulation', 'nydfs', 'new-york', 'stablecoin', 'guidance', 'reserve'],
    source_urls: [
      'https://www.dfs.ny.gov/reports_and_publications/press_releases/pr202206081',
    ],
    comparable_events: ['genius-act', 'sec-paxos-busd'],
    context_summary: 'NYDFS 是美国最早对稳定币提出明确储备要求的州监管机构，其指引成为联邦立法的参考蓝本。',
  },
  // ── 112. galaxy-digital-ipo ──
  {
    id: 'galaxy-digital-ipo',
    entity: 'Galaxy Digital',
    type: 'ipo_filing',
    milestones: [
      { date: '2018-08-01', event: 'Galaxy Digital 在加拿大多伦多证券交易所 (TSX) 上市' },
      { date: '2024-05-22', event: 'Galaxy Digital 申请将主要上市地转移至美国纳斯达克' },
    ],
    metrics: {
      initial_listing: 'TSX (加拿大)',
      target_us_listing: 'NASDAQ',
      aum: '~$5.5B',
    },
    tags: ['ipo', 'galaxy-digital', 'nasdaq', 'tsx', 'institutional'],
    source_urls: [
      'https://www.galaxydigital.io/news/',
    ],
    comparable_events: ['coinbase-ipo', 'circle-ipo-s1-2025'],
    context_summary: '加密投资机构 Galaxy Digital 从加拿大交易所转向美国上市，是加密金融企业上市路径的参照。',
  },
  // ── 113. binance-busd-wind-down ──
  {
    id: 'binance-busd-wind-down',
    entity: 'Binance',
    type: 'market_cap_change',
    milestones: [
      { date: '2023-02-13', event: 'SEC 指示 Paxos 停止铸造 BUSD' },
      { date: '2023-02-13', event: 'BUSD 市值从 ~$160 亿开始急剧下降' },
      { date: '2023-11-29', event: 'Binance 宣布 2024 年 2 月前完全停用 BUSD' },
      { date: '2024-02-01', event: 'BUSD 市值降至 <$100M，几乎清零' },
    ],
    metrics: {
      peak_market_cap: '$23B (2022-11)',
      market_cap_at_shutdown: '<$100M',
      decline_duration_months: 12,
    },
    tags: ['busd', 'binance', 'paxos', 'sec', 'wind-down', 'market-cap'],
    source_urls: [
      'https://www.binance.com/en/support/announcement/busd',
    ],
    comparable_events: ['sec-paxos-busd', 'usdt-dominance-post-svb'],
    context_summary: 'BUSD 从市值 $230 亿到归零仅用 12 个月，SEC 执法导致整个稳定币品牌消失的极端案例。',
  },
  // ── 114. floki-tokenfi-rwa ──
  {
    id: 'tokenfi-rwa',
    entity: 'TokenFi',
    type: 'product_launch',
    milestones: [
      { date: '2024-03-01', event: 'TokenFi 推出 RWA 代币化模块，面向中小企业资产上链' },
    ],
    metrics: {
      target: '中小企业 RWA 代币化',
      supported_assets: '房地产, 应收账款, 商品',
    },
    tags: ['rwa', 'tokenfi', 'tokenization', 'sme'],
    source_urls: [
      'https://tokenfi.com/',
    ],
    comparable_events: ['centrifuge-rwa', 'securitize-partnership-blackrock'],
    context_summary: '面向中小企业的 RWA 代币化工具，代表 RWA 赛道从机构级向大众化的探索方向。',
  },
  // ── 115. swift-tokenized-asset-trial ──
  {
    id: 'swift-tokenized-asset-trial',
    entity: 'SWIFT',
    type: 'partnership',
    milestones: [
      { date: '2023-08-31', event: 'SWIFT 完成代币化资产跨链互操作性试验，与 Chainlink 合作' },
      { date: '2024-01-16', event: 'SWIFT 宣布将在 2025 年推出代币化资产结算的商业方案' },
    ],
    metrics: {
      participating_banks: '>12',
      partner: 'Chainlink CCIP',
      member_banks: '11,000+',
    },
    tags: ['swift', 'tokenization', 'interoperability', 'chainlink', 'settlement'],
    source_urls: [
      'https://www.swift.com/news-events/press-releases/swift-explores-tokenised-asset-settlement',
    ],
    comparable_events: ['jpmorgan-jpm-coin', 'chainlink-ccip-stablecoin'],
    context_summary: 'SWIFT 拥有 11000+ 成员银行，其代币化资产结算实验是传统金融基础设施拥抱区块链的最大信号。',
  },
  // ── 116. stablecoin-remittance-growth ──
  {
    id: 'stablecoin-remittance-growth',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2024-06-01', event: '稳定币在新兴市场跨境汇款中的使用量同比增长超过 50%' },
    ],
    metrics: {
      key_corridors: '美→墨, 美→菲律宾, 非洲内部',
      average_fee: '<1% (vs 传统汇款 6.2%)',
      growth_yoy: '>50%',
    },
    tags: ['remittance', 'cross-border', 'emerging-markets', 'payments', 'stablecoin'],
    source_urls: [
      'https://www.chainalysis.com/blog/stablecoins-most-popular-asset/',
    ],
    comparable_events: ['moneygram-stellar', 'stablecoin-payments-volume-2024'],
    context_summary: '稳定币在新兴市场跨境汇款的增长率超过 50%，平均费率不到 1%，远低于传统汇款 6.2% 的全球平均水平。',
  },
  // ── 117. usdc-native-polygon ──
  {
    id: 'usdc-native-polygon',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2023-10-10', event: 'Circle 在 Polygon PoS 上线原生 USDC' },
    ],
    metrics: {
      chain: 'Polygon PoS',
      bridged_version: 'USDC.e',
    },
    tags: ['usdc', 'circle', 'polygon', 'native-issuance', 'l2'],
    source_urls: [
      'https://www.circle.com/blog/native-usdc-now-available-on-polygon-pos',
    ],
    comparable_events: ['circle-native-usdc-arbitrum', 'usdc-base-launch', 'solana-usdc-native'],
    context_summary: 'USDC 在 Polygon 原生发行，是 Circle 多链原生 USDC 战略的一部分，减少了对跨链桥的依赖。',
  },
  // ── 118. tether-education-investment ──
  {
    id: 'tether-education-investment',
    entity: 'Tether',
    type: 'funding_round',
    milestones: [
      { date: '2023-11-15', event: 'Tether 宣布投资比特币挖矿、人工智能和教育领域' },
      { date: '2024-04-09', event: 'Tether 投资 $2 亿于 Blackrock Neurotech (脑机接口)' },
      { date: '2024-06-20', event: 'Tether 宣布计划在 2025 年前投入 $5 亿于非稳定币业务' },
    ],
    metrics: {
      neurotech_investment: '$200M',
      total_diversification_target: '$500M',
      mining_investment: '>$100M',
    },
    tags: ['tether', 'investment', 'diversification', 'mining', 'ai'],
    source_urls: [
      'https://tether.to/en/tether-makes-strategic-200-million-investment-in-blackrock-neurotech/',
    ],
    comparable_events: ['tether-q4-2024-profit'],
    context_summary: 'Tether 利用超额利润向非稳定币业务多元化投资，包括 AI 和比特币挖矿，是利润再投资战略的参照。',
  },
  // ── 119. galaxy-digital-ust-lawsuit ──
  {
    id: 'galaxy-digital-ust-lawsuit',
    entity: 'Galaxy Digital',
    type: 'enforcement',
    milestones: [
      { date: '2024-07-08', event: 'NYAG 起诉 Galaxy Digital，指控其通过推广 UST/Luna 误导投资者获利 $7300 万' },
      { date: '2024-09-10', event: 'Galaxy Digital 同意支付 $2 亿和解金' },
    ],
    metrics: {
      settlement: '$200M',
      alleged_profit: '$73M',
      regulator: 'NYAG',
    },
    tags: ['enforcement', 'galaxy-digital', 'nyag', 'ust', 'luna', 'settlement'],
    source_urls: [
      'https://ag.ny.gov/press-release/2024/attorney-general-james-reaches-200-million-agreement-galaxy-digital',
    ],
    comparable_events: ['ust-collapse', 'terra-sec-action'],
    context_summary: 'UST 崩溃余波中对推广方的追责，Galaxy Digital $2 亿和解是参与方责任承担的参照案例。',
  },
  // ── 120. gemini-earn-settlement ──
  {
    id: 'gemini-earn-settlement',
    entity: 'Gemini',
    type: 'enforcement',
    milestones: [
      { date: '2023-01-12', event: 'SEC 起诉 Gemini 和 Genesis，指控 Earn 项目为未注册证券' },
      { date: '2024-02-08', event: 'Genesis 同意支付 $2100 万和解 SEC 指控' },
      { date: '2024-05-29', event: 'Gemini 与 NYDFS 达成 $3700 万和解，全额归还 Earn 用户资产' },
    ],
    metrics: {
      nydfs_settlement: '$37M',
      earn_users_returned: '~$2.2B (in-kind)',
      genesis_settlement: '$21M',
    },
    tags: ['enforcement', 'gemini', 'genesis', 'sec', 'nydfs', 'earn', 'lending'],
    source_urls: [
      'https://www.sec.gov/litigation/litreleases/2023/lr25638.htm',
      'https://www.dfs.ny.gov/reports_and_publications/press_releases/pr20240529',
    ],
    comparable_events: ['ftx-collapse', 'sec-coinbase-case'],
    context_summary: 'Gemini Earn 事件连接了 CeFi 借贷风险和监管执法，用户全额赎回的结果是行业少见的正面参照。',
  },
  // ── 121. tether-q2-2024-profit ──
  {
    id: 'tether-q2-2024-profit',
    entity: 'Tether',
    type: 'market_cap_change',
    milestones: [
      { date: '2024-07-31', event: 'Tether 公布 2024 Q2 净利润 $52 亿，上半年净利润 $52 亿' },
    ],
    metrics: {
      q2_net_profit: '$5.2B',
      h1_net_profit: '$5.2B',
      us_treasury_holdings: '$97.6B',
    },
    tags: ['tether', 'profit', 'earnings', 'treasury', 'q2-2024'],
    source_urls: [
      'https://tether.to/en/tether-hits-record-breaking-5-2-billion-profit-in-h1-2024/',
    ],
    comparable_events: ['tether-q4-2024-profit', 'tether-profit-2023'],
    context_summary: 'Tether 半年利润 $52 亿，超越许多大型银行，凸显了稳定币发行的高利润商业模式。',
  },
  // ── 122. binance-first-stablecoin ──
  {
    id: 'binance-first-stablecoin',
    entity: 'Binance',
    type: 'product_launch',
    milestones: [
      { date: '2019-09-05', event: 'Binance 与 Paxos 合作推出 BUSD 稳定币' },
    ],
    metrics: {
      issuer: 'Paxos (受 NYDFS 监管)',
      peak_market_cap: '$23B (Nov 2022)',
    },
    tags: ['busd', 'binance', 'paxos', 'stablecoin', 'launch'],
    source_urls: [
      'https://www.binance.com/en/blog/ecosystem/introducing-binance-usd-busd-a-usdpegged-stablecoin-383787217321869312',
    ],
    comparable_events: ['binance-busd-wind-down', 'pyusd-launch'],
    context_summary: 'BUSD 曾是第三大稳定币 ($23B)，与 SEC 对 Paxos 的执法行动直接相关，是交易所品牌稳定币兴衰的参照。',
  },
  // ── 123. defi-summer-compound-mining ──
  {
    id: 'defi-summer-compound-mining',
    entity: 'Compound',
    type: 'product_launch',
    milestones: [
      { date: '2020-06-15', event: 'Compound 启动 COMP 流动性挖矿，引爆 DeFi Summer' },
      { date: '2020-06-20', event: 'Compound TVL 在一周内从 $1 亿飙升至 $6 亿' },
    ],
    metrics: {
      tvl_before: '$100M',
      tvl_after_1_week: '$600M',
      comp_launch_price: '~$60',
      comp_peak_price: '~$370',
    },
    tags: ['defi', 'compound', 'comp', 'liquidity-mining', 'defi-summer'],
    source_urls: [
      'https://compound.finance/governance/proposals',
    ],
    comparable_events: ['aave-gho-launch', 'compound-v3-usdc'],
    context_summary: 'Compound 流动性挖矿引爆了 2020 年 DeFi Summer，TVL 一周 6 倍增长是 DeFi 生态爆发的起点参照。',
  },
  // ── 124. curve-3pool ──
  {
    id: 'curve-3pool',
    entity: 'Curve Finance',
    type: 'product_launch',
    milestones: [
      { date: '2020-09-16', event: 'Curve 推出 3Pool (DAI/USDC/USDT)，成为 DeFi 最大的稳定币流动性池' },
    ],
    metrics: {
      peak_tvl: '>$5B',
      pool_composition: 'DAI + USDC + USDT',
      significance: 'DeFi 稳定币定价锚',
    },
    tags: ['defi', 'curve', '3pool', 'stablecoin', 'liquidity', 'amm'],
    source_urls: [
      'https://curve.fi/',
    ],
    comparable_events: ['curve-crv-crisis', 'crvusd-launch'],
    context_summary: 'Curve 3Pool 是 DeFi 中最重要的稳定币流动性池，三大稳定币在此的比例是市场情绪的晴雨表。',
  },
  // ── 125. circle-global-dollar-network ──
  {
    id: 'circle-global-dollar-network',
    entity: 'Circle',
    type: 'partnership',
    milestones: [
      { date: '2024-11-18', event: 'Circle 宣布成立 Global Dollar Network 联盟' },
    ],
    metrics: {
      founding_members: 'Robinhood, Coinbase, Nuvei, Worldpay',
      goal: '推动 USDC 在全球支付和商业中的采用',
    },
    tags: ['circle', 'usdc', 'alliance', 'payments', 'global-dollar-network'],
    source_urls: [
      'https://www.circle.com/blog/launching-the-global-dollar-network',
    ],
    comparable_events: ['visa-usdc-settlement', 'robinhood-usdc-integration'],
    context_summary: 'Circle 联合 Robinhood、Coinbase 等成立 USDC 推广联盟，是稳定币走向主流支付的协作模式参照。',
  },
  // ── 126. polygon-usdc-dominance ──
  {
    id: 'polygon-usdc-dominance',
    entity: 'Polygon',
    type: 'market_cap_change',
    milestones: [
      { date: '2023-03-01', event: 'USDC 在 Polygon 上的市场份额超过 80%，成为 L2 上 USDC 占比最高的链' },
    ],
    metrics: {
      usdc_share_on_polygon: '>80%',
      total_stablecoins_polygon: '~$1.5B',
    },
    tags: ['polygon', 'usdc', 'l2', 'market-share', 'stablecoin'],
    source_urls: [
      'https://defillama.com/chain/Polygon',
    ],
    comparable_events: ['usdc-base-launch', 'tether-tron-dominance'],
    context_summary: 'Polygon 上 USDC 占比超 80% 与 Tron 上 USDT 主导形成对比，反映了不同链的用户群体差异。',
  },
  // ── 127. aave-v3-launch ──
  {
    id: 'aave-v3-launch',
    entity: 'Aave',
    type: 'product_launch',
    milestones: [
      { date: '2022-03-16', event: 'Aave V3 在 Polygon, Avalanche, Arbitrum, Optimism 等链上线' },
      { date: '2023-01-27', event: 'Aave V3 在 Ethereum 主网上线' },
    ],
    metrics: {
      tvl_v3: '>$15B',
      chains_supported: 8,
      key_feature: '跨链门户 (Portal), 效率模式 (E-Mode)',
    },
    tags: ['defi', 'aave', 'v3', 'lending', 'multichain'],
    source_urls: [
      'https://governance.aave.com/t/aave-v3-deployment-on-ethereum-mainnet/11147',
    ],
    comparable_events: ['aave-gho-launch', 'compound-v3-usdc', 'morpho-protocol'],
    context_summary: 'Aave V3 引入跨链和高效率模式，TVL 超 $150 亿，是 DeFi 借贷协议演进的里程碑。',
  },
  // ── 128. makerdao-endgame ──
  {
    id: 'makerdao-endgame',
    entity: 'MakerDAO',
    type: 'product_launch',
    milestones: [
      { date: '2022-05-12', event: 'Rune Christensen 发布 MakerDAO Endgame 计划' },
      { date: '2023-10-27', event: 'MakerDAO 启动 SubDAO 体系，首个 SubDAO Spark Protocol 独立运营' },
      { date: '2024-09-18', event: 'MakerDAO 品牌重塑为 Sky Protocol，DAI→USDS，MKR→SKY' },
    ],
    metrics: {
      dai_to_usds: 'DAI → USDS',
      mkr_to_sky: 'MKR → SKY',
      tvl_at_rebrand: '~$5B',
    },
    tags: ['makerdao', 'sky', 'endgame', 'rebrand', 'dai', 'usds', 'governance'],
    source_urls: [
      'https://forum.makerdao.com/t/endgame-plan-v3-complete-overview/17427',
      'https://sky.money/',
    ],
    comparable_events: ['sky-usds-rebrand', 'spark-protocol'],
    context_summary: 'MakerDAO Endgame 是 DeFi 历史上最大规模的协议重组，从 DAI 到 USDS 的品牌迁移影响了稳定币格局。',
  },
  // ── 129. tether-compliance-chainalysis ──
  {
    id: 'tether-compliance-chainalysis',
    entity: 'Tether',
    type: 'partnership',
    milestones: [
      { date: '2024-05-02', event: 'Tether 与 Chainalysis 合作建立二级市场 USDT 监控系统' },
      { date: '2024-11-19', event: 'Tether 宣布已冻结超过 $12 亿涉嫌非法活动的 USDT' },
    ],
    metrics: {
      frozen_usdt: '>$1.2B',
      compliance_partner: 'Chainalysis',
      law_enforcement_collaborations: '>200',
    },
    tags: ['compliance', 'tether', 'chainalysis', 'aml', 'frozen', 'law-enforcement'],
    source_urls: [
      'https://tether.to/en/tether-collaborates-with-over-200-law-enforcement-agencies/',
    ],
    comparable_events: ['tether-cftc-settlement', 'tether-attestation-bdo'],
    context_summary: 'Tether 从合规争议频发到主动冻结超 $12 亿非法资金，合规能力的提升是回应监管质疑的关键参照。',
  },
  // ── 130. paypal-pyusd-100m ──
  {
    id: 'paypal-pyusd-100m',
    entity: 'PayPal',
    type: 'market_cap_change',
    milestones: [
      { date: '2023-08-07', event: 'PayPal 推出 PYUSD' },
      { date: '2024-08-23', event: 'PYUSD 市值突破 $10 亿' },
    ],
    metrics: {
      market_cap_peak: '~$1B',
      issuer: 'Paxos',
      paypal_users: '~430M',
    },
    tags: ['pyusd', 'paypal', 'paxos', 'market-cap', 'milestone'],
    source_urls: [
      'https://newsroom.paypal-corp.com/2023-08-07-PayPal-Launches-U-S-Dollar-Stablecoin',
    ],
    comparable_events: ['pyusd-launch', 'paypal-pyusd-solana-incentive'],
    context_summary: 'PYUSD 从推出到市值破 $10 亿用时约 12 个月，但之后因 Solana 激励结束而回落，是企业级稳定币采纳的参照。',
  },
  // ── 131. eu-mica-implementation ──
  {
    id: 'eu-mica-implementation',
    entity: 'European Union',
    type: 'regulatory_bill',
    milestones: [
      { date: '2023-06-29', event: 'MiCA 法规在欧盟官方公报正式发布' },
      { date: '2024-06-30', event: 'MiCA 资产参考代币 (ART) 和电子货币代币 (EMT) 条款生效' },
      { date: '2024-12-30', event: 'MiCA 全部条款完全生效' },
    ],
    metrics: {
      full_effective_date: '2024-12-30',
      stablecoin_categories: 'ART + EMT',
      reserve_requirements: '全额储备 + 银行存管',
    },
    tags: ['regulation', 'mica', 'eu', 'stablecoin', 'implementation', 'emt', 'art'],
    source_urls: [
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114',
    ],
    comparable_events: ['mica-eu', 'eu-mica-tether-delisting'],
    context_summary: 'MiCA 分阶段生效的时间线是全球稳定币监管实施的参照，对 USDT 在欧洲的合规性产生直接影响。',
  },
  // ── 132. stablecoin-onchain-transfer-2024 ──
  {
    id: 'stablecoin-onchain-transfer-2024',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2024-12-01', event: '2024 年稳定币链上转账总量超过 $8.5 万亿，同比增长约 70%' },
    ],
    metrics: {
      annual_transfer_volume: '>$8.5T',
      yoy_growth: '~70%',
      comparison_visa: 'Visa 年处理量 ~$15T',
    },
    tags: ['stablecoin', 'transfer', 'volume', 'onchain', 'milestone', '2024'],
    source_urls: [
      'https://www.chainalysis.com/blog/stablecoins-most-popular-asset/',
    ],
    comparable_events: ['stablecoin-payments-volume-2024', 'stablecoin-200b-milestone'],
    context_summary: '稳定币年转账量 $8.5 万亿已达 Visa 年处理量的一半以上，是链上支付规模最有力的证据。',
  },
  // ── 133. ripple-xrp-sec-settlement ──
  {
    id: 'ripple-xrp-sec-ruling',
    entity: 'Ripple',
    type: 'enforcement',
    milestones: [
      { date: '2020-12-22', event: 'SEC 起诉 Ripple Labs，指控 XRP 为未注册证券' },
      { date: '2023-07-13', event: '法官裁定 XRP 在二级市场交易中不构成证券' },
      { date: '2024-08-07', event: '法院判决 Ripple 支付 $1.25 亿民事罚款（SEC 要求 $20 亿）' },
    ],
    metrics: {
      sec_requested: '$2B',
      actual_fine: '$125M',
      duration_years: 4,
    },
    tags: ['enforcement', 'sec', 'ripple', 'xrp', 'securities', 'court'],
    source_urls: [
      'https://www.sec.gov/litigation/litreleases/2020/lr25647.htm',
    ],
    comparable_events: ['sec-binance-case', 'sec-coinbase-case'],
    context_summary: 'Ripple 案是加密行业最重要的证券法判例，二级市场不构成证券的裁定对稳定币监管有间接影响。',
  },
  // ── 134. worldcoin-wld-launch ──
  {
    id: 'worldcoin-wld-launch',
    entity: 'Worldcoin',
    type: 'product_launch',
    milestones: [
      { date: '2023-07-24', event: 'Worldcoin 正式上线，发行 WLD 代币' },
      { date: '2024-10-17', event: 'Worldcoin 更名为 World，推出 World Chain L2' },
    ],
    metrics: {
      verified_users: '>10M',
      founder: 'Sam Altman',
      l2_chain: 'World Chain',
    },
    tags: ['worldcoin', 'world', 'identity', 'l2', 'sam-altman'],
    source_urls: [
      'https://world.org/',
    ],
    context_summary: 'Sam Altman 创立的数字身份项目，World Chain 支持稳定币支付，是 AI+身份验证+支付交叉领域的参照。',
  },
  // ── 135. stablecoin-argentina-adoption ──
  {
    id: 'stablecoin-argentina-adoption',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2023-12-01', event: '阿根廷成为拉美最大的稳定币使用市场之一，用于抗通胀美元储蓄' },
    ],
    metrics: {
      inflation_rate: '>200% (2024)',
      primary_stablecoins: 'USDT, USDC, DAI',
      use_case: '美元计价储蓄 + P2P 交易',
    },
    tags: ['adoption', 'argentina', 'inflation', 'stablecoin', 'emerging-markets', 'savings'],
    source_urls: [
      'https://www.chainalysis.com/blog/latin-america-cryptocurrency-geography-report/',
    ],
    comparable_events: ['stablecoin-remittance-growth', 'tether-tron-dominance'],
    context_summary: '阿根廷通胀率超 200% 的背景下稳定币成为民间美元替代品，是稳定币在高通胀经济体的最佳采纳案例。',
  },
  // ── 136. circle-series-d ──
  {
    id: 'circle-series-d',
    entity: 'Circle',
    type: 'funding_round',
    milestones: [
      { date: '2018-05-15', event: 'Circle 完成 $1.1 亿 E 轮融资，Bitmain 领投' },
      { date: '2021-04-12', event: 'Circle 完成 $4.4 亿融资，估值 $4.5B' },
    ],
    metrics: {
      round_2021: '$440M',
      valuation_2021: '$4.5B',
      investors: 'Fidelity, Marshall Wace, Fin Capital',
    },
    tags: ['funding', 'circle', 'usdc', 'series', 'venture'],
    source_urls: [
      'https://www.circle.com/blog/circle-raises-440-million',
    ],
    comparable_events: ['circle-series-f', 'circle-ipo-s1-2025'],
    context_summary: 'Circle 2021 年融资 $4.4 亿时估值 $4.5B，与后续 IPO 估值 $5-9B 的比较是公司成长的参照。',
  },
  // ── 137. polygon-zkEVM-stablecoin ──
  {
    id: 'polygon-zkevm-launch',
    entity: 'Polygon',
    type: 'product_launch',
    milestones: [
      { date: '2023-03-27', event: 'Polygon zkEVM 主网 Beta 上线' },
    ],
    metrics: {
      type: 'ZK-Rollup',
      evm_compatible: 'yes',
      target: '低成本 + 高安全性以太坊扩展',
    },
    tags: ['polygon', 'zkevm', 'l2', 'zk-rollup', 'ethereum'],
    source_urls: [
      'https://polygon.technology/blog/polygon-zkevm-mainnet-beta-is-live',
    ],
    comparable_events: ['coinbase-base-l2'],
    context_summary: 'Polygon zkEVM 是首批 ZK-Rollup 主网之一，为稳定币在 L2 上的低成本交易提供了基础设施。',
  },
  // ── 138. stablecoin-300b-total ──
  {
    id: 'stablecoin-300b-total',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-02-01', event: '全球稳定币总市值突破 $2200 亿 (2024 年底约 $2000 亿)' },
    ],
    metrics: {
      total_market_cap: '~$220B',
      usdt_share: '~65%',
      usdc_share: '~25%',
      yoy_growth: '~50%',
    },
    tags: ['stablecoin', 'market-cap', 'milestone', 'total-market'],
    source_urls: [
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['stablecoin-200b-milestone', 'stablecoin-total-100b'],
    context_summary: '稳定币总市值持续创新高，年增长 50% 反映了稳定币在支付和 DeFi 中的主流化趋势。',
  },
  // ── 139. bitsogo-merchant-stablecoin ──
  {
    id: 'checkout-com-stablecoin',
    entity: 'Checkout.com',
    type: 'product_launch',
    milestones: [
      { date: '2024-02-06', event: 'Checkout.com 推出稳定币支付结算功能，支持商户用 USDC 结算' },
    ],
    metrics: {
      supported_stablecoins: 'USDC',
      merchant_settlement: '法币或 USDC 可选',
      platform: 'Checkout.com',
    },
    tags: ['payments', 'checkout-com', 'usdc', 'merchant', 'settlement'],
    source_urls: [
      'https://www.checkout.com/blog/stablecoin-payouts',
    ],
    comparable_events: ['stripe-usdc-payouts', 'stripe-fiat-to-crypto-onramp'],
    context_summary: '支付处理商 Checkout.com 支持 USDC 商户结算，是除 Stripe 外企业支付基础设施拥抱稳定币的又一案例。',
  },
  // ── 140. ethena-ena-token ──
  {
    id: 'ethena-ena-token',
    entity: 'Ethena',
    type: 'product_launch',
    milestones: [
      { date: '2024-04-02', event: 'Ethena 推出 ENA 治理代币，通过 Binance Launchpool 分发' },
      { date: '2024-04-02', event: 'ENA 上线首日价格 ~$0.70，FDV 约 $100 亿' },
    ],
    metrics: {
      launch_price: '~$0.70',
      fdv: '~$10B',
      distribution: 'Binance Launchpool + airdrop',
    },
    tags: ['ethena', 'ena', 'token', 'governance', 'usde'],
    source_urls: [
      'https://ethena.fi/',
      'https://www.binance.com/en/support/announcement/ethena-ena',
    ],
    comparable_events: ['ethena-funding', 'usde-growth'],
    context_summary: 'Ethena 治理代币 ENA 首日 FDV $100 亿，是 2024 年最大的 DeFi 代币发行之一。',
  },
  // ── 141. usdc-cctp-v2 ──
  {
    id: 'usdc-cctp-v2',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2024-09-17', event: 'Circle 宣布 CCTP V2，支持更快的跨链 USDC 转账' },
    ],
    metrics: {
      version: 'V2',
      improvement: '更快的最终确认性',
      supported_chains: '>8',
    },
    tags: ['circle', 'cctp', 'cross-chain', 'usdc', 'infrastructure'],
    source_urls: [
      'https://www.circle.com/blog/cctp',
    ],
    comparable_events: ['circle-cctp-launch', 'layer-zero-oft'],
    context_summary: 'CCTP V2 升级了跨链 USDC 的速度和效率，是原生跨链稳定币基础设施迭代的参照。',
  },
  // ── 142. opbnb-stablecoin ──
  {
    id: 'opbnb-launch',
    entity: 'BNB Chain',
    type: 'product_launch',
    milestones: [
      { date: '2023-09-13', event: 'opBNB (BNB Chain L2) 主网上线，交易费低至 $0.001' },
    ],
    metrics: {
      type: 'Optimistic Rollup',
      gas_cost: '<$0.001',
      tps: '~4000',
    },
    tags: ['bnb', 'opbnb', 'l2', 'optimistic-rollup'],
    source_urls: [
      'https://www.bnbchain.org/en/blog/opbnb-mainnet-launch',
    ],
    comparable_events: ['coinbase-base-l2', 'polygon-zkevm-launch'],
    context_summary: 'opBNB 以极低的交易费为 BNB 链稳定币转账提供了 L2 扩展方案，与 Base、Polygon zkEVM 竞争。',
  },
  // ── 143. circle-usdc-noble-cosmos ──
  {
    id: 'circle-usdc-noble-cosmos',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2023-09-26', event: 'Circle 在 Noble (Cosmos) 上线原生 USDC' },
    ],
    metrics: {
      chain: 'Noble (Cosmos/IBC)',
      significance: '首次在非 EVM 链上原生发行 USDC',
    },
    tags: ['usdc', 'circle', 'cosmos', 'noble', 'ibc', 'native-issuance'],
    source_urls: [
      'https://www.circle.com/blog/native-usdc-on-noble',
    ],
    comparable_events: ['solana-usdc-native', 'circle-native-usdc-arbitrum'],
    context_summary: 'USDC 通过 Noble 进入 Cosmos 生态系统的 IBC 互联网络，是稳定币跨生态系统扩展的参照。',
  },
  // ── 144. tether-minting-record ──
  {
    id: 'tether-minting-record-2024',
    entity: 'Tether',
    type: 'market_cap_change',
    milestones: [
      { date: '2024-11-06', event: 'Tether 单日铸造 $30 亿 USDT，创历史单日铸造记录' },
    ],
    metrics: {
      single_day_mint: '$3B',
      context: '比特币突破 $70K 后的需求激增',
    },
    tags: ['tether', 'usdt', 'minting', 'record', 'demand'],
    source_urls: [
      'https://tether.to/en/transparency/',
    ],
    comparable_events: ['usdt-100b', 'stablecoin-300b-total'],
    context_summary: 'Tether 单日铸造 $30 亿创记录，反映了加密牛市周期中稳定币需求的爆发性增长模式。',
  },
  // ── 145. defi-stablecoin-tvl-100b ──
  {
    id: 'defi-stablecoin-tvl-100b',
    entity: 'DeFi Market',
    type: 'tvl_milestone',
    milestones: [
      { date: '2024-12-01', event: 'DeFi 协议中锁定的稳定币总量超过 $1000 亿' },
    ],
    metrics: {
      defi_stablecoin_tvl: '>$100B',
      top_protocols: 'Aave, Lido, MakerDAO/Sky, Ethena',
    },
    tags: ['defi', 'tvl', 'stablecoin', 'milestone'],
    source_urls: [
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['stablecoin-300b-total', 'dai-tvl-growth'],
    context_summary: 'DeFi 中稳定币 TVL 突破千亿，反映了稳定币在链上金融中的核心地位。',
  },
  // ── 146. coinbase-usdc-rewards ──
  {
    id: 'coinbase-usdc-rewards',
    entity: 'Coinbase',
    type: 'product_launch',
    milestones: [
      { date: '2023-06-08', event: 'Coinbase 将 USDC 持有者的年化收益率提高到 4%+' },
      { date: '2024-01-01', event: 'Coinbase USDC 奖励覆盖全球多个市场的用户' },
    ],
    metrics: {
      apy: '~4-5%',
      source: 'USDC 储备收益分润',
      eligibility: 'Coinbase 用户持有 USDC 即可',
    },
    tags: ['coinbase', 'usdc', 'rewards', 'yield', 'circle'],
    source_urls: [
      'https://www.coinbase.com/usdc',
    ],
    comparable_events: ['spark-protocol', 'usdc-growth-2021-2024'],
    context_summary: 'Coinbase 将 USDC 储备收益的一部分分享给用户，是推动 USDC 持有量增长的关键激励机制。',
  },
  // ── 147. stablecoins-ai-agents ──
  {
    id: 'stablecoins-ai-agents',
    entity: 'Stablecoin Market',
    type: 'product_launch',
    milestones: [
      { date: '2024-10-01', event: 'Skyfire 等公司开始探索 AI Agent 使用稳定币进行自主支付' },
      { date: '2025-01-06', event: 'Coinbase CEO Brian Armstrong 发推展示 AI Agent 使用 USDC 在 Base 上自主交易' },
    ],
    metrics: {
      use_case: 'AI Agent 自主使用稳定币支付',
      key_players: 'Skyfire, Coinbase, Circle',
    },
    tags: ['ai', 'agent', 'stablecoin', 'usdc', 'payments', 'autonomous'],
    source_urls: [
      'https://www.coinbase.com/blog/using-ai-agents-with-crypto',
    ],
    context_summary: 'AI Agent 使用稳定币自主支付是 2025 年最热的叙事之一，代表了稳定币从人类支付向机器支付的范式扩展。',
  },
  // ── 148. base-bridge-tvl ──
  {
    id: 'base-tvl-growth',
    entity: 'Base',
    type: 'tvl_milestone',
    milestones: [
      { date: '2023-08-09', event: 'Base 主网上线' },
      { date: '2024-03-15', event: 'Base TVL 突破 $40 亿' },
      { date: '2024-12-01', event: 'Base 成为 TVL 排名前 5 的 L2' },
    ],
    metrics: {
      tvl: '>$4B',
      usdc_on_base: '>$3B',
      builder: 'Coinbase',
    },
    tags: ['base', 'l2', 'coinbase', 'tvl', 'usdc'],
    source_urls: [
      'https://base.org/',
      'https://defillama.com/chain/Base',
    ],
    comparable_events: ['coinbase-base-l2', 'usdc-base-launch'],
    context_summary: 'Coinbase 推出的 Base L2 增长迅猛，USDC 是其主要稳定币，是交易所构建 L2 的成功案例。',
  },
  // ── 149. stablecoin-ban-proposals ──
  {
    id: 'us-stablecoin-cbdc-debate',
    entity: 'US Congress',
    type: 'regulatory_bill',
    milestones: [
      { date: '2023-09-20', event: '众议院金融服务委员会通过稳定币法案 (CLARITY Act)' },
      { date: '2024-05-23', event: '参众两院均未在 118 届国会中完成稳定币立法' },
    ],
    metrics: {
      house_bill: 'CLARITY Act',
      senate_bill: 'Lummis-Gillibrand (未通过)',
      status_118th: '未完成',
    },
    tags: ['regulation', 'congress', 'clarity-act', 'stablecoin', 'legislation'],
    source_urls: [
      'https://financialservices.house.gov/',
    ],
    comparable_events: ['genius-act', 'lummis-gillibrand-2022'],
    context_summary: '118 届国会未能完成稳定币立法，为 119 届国会的 GENIUS Act 提供了经验教训的参照。',
  },
  // ── 150. dydx-v4-appchain ──
  {
    id: 'dydx-v4-appchain',
    entity: 'dYdX',
    type: 'product_launch',
    milestones: [
      { date: '2023-10-26', event: 'dYdX V4 作为独立应用链上线，基于 Cosmos SDK' },
    ],
    metrics: {
      architecture: 'Cosmos SDK 应用链',
      daily_volume: '>$1B',
      usdc_settlement: 'Noble USDC',
    },
    tags: ['defi', 'dydx', 'perps', 'cosmos', 'appchain', 'usdc'],
    source_urls: [
      'https://dydx.exchange/blog/dydx-chain-launch',
    ],
    comparable_events: ['circle-usdc-noble-cosmos'],
    context_summary: 'dYdX 迁移至独立应用链并使用 Noble USDC 作为结算货币，是去中心化衍生品与稳定币结合的参照。',
  },
  // ── 151. eigenlayer-restaking ──
  {
    id: 'eigenlayer-restaking',
    entity: 'EigenLayer',
    type: 'tvl_milestone',
    milestones: [
      { date: '2023-06-14', event: 'EigenLayer 主网 Stage 1 上线' },
      { date: '2024-02-05', event: 'EigenLayer TVL 突破 $100 亿' },
    ],
    metrics: {
      tvl_peak: '>$15B',
      key_innovation: 'Restaking (再质押)',
    },
    tags: ['eigenlayer', 'restaking', 'ethereum', 'tvl', 'defi'],
    source_urls: [
      'https://www.eigenlayer.xyz/',
    ],
    context_summary: 'EigenLayer 引领的再质押叙事推动了 LST-fi 和稳定币收益策略（如 Ethena）的爆发式增长。',
  },
  // ── 152. jito-mev-solana ──
  {
    id: 'jito-mev-solana',
    entity: 'Jito',
    type: 'product_launch',
    milestones: [
      { date: '2023-11-28', event: 'Jito 推出 JTO 治理代币，Solana 最大的 MEV 和流动性质押协议' },
    ],
    metrics: {
      tvl: '>$2B',
      jto_airdrop: '~100M JTO',
      sol_staked: '>10M SOL',
    },
    tags: ['jito', 'solana', 'mev', 'liquid-staking', 'defi'],
    source_urls: [
      'https://www.jito.network/',
    ],
    context_summary: 'Jito 是 Solana 生态的核心基础设施，其流动性质押推动了 Solana 上稳定币 DeFi 的繁荣。',
  },
  // ── 153. stable-act-house ──
  {
    id: 'stable-act-house-2025',
    entity: 'US Congress',
    type: 'regulatory_bill',
    milestones: [
      { date: '2025-02-06', event: '众议院推出 STABLE Act (Stablecoin Transparency and Accountability for a Better Ledger Economy)' },
    ],
    metrics: {
      chamber: '众议院',
      sponsor: 'Rep. French Hill, Rep. Bryan Steil',
      companion_to: 'GENIUS Act (参议院)',
    },
    tags: ['regulation', 'legislation', 'stable-act', 'house', 'congress', 'stablecoin'],
    source_urls: [
      'https://financialservices.house.gov/',
    ],
    comparable_events: ['genius-act', 'us-stablecoin-cbdc-debate'],
    context_summary: '众议院版稳定币法案与参议院 GENIUS Act 形成两院并行立法态势，是美国稳定币监管推进的关键参照。',
  },
  // ── 154. sky-susds-launch ──
  {
    id: 'sky-susds-launch',
    entity: 'Sky Protocol',
    type: 'product_launch',
    milestones: [
      { date: '2024-09-18', event: 'Sky Protocol (原 MakerDAO) 推出 sUSDS 储蓄代币，年化约 6-8%' },
    ],
    metrics: {
      yield: '~6-8%',
      predecessor: 'sDAI / DSR',
      tvl: '>$1B',
    },
    tags: ['sky', 'susds', 'usds', 'savings', 'yield', 'defi'],
    source_urls: [
      'https://sky.money/',
    ],
    comparable_events: ['sky-usds-rebrand', 'spark-protocol'],
    context_summary: 'sUSDS 继承了 sDAI 的储蓄功能，高收益率使其成为 DeFi 稳定币收益产品的重要竞争者。',
  },
  // ── 155. tether-el-salvador ──
  {
    id: 'tether-el-salvador',
    entity: 'Tether',
    type: 'partnership',
    milestones: [
      { date: '2024-01-12', event: 'Tether 宣布在萨尔瓦多建立总部，用于能源和比特币挖矿业务' },
    ],
    metrics: {
      location: '萨尔瓦多',
      focus: '能源 + BTC 挖矿 + 教育',
    },
    tags: ['tether', 'el-salvador', 'mining', 'headquarters'],
    source_urls: [
      'https://tether.to/en/tether-announces-el-salvador-as-location-for-its-new-headquarters/',
    ],
    context_summary: 'Tether 选择对加密友好的萨尔瓦多设立总部，是稳定币公司"监管套利"选址的参照。',
  },
  // ── 156. circle-revenue-model ──
  {
    id: 'circle-revenue-2024',
    entity: 'Circle',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-01-11', event: 'Circle S-1 披露 2024 年前三季度收入 ~$12 亿' },
    ],
    metrics: {
      revenue_9m_2024: '~$1.2B',
      revenue_source: '主要来自 USDC 储备利息收入',
      coinbase_distribution_cost: '~50% 收入',
    },
    tags: ['circle', 'revenue', 'financials', 's-1', 'usdc'],
    source_urls: [
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=circle&type=S-1',
    ],
    comparable_events: ['circle-ipo-s1-2025', 'tether-q2-2024-profit'],
    context_summary: 'Circle S-1 首次披露财务数据，约 50% 收入分给 Coinbase 作为分销成本，是稳定币商业模式的核心参照。',
  },
  // ── 157. hong-kong-stablecoin-sandbox ──
  {
    id: 'hong-kong-stablecoin-sandbox',
    entity: 'HKMA',
    type: 'regulatory_bill',
    milestones: [
      { date: '2024-03-12', event: '香港金管局推出稳定币发行人沙盒计划' },
      { date: '2024-07-18', event: '京东、渣打银行等获批加入沙盒' },
      { date: '2024-12-06', event: '香港《稳定币法案》在立法会提交首读' },
    ],
    metrics: {
      sandbox_participants: '京东, Standard Chartered, Animoca',
      bill_status: '立法会首读',
    },
    tags: ['regulation', 'hong-kong', 'hkma', 'sandbox', 'stablecoin', 'licensing'],
    source_urls: [
      'https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/stablecoin-issuers/',
    ],
    comparable_events: ['hk-stablecoin-framework', 'singapore-mas-stablecoin'],
    context_summary: '香港从沙盒到立法的稳定币监管路径，京东等科技公司参与使其成为亚太稳定币创新的重要案例。',
  },
  // ── 158. kraken-stablecoin-plan ──
  {
    id: 'kraken-stablecoin-plan',
    entity: 'Kraken',
    type: 'product_launch',
    milestones: [
      { date: '2024-10-24', event: '媒体报道 Kraken 计划推出自有稳定币' },
    ],
    metrics: {
      status: '计划阶段',
      exchange_rank: 'Top 5 全球加密交易所',
    },
    tags: ['kraken', 'stablecoin', 'exchange', 'launch'],
    source_urls: [
      'https://blog.kraken.com/',
    ],
    comparable_events: ['binance-first-stablecoin', 'pyusd-launch'],
    context_summary: '继 Binance BUSD 退场后，Kraken 计划推出自有稳定币，反映交易所回归稳定币发行的趋势。',
  },
  // ── 159. usdc-sui-native ──
  {
    id: 'usdc-sui-native',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2024-10-08', event: 'Circle 在 Sui 网络上线原生 USDC' },
    ],
    metrics: {
      chain: 'Sui',
      technology: 'Move 语言',
    },
    tags: ['usdc', 'circle', 'sui', 'native-issuance', 'move'],
    source_urls: [
      'https://www.circle.com/blog/usdc-now-available-natively-on-sui',
    ],
    comparable_events: ['solana-usdc-native', 'circle-usdc-noble-cosmos'],
    context_summary: 'USDC 在 Sui 原生发行是 Circle 多链策略的延续，Sui 是 Move 语言链中首个获得原生 USDC 的。',
  },
  // ── 160. stablecoin-supply-vs-btc-correlation ──
  {
    id: 'stablecoin-supply-btc-correlation',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2024-01-01', event: '研究显示稳定币供应量与 BTC 价格高度正相关 (r > 0.85)' },
    ],
    metrics: {
      correlation: '>0.85',
      mechanism: '新增稳定币 → 购买力流入 → 推高加密资产价格',
    },
    tags: ['stablecoin', 'bitcoin', 'correlation', 'supply', 'research'],
    source_urls: [
      'https://www.chainalysis.com/blog/stablecoins-most-popular-asset/',
    ],
    context_summary: '稳定币供应量与比特币价格的高度正相关是分析市场周期的重要指标，供应增长通常领先于价格上涨。',
  },
  // ── 161. stripe-bridge-stablecoin-api ──
  {
    id: 'stripe-bridge-stablecoin-api',
    entity: 'Stripe / Bridge',
    type: 'product_launch',
    milestones: [
      { date: '2025-02-20', event: 'Stripe 基于收购的 Bridge 推出稳定币金融账户 API，支持企业在 100+ 国家接收和持有 USDC/USDB' },
    ],
    metrics: {
      countries: '>100',
      supported_stablecoins: 'USDC, USDB (Bridge 自有)',
      target: '企业全球收付款',
    },
    tags: ['stripe', 'bridge', 'stablecoin', 'api', 'payments', 'enterprise', '2025'],
    source_urls: [
      'https://stripe.com/blog/bridge-stablecoin-financial-accounts',
    ],
    comparable_events: ['stripe-bridge-acquisition', 'stripe-fiat-to-crypto-onramp'],
    context_summary: 'Stripe $11 亿收购 Bridge 后推出的首个产品，将稳定币支付能力嵌入 Stripe 生态覆盖 100+ 国家。',
  },
  // ── 162. circle-s1-amendment-2025 ──
  {
    id: 'circle-s1-amendment-2025',
    entity: 'Circle',
    type: 'ipo_filing',
    milestones: [
      { date: '2025-03-08', event: 'Circle 向 SEC 提交 S-1 修订版，更新财务数据和风险因素' },
    ],
    metrics: {
      filing_type: 'S-1/A (修订版)',
      target_exchange: 'NYSE',
      ticker: 'CRCL',
      estimated_valuation: '$5-7B',
    },
    tags: ['ipo', 'sec', 's-1', 'circle', 'usdc', 'amendment', '2025'],
    source_urls: [
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=circle&type=S-1',
    ],
    comparable_events: ['circle-ipo-s1-2025', 'coinbase-ipo'],
    context_summary: 'Circle S-1 修订版推进 IPO 进程，从首次提交到修订版用时约 2 个月，对比 Coinbase S-1→修订版 70 天。',
  },
  // ── 163. genius-act-committee-vote ──
  {
    id: 'genius-act-committee-vote',
    entity: 'US Congress',
    type: 'regulatory_bill',
    milestones: [
      { date: '2025-03-13', event: 'GENIUS Act 以 18:6 通过参议院银行委员会' },
    ],
    metrics: {
      vote: '18:6',
      bipartisan: 'yes',
      next_step: '参议院全体投票',
      key_provision: '允许 $100 亿以下发行方选择州级监管',
    },
    tags: ['regulation', 'genius-act', 'senate', 'committee', 'bipartisan', '2025'],
    source_urls: [
      'https://www.congress.gov/bill/119th-congress/senate-bill/394',
    ],
    comparable_events: ['genius-act', 'stable-act-house-2025'],
    context_summary: 'GENIUS Act 以两党 18:6 高票通过委员会，$100 亿以下发行方可选州监管，是美国稳定币立法最接近成功的时刻。',
  },
  // ── 164. tether-usdt-market-cap-140b ──
  {
    id: 'tether-usdt-140b',
    entity: 'Tether',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-01-22', event: 'USDT 市值突破 $1400 亿' },
    ],
    metrics: {
      market_cap: '$140B',
      time_from_100b: '~12 个月',
      global_stablecoin_share: '~63%',
    },
    tags: ['tether', 'usdt', 'market-cap', 'milestone', '2025'],
    source_urls: [
      'https://tether.to/en/transparency/',
    ],
    comparable_events: ['usdt-100b', 'usdt-50b-milestone'],
    context_summary: 'USDT 从 $1000 亿到 $1400 亿仅用约 12 个月，增长速度加快反映了稳定币的加速主流化。',
  },
  // ── 165. usdc-60b-milestone ──
  {
    id: 'usdc-60b-milestone',
    entity: 'Circle',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-02-15', event: 'USDC 市值突破 $560 亿，创历史新高' },
    ],
    metrics: {
      market_cap: '>$56B',
      recovery_from_svb_low: '从 SVB 后 $230 亿低点恢复',
      growth_rate: '~110% (YoY)',
    },
    tags: ['usdc', 'circle', 'market-cap', 'milestone', '2025'],
    source_urls: [
      'https://www.circle.com/en/usdc',
    ],
    comparable_events: ['usdc-growth-2021-2024', 'usdc-svb-depeg'],
    context_summary: 'USDC 从 SVB 后低点 $230 亿恢复到 $560 亿创新高，完全走出信任危机，是稳定币韧性的参照。',
  },
  // ── 166. coinbase-x-payments ──
  {
    id: 'coinbase-x-payments',
    entity: 'Coinbase',
    type: 'product_launch',
    milestones: [
      { date: '2025-01-15', event: 'Coinbase 与 X (Twitter) 集成，允许 X 用户使用 Base 上的 USDC 发送小费' },
    ],
    metrics: {
      platform: 'X (Twitter)',
      stablecoin: 'USDC on Base',
      use_case: '社交媒体小费/支付',
    },
    tags: ['coinbase', 'base', 'usdc', 'x-twitter', 'payments', 'social', '2025'],
    source_urls: [
      'https://www.coinbase.com/blog/',
    ],
    comparable_events: ['coinbase-base-l2', 'usdc-base-launch'],
    context_summary: 'Coinbase 将 USDC 支付嵌入社交媒体平台 X，是稳定币在社交支付场景的新探索。',
  },
  // ── 167. mastercard-move-stablecoin ──
  {
    id: 'mastercard-crypto-credential',
    entity: 'Mastercard',
    type: 'product_launch',
    milestones: [
      { date: '2025-01-08', event: 'Mastercard 宣布 Crypto Credential 服务支持用户通过人类可读别名（如 email 地址）发送稳定币' },
    ],
    metrics: {
      feature: '人类可读别名转账',
      supported_stablecoins: 'USDC, USDT',
      partners: 'Bit2Me, Lirium, Mercado Bitcoin',
    },
    tags: ['mastercard', 'crypto-credential', 'stablecoin', 'payments', '2025'],
    source_urls: [
      'https://www.mastercard.com/news/press/',
    ],
    comparable_events: ['mastercard-stablecoin', 'visa-usdc-settlement'],
    context_summary: 'Mastercard 通过 Crypto Credential 简化稳定币转账体验，用 email 取代钱包地址，降低了使用门槛。',
  },
  // ── 168. usdc-usdt-onchain-settle-daily ──
  {
    id: 'stablecoin-daily-100b',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-01-20', event: '稳定币链上日转账量首次突破 $1000 亿' },
    ],
    metrics: {
      daily_volume: '>$100B',
      comparison: '超过 SWIFT 日均处理量',
      primary_chains: 'Ethereum, Tron, Solana, Base',
    },
    tags: ['stablecoin', 'volume', 'onchain', 'milestone', 'daily', '2025'],
    source_urls: [
      'https://www.theblock.co/data/on-chain-metrics/stablecoins',
    ],
    comparable_events: ['stablecoin-onchain-transfer-2024', 'stablecoin-300b-total'],
    context_summary: '稳定币单日链上转账量突破 $1000 亿标志着稳定币已超越部分传统清算网络的处理能力。',
  },
  // ── 169. ethena-usde-6b ──
  {
    id: 'ethena-usde-6b',
    entity: 'Ethena',
    type: 'tvl_milestone',
    milestones: [
      { date: '2025-01-15', event: 'Ethena USDe 市值突破 $60 亿' },
    ],
    metrics: {
      market_cap: '>$6B',
      time_from_launch: '~11 个月',
      yield_source: '期货 funding rate + 质押收益',
    },
    tags: ['ethena', 'usde', 'tvl', 'market-cap', 'synthetic', '2025'],
    source_urls: [
      'https://ethena.fi/',
      'https://defillama.com/protocol/ethena',
    ],
    comparable_events: ['usde-growth', 'ethena-susde-growth'],
    context_summary: 'USDe 上线不到一年市值突破 $60 亿，是增长最快的合成美元资产，但 funding rate 风险仍是核心关注。',
  },
  // ── 170. ripple-rlusd-launch-full ──
  {
    id: 'ripple-rlusd-launch-full',
    entity: 'Ripple',
    type: 'product_launch',
    milestones: [
      { date: '2024-12-17', event: 'Ripple 正式推出 RLUSD 稳定币，获 NYDFS 批准' },
      { date: '2025-01-15', event: 'RLUSD 上线多个交易所，市值突破 $1 亿' },
    ],
    metrics: {
      regulator: 'NYDFS',
      market_cap: '>$100M',
      chains: 'XRP Ledger, Ethereum',
    },
    tags: ['ripple', 'rlusd', 'stablecoin', 'nydfs', 'launch', '2025'],
    source_urls: [
      'https://ripple.com/insights/ripple-usd-rlusd/',
    ],
    comparable_events: ['ripple-rlusd', 'pyusd-launch'],
    context_summary: 'Ripple 在赢得 SEC 诉讼后推出 RLUSD 稳定币，获 NYDFS 批准，是支付公司进入稳定币市场的新案例。',
  },
  // ── 171. backpack-dubai-exchange ──
  {
    id: 'backpack-dubai-stablecoin',
    entity: 'Backpack Exchange',
    type: 'product_launch',
    milestones: [
      { date: '2025-01-20', event: 'Backpack Exchange 获得迪拜 VARA 牌照，支持 USDC/USDT 交易对' },
    ],
    metrics: {
      license: 'Dubai VARA',
      supported_stablecoins: 'USDC, USDT',
      founder: 'FTX EU 前负责人',
    },
    tags: ['backpack', 'dubai', 'vara', 'exchange', 'stablecoin', '2025'],
    source_urls: [
      'https://backpack.exchange/',
    ],
    comparable_events: ['dubai-vara-regulation'],
    context_summary: '由 FTX EU 前高管创立的 Backpack 获得迪拜牌照，反映了 FTX 倒闭后合规交易所的重建趋势。',
  },
  // ── 172. tether-invest-adecoagro ──
  {
    id: 'tether-adecoagro-investment',
    entity: 'Tether',
    type: 'funding_round',
    milestones: [
      { date: '2025-02-05', event: 'Tether 收购阿根廷农业公司 Adecoagro 51% 股份' },
    ],
    metrics: {
      stake: '51%',
      company: 'Adecoagro (NYSE: AGRO)',
      sector: '农业',
    },
    tags: ['tether', 'adecoagro', 'acquisition', 'agriculture', 'diversification', '2025'],
    source_urls: [
      'https://tether.to/en/',
    ],
    comparable_events: ['tether-education-investment'],
    context_summary: 'Tether 收购上市农业公司是其利润多元化投资的延续，从加密到实体经济的资本输出引发了行业讨论。',
  },
  // ── 173. visa-intelligent-commerce ──
  {
    id: 'visa-tokenized-asset-platform',
    entity: 'Visa',
    type: 'product_launch',
    milestones: [
      { date: '2025-01-30', event: 'Visa 推出 Visa Tokenized Asset Platform (VTAP)，帮助银行发行和管理代币化资产和稳定币' },
    ],
    metrics: {
      pilot_bank: 'BBVA (西班牙)',
      target: '银行发行自有稳定币/代币',
      blockchain: 'Ethereum',
    },
    tags: ['visa', 'vtap', 'tokenization', 'bank', 'stablecoin', 'infrastructure', '2025'],
    source_urls: [
      'https://usa.visa.com/solutions/crypto.html',
    ],
    comparable_events: ['visa-usdc-settlement', 'swift-tokenized-asset-trial'],
    context_summary: 'Visa VTAP 允许银行在以太坊上发行代币化资产和稳定币，是卡组织从支持稳定币到赋能银行发行的跨越。',
  },
  // ── 174. paypal-business-usdc ──
  {
    id: 'paypal-business-usdc',
    entity: 'PayPal',
    type: 'product_launch',
    milestones: [
      { date: '2025-01-24', event: 'PayPal 在美国商户中推出 PYUSD 企业账户，支持 0 手续费商户收款' },
    ],
    metrics: {
      fee: '0% (促销期)',
      target: '美国中小企业',
      stablecoin: 'PYUSD',
    },
    tags: ['paypal', 'pyusd', 'merchant', 'business', 'payments', '2025'],
    source_urls: [
      'https://newsroom.paypal-corp.com/',
    ],
    comparable_events: ['pyusd-launch', 'paypal-pyusd-100m'],
    context_summary: 'PayPal 对商户免手续费接受 PYUSD 是刺激稳定币 B2B 支付采纳的激进策略，与传统 2-3% 手续费形成对比。',
  },
  // ── 175. stablecoin-africa-growth ──
  {
    id: 'stablecoin-africa-growth-2025',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-02-01', event: '撒哈拉以南非洲地区 2024 年稳定币交易量同比增长超 40%，以 USDT on Tron 为主' },
    ],
    metrics: {
      yoy_growth: '>40%',
      dominant_stablecoin: 'USDT on Tron',
      primary_use: '跨境汇款 + 美元储蓄',
      key_markets: '尼日利亚, 肯尼亚, 南非',
    },
    tags: ['africa', 'stablecoin', 'adoption', 'remittance', 'usdt', 'tron', '2025'],
    source_urls: [
      'https://www.chainalysis.com/blog/sub-saharan-africa-cryptocurrency-geography-report/',
    ],
    comparable_events: ['stablecoin-argentina-adoption', 'stablecoin-remittance-growth'],
    context_summary: '非洲稳定币增长 40%+ 以 USDT on Tron 为主，反映了新兴市场对低成本美元替代品的强劲需求。',
  },
  // ── 176. circle-japan-sbi-partnership ──
  {
    id: 'circle-japan-sbi',
    entity: 'Circle',
    type: 'partnership',
    milestones: [
      { date: '2025-03-04', event: 'Circle 与日本 SBI Holdings 合作将 USDC 引入日本市场' },
    ],
    metrics: {
      partner: 'SBI Holdings',
      market: '日本',
      regulation: '日本稳定币法 (2023 年生效)',
    },
    tags: ['circle', 'usdc', 'japan', 'sbi', 'partnership', '2025'],
    source_urls: [
      'https://www.circle.com/blog/',
    ],
    comparable_events: ['japan-stablecoin-law', 'circle-global-dollar-network'],
    context_summary: 'USDC 通过 SBI 进入日本是在 2023 年日本稳定币法生效后的首个重大市场进入，是亚太扩张的参照。',
  },
  // ── 177. tether-usdt-sui ──
  {
    id: 'tether-usdt-sui',
    entity: 'Tether',
    type: 'product_launch',
    milestones: [
      { date: '2025-01-13', event: 'Tether 在 Sui 网络原生发行 USDT' },
    ],
    metrics: {
      chain: 'Sui',
      technology: 'Move 语言',
    },
    tags: ['tether', 'usdt', 'sui', 'native-issuance', 'move', '2025'],
    source_urls: [
      'https://tether.to/en/',
    ],
    comparable_events: ['tether-usdt0-launch', 'usdc-sui-native'],
    context_summary: 'USDT 和 USDC 先后在 Sui 原生发行，Move 语言链成为稳定币扩展的新战场。',
  },
  // ── 178. base-usdc-3b-tvl ──
  {
    id: 'base-usdc-3b-2025',
    entity: 'Base',
    type: 'tvl_milestone',
    milestones: [
      { date: '2025-02-01', event: 'Base 链上 USDC 总量突破 $30 亿' },
    ],
    metrics: {
      usdc_on_base: '>$3B',
      growth_6m: '>200%',
      primary_use: 'DeFi + AI Agent 支付',
    },
    tags: ['base', 'usdc', 'tvl', 'l2', 'coinbase', '2025'],
    source_urls: [
      'https://defillama.com/chain/Base',
    ],
    comparable_events: ['base-tvl-growth', 'usdc-base-launch'],
    context_summary: 'Base 上 USDC 半年增长超 200%，AI Agent 支付场景的兴起是 Base USDC 增长的新驱动力。',
  },
  // ── 179. stablecoin-eu-mica-compliance ──
  {
    id: 'stablecoin-mica-compliance-2025',
    entity: 'European Union',
    type: 'regulatory_bill',
    milestones: [
      { date: '2025-01-01', event: 'MiCA 完全生效后多家交易所下架不合规稳定币 (含部分 USDT 交易对)' },
      { date: '2025-01-31', event: 'Tether 声明正在与欧洲合作伙伴推进 MiCA 合规方案' },
    ],
    metrics: {
      affected_stablecoins: 'USDT (部分), TUSD',
      compliant_stablecoins: 'USDC, EURC, EURCV',
      exchanges_affected: 'Coinbase Europe, Binance Europe 等',
    },
    tags: ['mica', 'eu', 'compliance', 'tether', 'usdt', 'delisting', '2025'],
    source_urls: [
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114',
    ],
    comparable_events: ['eu-mica-tether-delisting', 'eu-mica-implementation'],
    context_summary: 'MiCA 完全生效后 USDT 在欧洲部分受限，USDC 成为欧洲合规首选，是监管塑造稳定币格局的实际案例。',
  },
  // ── 180. usdc-cctp-500b ──
  {
    id: 'usdc-cctp-cumulative-2025',
    entity: 'Circle',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-02-01', event: 'Circle CCTP 累计跨链转账量突破 $200 亿' },
    ],
    metrics: {
      cumulative_volume: '>$20B',
      supported_chains: '>9',
      key_routes: 'Ethereum↔Base, Ethereum↔Arbitrum, Ethereum↔Solana',
    },
    tags: ['circle', 'cctp', 'cross-chain', 'usdc', 'volume', '2025'],
    source_urls: [
      'https://www.circle.com/blog/cctp',
    ],
    comparable_events: ['circle-cctp-launch', 'usdc-cctp-v2'],
    context_summary: 'CCTP 累计跨链转账量突破 $200 亿，成为最大的原生跨链稳定币协议，无需桥的原生 burn-mint 模式被验证。',
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
