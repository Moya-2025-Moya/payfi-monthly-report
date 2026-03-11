// 采集和推送时间表 — Vercel Cron 配置

export const SCHEDULE = {
  // 每日 Pipeline
  daily: {
    // 数据采集 (Phase 1)
    collect: {
      cron: '0 2 * * *', // 每天 UTC 02:00 (北京 10:00)
      description: 'A1-A5,A7 多源数据采集',
    },
    // AI 处理 (Phase 2-8)
    process: {
      cron: '0 3 * * *', // 每天 UTC 03:00 (北京 11:00)
      description: 'B1提取 → V0-V6验证 → B2-B5归集',
    },
  },

  // 每周 Pipeline
  weekly: {
    // Twitter 采集 (周日)
    twitter: {
      cron: '0 1 * * 0', // 每周日 UTC 01:00
      description: 'A6 Twitter特定账号采集',
    },
    // 知识引擎计算 (周日处理完后)
    knowledge: {
      cron: '0 5 * * 0', // 每周日 UTC 05:00
      description: 'C6盲区 + C7 Diff + C8密度统计',
    },
    // 周报快照 + 推送 (周一早)
    snapshot: {
      cron: '0 1 * * 1', // 每周一 UTC 01:00 (北京 09:00)
      description: '组装周报快照 → E1邮件 + E2 Telegram',
    },
  },
} as const

// Vercel Cron 路由配置 (用于 vercel.json)
export const CRON_ROUTES = [
  { path: '/api/cron/collect', schedule: SCHEDULE.daily.collect.cron },
  { path: '/api/cron/process', schedule: SCHEDULE.daily.process.cron },
  { path: '/api/cron/twitter', schedule: SCHEDULE.weekly.twitter.cron },
  { path: '/api/cron/knowledge', schedule: SCHEDULE.weekly.knowledge.cron },
  { path: '/api/cron/snapshot', schedule: SCHEDULE.weekly.snapshot.cron },
]
