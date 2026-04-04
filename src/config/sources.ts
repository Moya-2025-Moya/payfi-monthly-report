// 数据源配置 — API endpoints 和 key 管理

export const SOURCES = {
  // ── 链上数据 (免费) ──
  defillama: {
    baseUrl: process.env.DEFILLAMA_API_BASE || 'https://api.llama.fi',
    // Stablecoin endpoints live on a separate subdomain
    stablecoinBaseUrl: process.env.DEFILLAMA_STABLECOIN_API_BASE || 'https://stablecoins.llama.fi',
    endpoints: {
      stablecoins: '/stablecoins',
      stablecoinCharts: '/stablecoincharts/all',
      stablecoinPrices: '/stablecoinprices',
      protocols: '/protocols',
      raises: '/raises', // 融资数据（免费）
    },
  },

  // ── 新闻 RSS 源（全免费，16 个源） ──
  rssFeeds: [
    // ── 加密媒体 (11 个) ──
    { name: 'The Block', url: 'https://www.theblock.co/rss.xml' },
    { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { name: 'Decrypt', url: 'https://decrypt.co/feed' },
    { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
    { name: 'DLNews', url: 'https://www.dlnews.com/arc/outboundfeeds/rss/' },
    { name: 'Blockworks', url: 'https://blockworks.co/feed' },
    { name: 'The Defiant', url: 'https://thedefiant.io/feed' },
    { name: 'Crypto Briefing', url: 'https://cryptobriefing.com/feed/' },
    { name: 'Unchained', url: 'https://unchainedcrypto.com/feed/' },
    { name: 'CryptoSlate', url: 'https://cryptoslate.com/feed/' },
    { name: 'Protos', url: 'https://protos.com/feed/' },
    // BeInCrypto 已移除（403 Forbidden）
    // ── 支付行业媒体 (3 个) — 覆盖 TradFi 支付动态 ──
    { name: 'PYMNTS', url: 'https://www.pymnts.com/feed/' },
    { name: 'Finextra', url: 'https://www.finextra.com/rss/headlines.aspx' },
    { name: 'PaymentsDive', url: 'https://www.paymentsdive.com/feeds/news/' },
    // ── 中文 (2 个) ──
    { name: 'Cointelegraph 中文', url: 'https://cn.cointelegraph.com/rss' },
    { name: '吴说区块链', url: 'https://wublock.substack.com/feed' },
  ],

  // ── SEC (免费) ──
  secEdgar: {
    baseUrl: 'https://efts.sec.gov/LATEST/search-index',
    fullTextUrl: 'https://www.sec.gov/cgi-bin/browse-edgar',
    userAgent: process.env.SEC_EDGAR_USER_AGENT || 'StablePulse research@example.com',
  },

  // ── Twitter (twitterapi.io) ──
  twitter: {
    baseUrl: 'https://api.twitterapi.io',
    apiKey: process.env.TWITTERAPI_IO_KEY || '',
    // Starter plan: $29/月, 6个账号
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
    // Topic thread IDs for the supergroup (undefined = not configured)
    threadCn: process.env.TELEGRAM_THREAD_CN ? Number(process.env.TELEGRAM_THREAD_CN) : undefined,
    threadEn: process.env.TELEGRAM_THREAD_EN ? Number(process.env.TELEGRAM_THREAD_EN) : undefined,
  },
} as const
