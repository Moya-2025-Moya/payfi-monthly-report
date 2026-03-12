// HTML email template generator for StablePulse Weekly Newsletter
// Outputs a complete HTML email for Moya to send via SMTP
// Design: professional, clean, Chinese language, no hyperlinks except "More Details"

const SITE_URL = 'https://payfi-monthly-report.vercel.app'

interface NewsItem {
  date: string
  simple_zh: string
  background_zh: string
  what_happened_zh: string
  insight_zh: string
  tags: string[]
}

interface NarrativeForEmail {
  topic: string
  summary: string
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

export function generateEmailHTML(data: EmailData): string {
  const { weekDate, newsItems, narratives, totalFacts, highConfidence, mediumConfidence } = data

  const newsHTML = newsItems.map((item, i) => `
    <tr><td style="padding:0 0 24px 0;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="width:32px;vertical-align:top;padding-top:2px;">
          <div style="width:24px;height:24px;border-radius:50%;background:#ff6d00;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:24px;">${i + 1}</div>
        </td>
        <td style="padding-left:12px;">
          <p style="margin:0 0 4px;font-size:13px;color:#999;">${item.date}${item.tags.length > 0 ? ' · ' + item.tags.slice(0, 2).join(' · ') : ''}</p>
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1a1a1a;line-height:1.5;">${item.simple_zh}</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f7;border-radius:6px;">
            <tr><td style="padding:12px 14px;">
              <p style="margin:0 0 6px;font-size:13px;color:#666;line-height:1.6;"><span style="color:#ff6d00;font-weight:600;">背景</span> ${item.background_zh}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#404040;line-height:1.6;"><span style="color:#ff6d00;font-weight:600;">事件</span> ${item.what_happened_zh}</p>
              <p style="margin:0;font-size:13px;color:#666;line-height:1.6;"><span style="color:#ff6d00;font-weight:600;">影响</span> ${item.insight_zh}</p>
            </td></tr>
          </table>
        </td>
      </tr></table>
    </td></tr>`).join('\n')

  const narrativesHTML = narratives.map(n => {
    const factNodes = n.nodes.filter(nd => !nd.isPrediction)
    const predictionNodes = n.nodes.filter(nd => nd.isPrediction)

    const nodesHTML = factNodes.map(nd => `
      <tr><td style="padding:0 0 8px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="width:10px;vertical-align:top;padding-top:6px;">
            <div style="width:8px;height:8px;border-radius:50%;background:#ff6d00;"></div>
          </td>
          <td style="padding-left:10px;">
            <p style="margin:0;font-size:12px;color:#999;">${nd.date}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#404040;line-height:1.5;">${nd.title}</p>
          </td>
        </tr></table>
      </td></tr>`).join('\n')

    const predictionsHTML = predictionNodes.length > 0 ? `
      <tr><td style="padding:8px 0 0;">
        <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">后续关注</p>
        ${predictionNodes.map(nd => `
          <p style="margin:0 0 4px;font-size:12px;color:#999;line-height:1.5;font-style:italic;">· ${nd.title}</p>
        `).join('')}
      </td></tr>` : ''

    return `
    <tr><td style="padding:0 0 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f7;border-radius:8px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1a1a1a;">${n.topic}</p>
          <p style="margin:0 0 12px;font-size:13px;color:#666;line-height:1.5;">${n.summary}</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-left:2px solid #ff6d00;padding-left:0;">
            <tr><td style="padding-left:12px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${nodesHTML}
                ${predictionsHTML}
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>StablePulse Weekly | ${weekDate}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<!-- Wrapper -->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0f0f0;">
<tr><td align="center" style="padding:24px 16px;">

<!-- Main container -->
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:#1a1a1a;padding:28px 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td>
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:1px;">STABLEPULSE</p>
          <p style="margin:4px 0 0;font-size:12px;color:#999;letter-spacing:0.5px;">稳定币行业周报</p>
        </td>
        <td align="right" style="vertical-align:bottom;">
          <p style="margin:0;font-size:13px;color:#ff6d00;font-weight:600;">${weekDate}</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Stats bar -->
  <tr><td style="background:#f7f7f7;padding:14px 32px;border-bottom:1px solid #e5e5e5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:12px;color:#666;">
        本周 <span style="font-weight:700;color:#1a1a1a;">${totalFacts}</span> 条已验证事实
        · 高可信 <span style="color:#16a34a;font-weight:600;">${highConfidence}</span>
        · 中可信 <span style="color:#d97706;font-weight:600;">${mediumConfidence}</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- Section: Top 10 News -->
  <tr><td style="padding:28px 32px 8px;">
    <p style="margin:0 0 4px;font-size:11px;color:#ff6d00;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">TOP STORIES</p>
    <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#1a1a1a;">本周重要新闻</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${newsHTML}
    </table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:8px 32px 0;"><div style="border-top:1px solid #e5e5e5;"></div></td></tr>

  <!-- Section: Narrative Timelines -->
  <tr><td style="padding:28px 32px 8px;">
    <p style="margin:0 0 4px;font-size:11px;color:#ff6d00;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">NARRATIVES</p>
    <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:#1a1a1a;">叙事时间线</p>
  </td></tr>

  <tr><td style="padding:0 32px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${narrativesHTML}
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:12px 32px 32px;" align="center">
    <table cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:#ff6d00;border-radius:8px;padding:14px 32px;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${SITE_URL}" style="height:46px;v-text-anchor:middle;width:200px;" arcsize="17%" fill="true" stroke="false"><v:fill type="tile" color="#ff6d00" /><v:textbox inset="0,0,0,0"><center><![endif]-->
        <a href="${SITE_URL}" target="_blank" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;">查看完整分析 →</a>
        <!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f7f7f7;padding:20px 32px;border-top:1px solid #e5e5e5;">
    <p style="margin:0 0 8px;font-size:11px;color:#999;text-align:center;">
      StablePulse Weekly News · 稳定币行业情报
    </p>
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center;">
      <a href="{{unsubscribe_url}}" style="color:#999;text-decoration:underline;">退订 Unsubscribe</a>
    </p>
  </td></tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
<!-- /Wrapper -->

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
