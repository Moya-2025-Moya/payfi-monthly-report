// 数据源配置 — API endpoints 和 key 管理

export const SOURCES = {
  // ── 链上数据 (免费) ──
  defillama: {
    baseUrl: process.env.DEFILLAMA_API_BASE || 'https://api.llama.fi',
    endpoints: {
      stablecoins: '/stablecoins',
      stablecoinCharts: '/stablecoincharts/all',
      stablecoinPrices: '/stablecoinprices',
      protocols: '/protocols',
      raises: '/raises', // 融资数据（免费）
    },
  },

  // ── 新闻 (全免费，多源交叉验证) ──
  // CryptoPanic — 免费聚合器，汇集 300+ 来源
  cryptoPanic: {
    baseUrl: 'https://cryptopanic.com/api/free/v1',
    // 免费 tier: 不需要 API key 也可以用 /posts/ 端点
    // 有 key 可以获得更多字段: 在 https://cryptopanic.com/developers/api/ 注册
    apiKey: process.env.CRYPTOPANIC_API_KEY || '',
    endpoints: {
      posts: '/posts/',  // ?currencies=USDC,USDT&filter=important&kind=news
    },
  },
  rssFeeds: [
    { name: 'The Block', url: 'https://www.theblock.co/rss.xml' },
    { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { name: 'Decrypt', url: 'https://decrypt.co/feed' },
    { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
    { name: 'DeFi Llama News', url: 'https://feed.defillama.com/' },
    // 中文源
    { name: 'ChainCatcher', url: 'https://www.chaincatcher.com/rss' },
    { name: 'BlockBeats', url: 'https://www.theblockbeats.info/rss' },
    { name: 'Odaily', url: 'https://www.odaily.news/rss' },
  ],

  // ── SEC (免费) ──
  secEdgar: {
    baseUrl: 'https://efts.sec.gov/LATEST/search-index',
    fullTextUrl: 'https://www.sec.gov/cgi-bin/browse-edgar',
    userAgent: process.env.SEC_EDGAR_USER_AGENT || 'StablePulse research@example.com',
  },

  // ── 融资 (全免费) ──
  // 策略: DeFiLlama /raises (结构化) + 新闻提取

  // ── Twitter (twitterapi.io) ──
  twitter: {
    baseUrl: 'https://api.twitterapi.io',
    apiKey: process.env.TWITTERAPI_IO_KEY || '',
    // Starter plan: $29/月, 6个账号
    // 认证: X-API-Key header
    endpoints: {
      addMonitor: '/oapi/x_user_stream/add_user_to_monitor_tweet',
    },
  },

  // ── 分发 ──
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
} as const
