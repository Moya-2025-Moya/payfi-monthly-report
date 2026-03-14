import Link from 'next/link'
import { supabaseAdmin } from '@/db/client'

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  let status: 'success' | 'error' | 'invalid' = 'invalid'

  if (token) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select()

    if (error) {
      status = 'error'
    } else if (!data || data.length === 0) {
      status = 'error'
    } else {
      status = 'success'
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-var(--topbar-h))] flex items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-[5px] h-[14px] rounded-full" style={{ background: 'var(--accent)', opacity: 0.5 }} />
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--fg-muted)' }}>
            StablePulse
          </span>
        </div>

        {/* Card */}
        <div
          className="card-elevated p-8"
        >
          {status === 'success' && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--success-soft)' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 10l3 3 7-7" />
                </svg>
              </div>
              <h1 className="text-[18px] font-bold mb-2" style={{ color: 'var(--fg-title)' }}>
                已退订
              </h1>
              <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--fg-secondary)' }}>
                你将不再收到 StablePulse Weekly 邮件。<br />
                随时欢迎回来。
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--danger-soft)' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
                  <path d="M7 7l6 6M13 7l-6 6" />
                </svg>
              </div>
              <h1 className="text-[18px] font-bold mb-2" style={{ color: 'var(--fg-title)' }}>
                退订失败
              </h1>
              <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--fg-secondary)' }}>
                无效的退订链接，或该邮箱已退订。<br />
                请检查链接是否正确。
              </p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--warning-soft)' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="10" cy="10" r="7" />
                  <path d="M10 7v3M10 13h.01" />
                </svg>
              </div>
              <h1 className="text-[18px] font-bold mb-2" style={{ color: 'var(--fg-title)' }}>
                缺少退订凭证
              </h1>
              <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'var(--fg-secondary)' }}>
                请使用邮件中的退订链接。
              </p>
            </>
          )}

          <Link
            href="/"
            className="inline-block text-[13px] font-medium px-5 py-2 rounded-lg border transition-colors hover:border-[var(--border-hover)]"
            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
