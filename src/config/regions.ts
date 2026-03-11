// 监管追踪地区配置

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
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=&dateb=&owner=include&count=40&search_text=&action=getcompany',
    ],
  },
  {
    code: 'EU',
    name_en: 'European Union',
    name_zh: '欧盟',
    agencies: ['EBA', 'ECB', 'European Commission'],
    rss_sources: [],
  },
  {
    code: 'UK',
    name_en: 'United Kingdom',
    name_zh: '英国',
    agencies: ['FCA', 'Bank of England', 'HM Treasury'],
    rss_sources: [],
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
    rss_sources: [],
  },
  {
    code: 'JP',
    name_en: 'Japan',
    name_zh: '日本',
    agencies: ['FSA', 'Bank of Japan'],
    rss_sources: [],
  },
  {
    code: 'AE',
    name_en: 'UAE',
    name_zh: '阿联酋',
    agencies: ['VARA', 'ADGM', 'DFSA'],
    rss_sources: [],
  },
]
