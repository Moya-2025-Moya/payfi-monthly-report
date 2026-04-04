// POST /api/admin/settings/test-telegram
// Sends a test message to verify the Telegram configuration is working.
// Body: { thread: "cn" | "en" | "main" }

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { getTelegramConfig } from '@/lib/telegram-config'

export async function POST(request: NextRequest) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  let body: { thread?: string } = {}
  try { body = await request.json() } catch { /* ok */ }

  const target = (body.thread ?? 'main') as 'cn' | 'en' | 'main'

  const config = await getTelegramConfig()
  if (!config.botToken || !config.chatId) {
    return NextResponse.json({ error: 'Telegram not configured (missing botToken or chatId)' }, { status: 400 })
  }

  let threadId: number | undefined
  if (target === 'cn') threadId = config.threadCn
  else if (target === 'en') threadId = config.threadEn

  const text = `✅ <b>StablePulse</b> — test message (${target})\n\nTelegram config is working correctly.`

  const msgBody: Record<string, unknown> = {
    chat_id: config.chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  if (threadId !== undefined) msgBody.message_thread_id = threadId

  const res = await fetch(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgBody),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Telegram API error ${res.status}: ${err}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, target, threadId })
}
