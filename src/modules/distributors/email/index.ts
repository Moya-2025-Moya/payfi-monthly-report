// ============================================================
// StablePulse — E1 Email Distributor (Resend)
// ============================================================

import { SOURCES } from '@/config/sources'

interface EmailOptions {
  to: string[]
  subject: string
  html: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const apiKey = SOURCES.resend.apiKey
  if (!apiKey || apiKey === 're_xxx') {
    console.log('[E1] Resend not configured, skipping email')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'StablePulse <noreply@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend API error ${res.status}: ${err}`)
  }

  console.log(`[E1] Email sent to ${options.to.length} recipients`)
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────

function buildSnapshotHtml(
  weekNumber: string,
  data: {
    total_facts?: number
    new_facts?: number
    high_confidence?: number
    medium_confidence?: number
    low_confidence?: number
    rejected?: number
    new_entities?: number
    active_entities?: number
    new_contradictions?: number
    resolved_contradictions?: number
    top_density_anomalies?: string[]
  }
): string {
  const totalFacts = data.total_facts ?? 0
  const newFacts = data.new_facts ?? 0
  const high = data.high_confidence ?? 0
  const medium = data.medium_confidence ?? 0
  const low = data.low_confidence ?? 0
  const rejected = data.rejected ?? 0
  const newEntities = data.new_entities ?? 0
  const activeEntities = data.active_entities ?? 0
  const newContradictions = data.new_contradictions ?? 0
  const resolvedContradictions = data.resolved_contradictions ?? 0
  const anomalies = data.top_density_anomalies ?? []

  const anomaliesSection =
    anomalies.length > 0
      ? `
      <tr>
        <td style="padding: 12px 0; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
            Density Spikes
          </p>
          <ul style="margin: 0; padding: 0 0 0 20px; list-style-type: disc;">
            ${anomalies
              .map(
                (a) =>
                  `<li style="font-size: 14px; color: #1f2937; margin-bottom: 4px;">
                    <span style="display: inline-block; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 600; padding: 1px 6px; border-radius: 3px; margin-right: 6px;">SPIKE</span>
                    ${escapeHtml(a)}
                  </li>`
              )
              .join('')}
          </ul>
        </td>
      </tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StablePulse Weekly Report — ${escapeHtml(weekNumber)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0f766e 100%); padding: 32px 32px 28px 32px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #99f6e4; text-transform: uppercase; letter-spacing: 0.1em;">
                StablePulse Intelligence
              </p>
              <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 700; color: #ffffff; line-height: 1.2;">
                Weekly Snapshot
              </h1>
              <p style="margin: 0; font-size: 16px; color: #a7f3d0; font-weight: 500;">
                ${escapeHtml(weekNumber)}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                <!-- Stats Summary -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
                      Facts Summary
                    </p>
                    <!-- Stat pills row -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td width="48%" style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
                          <p style="margin: 0 0 2px 0; font-size: 28px; font-weight: 700; color: #15803d;">${totalFacts.toLocaleString()}</p>
                          <p style="margin: 0; font-size: 12px; color: #166534;">Total Facts</p>
                        </td>
                        <td width="4%"></td>
                        <td width="48%" style="background-color: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
                          <p style="margin: 0 0 2px 0; font-size: 28px; font-weight: 700; color: #1d4ed8;">${newFacts.toLocaleString()}</p>
                          <p style="margin: 0; font-size: 12px; color: #1e40af;">New This Week</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Confidence Distribution -->
                <tr>
                  <td style="padding-bottom: 24px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
                      Confidence Distribution
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td width="30%" style="text-align: center; padding: 10px; background-color: #f0fdf4; border-radius: 8px;">
                          <p style="margin: 0 0 2px 0; font-size: 22px; font-weight: 700; color: #16a34a;">${high.toLocaleString()}</p>
                          <p style="margin: 0; font-size: 11px; color: #15803d;">High</p>
                        </td>
                        <td width="4%"></td>
                        <td width="30%" style="text-align: center; padding: 10px; background-color: #eff6ff; border-radius: 8px;">
                          <p style="margin: 0 0 2px 0; font-size: 22px; font-weight: 700; color: #2563eb;">${medium.toLocaleString()}</p>
                          <p style="margin: 0; font-size: 11px; color: #1d4ed8;">Medium</p>
                        </td>
                        <td width="4%"></td>
                        <td width="30%" style="text-align: center; padding: 10px; background-color: #fefce8; border-radius: 8px;">
                          <p style="margin: 0 0 2px 0; font-size: 22px; font-weight: 700; color: #ca8a04;">${low.toLocaleString()}</p>
                          <p style="margin: 0; font-size: 11px; color: #a16207;">Low</p>
                        </td>
                      </tr>
                    </table>
                    ${
                      rejected > 0
                        ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                            + ${rejected.toLocaleString()} rejected
                          </p>`
                        : ''
                    }
                  </td>
                </tr>

                <!-- Entities & Contradictions -->
                <tr>
                  <td style="border-top: 1px solid #e5e7eb; padding-top: 20px; padding-bottom: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
                      Knowledge Graph
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding: 4px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size: 14px; color: #6b7280;">New entities</td>
                              <td align="right" style="font-size: 14px; font-weight: 600; color: #111827;">${newEntities.toLocaleString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size: 14px; color: #6b7280;">Active entities</td>
                              <td align="right" style="font-size: 14px; font-weight: 600; color: #111827;">${activeEntities.toLocaleString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size: 14px; color: #6b7280;">New contradictions</td>
                              <td align="right" style="font-size: 14px; font-weight: 600; color: ${newContradictions > 0 ? '#dc2626' : '#111827'};">${newContradictions.toLocaleString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size: 14px; color: #6b7280;">Resolved contradictions</td>
                              <td align="right" style="font-size: 14px; font-weight: 600; color: #16a34a;">${resolvedContradictions.toLocaleString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Density Anomalies (conditional) -->
                ${anomaliesSection}

                <!-- CTA -->
                <tr>
                  <td style="padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <a href="https://stablepulse.app/dashboard"
                       style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #0f766e 100%); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; letter-spacing: 0.02em;">
                      View Full Dashboard →
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                StablePulse · Automated Intelligence Report · ${escapeHtml(weekNumber)}
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #d1d5db;">
                You are receiving this because you have a StablePulse account.
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Send weekly snapshot email
export async function sendWeeklySnapshotEmail(
  recipients: string[],
  snapshot: { week_number: string; snapshot_data: Record<string, unknown> }
): Promise<void> {
  const data = snapshot.snapshot_data as Parameters<typeof buildSnapshotHtml>[1]
  const html = buildSnapshotHtml(snapshot.week_number, data)
  await sendEmail({
    to: recipients,
    subject: `StablePulse Weekly Report — ${snapshot.week_number}`,
    html,
  })
}
