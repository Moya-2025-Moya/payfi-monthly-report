// Telegram runtime config — DB-first, env-var fallback
//
// Channels are stored as a JSON array in app_settings key "telegram_channels".
// TELEGRAM_BOT_TOKEN is always read from env (secret, never stored in DB).

import { supabaseAdmin } from '@/db/client'
import { SOURCES } from '@/config/sources'

export interface TelegramChannel {
  id: string           // client-generated uuid
  name: string         // display name, e.g. "StablePulse CN"
  chatId: string       // Telegram supergroup chat_id (negative number as string)
  threadCn: number | undefined  // message_thread_id for CN topic
  threadEn: number | undefined  // message_thread_id for EN topic
}

export function getTelegramBotToken(): string {
  return SOURCES.telegram.botToken
}

export async function getTelegramChannels(): Promise<TelegramChannel[]> {
  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'telegram_channels')
      .single()

    if (data?.value) {
      const parsed = JSON.parse(data.value as string)
      if (Array.isArray(parsed)) return parsed as TelegramChannel[]
    }
  } catch {
    // table may not exist or no channels saved yet
  }

  // Fallback: build single channel from env vars / legacy flat keys
  try {
    const { data } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', ['telegram_chat_id', 'telegram_thread_cn', 'telegram_thread_en'])

    let chatId = ''
    let threadCn: number | undefined
    let threadEn: number | undefined

    for (const row of data ?? []) {
      if (row.key === 'telegram_chat_id') chatId = row.value as string
      else if (row.key === 'telegram_thread_cn' && row.value) threadCn = Number(row.value)
      else if (row.key === 'telegram_thread_en' && row.value) threadEn = Number(row.value)
    }

    if (chatId) {
      return [{ id: 'legacy', name: 'Default', chatId, threadCn, threadEn }]
    }
  } catch { /* ignore */ }

  // Final fallback: env vars
  const chatId = SOURCES.telegram.chatId
  if (!chatId) return []
  return [{
    id: 'env',
    name: 'Default',
    chatId,
    threadCn: SOURCES.telegram.threadCn,
    threadEn: SOURCES.telegram.threadEn,
  }]
}

export async function saveTelegramChannels(channels: TelegramChannel[]): Promise<void> {
  await supabaseAdmin
    .from('app_settings')
    .upsert(
      { key: 'telegram_channels', value: JSON.stringify(channels), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
}
