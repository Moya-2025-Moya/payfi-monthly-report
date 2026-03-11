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
  // [ROADMAP] CoinGecko — 后续集成，用于链上数据交叉验证
  // coingecko: {
  //   baseUrl: 'https://api.coingecko.com/api/v3',
  //   apiKey: process.env.COINGECKO_API_KEY || '',
  //   endpoints: {
  //     coinMarkets: '/coins/markets',
  //     coinDetail: '/coins/{id}',
  //   },
  // },

  // ── 新闻 (全免费，多源交叉验证) ──
  freeCryptoNews: {
    baseUrl: 'https://cryptocurrency.cv/api',
    // 完全免费，无需 API key
    endpoints: {
      news: '/news',           // 最新新闻
      search: '/search',       // 全文搜索
      archive: '/archive',     // 历史文章 (66万+)
      stream: '/stream',       // 实时 SSE 推送
    },
    // 过滤参数示例: /news?limit=50&q=stablecoin
  },
  rssFeeds: [
    { name: 'The Block', url: 'https://www.theblock.co/rss.xml' },
    { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { name: 'Decrypt', url: 'https://decrypt.co/feed' },
    { name: 'Bloomberg Crypto', url: 'https://www.bloomberg.com/crypto/feed' },
    { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
    { name: 'DeFi Llama News', url: 'https://feed.defillama.com/' },
  ],

  // ── SEC (免费) ──
  secEdgar: {
    baseUrl: 'https://efts.sec.gov/LATEST/search-index',
    fullTextUrl: 'https://www.sec.gov/cgi-bin/browse-edgar',
    userAgent: process.env.SEC_EDGAR_USER_AGENT || 'StablePulse research@example.com',
  },

  // ── 融资 (全免费) ──
  // 策略: DeFiLlama /raises (结构化) + 新闻提取
  // [ROADMAP] CryptoRank — 后续集成，用于融资数据交叉验证
  // cryptorank: {
  //   baseUrl: 'https://api.cryptorank.io/v1',
  //   apiKey: process.env.CRYPTORANK_API_KEY || '',
  //   endpoints: { funding: '/funding-rounds' },
  // },

  // ── Twitter (twitterapi.io) ──
  twitter: {
    baseUrl: 'https://api.twitterapi.io',
    apiKey: process.env.TWITTERAPI_IO_KEY || '',
    // Starter plan: $29/月, 6个账号
    // 认证: X-API-Key header
    endpoints: {
      addMonitor: '/oapi/x_user_stream/add_user_to_monitor_tweet',   // POST 添加监控账号
      // WebSocket 接收实时推文
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
