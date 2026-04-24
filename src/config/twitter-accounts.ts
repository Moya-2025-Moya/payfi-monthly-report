// Twitter 关注账号 — 仅限 ①官方媒体 ②监管/央行官方账号 ③核心发行方/交易所官方账号
// 明确**不包含** VC / KOL / 研究员个人 / 用户社区 — 这些是噪音源。
//
// 规则：每条推文背后必须是"机构身份发言"，而不是个人见解。

export type TwitterAuthorCategory = 'media' | 'regulator' | 'issuer' | 'infrastructure'

export interface TwitterAccount {
  handle: string          // Twitter handle WITHOUT @ prefix
  name: string
  category: TwitterAuthorCategory
  description: string
}

export const TWITTER_ACCOUNTS: TwitterAccount[] = [
  // ── 加密 / 金融科技 官方媒体 ──
  { handle: 'TheBlock__', name: 'The Block', category: 'media', description: 'Crypto news' },
  { handle: 'CoinDesk', name: 'CoinDesk', category: 'media', description: 'Crypto news' },
  { handle: 'Cointelegraph', name: 'Cointelegraph', category: 'media', description: 'Crypto news' },
  { handle: 'decryptmedia', name: 'Decrypt', category: 'media', description: 'Crypto news' },
  { handle: 'DLNewsInfo', name: 'DL News', category: 'media', description: 'Crypto news' },
  { handle: 'blockworks_', name: 'Blockworks', category: 'media', description: 'Crypto news' },
  { handle: 'TheDefiant', name: 'The Defiant', category: 'media', description: 'DeFi news' },
  { handle: 'ProtosHQ', name: 'Protos', category: 'media', description: 'Crypto news' },
  { handle: 'Unchained', name: 'Unchained', category: 'media', description: 'Crypto news / podcast' },
  { handle: 'PYMNTS', name: 'PYMNTS', category: 'media', description: 'Payments news' },
  { handle: 'Finextra', name: 'Finextra', category: 'media', description: 'Fintech news' },
  { handle: 'PaymentsDive', name: 'PaymentsDive', category: 'media', description: 'Payments news' },
  { handle: 'WSJCrypto', name: 'WSJ Crypto', category: 'media', description: 'WSJ crypto desk' },
  { handle: 'business', name: 'Bloomberg', category: 'media', description: 'Bloomberg business / crypto' },
  { handle: 'Reuters', name: 'Reuters', category: 'media', description: 'Reuters (general — filtered by keywords)' },
  { handle: 'FT', name: 'Financial Times', category: 'media', description: 'FT (general — filtered by keywords)' },

  // ── 美国监管 / 央行 ──
  { handle: 'SECGov', name: 'SEC', category: 'regulator', description: 'US SEC' },
  { handle: 'CFTC', name: 'CFTC', category: 'regulator', description: 'US CFTC' },
  { handle: 'USOCC', name: 'OCC', category: 'regulator', description: 'US OCC' },
  { handle: 'FederalReserve', name: 'Federal Reserve', category: 'regulator', description: 'US Fed' },
  { handle: 'USTreasury', name: 'US Treasury', category: 'regulator', description: 'US Treasury' },
  { handle: 'FinCENNews', name: 'FinCEN', category: 'regulator', description: 'US FinCEN' },

  // ── 欧洲 / 亚洲 监管 ──
  { handle: 'ESMAComms', name: 'ESMA', category: 'regulator', description: 'EU securities regulator' },
  { handle: 'ecb', name: 'ECB', category: 'regulator', description: 'European Central Bank' },
  { handle: 'FCAgov', name: 'FCA', category: 'regulator', description: 'UK FCA' },
  { handle: 'bankofengland', name: 'Bank of England', category: 'regulator', description: 'UK central bank' },
  { handle: 'MAS_sg', name: 'MAS', category: 'regulator', description: 'Singapore MAS' },
  { handle: 'HKMAinfo', name: 'HKMA', category: 'regulator', description: 'Hong Kong Monetary Authority' },
  { handle: 'BIS_org', name: 'BIS', category: 'regulator', description: 'Bank for International Settlements' },

  // ── 稳定币发行方 / 托管 / 核心基础设施 ──
  { handle: 'circle', name: 'Circle', category: 'issuer', description: 'USDC issuer' },
  { handle: 'Tether_to', name: 'Tether', category: 'issuer', description: 'USDT issuer' },
  { handle: 'PayPal', name: 'PayPal', category: 'issuer', description: 'PYUSD / payments' },
  { handle: 'Paxos', name: 'Paxos', category: 'issuer', description: 'Stablecoin issuer / custodian' },
  { handle: 'MakerDAO', name: 'MakerDAO', category: 'issuer', description: 'DAI issuer' },
  { handle: 'ethena_labs', name: 'Ethena', category: 'issuer', description: 'USDe issuer' },

  // ── 交易所官方（发布新币 / 合规信息）──
  { handle: 'coinbase', name: 'Coinbase', category: 'infrastructure', description: 'Exchange' },
  { handle: 'binance', name: 'Binance', category: 'infrastructure', description: 'Exchange' },
  { handle: 'krakenfx', name: 'Kraken', category: 'infrastructure', description: 'Exchange' },

  // ── 支付 / 卡组织 ──
  { handle: 'Visa', name: 'Visa', category: 'infrastructure', description: 'Card network' },
  { handle: 'Mastercard', name: 'Mastercard', category: 'infrastructure', description: 'Card network' },
]

// 按 category 分组
export function getAccountsByCategory(category: TwitterAuthorCategory): TwitterAccount[] {
  return TWITTER_ACCOUNTS.filter(a => a.category === category)
}
