// StablePulse Weekly Email Template — V7 情报简报风格
// Used by snapshot pipeline to generate the weekly email report
// Four differentiators: 验证透明 · 矛盾预警 · 观点分离 · 叙事连续性

const SITE_URL = 'https://payfi-monthly-report.vercel.app'

interface NewsItem {
  date: string
  simple_zh: string
  background_zh: string
  what_happened_zh: string
  insight_zh: string
  tags: string[]
  // V7 verification badges
  badge_labels?: string[]    // e.g. ['3源验证', '链上锚定', '来源可达']
  contradiction?: string     // Inline contradiction alert
  objectivity?: string       // 'fact' | 'opinion' | 'analysis'
  speaker?: string           // Attribution for opinion/analysis
}

interface NarrativeForEmail {
  topic: string
  summary: string
  weekCount?: number         // Cross-week tracking count
  lastWeekSummary?: string   // What happened last week
  nextWeekWatch?: string     // What to watch next week
  nodes: {
    date: string
    title: string
    description: string
    isPrediction?: boolean
  }[]
}

interface EmailData {
  weekDate: string            // e.g. "3月10日 - 3月16日"
  weekNumber: string          // e.g. "2026-W11"
  newsItems: NewsItem[]       // 10 detailed news items
  narratives: NarrativeForEmail[] // top 3 narratives
  totalFacts: number
  highConfidence: number
  mediumConfidence: number
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function generateEmailHTML(data: EmailData): string {
  const { weekDate, newsItems, narratives, totalFacts, highConfidence, mediumConfidence } = data

  // Separate facts from opinions
  const factItems = newsItems.filter(n => !n.objectivity || n.objectivity === 'fact')
  const opinionItems = newsItems.filter(n => n.objectivity === 'opinion' || n.objectivity === 'analysis')

  const newsHTML = factItems.map((item, i) => {
    const badgeHTML = buildBadges(item.badge_labels)
    const contradictionHTML = item.contradiction
      ? `<tr><td style="padding:6px 0 0;"><p style="margin:0;font-size:11px;color:#ef4444;background:rgba(239,68,68,0.08);padding:4px 8px;border-radius:4px;border:1px solid rgba(239,68,68,0.15);">⚠ ${esc(item.contradiction)}</p></td></tr>`
      : ''

    return `<tr><td style="padding:0 0 20px 0;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="width:28px;vertical-align:top;padding-top:2px;">
          <span style="font-size:12px;color:#444;font-family:monospace;">${String(i + 1).padStart(2, '0')}</span>
        </td>
        <td style="padding-left:12px;">
          <p style="margin:0 0 4px;font-size:11px;color:#666;">${esc(item.date)}${item.tags.length > 0 ? ' · ' + item.tags.slice(0, 2).map(esc).join(' · ') : ''}</p>
          <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#e5e5e5;line-height:1.5;">${esc(item.simple_zh)}</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#111;border-radius:6px;border:1px solid #222;">
            <tr><td style="padding:12px 14px;">
              <p style="margin:0 0 4px;font-size:12px;color:#888;line-height:1.6;"><span style="color:#10b981;font-weight:600;">背景</span> ${esc(item.background_zh)}</p>
              <p style="margin:0 0 4px;font-size:12px;color:#ccc;line-height:1.6;"><span style="color:#10b981;font-weight:600;">事件</span> ${esc(item.what_happened_zh)}</p>
              <p style="margin:0;font-size:12px;color:#888;line-height:1.6;"><span style="color:#10b981;font-weight:600;">影响</span> ${esc(item.insight_zh)}</p>
            </td></tr>
          </table>
          ${badgeHTML}
          ${contradictionHTML}
        </td>
      </tr></table>
    </td></tr>`
  }).join('\n')

  const opinionsHTML = opinionItems.length > 0 ? buildOpinionSection(opinionItems) : ''

  const narrativesHTML = narratives.map(n => {
    const factNodes = n.nodes.filter(nd => !nd.isPrediction)
    const predictionNodes = n.nodes.filter(nd => nd.isPrediction)

    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:#3b82f6;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);margin-left:8px;">第${n.weekCount}周追踪</span>`
      : ''

    const lastWeekHTML = n.lastWeekSummary
      ? `<tr><td style="padding:8px 0 0;"><p style="margin:0;font-size:11px;color:#666;padding-left:12px;border-left:2px solid #333;">上周: ${esc(n.lastWeekSummary)}</p></td></tr>`
      : ''

    const nextWeekHTML = n.nextWeekWatch
      ? `<tr><td style="padding:4px 0 0;"><p style="margin:0;font-size:11px;color:#f59e0b;">→ 下周关注: ${esc(n.nextWeekWatch)}</p></td></tr>`
      : ''

    const nodesHTML = factNodes.map(nd => `
      <tr><td style="padding:0 0 6px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="width:10px;vertical-align:top;padding-top:6px;">
            <div style="width:6px;height:6px;border-radius:50%;background:#10b981;"></div>
          </td>
          <td style="padding-left:10px;">
            <p style="margin:0;font-size:11px;color:#666;">${esc(nd.date)}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#ccc;line-height:1.5;">${esc(nd.title)}</p>
          </td>
        </tr></table>
      </td></tr>`).join('\n')

    const predictionsHTML = predictionNodes.length > 0 ? `
      <tr><td style="padding:8px 0 0;">
        <p style="margin:0 0 4px;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;">后续关注</p>
        ${predictionNodes.map(nd => `
          <p style="margin:0 0 3px;font-size:11px;color:#666;line-height:1.5;font-style:italic;">· ${esc(nd.title)}</p>
        `).join('')}
      </td></tr>` : ''

    return `<tr><td style="padding:0 0 16px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#111;border-radius:8px;border:1px solid #222;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 6px;">
            <span style="font-size:13px;font-weight:700;color:#e5e5e5;">${esc(n.topic)}</span>
            ${weekBadge}
          </p>
          <p style="margin:0 0 10px;font-size:12px;color:#999;line-height:1.5;">${esc(n.summary)}</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-left:2px solid #10b981;">
            <tr><td style="padding-left:12px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${nodesHTML}
                ${predictionsHTML}
              </table>
            </td></tr>
          </table>
          ${lastWeekHTML}
          ${nextWeekHTML}
        </td></tr>
      </table>
    </td></tr>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>StablePulse Weekly | ${esc(weekDate)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0a0a;">
<tr><td align="center" style="padding:24px 16px;">

<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">

  <!-- Header -->
  <tr><td style="padding:28px 32px 16px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td>
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:#10b981;text-transform:uppercase;">STABLEPULSE</p>
          <p style="margin:2px 0 0;font-size:11px;color:#444;letter-spacing:2px;">WEEKLY INTEL</p>
        </td>
        <td align="right" style="vertical-align:bottom;">
          <p style="margin:0;font-size:12px;color:#666;font-family:monospace;">${esc(weekDate)}</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Stats bar -->
  <tr><td style="padding:0 32px 16px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#111;border-radius:6px;border:1px solid #222;">
      <tr><td style="padding:10px 16px;font-size:12px;color:#888;">
        <span style="color:#e5e5e5;font-weight:700;">${totalFacts}</span> 条已验证
        · <span style="color:#10b981;font-weight:600;">${highConfidence}</span> 高可信
        · <span style="color:#f59e0b;font-weight:600;">${mediumConfidence}</span> 中可信
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>

  <!-- Section: Top Stories -->
  <tr><td style="padding:24px 32px 8px;">
    <p style="margin:0 0 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#10b981;">本周情报</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${newsHTML}
    </table>
  </td></tr>

  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>

  <!-- Section: Narrative Timelines -->
  <tr><td style="padding:24px 32px 8px;">
    <p style="margin:0 0 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#3b82f6;">叙事追踪</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${narrativesHTML}
    </table>
  </td></tr>

  ${opinionsHTML}

  <!-- CTA -->
  <tr><td style="padding:24px 32px 32px;" align="center">
    <table cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:#10b981;border-radius:6px;padding:12px 28px;">
        <a href="${SITE_URL}" target="_blank" style="color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;display:inline-block;">查看完整分析 →</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid #222;">
    <p style="margin:0 0 4px;font-size:11px;color:#444;text-align:center;letter-spacing:1px;">STABLEPULSE WEEKLY INTEL</p>
    <p style="margin:0 0 8px;font-size:11px;color:#333;text-align:center;">稳定币行业情报 · AI 验证 · 内部参考</p>
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

/* ── Build verification badges HTML ── */
function buildBadges(labels?: string[]): string {
  if (!labels || labels.length === 0) return ''
  const badges = labels.map(label =>
    `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:#10b981;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);margin-right:4px;">✓ ${esc(label)}</span>`
  ).join('')
  return `<tr><td style="padding:6px 0 0;">${badges}</td></tr>`
}

/* ── Build opinion section ── */
function buildOpinionSection(items: NewsItem[]): string {
  const rows = items.map(item => {
    const isOpinion = item.objectivity === 'opinion'
    const color = isOpinion ? '#8b5cf6' : '#3b82f6'
    const label = isOpinion ? '观点' : '分析'
    const speakerHTML = item.speaker
      ? `<span style="font-size:12px;color:${color};font-weight:600;">${esc(item.speaker)}</span>`
      : ''

    return `<tr><td style="padding:0 0 12px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td>
          <span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:${color};background:${color}15;border:1px solid ${color}30;margin-right:6px;">${label}</span>
          ${speakerHTML}
        </td></tr>
        <tr><td style="padding:4px 0 0;">
          <p style="margin:0;font-size:12px;color:#ccc;line-height:1.6;font-style:italic;padding-left:12px;border-left:2px solid ${color}40;">${esc(item.simple_zh)}</p>
        </td></tr>
      </table>
    </td></tr>`
  }).join('')

  return `
  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>
  <tr><td style="padding:24px 32px 8px;">
    <p style="margin:0 0 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#8b5cf6;">观点与分析</p>
  </td></tr>
  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${rows}
    </table>
  </td></tr>`
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
