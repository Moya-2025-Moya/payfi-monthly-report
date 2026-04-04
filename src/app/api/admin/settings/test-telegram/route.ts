// POST /api/admin/settings/test-telegram
// Sends a test message directly to a specific chat/thread.
// Body: { chatId: string, threadId?: number, label?: string }

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { getTelegramBotToken } from '@/lib/telegram-config'

export async function POST(request: NextRequest) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  let body: { chatId?: string; threadId?: number; label?: string } = {}
  try { body = await request.json() } catch { /* ok */ }

  const { chatId, threadId, label = '' } = body

  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
  }

  const botToken = getTelegramBotToken()
  if (!botToken) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set in environment' }, { status: 400 })
  }

  const threadLabel = threadId !== undefined ? ` · thread ${threadId}` : ' · main'
  const channelLabel = label ? ` · ${label}` : ''
  const text = `✅ <b>StablePulse</b> — test message${channelLabel}${threadLabel}\n\nTelegram config is working correctly.`

  const msgBody: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }
  if (threadId !== undefined) msgBody.message_thread_id = threadId

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
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

  return NextResponse.json({ ok: true, chatId, threadId })
}
