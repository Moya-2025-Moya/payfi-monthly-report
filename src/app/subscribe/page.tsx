'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'

export default function SubscribePage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('请输入有效的邮箱地址')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || '订阅失败，请稍后重试')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMsg('网络错误，请稍后重试')
      setStatus('error')
    }
  }

  return (
    <div>
      <PageHeader title="订阅周报" />

      <div className="max-w-lg">
        <p className="text-[14px] mb-6" style={{ color: 'var(--fg-body)' }}>
          每周一收到 StablePulse 稳定币行业周报，包含本周最重要的 10 条新闻和叙事时间线分析。
        </p>

        {status === 'success' ? (
          <div
            className="rounded-lg border p-6 text-center"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
              style={{ background: 'var(--success)', color: 'var(--accent-fg)' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 10l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--fg-title)' }}>
              订阅成功
            </p>
            <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
              下一期周报将发送至 <strong style={{ color: 'var(--fg-body)' }}>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              className="rounded-lg border p-6"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <label
                className="block text-[12px] font-medium mb-2"
                style={{ color: 'var(--fg-title)' }}
              >
                邮箱地址
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-3 py-2 rounded-md border text-[14px] outline-none transition-colors"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--fg-body)',
                  }}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-5 py-2 rounded-md text-[14px] font-medium transition-colors cursor-pointer"
                  style={{
                    background: status === 'loading' ? 'var(--accent-hover)' : 'var(--accent)',
                    color: 'var(--accent-fg)',
                    opacity: status === 'loading' ? 0.7 : 1,
                  }}
                >
                  {status === 'loading' ? '提交中...' : '订阅'}
                </button>
              </div>

              {status === 'error' && (
                <p className="mt-2 text-[12px]" style={{ color: 'var(--danger)' }}>
                  {errorMsg}
                </p>
              )}
            </div>
          </form>
        )}

        <p className="mt-4 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          我们不会分享你的邮箱。可随时退订。
        </p>
      </div>
    </div>
  )
}
