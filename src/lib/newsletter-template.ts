// StablePulse Weekly Newsletter — HTML email template generator
// Generates email-safe HTML (inline styles, table layout, no CSS variables)

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
  metric_value?: number
  metric_unit?: string
  metric_change?: string
}

interface NarrativeItem {
  topic: string
  summary: string
}

interface NewsletterInput {
  weekNumber: string
  reportDate: string
  summaryItems: SummaryItem[]
  facts: FactItem[]
  narratives: NarrativeItem[]
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

const FACT_TYPE_LABELS: Record<string, string> = {
  event: '事件', metric: '指标', quote: '引述',
  relationship: '关系', status_change: '状态变更',
}

const FACT_TYPE_COLORS: Record<string, string> = {
  event: '#3b82f6', metric: '#10b981', quote: '#8b5cf6',
  relationship: '#f59e0b', status_change: '#ef4444',
}

export function generateNewsletterHTML(input: NewsletterInput): string {
  const { weekNumber, reportDate, summaryItems, facts, narratives } = input

  // Group facts by objectivity
  const objectiveFacts = facts.filter(f => f.objectivity === 'fact' || !f.objectivity)
  const opinions = facts.filter(f => f.objectivity === 'opinion' || f.objectivity === 'analysis')

  // Build sections
  const summarySection = buildSummarySection(summaryItems)
  const narrativeSection = buildNarrativeSection(narratives)
  const factsSection = buildFactsSection(objectiveFacts, '本周事实')
  const opinionsSection = opinions.length > 0 ? buildFactsSection(opinions, '观点与分析') : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StablePulse Weekly | ${escapeHtml(reportDate)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <!-- Main container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:32px 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:2px;">STABLEPULSE</span>
                    <span style="font-size:13px;color:#999;margin-left:8px;">WEEKLY</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;">
                    <span style="font-size:13px;color:#888;font-family:monospace;">${escapeHtml(weekNumber)} · ${escapeHtml(reportDate)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary -->
          ${summarySection}

          <!-- Narratives -->
          ${narrativeSection}

          <!-- Facts -->
          ${factsSection}

          <!-- Opinions -->
          ${opinionsSection}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#999;">
                StablePulse Weekly News — 稳定币/支付领域周报
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="{{unsubscribe_url}}" style="color:#999;text-decoration:underline;">退订 / Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildSummarySection(items: SummaryItem[]): string {
  if (items.length === 0) return ''

  const rows = items.map((item, i) => {
    const simple = getField(item, 'simple')
    const bg = getField(item, 'background')
    const wh = getField(item, 'what_happened')

    let detail = ''
    if (bg || wh) {
      const parts: string[] = []
      if (bg) parts.push(escapeHtml(bg))
      if (wh) parts.push(escapeHtml(wh))
      detail = `<p style="margin:4px 0 0;font-size:13px;color:#666;line-height:1.6;">${parts.join(' ')}</p>`
    }

    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.6;">
          <span style="color:#999;font-family:monospace;font-size:12px;margin-right:8px;">${i + 1}.</span>
          ${escapeHtml(simple)}
        </p>
        ${detail}
      </td>
    </tr>`
  }).join('')

  return `<tr>
    <td style="padding:24px 32px;">
      <p style="margin:0 0 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#3b82f6;">本周动态</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows}
      </table>
    </td>
  </tr>`
}

function buildNarrativeSection(narratives: NarrativeItem[]): string {
  if (narratives.length === 0) return ''

  const items = narratives.map(n =>
    `<tr>
      <td style="padding:12px 16px;background-color:#fafafa;border-radius:8px;margin-bottom:8px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1a1a1a;">${escapeHtml(n.topic)}</p>
        <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">${escapeHtml(n.summary)}</p>
      </td>
    </tr>
    <tr><td style="height:8px;"></td></tr>`
  ).join('')

  return `<tr>
    <td style="padding:8px 32px 24px;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#999;">叙事线索</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${items}
      </table>
    </td>
  </tr>`
}

function buildFactsSection(facts: FactItem[], title: string): string {
  if (facts.length === 0) return ''

  // Group by fact_type
  const grouped = new Map<string, FactItem[]>()
  for (const f of facts) {
    const arr = grouped.get(f.fact_type) ?? []
    arr.push(f)
    grouped.set(f.fact_type, arr)
  }

  const sections = [...grouped.entries()].map(([type, items]) => {
    const label = FACT_TYPE_LABELS[type] ?? type
    const color = FACT_TYPE_COLORS[type] ?? '#666'

    const rows = items.slice(0, 10).map(f => {
      const speaker = f.speaker ? `<span style="color:${color};font-size:12px;">[${escapeHtml(f.speaker)}]</span> ` : ''
      const metric = f.metric_value != null
        ? `<span style="font-family:monospace;font-weight:600;color:#1a1a1a;"> ${f.metric_value.toLocaleString()} ${escapeHtml(f.metric_unit ?? '')}</span>${f.metric_change ? `<span style="font-size:12px;color:#10b981;"> ${escapeHtml(f.metric_change)}</span>` : ''}`
        : ''
      return `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #f8f8f8;font-size:13px;color:#333;line-height:1.6;">
          ${speaker}${escapeHtml(f.content_zh)}${metric}
        </td>
      </tr>`
    }).join('')

    return `<tr>
      <td style="padding:8px 0 4px;">
        <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:${color};background-color:${color}15;">
          ${escapeHtml(label)} (${items.length})
        </span>
      </td>
    </tr>
    ${rows}`
  }).join('')

  return `<tr>
    <td style="padding:8px 32px 24px;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#999;">${escapeHtml(title)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${sections}
      </table>
    </td>
  </tr>`
}
