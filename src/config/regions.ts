// 监管追踪地区配置
//
// 每条 rss_sources 里的 URL 都经过 curl 实测返回 200 + 有效 RSS/Atom XML
// (2026-04 验证)。如需补充，请先用 HEAD+curl 校验再添加。
//
// 未包含 / 需进一步研究的：CFTC (页面是 HTML 不是 RSS)，FinCEN (404)，
// EBA (404)，HKMA (404)，MAS (当前网站维护中)，BIS (URL 失效)，日本 FSA
// (暂未找到官方 RSS)，阿联酋 VARA / ADGM / DFSA (无对外 RSS feed)。

export interface RegionConfig {
  code: string
  name_en: string
  name_zh: string
  agencies: string[]
  rss_sources: string[]
}

export const REGIONS: RegionConfig[] = [
  {
    code: 'US',
    name_en: 'United States',
    name_zh: '美国',
    agencies: ['SEC', 'OCC', 'Federal Reserve', 'CFTC', 'FinCEN', 'Congress'],
    rss_sources: [
      // SEC 新闻稿
      'https://www.sec.gov/news/pressreleases.rss',
      // SEC 官员声明 / public statements（RegFI、主席发言等）
      'https://www.sec.gov/news/statements.rss',
      // 美联储新闻稿
      'https://www.federalreserve.gov/feeds/press_all.xml',
      // OCC 新闻（货币监理署）
      'https://www.occ.gov/rss/occ_news.xml',
    ],
  },
  {
    code: 'EU',
    name_en: 'European Union',
    name_zh: '欧盟',
    agencies: ['ESMA', 'ECB', 'European Commission'],
    rss_sources: [
      // ESMA 新闻（MiCA / 稳定币监管主机构）
      'https://www.esma.europa.eu/rss.xml',
      // ECB 新闻稿
      'https://www.ecb.europa.eu/rss/press.html',
    ],
  },
  {
    code: 'UK',
    name_en: 'United Kingdom',
    name_zh: '英国',
    agencies: ['FCA', 'Bank of England', 'HM Treasury'],
    rss_sources: [
      // FCA 新闻
      'https://www.fca.org.uk/news/rss.xml',
      // 英格兰银行新闻
      'https://www.bankofengland.co.uk/rss/news',
    ],
  },
  {
    code: 'SG',
    name_en: 'Singapore',
    name_zh: '新加坡',
    agencies: ['MAS'],
    rss_sources: [],
  },
  {
    code: 'HK',
    name_en: 'Hong Kong',
    name_zh: '香港',
    agencies: ['HKMA', 'SFC'],
    rss_sources: [
      // 香港证监会新闻稿
      'https://www.sfc.hk/en/RSS-Feeds/Press-releases',
    ],
  },
  {
    code: 'JP',
    name_en: 'Japan',
    name_zh: '日本',
    agencies: ['FSA', 'Bank of Japan'],
    rss_sources: [
      // 日本银行官方 RSS
      'https://www.boj.or.jp/en/rss/whatsnew.xml',
    ],
  },
  {
    code: 'AE',
    name_en: 'UAE',
    name_zh: '阿联酋',
    agencies: ['VARA', 'ADGM', 'DFSA'],
    rss_sources: [],
  },
  {
    code: 'VN',
    name_en: 'Vietnam',
    name_zh: '越南',
    agencies: ['SBV', 'MOF', 'SSC'],
    // SBV / MOF / SSC 暂未发现稳定的英文 RSS。靠 Brave Search 越南语 / 英文
    // 关键词查询补位 — 见 src/modules/collectors/brave-search/index.ts。
    rss_sources: [],
  },
]
