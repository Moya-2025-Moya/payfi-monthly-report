// ============================================================
// StablePulse — E2 Telegram Bot Distributor
// ============================================================

import { SOURCES } from '@/config/sources'

export async function sendTelegramMessage(text: string): Promise<void> {
  const { botToken, chatId } = SOURCES.telegram
  if (!botToken || botToken === '123456:ABC-DEF' || !chatId || chatId === '-100xxxxxxxxxx') {
    console.log('[E2] Telegram not configured, skipping')
    return
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API error ${res.status}: ${err}`)
  }

  console.log('[E2] Telegram message sent')
}

export async function sendWeeklySnapshotTelegram(
  snapshot: { week_number: string; snapshot_data: Record<string, unknown> }
): Promise<void> {
  // Build a concise Telegram message
  const data = snapshot.snapshot_data as any
  const message = [
    `<b>📊 StablePulse Weekly — ${snapshot.week_number}</b>`,
    '',
    `New facts: ${data.new_facts ?? 0}`,
    `🟢 High: ${data.high_confidence ?? 0} | 🔵 Med: ${data.medium_confidence ?? 0} | 🟡 Low: ${data.low_confidence ?? 0}`,
    `Rejected: ${data.rejected ?? 0}`,
    '',
    `New entities: ${data.new_entities ?? 0}`,
    `New contradictions: ${data.new_contradictions ?? 0}`,
    data.top_density_anomalies?.length > 0
      ? `\n⚡ Density spikes: ${data.top_density_anomalies.join(', ')}`
      : '',
  ].filter(Boolean).join('\n')

  await sendTelegramMessage(message)
}

// Send pipeline alert (for errors)
export async function sendPipelineAlert(pipelineType: string, error: string): Promise<void> {
  await sendTelegramMessage(
    `<b>⚠️ Pipeline Failed</b>\n\nType: ${pipelineType}\nError: ${error}`
  )
}
