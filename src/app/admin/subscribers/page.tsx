'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

interface Subscriber {
  id: string
  email: string
  status: string
  created_at: string
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/subscribers')
      if (res.ok) {
        const data = await res.json()
        setSubscribers(Array.isArray(data) ? data : data.data ?? [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    const email = newEmail.trim()
    if (!email || adding) return
    setAdding(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setNewEmail('')
        load()
      }
    } catch { /* ignore */ }
    finally { setAdding(false) }
  }

  async function handleToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'unsubscribed' : 'active'
    try {
      await fetch('/api/subscribers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      load()
    } catch { /* ignore */ }
  }

  const active = subscribers.filter(s => s.status === 'active')
  const inactive = subscribers.filter(s => s.status !== 'active')

  return (
    <div>
      <PageHeader title="订阅者管理" />

      <div className="max-w-2xl space-y-4">
        {/* Add subscriber */}
        <Card>
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>添加订阅者</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="email@example.com"
              className="flex-1 px-3 py-2 rounded-md border text-[13px] outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newEmail.trim()}
              className="px-4 py-2 rounded-md text-[12px] font-medium"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)', opacity: adding ? 0.7 : 1 }}
            >
              {adding ? '添加中...' : '添加'}
            </button>
          </div>
        </Card>

        {/* Subscriber list */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold" style={{ color: 'var(--fg-title)' }}>
              订阅者列表
            </p>
            <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
              {active.length} 活跃 · {inactive.length} 已退订
            </span>
          </div>

          {loading ? (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
          ) : subscribers.length === 0 ? (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--fg-muted)' }}>暂无订阅者</p>
          ) : (
            <div className="space-y-1">
              {subscribers.map(s => (
                <div key={s.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md"
                  style={{ background: s.status === 'active' ? 'transparent' : 'var(--surface-alt)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full"
                      style={{ background: s.status === 'active' ? 'var(--success)' : 'var(--fg-muted)', opacity: s.status === 'active' ? 1 : 0.4 }} />
                    <span className="text-[13px]"
                      style={{ color: s.status === 'active' ? 'var(--fg-body)' : 'var(--fg-muted)', textDecoration: s.status !== 'active' ? 'line-through' : 'none' }}>
                      {s.email}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                      {new Date(s.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggle(s.id, s.status)}
                    className="text-[11px] px-2 py-1 rounded border transition-colors"
                    style={{
                      borderColor: s.status === 'active' ? 'var(--danger)' : 'var(--success)',
                      color: s.status === 'active' ? 'var(--danger)' : 'var(--success)',
                    }}
                  >
                    {s.status === 'active' ? '退订' : '恢复'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
