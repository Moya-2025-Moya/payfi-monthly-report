'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/Card'

type Tab = 'generate' | 'preview' | 'subscribers'

/* ── Stream event types ── */
interface StreamEvent {
  type: string
  runId?: string
  step?: string
  message?: string
  level?: string
}

/* ── Report data ── */
interface ReportData {
  id: string
  date: string
  subject: string | null
  content: string
  created_at: string
}

/* ── Subscriber ── */
interface Subscriber {
  id: string
  email: string
  status: string
  created_at: string
}

/* ──────────────────────────────────────────
   Tab 1: Generate Weekly Report
   ────────────────────────────────────────── */
function GenerateTab() {
  const [generating, setGenerating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  async function handleGenerate() {
    setGenerating(true)
    setLogs([])

    try {
      const res = await fetch('/api/cron/snapshot/stream')
      if (!res.ok || !res.body) {
        setLogs(prev => [...prev, '[ERROR] 请求失败'])
        setGenerating(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event: StreamEvent = JSON.parse(line.slice(6))
            if (event.type === 'log' && event.message) {
              setLogs(prev => [...prev, event.message!])
            } else if (event.type === 'progress' && event.step && event.message) {
              setLogs(prev => [...prev, `[${event.step}] ${event.message}`])
            } else if (event.type === 'done') {
              setLogs(prev => [...prev, '--- 生成完成 ---'])
            } else if (event.type === 'error' && event.message) {
              setLogs(prev => [...prev, `[ERROR] ${event.message}`])
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setLogs(prev => [...prev, '[ERROR] 网络错误'])
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--fg-title)' }}>生成本周周报</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--fg-muted)' }}>
              统计事实 → 矛盾检测 → AI 选题+分类 → 生成摘要 → 邮件报告
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 rounded-md text-[13px] font-semibold transition-colors"
            style={{
              background: generating ? 'var(--surface-alt)' : 'var(--accent)',
              color: generating ? 'var(--fg-muted)' : 'var(--accent-fg)',
              opacity: generating ? 0.7 : 1,
            }}>
            {generating ? '生成中...' : '生成本周周报'}
          </button>
        </div>
      </Card>

      {logs.length > 0 && (
        <Card>
          <p className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>
            生成日志
          </p>
          <div
            className="font-mono text-[11px] leading-relaxed rounded-md p-3 overflow-auto"
            style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)', maxHeight: '400px' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ color: log.includes('[ERROR]') ? 'var(--danger)' : log.includes('完成') ? 'var(--success)' : undefined }}>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </Card>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────
   Tab 2: Email Preview
   ────────────────────────────────────────── */
function PreviewTab() {
  const [reports, setReports] = useState<ReportData[]>([])
  const [selected, setSelected] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then((data: ReportData[]) => {
        setReports(data)
        if (data.length > 0) setSelected(data[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-[12px] py-8 text-center" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
  if (reports.length === 0) return <p className="text-[12px] py-8 text-center" style={{ color: 'var(--fg-muted)' }}>还没有生成过邮件报告。</p>

  return (
    <div className="flex gap-4">
      <div className="w-48 shrink-0 space-y-1">
        {reports.map(r => (
          <button key={r.id} onClick={() => setSelected(r)}
            className="w-full text-left px-3 py-2 rounded-md text-[12px] transition-colors"
            style={{
              background: selected?.id === r.id ? 'var(--accent-soft)' : 'transparent',
              color: selected?.id === r.id ? 'var(--accent)' : 'var(--fg-secondary)',
              border: `1px solid ${selected?.id === r.id ? 'var(--accent-muted)' : 'var(--border)'}`,
            }}>
            <p className="font-medium">{r.date}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{r.subject ?? 'No subject'}</p>
          </button>
        ))}
      </div>
      {selected && (
        <div className="flex-1 border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
            <div>
              <p className="text-[12px] font-medium" style={{ color: 'var(--fg-title)' }}>{selected.subject ?? `StablePulse Weekly | ${selected.date}`}</p>
              <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>From: StablePulse &lt;noreply@stablepulse.com&gt;</p>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{new Date(selected.created_at).toLocaleString('zh-CN')}</p>
          </div>
          <iframe srcDoc={selected.content} className="w-full border-0" style={{ height: '80vh', background: '#f0f0f0' }} title="Email preview" sandbox="allow-same-origin" />
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────
   Tab 3: Subscribers
   ────────────────────────────────────────── */
function SubscribersTab() {
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
      if (res.ok) { setNewEmail(''); load() }
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
    <div className="space-y-4 max-w-2xl">
      <Card>
        <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>添加订阅者</p>
        <div className="flex gap-2">
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="email@example.com"
            className="flex-1 px-3 py-2 rounded-md border text-[13px] outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }} />
          <button onClick={handleAdd} disabled={adding || !newEmail.trim()}
            className="px-4 py-2 rounded-md text-[12px] font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', opacity: adding ? 0.7 : 1 }}>
            {adding ? '添加中...' : '添加'}
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--fg-title)' }}>订阅者列表</p>
          <span className="text-[11px] font-mono" style={{ color: 'var(--fg-muted)' }}>{active.length} 活跃 · {inactive.length} 已退订</span>
        </div>
        {loading ? (
          <p className="text-[12px] py-4 text-center" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
        ) : subscribers.length === 0 ? (
          <p className="text-[12px] py-4 text-center" style={{ color: 'var(--fg-muted)' }}>暂无订阅者</p>
        ) : (
          <div className="space-y-1">
            {subscribers.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-md"
                style={{ background: s.status === 'active' ? 'transparent' : 'var(--surface-alt)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full"
                    style={{ background: s.status === 'active' ? 'var(--success)' : 'var(--fg-muted)', opacity: s.status === 'active' ? 1 : 0.4 }} />
                  <span className="text-[13px]"
                    style={{ color: s.status === 'active' ? 'var(--fg-body)' : 'var(--fg-muted)', textDecoration: s.status !== 'active' ? 'line-through' : 'none' }}>
                    {s.email}
                  </span>
                </div>
                <button onClick={() => handleToggle(s.id, s.status)}
                  className="text-[11px] px-2 py-1 rounded border transition-colors"
                  style={{
                    borderColor: s.status === 'active' ? 'var(--danger)' : 'var(--success)',
                    color: s.status === 'active' ? 'var(--danger)' : 'var(--success)',
                  }}>
                  {s.status === 'active' ? '退订' : '恢复'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

/* ──────────────────────────────────────────
   Main Admin Page: 3 Tabs
   ────────────────────────────────────────── */
const TABS: { key: Tab; label: string }[] = [
  { key: 'generate', label: '运行周报' },
  { key: 'preview', label: '预览邮件' },
  { key: 'subscribers', label: '订阅者' },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('generate')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[18px] font-bold" style={{ color: 'var(--fg-title)' }}>管理后台</h1>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 text-[13px] font-medium transition-colors"
            style={{
              color: tab === t.key ? 'var(--accent)' : 'var(--fg-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'generate' && <GenerateTab />}
      {tab === 'preview' && <PreviewTab />}
      {tab === 'subscribers' && <SubscribersTab />}
    </div>
  )
}
