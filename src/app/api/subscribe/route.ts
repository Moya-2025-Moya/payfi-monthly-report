import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '请提供邮箱地址' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return NextResponse.json({ error: '邮箱格式无效' }, { status: 400 })
    }

    const unsubscribe_token = crypto.randomUUID()

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          email: normalized,
          status: 'active',
          welcomed: false,
          unsubscribe_token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('[subscribe] Upsert error:', error)
      return NextResponse.json({ error: '订阅失败，请稍后重试' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[subscribe] Unexpected error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
