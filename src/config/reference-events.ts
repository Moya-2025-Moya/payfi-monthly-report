// 参考知识库 V14 — 人工策展的稳定币行业历史事件
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
  source_urls: string[]       // Primary sources for every number (SEC filing, DeFiLlama, official blog)
  comparable_events?: string[] // IDs of natural comparison pairs
  context_summary: string     // 为什么这个事件适合作为参照 (1-2 句)
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

  // ════════════════════════════════════════════════════════════
  // IPO / 上市
  // ════════════════════════════════════════════════════════════

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
    tags: ['ipo', 'sec', 's-1', 'listing', 'coinbase', 'direct-listing', 'usdc'],
    source_urls: [
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001679788&type=S-1',
      'https://www.coinbase.com/blog/coinbase-announces-proposed-direct-listing',
    ],
    comparable_events: ['circle-ipo-spac-2022', 'circle-s1-2024'],
    context_summary: 'Coinbase 是 USDC 联合发行方，其上市是加密行业首个大型直接上市案例，也是 Circle 后续 IPO 进程的自然对比对象。',
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
    source_urls: [
      'https://www.circle.com/blog/circle-and-concord-acquisition-corp-enter-into-a-definitive-business-combination-agreement',
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001876042&type=S-4',
    ],
    comparable_events: ['coinbase-ipo', 'circle-s1-2024'],
    context_summary: 'Circle 第一次 IPO 尝试以 SPAC 终止收场，是分析 Circle 第二次 S-1 申请时的核心历史参照。',
  },
  {
    id: 'circle-s1-2024',
    entity: 'Circle',
    type: 'ipo_filing',
    milestones: [
      { date: '2024-01-11', event: 'Circle 秘密提交 S-1 (第二次尝试 IPO)' },
      { date: '2025-04-01', event: 'Circle 公开提交 S-1，披露 2024 年收入 $1.68B' },
    ],
    metrics: {
      previous_attempt: 'SPAC 2021-2022 (终止)',
      usdc_market_cap_at_filing: '~$26B',
      revenue_2024: '$1.68B',
    },
    tags: ['ipo', 'sec', 's-1', 'circle', 'usdc'],
    source_urls: [
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001876042&type=S-1',
      'https://www.circle.com/blog/our-journey-to-becoming-a-public-company',
    ],
    comparable_events: ['circle-ipo-spac-2022', 'coinbase-ipo'],
    context_summary: 'Circle 第二次冲刺 IPO，成功与否将直接影响 USDC 的市场信心和稳定币行业在传统资本市场的合法性。',
  },

  // ════════════════════════════════════════════════════════════
  // 监管法案
  // ════════════════════════════════════════════════════════════

  {
    id: 'genius-act',
    entity: 'US Congress',
    type: 'regulatory_bill',
    milestones: [
      { date: '2025-02-04', event: 'GENIUS Act (Guiding and Establishing National Innovation for US Stablecoins) 参议院引入' },
      { date: '2025-03-13', event: '参议院银行委员会 18:6 通过' },
      { date: '2025-05-19', event: '参议院程序性投票未通过 (48:49)' },
    ],
    metrics: {
      sponsor: 'Sen. Bill Hagerty',
      committee_vote: '18:6',
      key_provision: '联邦+州双轨监管框架',
      procedural_vote: '48:49 (未达 60 票)',
    },
    tags: ['regulation', 'legislation', 'stablecoin', 'genius-act', 'senate', 'congress'],
    source_urls: [
      'https://www.congress.gov/bill/119th-congress/senate-bill/394',
      'https://www.banking.senate.gov/newsroom/majority/chairman-hagerty-announces-genius-act',
    ],
    comparable_events: ['stable-act-2024', 'lummis-gillibrand-2022', 'clarity-for-stablecoins-act'],
    context_summary: 'GENIUS Act 是美国参议院首个获得委员会通过的专门稳定币立法，为后续稳定币法案奠定了基调。',
  },
  {
    id: 'stable-act-2024',
    entity: 'US Congress',
    type: 'regulatory_bill',
    milestones: [
      { date: '2024-04-17', event: 'STABLE Act (Stablecoin Transparency and Accountability for a Better Ledger Economy) 众议院金融服务委员会通过' },
    ],
    metrics: {
      sponsor: 'Rep. Patrick McHenry',
      committee_vote: '通过 (党派分歧)',
      key_provision: '稳定币发行许可 + 储备要求',
    },
    tags: ['regulation', 'legislation', 'stablecoin', 'stable-act', 'house', 'congress'],
    source_urls: [
      'https://financialservices.house.gov/news/documentsingle.aspx?DocumentID=409277',
    ],
    comparable_events: ['genius-act', 'clarity-for-stablecoins-act'],
    context_summary: '众议院版稳定币立法，与参议院 GENIUS Act 并行推进，两者最终需要协调统一。',
  },
  {
    id: 'clarity-for-stablecoins-act',
    entity: 'US Congress',
    type: 'regulatory_bill',
    milestones: [
      { date: '2023-07-26', event: '众议院金融服务委员会通过 Clarity for Payment Stablecoins Act' },
    ],
    metrics: {
      committee_vote: '34:16',
      sponsor: 'Rep. Patrick McHenry',
      outcome: '未进入全院投票 (118th Congress)',
    },
    tags: ['regulation', 'legislation', 'stablecoin', 'house', 'congress'],
    source_urls: [
      'https://financialservices.house.gov/news/documentsingle.aspx?DocumentID=408842',
    ],
    comparable_events: ['genius-act', 'stable-act-2024'],
    context_summary: '118 届国会众议院稳定币法案，虽未进入全院投票但为 119 届 STABLE Act 和 GENIUS Act 奠定了立法框架。',
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
    tags: ['regulation', 'legislation', 'lummis-gillibrand', 'senate', 'congress', 'stablecoin'],
    source_urls: [
      'https://www.congress.gov/bill/117th-congress/senate-bill/4356',
    ],
    comparable_events: ['genius-act', 'stable-act-2024'],
    context_summary: '首个跨党派全面加密立法尝试，其中稳定币条款为后续单独立法提供了蓝本。',
  },
  {
    id: 'pwg-stablecoin-report-2021',
    entity: 'US Treasury / PWG',
    type: 'regulatory_bill',
    milestones: [
      { date: '2021-11-01', event: '总统工作组 (PWG) 发布《稳定币报告》，建议国会立法限制发行商为受保存款机构' },
    ],
    metrics: {
      key_recommendation: '稳定币发行商应为受保存款机构',
      participants: 'Treasury, Fed, SEC, CFTC',
    },
    tags: ['regulation', 'treasury', 'stablecoin', 'pwg', 'report'],
    source_urls: [
      'https://home.treasury.gov/system/files/136/StableCoinReport_Nov1_508.pdf',
    ],
    comparable_events: ['genius-act', 'occ-stablecoin-letter-2021'],
    context_summary: '美国政府首份专门针对稳定币的政策报告，其"银行准入"思路深刻影响了后续所有稳定币立法方向。',
  },
  {
    id: 'occ-stablecoin-letter-2021',
    entity: 'OCC',
    type: 'regulatory_bill',
    milestones: [
      { date: '2021-01-04', event: 'OCC 发布解释信 #1174，允许联邦银行使用稳定币进行支付结算' },
      { date: '2021-01-04', event: 'OCC 同时允许银行运行区块链节点参与独立节点验证网络 (INVN)' },
    ],
    metrics: {
      letter_number: '1174',
      acting_comptroller: 'Brian Brooks',
      key_provision: '国家银行可使用稳定币和区块链进行支付活动',
    },
    tags: ['regulation', 'occ', 'stablecoin', 'banking', 'payments'],
    source_urls: [
      'https://www.occ.gov/news-issuances/news-releases/2021/nr-occ-2021-2.html',
    ],
    comparable_events: ['pwg-stablecoin-report-2021', 'genius-act'],
    context_summary: 'OCC 解释信是美国银行体系首次明确认可稳定币的支付功能，为银行参与稳定币生态提供了法律依据。',
  },
  {
    id: 'basel-stablecoin-capital-2022',
    entity: 'Basel Committee',
    type: 'regulatory_bill',
    milestones: [
      { date: '2022-12-16', event: 'Basel Committee 发布加密资产审慎处理标准，稳定币归类为 Group 1b' },
      { date: '2025-01-01', event: '标准预计实施日期' },
    ],
    metrics: {
      stablecoin_classification: 'Group 1b',
      capital_requirement: '等同传统资产 + 附加风险权重',
      key_condition: '满足赎回、储备、治理条件可获较低权重',
    },
    tags: ['regulation', 'basel', 'stablecoin', 'banking', 'capital-requirements'],
    source_urls: [
      'https://www.bis.org/bcbs/publ/d545.htm',
    ],
    comparable_events: ['pwg-stablecoin-report-2021'],
    context_summary: 'Basel 标准决定了全球银行持有或使用稳定币的资本成本，对机构采用稳定币有深远影响。',
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
    source_urls: [
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R1114',
      'https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica',
    ],
    comparable_events: ['eu-mica-tether-delisting', 'genius-act', 'uk-stablecoin-regulation'],
    context_summary: 'MiCA 是全球首个全面加密监管框架，其稳定币条款直接影响了 Tether 在欧洲的合规状态。',
  },
  {
    id: 'eu-mica-tether-delisting',
    entity: 'EU/Tether',
    type: 'regulatory_bill',
    milestones: [
      { date: '2024-12-30', event: 'MiCA 全面生效，部分欧盟交易所下架 USDT (不合规)' },
      { date: '2025-01-31', event: '多家欧盟交易所完成 USDT 下架' },
    ],
    metrics: {
      affected_exchanges: 'Coinbase EU, OKX EU, Kraken EU',
      reason: 'Tether 未获得 MiCA 授权',
      usdt_eu_share: '~5% of global volume',
    },
    tags: ['regulation', 'mica', 'eu', 'tether', 'usdt', 'delisting', 'compliance'],
    source_urls: [
      'https://tether.to/en/tether-responds-to-upcoming-eu-regulations',
      'https://www.coindesk.com/policy/2024/12/30/tether-faces-european-exchange-delistings-as-mica-takes-effect/',
    ],
    comparable_events: ['mica-eu', 'sec-paxos-busd'],
    context_summary: 'MiCA 对 USDT 的实际影响案例——当监管要求与最大稳定币发行方不兼容时的市场后果。',
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
    source_urls: [
      'https://www.fsa.go.jp/en/news/2022/20220603.html',
    ],
    comparable_events: ['singapore-mas-stablecoin', 'hk-stablecoin-framework'],
    context_summary: '日本是 G7 中首个通过稳定币专门立法的国家，对亚洲其他市场的监管设计有示范作用。',
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
    source_urls: [
      'https://www.legislation.gov.uk/ukpga/2023/29/contents/enacted',
      'https://www.fca.org.uk/publications/discussion-papers/regulating-cryptoassets-phase-1-stablecoins',
    ],
    comparable_events: ['mica-eu', 'japan-stablecoin-law'],
    context_summary: '英国作为主要金融中心，其稳定币监管路径对全球合规框架有重要参考意义。',
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
    source_urls: [
      'https://www.mas.gov.sg/news/media-releases/2023/mas-finalises-stablecoin-regulatory-framework',
    ],
    comparable_events: ['japan-stablecoin-law', 'hk-stablecoin-framework'],
    context_summary: '新加坡是亚洲首个推出完整稳定币许可框架的司法管辖区，StraitsX 获批是首例。',
  },
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
      'https://www.hkma.gov.hk/eng/news-and-media/press-releases/2024/03/20240312-3/',
    ],
    comparable_events: ['singapore-mas-stablecoin', 'japan-stablecoin-law'],
    context_summary: '香港稳定币沙盒是亚太地区监管竞争的缩影，京东等本土企业参与体现了大陆资本的布局意图。',
  },

  // ════════════════════════════════════════════════════════════
  // 稳定币发行 / 市值里程碑
  // ════════════════════════════════════════════════════════════

  {
    id: 'usdt-100b',
    entity: 'Tether',
    type: 'market_cap_change',
    milestones: [
      { date: '2014-10-06', event: 'USDT 发行 (原名 Realcoin)' },
      { date: '2020-01-01', event: 'USDT 市值首次突破 $4B' },
      { date: '2021-04-01', event: 'USDT 市值首次突破 $40B' },
      { date: '2024-03-04', event: 'USDT 市值首次突破 $100B' },
      { date: '2025-03-01', event: 'USDT 市值突破 $140B' },
    ],
    metrics: {
      '4b_to_40b_days': 456,
      '40b_to_100b_days': 1069,
      '100b_to_140b_days': 362,
      current_dominance: '~62% 稳定币市场',
    },
    tags: ['usdt', 'tether', 'market-cap', 'stablecoin', 'milestone'],
    source_urls: [
      'https://tether.to/en/transparency/',
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['usdc-growth-2021-2024', 'stablecoin-total-100b'],
    context_summary: 'USDT 从 $4B 到 $100B 的增长曲线是衡量任何新稳定币成长速度的终极基准。',
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
      { date: '2025-03-01', event: 'USDC 市值回升至 ~$60B' },
    ],
    metrics: {
      svb_depeg_low: '$0.87',
      svb_recovery_time_hours: 72,
      circle_svb_exposure: '$3.3B',
      peak_market_cap: '$55B',
      post_svb_low: '$24B',
    },
    tags: ['usdc', 'circle', 'market-cap', 'stablecoin', 'svb'],
    source_urls: [
      'https://www.circle.com/usdc',
      'https://defillama.com/stablecoin/usd-coin',
    ],
    comparable_events: ['usdt-100b', 'usdc-svb-depeg', 'usdc-supply-contraction'],
    context_summary: 'USDC 经历了完整的增长-收缩-恢复周期，是分析稳定币韧性和市场信心恢复的核心案例。',
  },
  {
    id: 'usdc-supply-contraction',
    entity: 'Circle',
    type: 'market_cap_change',
    milestones: [
      { date: '2022-06-01', event: 'USDC 市值峰值 ~$55B' },
      { date: '2023-03-11', event: 'SVB 脱钩加速流出' },
      { date: '2023-10-01', event: 'USDC 市值跌至 ~$24B (较峰值 -56%)' },
      { date: '2024-06-01', event: 'USDC 市值开始反弹至 ~$33B' },
    ],
    metrics: {
      peak_market_cap: '$55B',
      trough_market_cap: '$24B',
      decline_percent: '-56%',
      contraction_duration_months: 16,
      primary_cause: 'SVB 脱钩 + 利率上升导致资金回流传统市场',
    },
    tags: ['usdc', 'circle', 'market-cap', 'contraction', 'stablecoin'],
    source_urls: [
      'https://defillama.com/stablecoin/usd-coin',
    ],
    comparable_events: ['usdc-svb-depeg', 'usdt-dominance-post-svb'],
    context_summary: 'USDC 2022-2023 的供给收缩是理解 Tether 市场份额跃升和 Circle 营收压力的关键背景。',
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
    tags: ['ust', 'terra', 'luna', 'depeg', 'collapse', 'stablecoin', 'algorithmic'],
    source_urls: [
      'https://www.coindesk.com/markets/2022/05/11/ust-peg-slips-below-050-as-crypto-selloff-continues/',
      'https://defillama.com/stablecoin/terrausd',
    ],
    comparable_events: ['iron-finance-collapse', 'fei-protocol', 'usdd-tron'],
    context_summary: 'UST 崩盘是稳定币历史上最大的系统性事件，直接催生了全球稳定币监管立法浪潮。',
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
    source_urls: [
      'https://www.circle.com/blog/an-update-on-usdc-and-silicon-valley-bank',
      'https://www.federalreserve.gov/newsevents/pressreleases/monetary20230312b.htm',
    ],
    comparable_events: ['ust-collapse', 'usdc-supply-contraction', 'usdt-dominance-post-svb'],
    context_summary: 'USDC SVB 脱钩事件暴露了法币储备集中于单一银行的风险，促使稳定币发行方多元化银行关系。',
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
    source_urls: [
      'https://defillama.com/stablecoins',
      'https://tether.to/en/transparency/',
    ],
    comparable_events: ['usdc-svb-depeg', 'usdc-supply-contraction'],
    context_summary: 'SVB 后 USDT 的市场份额跃升说明稳定币竞争中，监管合规并不一定带来市场份额优势。',
  },
  {
    id: 'stablecoin-total-100b',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2021-08-01', event: '稳定币总市值首次突破 $100B' },
      { date: '2022-05-01', event: '稳定币总市值峰值 ~$180B (UST 崩盘前)' },
      { date: '2022-07-01', event: 'UST 崩盘后总市值跌至 ~$150B' },
      { date: '2024-11-01', event: '稳定币总市值重回 $170B+' },
      { date: '2025-03-01', event: '稳定币总市值突破 $225B' },
    ],
    metrics: {
      first_100b_date: '2021-08',
      peak_2022: '~$180B',
      post_ust_low: '~$130B',
      current_ath: '$225B+',
    },
    tags: ['market-cap', 'stablecoin', 'milestone', 'total-market'],
    source_urls: [
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['stablecoin-payments-volume-2024', 'usdt-100b'],
    context_summary: '稳定币总市值的增长轨迹是衡量行业整体健康度和采用率的宏观指标。',
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
    source_urls: [
      'https://defillama.com/stablecoins',
      'https://visa.com/corporate/about-visa',
    ],
    comparable_events: ['stablecoin-total-100b'],
    context_summary: '稳定币链上交易量接近 Visa 是证明稳定币作为支付网络规模的关键数据点。',
  },

  // ════════════════════════════════════════════════════════════
  // 稳定币产品发布
  // ════════════════════════════════════════════════════════════

  {
    id: 'dai-creation',
    entity: 'MakerDAO',
    type: 'product_launch',
    milestones: [
      { date: '2017-12-18', event: 'Single-Collateral DAI (SAI) 上线，仅支持 ETH 抵押' },
      { date: '2019-11-18', event: 'Multi-Collateral DAI (MCD) 上线，支持多种抵押品' },
      { date: '2022-10-01', event: 'DAI 市值稳定在 $5-6B 区间' },
    ],
    metrics: {
      initial_collateral: 'ETH only',
      mcd_collateral_count: '10+ 资产',
      stability_fee_range: '0-8%',
      peak_market_cap: '$10B (2022-02)',
    },
    tags: ['dai', 'makerdao', 'defi', 'stablecoin', 'product-launch', 'cdp'],
    source_urls: [
      'https://blog.makerdao.com/multi-collateral-dai-is-live/',
      'https://defillama.com/stablecoin/dai',
    ],
    comparable_events: ['sky-usds-rebrand', 'frax-v3', 'aave-gho-launch'],
    context_summary: 'DAI 是首个去中心化超额抵押稳定币，其 CDP 模型成为 DeFi 稳定币设计的原型。',
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
    source_urls: [
      'https://blog.makerdao.com/introducing-sky-protocol/',
      'https://defillama.com/stablecoin/usds',
    ],
    comparable_events: ['dai-creation', 'paxos-usdp-rebrand'],
    context_summary: 'MakerDAO 重塑为 Sky 标志着 DeFi 原生稳定币向更主流品牌策略的转型。',
  },
  {
    id: 'pyusd-launch',
    entity: 'PayPal',
    type: 'product_launch',
    milestones: [
      { date: '2023-08-07', event: 'PayPal 发布 PYUSD，Paxos 发行，以太坊链' },
      { date: '2024-05-29', event: 'PYUSD 上线 Solana' },
      { date: '2024-08-01', event: 'PYUSD 市值突破 $1B' },
      { date: '2025-01-01', event: 'PYUSD 市值回落至 ~$500M' },
    ],
    metrics: {
      launch_to_1b_days: 360,
      issuer: 'Paxos Trust',
      initial_chain: 'Ethereum',
      expanded_chain: 'Solana',
      peak_market_cap: '$1B',
    },
    tags: ['product-launch', 'pyusd', 'paypal', 'stablecoin', 'paxos'],
    source_urls: [
      'https://newsroom.paypal-corp.com/2023-08-07-PayPal-Launches-U-S-Dollar-Stablecoin',
      'https://defillama.com/stablecoin/paypal-usd',
    ],
    comparable_events: ['ripple-rlusd', 'world-liberty-usd0'],
    context_summary: 'PYUSD 是首个由传统支付巨头发行的稳定币，其采用率是衡量 Web2→Web3 跨越的标尺。',
  },
  {
    id: 'ripple-rlusd',
    entity: 'Ripple',
    type: 'product_launch',
    milestones: [
      { date: '2024-12-17', event: 'Ripple 发布 RLUSD 稳定币 (NYDFS 批准)' },
      { date: '2025-01-15', event: 'RLUSD 市值达 ~$100M' },
    ],
    metrics: {
      regulator: 'NYDFS',
      chains: 'XRP Ledger, Ethereum',
      backing: '1:1 美元存款 + 美国国债',
    },
    tags: ['product-launch', 'ripple', 'rlusd', 'stablecoin', 'nydfs'],
    source_urls: [
      'https://ripple.com/solutions/stablecoin/',
      'https://www.dfs.ny.gov/',
    ],
    comparable_events: ['pyusd-launch', 'world-liberty-usd0'],
    context_summary: 'RLUSD 是 Ripple 从 XRP 支付扩展至稳定币的战略举措，其 NYDFS 许可是合规优势。',
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
    source_urls: [
      'https://www.worldlibertyfinancial.com/',
    ],
    comparable_events: ['pyusd-launch', 'ripple-rlusd'],
    context_summary: '政治关联稳定币的出现标志着稳定币成为美国政治议题的新阶段。',
  },
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
      'https://tether.to/en/tether-introduces-usdt0/',
    ],
    comparable_events: ['circle-cctp-launch'],
    context_summary: 'USDT0 是 Tether 解决跨链碎片化问题的方案，与 Circle 的 CCTP 形成直接竞争。',
  },
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
      'https://www.circle.com/cross-chain-transfer-protocol',
    ],
    comparable_events: ['tether-usdt0-launch', 'solana-usdc-native'],
    context_summary: 'CCTP 是稳定币原生跨链传输的行业标准之一，避免了传统桥接的安全风险。',
  },
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
      'https://www.circle.com/blog/usdc-now-available-natively-on-solana',
    ],
    comparable_events: ['usdc-base-launch', 'circle-cctp-launch'],
    context_summary: 'Solana 原生 USDC 替代桥接版是稳定币多链部署策略的典型案例。',
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
    source_urls: [
      'https://www.circle.com/blog/usdc-now-available-natively-on-base',
    ],
    comparable_events: ['solana-usdc-native'],
    context_summary: 'USDC 在 Base 的快速增长展示了 L2 对稳定币流通的放大效应。',
  },
  {
    id: 'fdusd-launch',
    entity: 'First Digital',
    type: 'product_launch',
    milestones: [
      { date: '2023-06-01', event: 'First Digital USD (FDUSD) 发行，香港注册' },
      { date: '2023-09-01', event: 'Binance 将交易手续费减免切换至 FDUSD (替代 BUSD)' },
      { date: '2024-04-01', event: 'FDUSD 市值达 ~$4B' },
    ],
    metrics: {
      issuer: 'First Digital Trust (Hong Kong)',
      primary_exchange: 'Binance',
      peak_market_cap: '~$4B',
      chains: 'Ethereum, BNB Chain',
    },
    tags: ['product-launch', 'fdusd', 'first-digital', 'binance', 'stablecoin', 'hong-kong'],
    source_urls: [
      'https://firstdigitallabs.com/',
      'https://defillama.com/stablecoin/first-digital-usd',
    ],
    comparable_events: ['sec-paxos-busd', 'busd-launch-growth'],
    context_summary: 'FDUSD 是 BUSD 被 SEC 终止后 Binance 扶持的替代品，其增长完全依赖 Binance 的流量补贴。',
  },
  {
    id: 'busd-launch-growth',
    entity: 'Paxos/Binance',
    type: 'product_launch',
    milestones: [
      { date: '2019-09-05', event: 'Binance USD (BUSD) 发行，Paxos 铸造，NYDFS 批准' },
      { date: '2021-11-01', event: 'BUSD 市值突破 $14B' },
      { date: '2022-11-01', event: 'BUSD 市值峰值 ~$23B' },
      { date: '2023-02-13', event: 'SEC Wells Notice + NYDFS 停铸令' },
    ],
    metrics: {
      peak_market_cap: '$23B',
      issuer: 'Paxos Trust',
      regulator: 'NYDFS',
      time_to_peak_months: 39,
    },
    tags: ['product-launch', 'busd', 'binance', 'paxos', 'stablecoin', 'nydfs'],
    source_urls: [
      'https://paxos.com/busd/',
      'https://defillama.com/stablecoin/binance-usd',
    ],
    comparable_events: ['sec-paxos-busd', 'fdusd-launch'],
    context_summary: 'BUSD 从发行到巅峰再到被终止的完整生命周期，是监管风险如何瞬间摧毁 $23B 稳定币的经典案例。',
  },
  {
    id: 'gusd-launch',
    entity: 'Gemini',
    type: 'product_launch',
    milestones: [
      { date: '2018-09-10', event: 'Gemini Dollar (GUSD) 发行，NYDFS 首批批准的稳定币之一' },
      { date: '2021-01-01', event: 'GUSD 市值达 ~$300M' },
      { date: '2024-01-01', event: 'GUSD 市值萎缩至 ~$60M' },
    ],
    metrics: {
      regulator: 'NYDFS',
      peak_market_cap: '~$300M',
      current_market_cap: '~$60M',
      issuer: 'Gemini Trust Company',
    },
    tags: ['product-launch', 'gusd', 'gemini', 'stablecoin', 'nydfs', 'regulated'],
    source_urls: [
      'https://www.gemini.com/dollar',
      'https://defillama.com/stablecoin/gemini-dollar',
    ],
    comparable_events: ['paxos-usdp-rebrand', 'busd-launch-growth'],
    context_summary: 'GUSD 是早期受监管稳定币的代表，其未能规模化说明合规并非市场成功的充分条件。',
  },
  {
    id: 'paxos-usdp-rebrand',
    entity: 'Paxos',
    type: 'product_launch',
    milestones: [
      { date: '2018-09-10', event: 'Paxos Standard (PAX) 发行，NYDFS 批准' },
      { date: '2021-08-24', event: 'PAX 更名为 Pax Dollar (USDP)' },
      { date: '2024-01-01', event: 'USDP 市值 ~$150M' },
    ],
    metrics: {
      regulator: 'NYDFS',
      peak_market_cap: '~$1B',
      current_market_cap: '~$150M',
      rebrand_date: '2021-08-24',
    },
    tags: ['product-launch', 'usdp', 'paxos', 'stablecoin', 'nydfs', 'regulated'],
    source_urls: [
      'https://paxos.com/usdp/',
      'https://defillama.com/stablecoin/pax-dollar',
    ],
    comparable_events: ['gusd-launch', 'busd-launch-growth'],
    context_summary: 'USDP (原 PAX) 是 Paxos 自有品牌稳定币，与 Paxos 代发的 BUSD/PYUSD 形成商业模式对比。',
  },
  {
    id: 'circle-eurc-launch',
    entity: 'Circle',
    type: 'product_launch',
    milestones: [
      { date: '2022-06-16', event: 'Circle 发布 EURC (Euro Coin)，以太坊原生' },
      { date: '2024-06-30', event: 'EURC 获得 MiCA 合规授权 (法国 EMI 牌照)' },
      { date: '2025-01-01', event: 'EURC 市值达 ~$150M' },
    ],
    metrics: {
      initial_chain: 'Ethereum',
      expanded_chains: 'Solana, Avalanche, Base',
      mica_license: 'French EMI (Société Générale partnership)',
      market_cap: '~$150M',
    },
    tags: ['product-launch', 'eurc', 'circle', 'euro', 'stablecoin', 'mica'],
    source_urls: [
      'https://www.circle.com/eurc',
      'https://defillama.com/stablecoin/euro-coin',
    ],
    comparable_events: ['tether-eurt', 'mica-eu'],
    context_summary: 'EURC 是 MiCA 合规的欧元稳定币标杆，直接受益于 USDT 在欧洲下架带来的市场空间。',
  },
  {
    id: 'tether-eurt',
    entity: 'Tether',
    type: 'product_launch',
    milestones: [
      { date: '2016-01-01', event: 'Tether 推出 EURT (欧元稳定币)' },
      { date: '2024-12-30', event: 'MiCA 生效后 EURT 面临合规挑战' },
    ],
    metrics: {
      peak_market_cap: '~$500M',
      current_market_cap: '~$37M',
      mica_status: '未获授权',
    },
    tags: ['product-launch', 'eurt', 'tether', 'euro', 'stablecoin'],
    source_urls: [
      'https://tether.to/en/',
      'https://defillama.com/stablecoin/tether-eurt',
    ],
    comparable_events: ['circle-eurc-launch', 'eu-mica-tether-delisting'],
    context_summary: 'EURT 的萎缩与 EURC 的增长形成对比，说明监管合规在欧元稳定币竞争中的决定性作用。',
  },
  {
    id: 'liquity-lusd',
    entity: 'Liquity',
    type: 'product_launch',
    milestones: [
      { date: '2021-04-05', event: 'Liquity LUSD 上线，完全去中心化（不可治理、不可升级）' },
      { date: '2022-05-01', event: 'LUSD 市值峰值 ~$1.5B' },
      { date: '2024-01-01', event: 'LUSD 市值稳定在 ~$300M' },
    ],
    metrics: {
      mechanism: '超额抵押 (ETH，最低 110% CR)',
      governance: '无治理 (不可变合约)',
      peak_market_cap: '~$1.5B',
      one_time_fee: '0.5% 铸造费',
    },
    tags: ['product-launch', 'lusd', 'liquity', 'defi', 'stablecoin', 'decentralized'],
    source_urls: [
      'https://www.liquity.org/',
      'https://defillama.com/stablecoin/liquity-usd',
    ],
    comparable_events: ['dai-creation', 'frax-v3'],
    context_summary: 'LUSD 是完全不可治理的稳定币实验，代表了去中心化最大主义的设计哲学。',
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
    tags: ['depeg', 'collapse', 'iron-finance', 'titan', 'algorithmic', 'polygon', 'stablecoin'],
    source_urls: [
      'https://www.coindesk.com/markets/2021/06/17/iron-finances-titan-token-falls-to-near-zero-in-defi-panic-selling/',
    ],
    comparable_events: ['ust-collapse', 'fei-protocol'],
    context_summary: 'Iron Finance 是 UST 崩盘前最大的算法稳定币失败案例，证明了部分抵押设计的脆弱性。',
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
    source_urls: [
      'https://www.coindesk.com/tech/2022/08/20/algorithmic-stablecoin-project-fei-protocol-to-wind-down/',
    ],
    comparable_events: ['iron-finance-collapse', 'ust-collapse'],
    context_summary: 'FEI 的"直接激励"机制失败展示了算法稳定币在脱钩时流动性陷阱的致命缺陷。',
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
    source_urls: [
      'https://usdd.io/',
      'https://defillama.com/stablecoin/usdd',
    ],
    comparable_events: ['ust-collapse', 'frax-v3'],
    context_summary: 'USDD 在 UST 崩盘后立刻将模式切换为超额抵押，是算法稳定币向安全模式退却的典型案例。',
  },
  {
    id: 'aave-gho-launch',
    entity: 'Aave',
    type: 'product_launch',
    milestones: [
      { date: '2023-07-15', event: 'GHO 稳定币在 Ethereum 主网上线' },
      { date: '2024-03-01', event: 'GHO 市值突破 $50M' },
      { date: '2025-01-01', event: 'GHO 市值达 ~$180M' },
    ],
    metrics: {
      launch_chain: 'Ethereum',
      mechanism: 'Aave V3 抵押铸造',
      initial_borrow_rate: '1.5%',
    },
    tags: ['product-launch', 'gho', 'aave', 'defi', 'stablecoin'],
    source_urls: [
      'https://governance.aave.com/t/gho-development-update/14442',
      'https://defillama.com/stablecoin/gho',
    ],
    comparable_events: ['crvusd-launch', 'frax-v3'],
    context_summary: 'GHO 是 DeFi 借贷协议发行自有稳定币的趋势代表，Aave 的用户基础是其增长引擎。',
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
    source_urls: [
      'https://docs.frax.finance/',
      'https://defillama.com/stablecoin/frax',
    ],
    comparable_events: ['dai-creation', 'aave-gho-launch'],
    context_summary: 'Frax 从算法模式转向全抵押是 UST 崩盘后整个行业向安全性靠拢的缩影。',
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
    source_urls: [
      'https://docs.curve.fi/crvUSD/overview/',
      'https://defillama.com/stablecoin/crvusd',
    ],
    comparable_events: ['aave-gho-launch', 'frax-v3'],
    context_summary: 'crvUSD 的 LLAMMA 软清算机制是稳定币清算设计的重要创新。',
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
    source_urls: [
      'https://gold.tether.to/',
      'https://tether.to/en/transparency/',
    ],
    comparable_events: ['usdt-100b'],
    context_summary: 'XAUT 代表了稳定币从美元锚定扩展到其他资产（黄金）的趋势。',
  },

  // ════════════════════════════════════════════════════════════
  // TVL / DeFi 稳定币里程碑
  // ════════════════════════════════════════════════════════════

  {
    id: 'dai-tvl-growth',
    entity: 'MakerDAO',
    type: 'tvl_milestone',
    milestones: [
      { date: '2019-11-18', event: 'MakerDAO 上线多抵押 DAI (MCD)' },
      { date: '2021-05-01', event: 'DAI 市值首次突破 $5B' },
      { date: '2022-02-01', event: 'DAI 市值峰值 ~$10B' },
    ],
    metrics: {
      single_to_multi_collateral_date: '2019-11-18',
      time_to_5b_months: 18,
      peak_market_cap: '$10B (2022-02)',
    },
    tags: ['tvl', 'dai', 'makerdao', 'defi', 'stablecoin', 'milestone'],
    source_urls: [
      'https://defillama.com/stablecoin/dai',
    ],
    comparable_events: ['usde-growth', 'usdc-growth-2021-2024'],
    context_summary: 'DAI 从 MCD 上线到 $10B 的增长曲线是去中心化稳定币的增长基准。',
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
    source_urls: [
      'https://ethena.fi/',
      'https://defillama.com/stablecoin/ethena-usde',
    ],
    comparable_events: ['dai-tvl-growth', 'usual-protocol'],
    context_summary: 'USDe 4.5 个月达 $3B 是历史最快的稳定币增长，其合成美元模式是高收益驱动的采用典型。',
  },

  // ════════════════════════════════════════════════════════════
  // 执法 / 合规事件
  // ════════════════════════════════════════════════════════════

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
    comparable_events: ['sec-paxos-busd', 'tether-reserve-composition'],
    context_summary: '对 Tether 的执法是稳定币领域最重大的监管行动，直接推动了行业透明度标准的提升。',
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
    tags: ['enforcement', 'sec', 'paxos', 'busd', 'binance', 'wells-notice', 'stablecoin'],
    source_urls: [
      'https://paxos.com/2023/02/13/paxos-will-halt-minting-new-busd-tokens/',
      'https://www.dfs.ny.gov/consumers/alerts/Paxos_702',
    ],
    comparable_events: ['busd-launch-growth', 'fdusd-launch', 'tether-cftc-settlement'],
    context_summary: 'BUSD 被终止是 SEC 将稳定币归类为证券的首次尝试，直接改变了 Binance 的稳定币策略。',
  },

  // ════════════════════════════════════════════════════════════
  // 融资
  // ════════════════════════════════════════════════════════════

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
      'https://www.circle.com/blog/circle-raises-400m-funding-round',
    ],
    comparable_events: ['circle-s1-2024', 'ethena-funding'],
    context_summary: 'BlackRock 领投 Circle 标志着传统资管巨头对稳定币基础设施的战略性押注。',
  },
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
      'https://tether.to/en/tether-reports-record-breaking-profits/',
    ],
    comparable_events: ['tether-reserve-composition', 'circle-s1-2024'],
    context_summary: 'Tether 单季利润超过多数银行，证明了稳定币发行在高利率环境中的盈利能力。',
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
    tags: ['funding', 'ethena', 'usde', 'dragonfly', 'defi', 'stablecoin'],
    source_urls: [
      'https://www.theblock.co/post/274192/ethena-labs-funding-round',
    ],
    comparable_events: ['circle-series-f', 'agora-funding'],
    context_summary: 'Ethena 以 $20M 融资撬动 $5B+ TVL，是资本效率极高的稳定币项目案例。',
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
    source_urls: [
      'https://www.theblock.co/post/299547/m0-series-a-bain-capital-crypto',
    ],
    comparable_events: ['agora-funding', 'mountain-protocol-funding'],
    context_summary: 'M^0 定位为稳定币的"发行层"基础设施，代表了稳定币堆栈的模块化趋势。',
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
    source_urls: [
      'https://www.theblock.co/post/286425/agora-seed-round',
    ],
    comparable_events: ['m0-foundation-funding', 'mountain-protocol-funding'],
    context_summary: 'Agora 代表了新一批瞄准机构市场的稳定币初创公司。',
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
    source_urls: [
      'https://www.coindesk.com/business/2023/09/12/mountain-protocol-raises-8m-for-yield-bearing-stablecoin/',
    ],
    comparable_events: ['agora-funding', 'ondo-usdy'],
    context_summary: 'Mountain Protocol 的 USDM 是收益型稳定币赛道的代表项目。',
  },

  // ════════════════════════════════════════════════════════════
  // 合作 / 收购
  // ════════════════════════════════════════════════════════════

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
    tags: ['acquisition', 'stripe', 'bridge', 'b2b', 'infrastructure', 'partnership', 'stablecoin'],
    source_urls: [
      'https://stripe.com/blog/stripe-acquires-bridge',
    ],
    comparable_events: ['stripe-usdc-payouts', 'visa-usdc-settlement'],
    context_summary: 'Stripe 以 $1.1B 收购 Bridge 是稳定币基础设施领域有史以来最大的收购案。',
  },
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
    tags: ['partnership', 'visa', 'usdc', 'circle', 'settlement', 'payments', 'stablecoin'],
    source_urls: [
      'https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.17821.html',
      'https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.19881.html',
    ],
    comparable_events: ['mastercard-stablecoin', 'stripe-usdc-payouts'],
    context_summary: 'Visa 用 USDC 结算是传统卡网络拥抱稳定币的里程碑，验证了稳定币在企业支付中的可行性。',
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
    source_urls: [
      'https://www.mastercard.com/news/press/2023/june/mastercard-multi-token-network/',
    ],
    comparable_events: ['visa-usdc-settlement', 'stripe-bridge-acquisition'],
    context_summary: 'Mastercard MTN 让银行通过卡网络使用稳定币结算，与 Visa 形成两大卡网络的竞争格局。',
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
    tags: ['product-launch', 'stripe', 'usdc', 'payments', 'merchant', 'stablecoin'],
    source_urls: [
      'https://stripe.com/blog/adding-support-for-usdc-payments',
    ],
    comparable_events: ['stripe-bridge-acquisition', 'paypal-xoom-stablecoin'],
    context_summary: 'Stripe 回归加密支付并选择 USDC 说明稳定币已成为 Web2 支付基础设施的标准组件。',
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
    tags: ['product-launch', 'paypal', 'pyusd', 'payments', 'merchant', 'stablecoin'],
    source_urls: [
      'https://newsroom.paypal-corp.com/2024-09-25-PayPal-Enables-Business-Accounts-to-Buy-Hold-and-Sell-Cryptocurrency',
    ],
    comparable_events: ['pyusd-launch', 'stripe-usdc-payouts'],
    context_summary: 'PayPal 将 PYUSD 整合到商户支付和跨境汇款，是稳定币进入主流消费者场景的关键步骤。',
  },
  {
    id: 'shopify-stablecoin-checkout',
    entity: 'Shopify',
    type: 'partnership',
    milestones: [
      { date: '2022-06-23', event: 'Shopify 通过 Strike 集成支持 USDC 商户收款' },
      { date: '2024-08-01', event: 'Shopify 扩展加密支付选项，支持多种稳定币' },
    ],
    metrics: {
      merchants_on_shopify: '4.4M+',
      integration_partner: 'Strike, Solana Pay',
    },
    tags: ['partnership', 'shopify', 'usdc', 'stablecoin', 'payments', 'merchant', 'e-commerce'],
    source_urls: [
      'https://www.shopify.com/blog/crypto-payments',
    ],
    comparable_events: ['stripe-usdc-payouts', 'paypal-xoom-stablecoin'],
    context_summary: 'Shopify 接入稳定币支付为数百万中小商户提供了链上收款能力。',
  },
  {
    id: 'grab-stablecoin-integration',
    entity: 'Grab',
    type: 'partnership',
    milestones: [
      { date: '2024-09-18', event: 'Grab 在新加坡与 Circle 合作，支持 USDC 充值 GrabPay 钱包' },
    ],
    metrics: {
      region: '东南亚 (新加坡首发)',
      partner: 'Circle, Triple-A',
      grab_users: '180M+',
    },
    tags: ['partnership', 'grab', 'usdc', 'circle', 'stablecoin', 'southeast-asia', 'payments'],
    source_urls: [
      'https://www.circle.com/blog/grab-and-circle-partner-to-bring-usdc-to-southeast-asia', // verify
    ],
    comparable_events: ['shopify-stablecoin-checkout', 'visa-usdc-settlement'],
    context_summary: 'Grab 是东南亚最大的超级App，其稳定币整合是新兴市场采用的重要信号。',
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
    tags: ['partnership', 'mantle', 'ondo', 'usdy', 'rwa', 'treasury', 'stablecoin'],
    source_urls: [
      'https://www.mantle.xyz/blog/announcements/mantle-treasury-diversification-ondo',
    ],
    comparable_events: ['ondo-usdy', 'blackrock-buidl-fund'],
    context_summary: 'DAO 国库配置 RWA 稳定币产品是 DeFi 资产管理成熟化的标志。',
  },

  // ════════════════════════════════════════════════════════════
  // RWA / 代币化
  // ════════════════════════════════════════════════════════════

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
    tags: ['product-launch', 'blackrock', 'buidl', 'tokenization', 'rwa', 'treasury', 'stablecoin'],
    source_urls: [
      'https://securitize.io/learn/press/blackrock-launches-first-tokenized-fund-buidl-on-the-ethereum-network',
    ],
    comparable_events: ['franklin-benji', 'ondo-usdy'],
    context_summary: 'BlackRock BUIDL 是全球最大资管公司进入代币化市场的标志，模糊了国债基金与稳定币的边界。',
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
    tags: ['product-launch', 'franklin-templeton', 'benji', 'tokenization', 'rwa', 'stablecoin'],
    source_urls: [
      'https://www.franklintempleton.com/investments/options/money-market-funds/products/702/SINGLCLASS/franklin-on-chain-us-government-money-fund',
    ],
    comparable_events: ['blackrock-buidl-fund', 'ondo-usdy'],
    context_summary: 'Franklin BENJI 是首个上链的传统货币市场基金，比 BlackRock BUIDL 早 3 年。',
  },
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
    tags: ['product-launch', 'ondo', 'usdy', 'rwa', 'tokenization', 'yield', 'treasury', 'stablecoin'],
    source_urls: [
      'https://ondo.finance/',
      'https://defillama.com/protocol/ondo-finance',
    ],
    comparable_events: ['blackrock-buidl-fund', 'usual-protocol'],
    context_summary: 'USDY 是 DeFi 原生 RWA 稳定币的典型，模糊了收益型基金和稳定币的界限。',
  },
  {
    id: 'usual-protocol',
    entity: 'Usual',
    type: 'product_launch',
    milestones: [
      { date: '2024-07-10', event: 'Usual 推出 USD0 (RWA 抵押稳定币)' },
      { date: '2024-12-18', event: 'Binance 上线 USUAL 代币' },
      { date: '2025-01-01', event: 'USD0 TVL 达 $1.4B' },
    ],
    metrics: {
      backing: '短期美国国债 (Hashnote, Ondo)',
      tvl_6m: '$1.4B',
    },
    tags: ['product-launch', 'usual', 'usd0', 'stablecoin', 'rwa', 'defi'],
    source_urls: [
      'https://usual.money/',
      'https://defillama.com/stablecoin/usual-usd',
    ],
    comparable_events: ['ondo-usdy', 'usde-growth'],
    context_summary: 'USD0 结合了 RWA 收益和 DeFi 可组合性，是 2024 年增长最快的 RWA 稳定币之一。',
  },

  // ════════════════════════════════════════════════════════════
  // 审计 / 透明度
  // ════════════════════════════════════════════════════════════

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
    tags: ['audit', 'circle', 'usdc', 'compliance', 'deloitte', 'soc2', 'stablecoin'],
    source_urls: [
      'https://www.circle.com/usdc-transparency',
    ],
    comparable_events: ['tether-reserve-composition'],
    context_summary: 'Circle 的 SOC 2 审计和月度储备报告设立了稳定币透明度的行业标杆。',
  },
  {
    id: 'tether-reserve-composition',
    entity: 'Tether',
    type: 'product_launch',
    milestones: [
      { date: '2021-08-09', event: 'Tether 首次公布储备详细分类 (商业票据占比 ~50%)' },
      { date: '2023-03-01', event: 'Tether 储备中商业票据占比降至 0%，转为美国国债' },
      { date: '2024-01-01', event: 'Tether 美国国债持有量达 $72B+，为全球前 20 大持有者' },
    ],
    metrics: {
      cp_peak_share: '~50%',
      cp_current_share: '0%',
      us_treasury_share: '~80%',
      attestor: 'BDO Italia',
      treasury_holdings: '$72B+',
    },
    tags: ['audit', 'tether', 'usdt', 'reserve', 'transparency', 'stablecoin', 'treasury'],
    source_urls: [
      'https://tether.to/en/transparency/',
    ],
    comparable_events: ['circle-soc2-audit', 'tether-cftc-settlement'],
    context_summary: 'Tether 从商业票据到美国国债的储备转型是监管压力推动行业安全化的典型案例。',
  },

  // ════════════════════════════════════════════════════════════
  // B2B 基础设施
  // ════════════════════════════════════════════════════════════

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
    tags: ['product-launch', 'fireblocks', 'usdc', 'infrastructure', 'b2b', 'api', 'stablecoin'],
    source_urls: [
      'https://www.fireblocks.com/blog/fireblocks-tokenization-engine/', // verify
    ],
    comparable_events: ['circle-cctp-launch', 'stripe-bridge-acquisition'],
    context_summary: 'Fireblocks 的稳定币 API 降低了企业铸造/赎回 USDC 的技术门槛。',
  },
  {
    id: 'brale-stablecoin-api',
    entity: 'Brale',
    type: 'product_launch',
    milestones: [
      { date: '2023-01-01', event: 'Brale (原 Stablecorp) 推出企业稳定币 API，支持白标发行' },
      { date: '2024-06-01', event: 'Brale 获得多个州货币传输许可' },
    ],
    metrics: {
      product: '白标稳定币发行+合规 API',
      chains_supported: 'Ethereum, Solana, Polygon',
    },
    tags: ['product-launch', 'brale', 'infrastructure', 'b2b', 'api', 'stablecoin', 'white-label'],
    source_urls: [
      'https://www.brale.xyz/',
    ],
    comparable_events: ['fireblocks-stablecoin-infra', 'm0-foundation-funding'],
    context_summary: 'Brale 代表了"稳定币即服务"的 B2B 基础设施趋势。',
  },
  {
    id: 'paxos-stablecoin-as-service',
    entity: 'Paxos',
    type: 'product_launch',
    milestones: [
      { date: '2023-08-07', event: 'Paxos 作为 PayPal PYUSD 的发行方，确立 Stablecoin-as-a-Service 模式' },
      { date: '2024-12-01', event: 'Paxos 获得 MAS 主要支付机构许可 (新加坡)' },
    ],
    metrics: {
      clients: 'PayPal (PYUSD), Mercado Libre (MUSD)',
      regulatory_licenses: 'NYDFS, MAS',
      model: '白标稳定币发行+合规+托管',
    },
    tags: ['product-launch', 'paxos', 'infrastructure', 'b2b', 'stablecoin-as-service', 'stablecoin'],
    source_urls: [
      'https://paxos.com/stablecoin-as-a-service/',
    ],
    comparable_events: ['pyusd-launch', 'brale-stablecoin-api'],
    context_summary: 'Paxos 的 StaaS 模式让传统企业无需自建合规基础设施即可发行品牌稳定币。',
  },
  {
    id: 'mercado-libre-musd',
    entity: 'Mercado Libre',
    type: 'product_launch',
    milestones: [
      { date: '2024-12-01', event: 'Mercado Libre 通过 Paxos 在巴西发行 MUSD 稳定币' },
    ],
    metrics: {
      issuer_partner: 'Paxos',
      market: '巴西',
      mercado_libre_users: '200M+',
    },
    tags: ['product-launch', 'mercado-libre', 'musd', 'paxos', 'stablecoin', 'latam', 'brazil'],
    source_urls: [
      'https://paxos.com/blog/mercado-libre-meli-dollar/', // verify
    ],
    comparable_events: ['pyusd-launch', 'paxos-stablecoin-as-service'],
    context_summary: '拉美最大电商平台发行稳定币是新兴市场 Web2 公司采用稳定币的标志性事件。',
  },

  // ════════════════════════════════════════════════════════════
  // 链上里程碑 + 市场结构
  // ════════════════════════════════════════════════════════════

  {
    id: 'tron-usdt-dominance',
    entity: 'Tron',
    type: 'market_cap_change',
    milestones: [
      { date: '2019-04-17', event: 'USDT 从 Omni (Bitcoin) 扩展到 TRON TRC-20' },
      { date: '2021-01-01', event: 'Tron USDT 流通量超过 Ethereum USDT' },
      { date: '2024-01-01', event: 'Tron 上 USDT 达 $50B+，占 USDT 总量 ~50%' },
    ],
    metrics: {
      tron_usdt_share: '~50%',
      tron_usdt_amount: '$50B+',
      use_case: '新兴市场 P2P 转账、低手续费',
    },
    tags: ['usdt', 'tether', 'tron', 'market-cap', 'stablecoin', 'chain-distribution'],
    source_urls: [
      'https://tronscan.org/#/',
      'https://defillama.com/stablecoins/Tron',
    ],
    comparable_events: ['usdt-100b', 'stablecoin-payments-volume-2024'],
    context_summary: 'Tron 承载约一半的 USDT 流通量，反映了新兴市场用户对低费用链的偏好。',
  },
  {
    id: 'stablecoin-depegging-index',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2022-05-09', event: 'UST 脱钩→归零，影响全市场稳定币信心' },
      { date: '2023-03-11', event: 'USDC SVB 脱钩至 $0.87，48 小时恢复' },
      { date: '2023-03-11', event: 'DAI 因 USDC 敞口联动脱钩至 $0.90' },
    ],
    metrics: {
      ust_loss: '$18B (永久)',
      usdc_svb_low: '$0.87 (48hr recovery)',
      dai_svb_low: '$0.90',
      total_depeg_events_2022_2023: '5+ 重大脱钩',
    },
    tags: ['depeg', 'stablecoin', 'market', 'risk', 'ust', 'usdc', 'dai'],
    source_urls: [
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['ust-collapse', 'usdc-svb-depeg'],
    context_summary: '2022-2023 年的集中脱钩事件是分析稳定币系统性风险的核心参照数据集。',
  },
  {
    id: 'stablecoin-200b-milestone',
    entity: 'Stablecoin Market',
    type: 'market_cap_change',
    milestones: [
      { date: '2025-01-15', event: '稳定币总市值首次突破 $200B' },
      { date: '2025-03-01', event: '稳定币总市值达 $225B+' },
    ],
    metrics: {
      total_market_cap: '$225B+',
      usdt_share: '~62%',
      usdc_share: '~26%',
      top5_concentration: '~95%',
    },
    tags: ['market-cap', 'stablecoin', 'milestone', 'total-market'],
    source_urls: [
      'https://defillama.com/stablecoins',
    ],
    comparable_events: ['stablecoin-total-100b'],
    context_summary: '$200B 里程碑标志着稳定币从加密原生工具向主流金融基础设施的转变。',
  },

  // ════════════════════════════════════════════════════════════
  // 更多稳定币产品 & 事件
  // ════════════════════════════════════════════════════════════

  {
    id: 'jpy-stablecoin-progmat',
    entity: 'MUFG / Progmat',
    type: 'product_launch',
    milestones: [
      { date: '2024-06-01', event: 'MUFG 旗下 Progmat 平台与 Binance Japan 合作测试日元稳定币' },
      { date: '2024-11-01', event: '日本银行联盟 DCJPY 测试网运行' },
    ],
    metrics: {
      platform: 'Progmat (MUFG)',
      currency: 'JPY',
      framework: '日本《资金决济法》',
    },
    tags: ['product-launch', 'jpy', 'japan', 'mufg', 'stablecoin', 'bank'],
    source_urls: [
      'https://progmat.co.jp/en/',
    ],
    comparable_events: ['japan-stablecoin-law'],
    context_summary: '日本银行主导的日元稳定币是银行体系发行稳定币的全球首批案例之一。',
  },
  {
    id: 'societe-generale-eurcv',
    entity: 'Société Générale FORGE',
    type: 'product_launch',
    milestones: [
      { date: '2023-04-20', event: 'SG-FORGE 在 Ethereum 上发行 EUR CoinVertible (EURCV)' },
      { date: '2024-06-30', event: 'EURCV 获得 MiCA 授权' },
    ],
    metrics: {
      chain: 'Ethereum',
      regulator: 'AMF (France)',
      bank_tier: 'G-SIB (全球系统性重要银行)',
    },
    tags: ['product-launch', 'eurcv', 'societe-generale', 'euro', 'stablecoin', 'bank', 'mica'],
    source_urls: [
      'https://www.sgforge.com/',
    ],
    comparable_events: ['circle-eurc-launch', 'jpy-stablecoin-progmat'],
    context_summary: 'SG-FORGE 是全球首个由 G-SIB 银行发行的稳定币，代表了传统银行进入稳定币发行的新趋势。',
  },
  {
    id: 'jd-stablecoin-hk-sandbox',
    entity: 'JD.com (京东)',
    type: 'product_launch',
    milestones: [
      { date: '2024-07-18', event: '京东科技入选 HKMA 稳定币沙盒首批参与者' },
      { date: '2024-07-18', event: '测试港元稳定币 (HKD-pegged stablecoin)' },
    ],
    metrics: {
      sandbox: 'HKMA Stablecoin Sandbox',
      currency: 'HKD',
      status: '测试中',
    },
    tags: ['product-launch', 'jd', 'hong-kong', 'hkd', 'stablecoin', 'sandbox'],
    source_urls: [
      'https://www.hkma.gov.hk/eng/news-and-media/press-releases/2024/07/20240718-3/',
    ],
    comparable_events: ['hk-stablecoin-framework'],
    context_summary: '京东参与香港稳定币沙盒体现了中国科技巨头通过香港布局稳定币的路径。',
  },
  {
    id: 'tether-hadron-platform',
    entity: 'Tether',
    type: 'product_launch',
    milestones: [
      { date: '2024-11-14', event: 'Tether 推出 Hadron 平台，允许机构代币化任何资产 (股票、债券、积分等)' },
    ],
    metrics: {
      product: 'Hadron 代币化平台',
      target: '机构、基金管理人、政府',
      capabilities: '资产发行、KYC/AML、多链部署',
    },
    tags: ['product-launch', 'tether', 'hadron', 'tokenization', 'infrastructure', 'b2b'],
    source_urls: [
      'https://tether.to/en/tether-launches-hadron-by-tether/',
    ],
    comparable_events: ['paxos-stablecoin-as-service', 'blackrock-buidl-fund'],
    context_summary: 'Hadron 是 Tether 从稳定币发行扩展到通用代币化平台的战略多元化举措。',
  },
  {
    id: 'ethena-susde-pendle',
    entity: 'Ethena',
    type: 'tvl_milestone',
    milestones: [
      { date: '2024-04-01', event: 'sUSDe 成为 Pendle 上最大收益来源' },
      { date: '2024-07-01', event: 'sUSDe 在 Pendle 上的 TVL 超过 $1B' },
    ],
    metrics: {
      pendle_tvl: '$1B+',
      peak_implied_yield: '~50% (Pendle PT)',
      mechanism: 'sUSDe 的质押收益通过 Pendle 分离',
    },
    tags: ['tvl', 'ethena', 'susde', 'pendle', 'defi', 'yield', 'stablecoin'],
    source_urls: [
      'https://app.pendle.finance/',
      'https://ethena.fi/',
    ],
    comparable_events: ['usde-growth'],
    context_summary: 'sUSDe 在 Pendle 上的爆发式增长展示了收益型稳定币在 DeFi 可组合性中的杠杆效应。',
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
