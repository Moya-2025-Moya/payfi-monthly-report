// StablePulse Weekly Newsletter — V7 情报简报风格
// 四大差异化: 验证透明 · 矛盾预警 · 观点分离 · 叙事连续性
// Email-safe: inline styles, table layout, no CSS variables

interface SummaryItem {
  simple_zh?: string
  simple?: string
  background_zh?: string
  background?: string
  what_happened_zh?: string
  what_happened?: string
  insight_zh?: string
  insight?: string
  source_url?: string
  tags?: string[]
}

interface FactItem {
  content_zh: string
  fact_type: string
  objectivity?: string
  speaker?: string
  tags: string[]
  source_url?: string
  confidence?: string
  metric_value?: number
  metric_unit?: string
  metric_change?: string
  // Verification badges
  badge_labels?: string[]       // e.g. ['3源验证', '链上锚定', '来源可达']
  contradiction?: string        // Inline contradiction alert
}

interface NarrativeItem {
  topic: string
  summary: string
  weekCount?: number            // How many weeks this has been tracked
  lastWeekSummary?: string      // Cross-week: what happened last week
  nextWeekWatch?: string        // What to watch next week
}

interface MetricSnapshot {
  name: string                  // e.g. 'USDC'
  value: string                 // e.g. '$52B'
  change?: string               // e.g. '+3.2%'
}

