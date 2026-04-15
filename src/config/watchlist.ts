// 关注实体列表 — 采集器和知识引擎共用
// 新增实体只需在此处添加

import type { EntityCategory } from '@/lib/types'

export interface WatchlistEntity {
  name: string
  aliases: string[]
  category: EntityCategory
  // 采集器需要的标识
  coin_ids?: { defillama?: string; coingecko?: string /* ROADMAP */ }
  sec_cik?: string
  ticker?: string
  blog_rss?: string
  github_org?: string
  website?: string
}

export const WATCHLIST: WatchlistEntity[] = [
  // ── 稳定币发行商 ──
  {
    name: 'Circle',
    aliases: ['USDC', 'Centre'],
    category: 'stablecoin_issuer',
    coin_ids: { defillama: 'usd-coin', coingecko: 'usd-coin' },
    sec_cik: '0001876042',
    ticker: undefined,
    blog_rss: 'https://www.circle.com/blog/rss.xml',
    github_org: 'circlefin',
    website: 'https://www.circle.com',
  },
  {
    name: 'Tether',
    aliases: ['USDT', 'Tether Holdings'],
    category: 'stablecoin_issuer',
    coin_ids: { defillama: 'tether', coingecko: 'tether' },
    website: 'https://tether.to',
  },
  {
    name: 'Ethena',
    aliases: ['USDe', 'Ethena Labs'],
    category: 'stablecoin_issuer',
    coin_ids: { defillama: 'ethena-usde', coingecko: 'ethena-usde' },
    github_org: 'ethena-labs',
    website: 'https://ethena.fi',
  },
  {
    name: 'PayPal (PYUSD)',
    aliases: ['PYUSD', 'PayPal USD', 'PayPal Stablecoin'],
    category: 'stablecoin_issuer',
    coin_ids: { defillama: 'paypal-usd', coingecko: 'paypal-usd' },
    ticker: 'PYPL',
    sec_cik: '0001633917',
    website: 'https://www.paypal.com',
  },
  {
    name: 'MakerDAO',
    aliases: ['Maker', 'DAI', 'Sky'],
    category: 'stablecoin_issuer',
    coin_ids: { defillama: 'dai', coingecko: 'dai' },
    github_org: 'makerdao',
    website: 'https://makerdao.com',
  },
  {
    name: 'Frax',
    aliases: ['FRAX', 'Frax Finance'],
    category: 'stablecoin_issuer',
    coin_ids: { defillama: 'frax', coingecko: 'frax' },
    github_org: 'FraxFinance',
    website: 'https://frax.finance',
  },
  {
    name: 'Agora',
    aliases: ['AUSD'],
    category: 'stablecoin_issuer',
    website: 'https://www.agora.finance',
  },
  {
    name: 'Paxos',
    aliases: ['USDP', 'Pax Dollar'],
    category: 'stablecoin_issuer',
    coin_ids: { defillama: 'pax-dollar', coingecko: 'pax-dollar' },
    website: 'https://paxos.com',
  },
  {
    name: 'First Digital',
    aliases: ['FDUSD', 'First Digital USD'],
    category: 'stablecoin_issuer',
    coin_ids: { defillama: 'first-digital-usd', coingecko: 'first-digital-usd' },
    website: 'https://firstdigitallabs.com',
  },
  {
    name: 'Ripple',
    aliases: ['RLUSD', 'XRP', 'Ripple Labs'],
    category: 'stablecoin_issuer',
    coin_ids: { coingecko: 'ripple' },
    website: 'https://ripple.com',
  },

  // ── B2B 基础设施 ──
  {
    name: 'Stripe',
    aliases: [],
    category: 'b2b_infra',
    blog_rss: 'https://stripe.com/blog/feed.rss',
    website: 'https://stripe.com',
  },
  {
    name: 'Bridge',
    aliases: ['Bridge.xyz'],
    category: 'b2b_infra',
    website: 'https://www.bridge.xyz',
  },
  {
    name: 'Zero Hash',
    aliases: [],
    category: 'b2b_infra',
    website: 'https://zerohash.com',
  },
  {
    name: 'Fireblocks',
    aliases: [],
    category: 'b2b_infra',
    website: 'https://www.fireblocks.com',
  },
  {
    name: 'BitGo',
    aliases: [],
    category: 'b2b_infra',
    website: 'https://www.bitgo.com',
  },
  {
    name: 'Anchorage',
    aliases: ['Anchorage Digital'],
    category: 'b2b_infra',
    website: 'https://www.anchorage.com',
  },
  {
    name: 'Checkout.com',
    aliases: ['Checkout'],
    category: 'b2b_infra',
    website: 'https://www.checkout.com',
  },
  {
    name: 'BitPay',
    aliases: [],
    category: 'b2b_infra',
    website: 'https://bitpay.com',
  },
  {
    name: 'Chainlink',
    aliases: ['LINK'],
    category: 'b2b_infra',
    coin_ids: { defillama: 'chainlink', coingecko: 'chainlink' },
    website: 'https://chain.link',
  },

  // ── 支付 & 汇款 ──
  {
    name: 'Stellar',
    aliases: ['XLM', 'Stellar Development Foundation'],
    category: 'b2b_infra',
    coin_ids: { coingecko: 'stellar' },
    website: 'https://stellar.org',
  },
  {
    name: 'MoneyGram',
    aliases: [],
    category: 'b2b_infra',
    ticker: 'MGI',
    website: 'https://www.moneygram.com',
  },
  {
    name: 'Bitso',
    aliases: [],
    category: 'b2b_infra',
    website: 'https://bitso.com',
  },
  {
    name: 'Yellow Card',
    aliases: [],
    category: 'b2b_infra',
    website: 'https://yellowcard.io',
  },
  {
    name: 'Deel',
    aliases: [],
    category: 'b2b_infra',
    website: 'https://www.deel.com',
  },

  // ── 传统金融 ──
  {
    name: 'Visa',
    aliases: [],
    category: 'tradfi',
    ticker: 'V',
    sec_cik: '0001403161',
    website: 'https://visa.com',
  },
  {
    name: 'Mastercard',
    aliases: [],
    category: 'tradfi',
    ticker: 'MA',
    sec_cik: '0001141391',
    website: 'https://www.mastercard.com',
  },
  {
    name: 'JPMorgan',
    aliases: ['JPM', 'JP Morgan', 'JPMorgan Chase'],
    category: 'tradfi',
    ticker: 'JPM',
    sec_cik: '0000019617',
    website: 'https://www.jpmorgan.com',
  },
  {
    name: 'BlackRock',
    aliases: ['BLK'],
    category: 'tradfi',
    ticker: 'BLK',
    sec_cik: '0001364742',
    website: 'https://www.blackrock.com',
  },

  // ── 交易所 ──
  {
    name: 'Binance',
    aliases: ['BNB'],
    category: 'tradfi',
    website: 'https://www.binance.com',
  },
  {
    name: 'OKX',
    aliases: ['OKEx'],
    category: 'tradfi',
    website: 'https://www.okx.com',
  },

  // ── 上市公司 (Crypto) ──
  {
    name: 'Coinbase',
    aliases: ['COIN'],
    category: 'public_company',
    ticker: 'COIN',
    sec_cik: '0001679788',
    blog_rss: 'https://www.coinbase.com/blog/rss',
    github_org: 'coinbase',
    website: 'https://www.coinbase.com',
  },
  {
    name: 'Block',
    aliases: ['Square', 'SQ', 'Cash App'],
    category: 'public_company',
    ticker: 'XYZ',
    sec_cik: '0001512673',
    website: 'https://block.xyz',
  },
  {
    name: 'Robinhood',
    aliases: ['HOOD'],
    category: 'public_company',
    ticker: 'HOOD',
    sec_cik: '0001783879',
    website: 'https://robinhood.com',
  },

  // ── DeFi ──
  {
    name: 'Aave',
    aliases: [],
    category: 'defi',
    coin_ids: { defillama: 'aave', coingecko: 'aave' },
    github_org: 'aave',
    website: 'https://aave.com',
  },
  {
    name: 'Curve',
    aliases: ['Curve Finance'],
    category: 'defi',
    coin_ids: { defillama: 'curve-finance', coingecko: 'curve-dao-token' },
    github_org: 'curvefi',
    website: 'https://curve.fi',
  },
  {
    name: 'Uniswap',
    aliases: [],
    category: 'defi',
    coin_ids: { defillama: 'uniswap', coingecko: 'uniswap' },
    github_org: 'Uniswap',
    website: 'https://uniswap.org',
  },
  {
    name: 'Compound',
    aliases: ['COMP'],
    category: 'defi',
    coin_ids: { defillama: 'compound-finance', coingecko: 'compound-governance-token' },
    github_org: 'compound-finance',
    website: 'https://compound.finance',
  },

  // ── RWA 项目 ──
  {
    name: 'USYC',
    aliases: ['Hashnote', 'US Yield Coin'],
    category: 'defi',
    website: 'https://usyc.hashnote.com',
  },
  {
    name: 'BUIDL',
    aliases: ['BlackRock BUIDL', 'BlackRock USD Institutional Digital Liquidity Fund'],
    category: 'defi',
    website: 'https://www.blackrock.com',
  },
  {
    name: 'IBENJI',
    aliases: ['Benji', 'Franklin Templeton BENJI'],
    category: 'defi',
    website: 'https://www.franklintempleton.com',
  },

  // ── 监管机构 ──
  {
    name: 'SEC',
    aliases: ['Securities and Exchange Commission', 'US SEC'],
    category: 'regulator',
    website: 'https://www.sec.gov',
  },
  {
    name: 'OCC',
    aliases: ['Office of the Comptroller of the Currency'],
    category: 'regulator',
    website: 'https://www.occ.treas.gov',
  },
  {
    name: 'Federal Reserve',
    aliases: ['Fed', 'FRB'],
    category: 'regulator',
    website: 'https://www.federalreserve.gov',
  },
  {
    name: 'FinCEN',
    aliases: ['Financial Crimes Enforcement Network'],
    category: 'regulator',
    website: 'https://www.fincen.gov',
  },
  {
    name: 'NY DFS',
    aliases: ['NYDFS', 'New York Department of Financial Services'],
    category: 'regulator',
    website: 'https://www.dfs.ny.gov',
  },
  {
    name: 'HKMA',
    aliases: ['Hong Kong Monetary Authority', '香港金管局'],
    category: 'regulator',
    website: 'https://www.hkma.gov.hk',
  },
  {
    name: 'MAS',
    aliases: ['Monetary Authority of Singapore', '新加坡金管局'],
    category: 'regulator',
    website: 'https://www.mas.gov.sg',
  },
]

// 辅助: 根据名称或别名查找实体
export function findWatchlistEntity(nameOrAlias: string): WatchlistEntity | undefined {
  const lower = nameOrAlias.toLowerCase()
  return WATCHLIST.find(
    e => e.name.toLowerCase() === lower || e.aliases.some(a => a.toLowerCase() === lower)
  )
}

// 辅助: 获取有 SEC CIK 的公司
export function getCompaniesWithCIK(): WatchlistEntity[] {
  return WATCHLIST.filter(e => e.sec_cik)
}

// 辅助: 获取有 coin_ids 的币种
export function getCoinsForOnchain(): WatchlistEntity[] {
  return WATCHLIST.filter(e => e.coin_ids)
}
