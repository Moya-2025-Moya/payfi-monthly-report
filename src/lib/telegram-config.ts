// Telegram runtime config — DB-first, env-var fallback
//
// Priority:
//   1. app_settings table (editable from admin UI)
//   2. Environment variables (TELEGRAM_CHAT_ID, TELEGRAM_THREAD_CN, TELEGRAM_THREAD_EN)
//
// TELEGRAM_BOT_TOKEN is always read from env (secret, never stored in DB).

import { supabaseAdmin } from '@/db/client'
import { SOURCES } from '@/config/sources'

export interface TelegramConfig {
  botToken: string
  chatId: string
  threadCn: number | undefined
  threadEn: number | undefined
}

export async function getTelegramConfig(): Promise<TelegramConfig> {
  // Bot token is always from env
  const botToken = SOURCES.telegram.botToken

  // Try DB first for the rest
  let dbChatId: string | undefined
  let dbThreadCn: number | undefined
  let dbThreadEn: number | undefined

  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', ['telegram_chat_id', 'telegram_thread_cn', 'telegram_thread_en'])

    for (const row of data ?? []) {
      const key = row.key as string
      const val = row.value as string
      if (key === 'telegram_chat_id') dbChatId = val
      else if (key === 'telegram_thread_cn' && val) dbThreadCn = Number(val)
      else if (key === 'telegram_thread_en' && val) dbThreadEn = Number(val)
    }
  } catch {
    // app_settings table may not exist yet — fall through to env vars
  }

  return {
    botToken,
    chatId:   dbChatId   ?? SOURCES.telegram.chatId,
    threadCn: dbThreadCn ?? SOURCES.telegram.threadCn,
    threadEn: dbThreadEn ?? SOURCES.telegram.threadEn,
  }
}
