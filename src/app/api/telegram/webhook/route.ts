// Telegram Bot Webhook — handles /watch, /unwatch, /list commands

import { NextResponse } from 'next/server'
import { SOURCES } from '@/config/sources'
import { addEntity, deactivateEntity, getActiveEntities, findEntity } from '@/lib/watchlist'

const BOT_TOKEN = SOURCES.telegram.botToken

interface TelegramUpdate {
  message?: {
    chat: { id: number }
    from?: { id: number }
    text?: string
  }
}

async function sendTelegramReply(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
}

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json()
    const message = update.message
    if (!message?.text) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text.trim()

    // /watch EntityName [category]
    if (text.startsWith('/watch ')) {
      const parts = text.slice(7).trim().split(/\s+/)
      const name = parts[0]
      const category = parts[1] || 'other'

      if (!name) {
        await sendTelegramReply(chatId, 'Usage: /watch EntityName [category]')
        return NextResponse.json({ ok: true })
      }

      // Check if already exists
      const existing = await findEntity(name)
      if (existing) {
        await sendTelegramReply(chatId, `Entity "${name}" already in watchlist (${existing.category})`)
        return NextResponse.json({ ok: true })
      }

      try {
        const validCategories = ['issuer', 'payments', 'institutional', 'regulatory', 'infrastructure', 'enterprise', 'rwa', 'defi']
        const cat = validCategories.includes(category) ? category : 'defi'
        await addEntity(name, [], cat as 'issuer' | 'payments' | 'institutional' | 'regulatory' | 'infrastructure' | 'enterprise' | 'rwa' | 'defi')
        await sendTelegramReply(chatId, `✅ Added "<b>${name}</b>" to watchlist (${cat})`)
      } catch (err) {
        await sendTelegramReply(chatId, `❌ Failed to add: ${err instanceof Error ? err.message : String(err)}`)
      }
      return NextResponse.json({ ok: true })
    }

    // /unwatch EntityName
    if (text.startsWith('/unwatch ')) {
      const name = text.slice(9).trim()
      if (!name) {
        await sendTelegramReply(chatId, 'Usage: /unwatch EntityName')
        return NextResponse.json({ ok: true })
      }

      const success = await deactivateEntity(name)
      if (success) {
        await sendTelegramReply(chatId, `✅ Deactivated "<b>${name}</b>" from watchlist`)
      } else {
        await sendTelegramReply(chatId, `❌ Entity "${name}" not found`)
      }
      return NextResponse.json({ ok: true })
    }

    // /list
    if (text === '/list') {
      const entities = await getActiveEntities()
      if (entities.length === 0) {
        await sendTelegramReply(chatId, 'Watchlist is empty')
        return NextResponse.json({ ok: true })
      }

      // Group by category
      const grouped: Record<string, string[]> = {}
      for (const e of entities) {
        if (!grouped[e.category]) grouped[e.category] = []
        grouped[e.category].push(e.name)
      }

      let reply = `📋 <b>Watchlist</b> (${entities.length} entities)\n\n`
      for (const [cat, names] of Object.entries(grouped)) {
        reply += `<b>${cat}</b>: ${names.join(', ')}\n`
      }

      await sendTelegramReply(chatId, reply)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[telegram-webhook] Error:', err)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}
