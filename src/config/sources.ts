// 数据源配置 — API endpoints 和 key 管理
// V2: 去掉 DeFiLlama, 新增 Brave Search

export const SOURCES = {
  // ── 新闻 RSS 源（全免费） ──
  rssFeeds: [
    // ── 加密媒体 (英文 11 个) ──
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
    // ── 支付行业媒体 (3 个) ──
    { name: 'PYMNTS', url: 'https://www.pymnts.com/feed/' },
    { name: 'Finextra', url: 'https://www.finextra.com/rss/headlines.aspx' },
    { name: 'PaymentsDive', url: 'https://www.paymentsdive.com/feeds/news/' },
    // ── 中文 (2 个) ──
    { name: 'Cointelegraph 中文', url: 'https://cn.cointelegraph.com/rss' },
    { name: '吴说区块链', url: 'https://wublock.substack.com/feed' },
    // ── 韩文 / 日文 (多语言覆盖，抓亚洲监管新闻) ──
    { name: 'CoinDesk Korea', url: 'https://www.coindeskkorea.com/rss' },
    { name: 'CoinPost (JP)', url: 'https://coinpost.jp/?feed=rss2' },
  ],

  // ── SEC (免费) ──
  secEdgar: {
    baseUrl: 'https://efts.sec.gov/LATEST/search-index',
    fullTextUrl: 'https://www.sec.gov/cgi-bin/browse-edgar',
    userAgent: process.env.SEC_EDGAR_USER_AGENT || 'UDailyNews research@example.com',
  },

  // ── Twitter (twitterapi.io) ──
  twitter: {
    baseUrl: 'https://api.twitterapi.io',
    apiKey: process.env.TWITTERAPI_IO_KEY || '',
    endpoints: {
      addMonitor: '/oapi/x_user_stream/add_user_to_monitor_tweet',
    },
  },

  // ── Brave Search (多语言新闻兜底) ──
  braveSearch: {
    apiKey: process.env.BRAVE_SEARCH_API_KEY || '',
    baseUrl: 'https://api.search.brave.com/res/v1',
    endpoints: {
      news: '/news/search',
      web: '/web/search',
    },
  },

  // ── Telegram 分发 ──
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    threadCn: process.env.TELEGRAM_THREAD_CN ? Number(process.env.TELEGRAM_THREAD_CN) : undefined,
  },
} as const
