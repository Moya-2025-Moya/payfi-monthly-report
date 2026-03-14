'use client'

import { useState } from 'react'

export function Landing({ currentWeek }: { currentWeek: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setState('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setState('success')
        setEmail('')
      } else {
        setState('error')
        setErrorMsg(data.error || '订阅失败')
      }
    } catch {
      setState('error')
      setErrorMsg('网络错误，请稍后重试')
    }
  }

  return (
    <div className="max-w-[680px] mx-auto" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {/* Brand */}
      <div className="mb-3">
        <span className="text-[11px] font-bold tracking-[3px] uppercase" style={{ color: 'var(--fg-muted)' }}>
          StablePulse
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-[32px] md:text-[40px] font-bold leading-[1.2] mb-4" style={{ color: 'var(--fg-title)', letterSpacing: '-0.02em' }}>
        稳定币行业<br />每周深度追踪
      </h1>

      {/* Subline */}
      <p className="text-[15px] leading-[1.8] mb-8" style={{ color: 'var(--fg-secondary)', maxWidth: '480px' }}>
        AI 多源交叉验证，零观点。每周追踪稳定币市场动态、融资、监管与链上数据，直接送到你的收件箱。
      </p>

      {/* Subscribe form */}
      {state === 'success' ? (
        <div className="flex items-center gap-2 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-[14px] font-medium" style={{ color: '#059669' }}>订阅成功，下期周报将发送到你的邮箱</span>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="flex items-stretch gap-2" style={{ maxWidth: '420px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setState('idle') }}
            placeholder="your@email.com"
            required
            className="flex-1 min-w-0 px-4 py-2.5 text-[14px] rounded-lg border outline-none transition-colors"
            style={{
              borderColor: state === 'error' ? '#ef4444' : 'var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg-title)',
            }}
          />
          <button
            type="submit"
            disabled={state === 'loading'}
            className="shrink-0 px-5 py-2.5 text-[13px] font-semibold rounded-lg transition-opacity"
            style={{
              background: '#ff6d00',
              color: '#ffffff',
              opacity: state === 'loading' ? 0.6 : 1,
            }}
          >
            {state === 'loading' ? '...' : '订阅'}
          </button>
        </form>
      )}
      {state === 'error' && (
        <p className="text-[12px] mt-2" style={{ color: '#ef4444' }}>{errorMsg}</p>
      )}

      {/* Link to current report */}
      <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
        <a href={`/weekly/${currentWeek}`}
          className="inline-flex items-center gap-2 text-[13px] font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}>
          阅读本周报告
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </a>
      </div>
    </div>
  )
}
