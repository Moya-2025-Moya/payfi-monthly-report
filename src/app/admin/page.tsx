'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/Card'

type Tab = 'generate' | 'pipeline' | 'preview' | 'subscribers'

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

/* ── Confirm dialog ── */
function ConfirmDialog({ title, message, onConfirm, onCancel, danger }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg border p-6 max-w-sm w-full mx-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-[14px] font-semibold mb-2" style={{ color: 'var(--fg-title)' }}>{title}</p>
        <p className="text-[12px] mb-4" style={{ color: 'var(--fg-secondary)' }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-md text-[12px] border"
            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>取消</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md text-[12px] font-medium"
            style={{ background: danger ? 'var(--danger)' : 'var(--accent)', color: 'white' }}>确认</button>
        </div>
      </div>
    </div>
  )
}

/* ── SSE Log Stream Hook ── */
function useSSEStream() {
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const run = useCallback(async (url: string) => {
    setRunning(true)
    setLogs([])
    try {
      const res = await fetch(url)
      if (!res.ok || !res.body) {
        setLogs(prev => [...prev, '[ERROR] 请求失败'])
        setRunning(false)
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
              setLogs(prev => [...prev, '--- 完成 ---'])
            } else if (event.type === 'error' && event.message) {
              setLogs(prev => [...prev, `[ERROR] ${event.message}`])
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setLogs(prev => [...prev, '[ERROR] 网络错误'])
    } finally {
      setRunning(false)
    }
  }, [])

  return { logs, running, run, logsEndRef }
}

function LogPanel({ logs, logsEndRef }: { logs: string[]; logsEndRef: React.RefObject<HTMLDivElement | null> }) {
  if (logs.length === 0) return null
  return (
    <Card>
      <p className="text-[11px] font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--fg-muted)' }}>日志</p>
      <div className="font-mono text-[11px] leading-relaxed rounded-md p-3 overflow-auto"
        style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)', maxHeight: '400px' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ color: log.includes('[ERROR]') ? 'var(--danger)' : log.includes('完成') ? 'var(--success)' : undefined }}>
            {log}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </Card>
  )
}

/* ──────────────────────────────────────────
   Tab 1: Generate Weekly Report (一键)
   ────────────────────────────────────────── */
function GenerateTab() {
  const { logs, running, run, logsEndRef } = useSSEStream()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="space-y-4">
      {showConfirm && (
        <ConfirmDialog
          title="生成本周周报"
          message="将执行完整流水线: 统计 → 矛盾检测 → AI 选取+上下文引擎 → 保存 → 邮件生成。确认继续？"
          onConfirm={() => { setShowConfirm(false); run('/api/cron/snapshot/stream') }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--fg-title)' }}>生成本周周报</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--fg-muted)' }}>
              统计 → 矛盾检测 → AI 选取+上下文引擎 → 保存 → 邮件生成
            </p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={running}
            className="px-6 py-2.5 rounded-md text-[13px] font-semibold transition-colors"
            style={{
              background: running ? 'var(--surface-alt)' : 'var(--accent)',
              color: running ? 'var(--fg-muted)' : 'var(--accent-fg)',
              opacity: running ? 0.7 : 1,
            }}>
            {running ? '生成中...' : '生成本周周报'}
          </button>
        </div>
      </Card>
      <LogPanel logs={logs} logsEndRef={logsEndRef} />
    </div>
  )
}

/* ──────────────────────────────────────────
   Tab 2: Pipeline (逐步执行)
   ────────────────────────────────────────── */
const PIPELINE_STEPS = [
  { key: 'collect', label: '数据采集', endpoint: '/api/cron/collect', desc: '从 RSS / SEC EDGAR 采集新闻' },
  { key: 'twitter', label: '推特采集', endpoint: '/api/cron/twitter', desc: '从 Twitter/X 采集推文' },
  { key: 'process', label: 'AI 处理', endpoint: '/api/cron/process/stream', desc: '事实拆解 + 验证 + 分类', isStream: true },
  { key: 'snapshot', label: '快照生成', endpoint: '/api/cron/snapshot/stream', desc: '选取 + 上下文引擎 + 邮件', isStream: true },
  { key: 'narrative', label: '叙事更新', endpoint: '/api/cron/narrative/stream', desc: '更新叙事线索追踪', isStream: true },
]

function PipelineTab() {
  const { logs, running, run, logsEndRef } = useSSEStream()
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetStatus, setResetStatus] = useState('')

  async function handleStep(step: typeof PIPELINE_STEPS[number]) {
    setRunningStep(step.key)
    if (step.isStream) {
      await run(step.endpoint)
    } else {
      // Non-stream: simple POST/GET
      try {
        const res = await fetch(step.endpoint)
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          // Show result in a simple way
          const msg = data.message || data.status || '完成'
          run(step.endpoint) // fallback: just show it ran
          void msg
        }
      } catch { /* ignore */ }
    }
    setRunningStep(null)
  }

  async function handleReset() {
    setShowResetConfirm(false)
    setResetStatus('重置中...')
    try {
      // Delete all atomic_facts, weekly_snapshots, reports for current week
      const res = await fetch('/api/admin/reset', { method: 'POST' })
      if (res.ok) {
        setResetStatus('数据已重置')
      } else {
        setResetStatus('重置失败')
      }
    } catch {
      setResetStatus('重置失败')
    }
    setTimeout(() => setResetStatus(''), 3000)
  }

  return (
    <div className="space-y-4">
      {showResetConfirm && (
        <ConfirmDialog
          title="重置所有数据"
          message="将清空所有事实、快照和邮件报告。此操作不可撤销。确认继续？"
          danger
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      <Card>
        <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>流水线步骤</p>
        <div className="space-y-2">
          {PIPELINE_STEPS.map(step => (
            <div key={step.key} className="flex items-center justify-between py-2 px-3 rounded-md border"
              style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--fg-body)' }}>{step.label}</p>
                <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{step.desc}</p>
              </div>
              <button
                onClick={() => handleStep(step)}
                disabled={running || runningStep !== null}
                className="px-4 py-1.5 rounded-md text-[12px] font-medium border transition-colors"
                style={{
                  borderColor: runningStep === step.key ? 'var(--accent)' : 'var(--border)',
                  color: runningStep === step.key ? 'var(--accent)' : 'var(--fg-secondary)',
                  opacity: (running || runningStep !== null) ? 0.5 : 1,
                }}>
                {runningStep === step.key ? '运行中...' : '执行'}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <LogPanel logs={logs} logsEndRef={logsEndRef} />

      {/* DEV: Data Reset */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold" style={{ color: 'var(--danger)' }}>DEV: 数据重置</p>
            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>清空所有事实、快照和邮件报告</p>
          </div>
          <div className="flex items-center gap-2">
            {resetStatus && <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{resetStatus}</span>}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-1.5 rounded-md text-[12px] font-medium border transition-colors"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              重置数据
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ──────────────────────────────────────────
   Tab 3: Email Preview
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
              <p className="text-[12px] font-medium" style={{ color: 'var(--fg-title)' }}>{selected.subject ?? `StablePulse | ${selected.date}`}</p>
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
   Tab 4: Subscribers
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
   Main Admin Page: 4 Tabs
   ────────────────────────────────────────── */
const TABS: { key: Tab; label: string }[] = [
  { key: 'generate', label: '运行周报' },
  { key: 'pipeline', label: '流水线' },
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
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'preview' && <PreviewTab />}
      {tab === 'subscribers' && <SubscribersTab />}
    </div>
  )
}