interface NewsletterInput {
  weekNumber: string
  reportDate: string
  summaryItems: SummaryItem[]
  facts: FactItem[]
  narratives: NarrativeItem[]
  metrics?: MetricSnapshot[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getField(item: SummaryItem, field: 'simple' | 'background' | 'what_happened' | 'insight'): string {
  const zhKey = `${field}_zh` as keyof SummaryItem
  return (item[zhKey] as string) || (item[field] as string) || ''
}

export function generateNewsletterHTML(input: NewsletterInput): string {
  const { weekNumber, reportDate, summaryItems, facts, narratives, metrics } = input

  // Separate facts vs opinions
  const objectiveFacts = facts.filter(f => f.objectivity === 'fact' || !f.objectivity)
  const opinions = facts.filter(f => f.objectivity === 'opinion' || f.objectivity === 'analysis')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StablePulse Weekly | ${escapeHtml(reportDate)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:11px;font-weight:700;letter-spacing:3px;color:#10b981;text-transform:uppercase;">STABLEPULSE</span>
                    <span style="font-size:11px;color:#666;margin-left:6px;letter-spacing:2px;">WEEKLY INTEL</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;">
                    <span style="font-size:22px;font-weight:700;color:#ffffff;">${escapeHtml(reportDate)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:4px;">
                    <span style="font-size:12px;color:#666;font-family:monospace;">${escapeHtml(weekNumber)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${buildMetricsBar(metrics)}

          <!-- Divider -->
          <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>

          ${buildSummarySection(summaryItems, objectiveFacts)}

          ${buildNarrativeSection(narratives)}

          ${buildOpinionSection(opinions)}

          <!-- Footer -->
          <tr>
            <td style="padding:32px;border-top:1px solid #222;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:11px;color:#444;letter-spacing:1px;">STABLEPULSE WEEKLY INTEL</p>
                    <p style="margin:0 0 12px;font-size:11px;color:#333;">稳定币行业情报 · AI 验证 · 内部参考</p>
                    <p style="margin:0;font-size:11px;">
                      <a href="{{unsubscribe_url}}" style="color:#444;text-decoration:underline;">退订</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/* ── Data Bar: Key metrics at a glance ── */
function buildMetricsBar(metrics?: MetricSnapshot[]): string {
  if (!metrics || metrics.length === 0) return ''

  const cells = metrics.slice(0, 5).map(m => {
    const changeColor = m.change?.startsWith('+') ? '#10b981' : m.change?.startsWith('-') ? '#ef4444' : '#666'
    const changeHtml = m.change
      ? `<span style="font-size:11px;color:${changeColor};margin-left:4px;">${escapeHtml(m.change)}</span>`
      : ''
    return `<td style="padding:12px 16px;text-align:center;">
      <p style="margin:0 0 2px;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(m.name)}</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#fff;font-family:monospace;">${escapeHtml(m.value)}${changeHtml}</p>
    </td>`
  }).join('')

  return `<tr>
    <td style="padding:16px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111;border-radius:8px;border:1px solid #222;">
        <tr>${cells}</tr>
      </table>
    </td>
  </tr>`
}

/* ── Summary Section with verification badges ── */
function buildSummarySection(items: SummaryItem[], facts: FactItem[]): string {
  if (items.length === 0) return ''

  const rows = items.map((item, i) => {
    const simple = getField(item, 'simple')
    const bg = getField(item, 'background')

    // Find matching fact for verification badges
    const matchingFact = facts.find(f =>
      item.tags?.some(t => f.tags.includes(t)) || f.content_zh.includes(simple.slice(0, 20))
    )
    const badgeHtml = buildBadgeHtml(matchingFact)
    const contradictionHtml = matchingFact?.contradiction
      ? `<p style="margin:6px 0 0;font-size:11px;color:#ef4444;background:rgba(239,68,68,0.08);padding:4px 8px;border-radius:4px;border:1px solid rgba(239,68,68,0.15);">⚠ ${escapeHtml(matchingFact.contradiction)}</p>`
      : ''

    const detailHtml = bg
      ? `<p style="margin:4px 0 0;font-size:12px;color:#888;line-height:1.6;">${escapeHtml(bg)}</p>`
      : ''

    return `<tr>
      <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:24px;vertical-align:top;padding-top:2px;">
              <span style="font-size:12px;color:#444;font-family:monospace;">${String(i + 1).padStart(2, '0')}</span>
            </td>
            <td>
              <p style="margin:0;font-size:14px;color:#e5e5e5;line-height:1.6;">${escapeHtml(simple)}</p>
              ${detailHtml}
              ${badgeHtml}
              ${contradictionHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  }).join('')

  return `<tr>
    <td style="padding:24px 32px;">
      <p style="margin:0 0 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#10b981;">本周情报</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows}
      </table>
    </td>
  </tr>`
}

/* ── Build verification badge HTML for a fact ── */
function buildBadgeHtml(fact?: FactItem): string {
  if (!fact?.badge_labels || fact.badge_labels.length === 0) return ''

  const badges = fact.badge_labels.map(label => {
    return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:#10b981;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);margin-right:4px;">✓ ${escapeHtml(label)}</span>`
  }).join('')

  return `<p style="margin:6px 0 0;">${badges}</p>`
}

/* ── Narrative Section with cross-week tracking ── */
function buildNarrativeSection(narratives: NarrativeItem[]): string {
  if (narratives.length === 0) return ''

  const items = narratives.map(n => {
    const weekBadge = n.weekCount && n.weekCount > 1
      ? `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:#3b82f6;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);margin-left:8px;">第${n.weekCount}周追踪</span>`
      : ''

    const lastWeekHtml = n.lastWeekSummary
      ? `<p style="margin:8px 0 0;font-size:11px;color:#666;padding-left:12px;border-left:2px solid #333;">上周: ${escapeHtml(n.lastWeekSummary)}</p>`
      : ''

    const nextWeekHtml = n.nextWeekWatch
      ? `<p style="margin:4px 0 0;font-size:11px;color:#f59e0b;"><span style="color:#f59e0b;">→</span> 下周关注: ${escapeHtml(n.nextWeekWatch)}</p>`
      : ''

    return `<tr>
      <td style="padding:12px 16px;background-color:#111;border-radius:8px;border:1px solid #222;">
        <p style="margin:0 0 6px;">
          <span style="font-size:13px;font-weight:600;color:#e5e5e5;">${escapeHtml(n.topic)}</span>
          ${weekBadge}
        </p>
        <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">${escapeHtml(n.summary)}</p>
        ${lastWeekHtml}
        ${nextWeekHtml}
      </td>
    </tr>
    <tr><td style="height:8px;"></td></tr>`
  }).join('')

  return `<tr>
    <td style="padding:8px 32px 24px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#3b82f6;">叙事追踪</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${items}
      </table>
    </td>
  </tr>`
}

/* ── Opinion Section: structurally separated from facts ── */
function buildOpinionSection(opinions: FactItem[]): string {
  if (opinions.length === 0) return ''

  const rows = opinions.slice(0, 8).map(f => {
    const isOpinion = f.objectivity === 'opinion'
    const color = isOpinion ? '#8b5cf6' : '#3b82f6'
    const label = isOpinion ? '观点' : '分析'
    const speakerHtml = f.speaker
      ? `<span style="font-size:12px;color:${color};font-weight:600;">${escapeHtml(f.speaker)}</span>`
      : ''

    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:${color};background:${color}15;border:1px solid ${color}30;margin-right:6px;">${label}</span>
              ${speakerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-top:4px;">
              <p style="margin:0;font-size:13px;color:#ccc;line-height:1.6;font-style:italic;padding-left:12px;border-left:2px solid ${color}40;">${escapeHtml(f.content_zh)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  }).join('')

  return `<tr>
    <td style="padding:8px 32px 24px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#8b5cf6;">观点与分析</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows}
      </table>
    </td>
  </tr>`
}
