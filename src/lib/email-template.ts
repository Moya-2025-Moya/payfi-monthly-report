// StablePulse Weekly Email — V10 三层渐进式邮件
// Layer 1 (5s): 本周一句话 + 3 headlines
// Layer 2 (30s): 3 narratives (上周/本周/参考数据/时间线)
// Layer 3 (2min): 5 factual signals by category
// Footer: verification stats one-liner
// AI boundary: ZERO judgment, ZERO predictions. Pure facts only.

const SITE_URL = 'https://payfi-monthly-report.vercel.app'

/* ── Types ── */

export interface NarrativeForEmail {
  topic: string
  weekCount?: number
  last_week: string
  this_week: string
  timeline?: string        // e.g. "SEC 反馈窗口 3.17 起"
  comparable?: string      // e.g. "Coinbase S-1→IPO 用时 5 个月"
}

export interface SignalItem {
  category: 'milestone' | 'product' | 'data'
  text: string             // e.g. "Ethena USDe TVL 突破 $5B (历史最大偏离 -0.8%, 2025.04)"
}

export interface EmailData {
  weekNumber: string       // e.g. "2026-W11"
  weekDate: string         // e.g. "3月10日 - 3月16日"
  oneLiner: string         // 本周一句话
  headlines: string[]      // 3 headlines (event-type sorted)
  narratives: NarrativeForEmail[]
  signals: SignalItem[]
  // Verification stats
  totalFacts: number
  verifiedCount: number
  crossVerifiedCount: number
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const CATEGORY_LABELS: Record<string, string> = {
  milestone: '里程碑',
  product: '产品/合作',
  data: '数据',
}

export function generateEmailHTML(data: EmailData): string {
  const {
    weekNumber, weekDate, oneLiner, headlines, narratives, signals,
    totalFacts, verifiedCount, crossVerifiedCount,
  } = data

  const wNum = weekNumber.split('-W')[1]

  // Layer 1: Headlines
  const headlinesHTML = headlines.slice(0, 3).map(h =>
    `<tr><td style="padding:2px 0;font-size:13px;color:#ccc;line-height:1.6;">· ${esc(h)}</td></tr>`
  ).join('\n')

  // Layer 2: Narratives
  const narrativesHTML = narratives.slice(0, 3).map(n => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? ` <span style="font-size:10px;color:#3b82f6;">[第${n.weekCount}周]</span>`
      : ''

    const lastWeekLine = n.last_week && n.last_week !== '首次追踪'
      ? `<tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#888;line-height:1.6;">│ 上周: ${esc(n.last_week)}</td></tr>`
      : ''
    const thisWeekLine = `<tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#ccc;line-height:1.6;">│ 本周: ${esc(n.this_week)}</td></tr>`
    const timelineLine = n.timeline
      ? `<tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#888;line-height:1.6;">│ 时间线: ${esc(n.timeline)}</td></tr>`
      : ''
    const comparableLine = n.comparable
      ? `<tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#888;line-height:1.6;">│ 参考: ${esc(n.comparable)}</td></tr>`
      : ''

    return `<tr><td style="padding:0 0 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:0 0 4px;"><span style="font-size:13px;font-weight:700;color:#e5e5e5;">▎${esc(n.topic)}</span>${weekBadge}</td></tr>
        ${lastWeekLine}
        ${thisWeekLine}
        ${timelineLine}
        ${comparableLine}
      </table>
    </td></tr>`
  }).join('\n')

  // Layer 3: Signals grouped by category
  const grouped: Record<string, string[]> = {}
  for (const s of signals) {
    const cat = s.category || 'data'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s.text)
  }

  // Order: milestone → product → data
  const categoryOrder: Array<'milestone' | 'product' | 'data'> = ['milestone', 'product', 'data']
  const signalsHTML = categoryOrder
    .filter(cat => grouped[cat]?.length)
    .map(cat => {
      const items = grouped[cat]!.map(text =>
        `<tr><td style="padding:1px 0 1px 8px;font-size:12px;color:#ccc;line-height:1.7;">· ${esc(text)}</td></tr>`
      ).join('\n')
      return `<tr><td style="padding:0 0 10px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#888;">${esc(CATEGORY_LABELS[cat] ?? cat)}:</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">${items}</table>
      </td></tr>`
    }).join('\n')

  // Verification footer
  const verificationLine = `${totalFacts}条事实 · ${verifiedCount === totalFacts ? '100%' : `${verifiedCount}/${totalFacts}`}来源验证 · ${crossVerifiedCount}条多源交叉`

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>StablePulse W${wNum} | ${esc(weekDate)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;">
<tr><td align="center" style="padding:24px 16px;">

<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">

  <!-- Header -->
  <tr><td style="padding:28px 32px 12px;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:#10b981;">STABLEPULSE · W${esc(wNum)} · ${esc(weekDate)}</p>
  </td></tr>

  <!-- Layer 1: One-liner + Headlines -->
  <tr><td style="padding:12px 32px 16px;">
    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#e5e5e5;line-height:1.6;">
      ${esc(oneLiner)}
    </p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${headlinesHTML}
    </table>
  </td></tr>

  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>

  <!-- Layer 2: Narrative Tracking -->
  <tr><td style="padding:20px 32px 4px;">
    <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:3px;color:#3b82f6;">━━ 叙事追踪 ━━</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${narrativesHTML}
    </table>
  </td></tr>

  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>

  <!-- Layer 3: Factual Signals -->
  <tr><td style="padding:20px 32px 4px;">
    <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:3px;color:#10b981;">━━ 本周事实 ━━</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${signalsHTML}
    </table>
  </td></tr>

  <!-- Verification Footer -->
  <tr><td style="padding:16px 32px 8px;">
    <div style="border-top:1px solid #222;padding-top:16px;">
      <p style="margin:0 0 12px;font-size:11px;color:#666;text-align:center;font-family:monospace;">
        ${esc(verificationLine)}
      </p>
      <p style="margin:0;text-align:center;">
        <a href="${SITE_URL}/weekly/${encodeURIComponent(weekNumber)}" target="_blank"
          style="font-size:12px;color:#10b981;text-decoration:none;">浏览器中查看 →</a>
      </p>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid #222;">
    <p style="margin:0 0 4px;font-size:11px;color:#444;text-align:center;letter-spacing:1px;">STABLEPULSE</p>
    <p style="margin:0 0 8px;font-size:11px;color:#333;text-align:center;">稳定币行业事实聚合 · 内部参考</p>
    <p style="margin:0;font-size:11px;text-align:center;">
      <a href="{{unsubscribe_url}}" style="color:#444;text-decoration:underline;">退订</a>
    </p>
  </td></tr>

</table>

</td></tr>
</table>

</body>
</html>`
}

/** Convert week number to date range string */
export function weekToDateRange(weekNumber: string): string {
  const [yearStr, wPart] = weekNumber.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return `${fmt(monday)} - ${fmt(sunday)}`
}

/** Get the Monday date of a given ISO week as YYYY-MM-DD */
export function weekToMondayDate(weekNumber: string): string {
  const [yearStr, wPart] = weekNumber.split('-W')
  const year = Number(yearStr)
  const num = Number(wPart)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (num - 1) * 7)
  return monday.toISOString().split('T')[0]
}
