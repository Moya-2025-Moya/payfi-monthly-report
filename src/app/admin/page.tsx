'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/Card'

// Admin token for API auth (dev environments may leave this empty)
function getAdminHeaders(): Record<string, string> {
  const token = process.env.NEXT_PUBLIC_ADMIN_TOKEN
  return token ? { 'x-admin-token': token } : {}
}

function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = { ...getAdminHeaders(), ...(init?.headers ?? {}) }
  return fetch(url, { ...init, headers })
}

type Tab = 'pipeline' | 'preview' | 'subscribers'

/* ── Stream event types ── */
interface StreamEvent {
  type: string
  runId?: string
  step?: string
  message?: string
  level?: string
}

/* ── DB log entry (from pipeline_runs.logs) ── */
interface DBLogEntry {
  time: string
  message: string
  level: 'info' | 'success' | 'error' | 'progress'
}

/* ── Pipeline run record ── */
interface PipelineRunData {
  id: string
  pipeline_type: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at: string | null
  logs: DBLogEntry[]
  stats: Record<string, unknown> | null
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

/* ── SSE Log Stream Hook (returns runId for polling) ── */
function useSSEStream() {
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const run = useCallback(async (url: string) => {
    setRunning(true)
    setLogs([])
    setRunId(null)
    try {
      const res = await adminFetch(url)
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
            if (event.type === 'init' && event.runId) {
              setRunId(event.runId)
            } else if (event.type === 'log' && event.message) {
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

  // Restore logs from a DB run record
  const restore = useCallback((dbLogs: DBLogEntry[], status: string, id: string) => {
    setRunId(id)
    setLogs(dbLogs.map(l => {
      const prefix = l.level === 'error' ? '[ERROR] ' : ''
      return prefix + l.message
    }))
    setRunning(status === 'running')
  }, [])

  return { logs, running, run, runId, logsEndRef, restore, setLogs, setRunning }
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
   Tab 1: Pipeline (逐步执行 + 持久化日志)
   ────────────────────────────────────────── */
const PIPELINE_STEPS = [
  { key: 'collect', label: '数据采集', endpoint: '/api/cron/collect', desc: '从 RSS / SEC EDGAR 采集新闻', pipelineType: 'collect' },
  { key: 'twitter', label: '推特采集', endpoint: '/api/cron/twitter', desc: '从 Twitter/X 采集推文', pipelineType: 'twitter' },
  { key: 'process', label: 'AI 处理', endpoint: '/api/cron/process/stream', desc: '事实拆解 + 验证 + 分类', pipelineType: 'process', isStream: true },
  { key: 'snapshot', label: '快照生成', endpoint: '/api/cron/snapshot/stream', desc: '选取 + 上下文引擎 + 邮件', pipelineType: 'snapshot', isStream: true },
  { key: 'narrative', label: '叙事更新', endpoint: '/api/cron/narrative/stream', desc: '更新叙事线索追踪', pipelineType: 'narrative', isStream: true },
] as const

/* Status badge colors */
function statusColor(status: string | undefined): { bg: string; fg: string; label: string } {
  switch (status) {
    case 'running': return { bg: 'var(--accent-soft)', fg: 'var(--accent)', label: '运行中' }
    case 'completed': return { bg: 'var(--success-soft, rgba(34,197,94,0.1))', fg: 'var(--success)', label: '已完成' }
    case 'failed': return { bg: 'rgba(239,68,68,0.1)', fg: 'var(--danger)', label: '失败' }
    case 'cancelled': return { bg: 'var(--surface-alt)', fg: 'var(--fg-muted)', label: '已取消' }
    default: return { bg: 'var(--surface-alt)', fg: 'var(--fg-muted)', label: '未执行' }
  }
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return '' }
}

function PipelineTab() {
  const { logs, running, run, runId, logsEndRef, restore, setLogs, setRunning } = useSSEStream()
  const [runningStep, setRunningStep] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetStatus, setResetStatus] = useState('')
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [testMode, setTestMode] = useState(false)
  // Per-step latest run info (from DB)
  const [stepRuns, setStepRuns] = useState<Record<string, PipelineRunData | null>>({})
  const [loadingRuns, setLoadingRuns] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingRunIdRef = useRef<string | null>(null)

  // ─── Load latest runs on mount ───
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await adminFetch('/api/pipeline/runs')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setStepRuns(data)
            // Find any currently running step
            for (const step of PIPELINE_STEPS) {
              const r = data[step.pipelineType] as PipelineRunData | null
              if (r?.status === 'running') {
                setActiveStep(step.key)
                restore(r.logs ?? [], r.status, r.id)
                // Start polling
                startPolling(r.id)
                break
              }
            }
            // If no running step, show latest completed/failed step's logs
            if (!cancelled) {
              let latest: PipelineRunData | null = null
              let latestKey: string | null = null
              for (const step of PIPELINE_STEPS) {
                const r = data[step.pipelineType] as PipelineRunData | null
                if (r && r.status !== 'running') {
                  if (!latest || r.started_at > latest.started_at) {
                    latest = r
                    latestKey = step.key
                  }
                }
              }
              if (latest && latestKey && !data[PIPELINE_STEPS.find(s => s.key === latestKey)!.pipelineType]?.status?.includes('running')) {
                // Only restore if no running step was found
                const hasRunning = PIPELINE_STEPS.some(s => data[s.pipelineType]?.status === 'running')
                if (!hasRunning) {
                  setActiveStep(latestKey)
                  restore(latest.logs ?? [], latest.status, latest.id)
                }
              }
            }
          }
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingRuns(false) }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Polling for running pipelines ───
  function startPolling(id: string) {
    stopPolling()
    pollingRunIdRef.current = id
    pollRef.current = setInterval(async () => {
      try {
        const res = await adminFetch(`/api/pipeline/runs?id=${id}`)
        if (!res.ok) return
        const data: PipelineRunData = await res.json()
        // Update logs
        setLogs((data.logs ?? []).map(l => {
          const prefix = l.level === 'error' ? '[ERROR] ' : ''
          return prefix + l.message
        }))
        // Update step status
        setStepRuns(prev => ({ ...prev, [data.pipeline_type]: data }))
        // If done, stop polling
        if (data.status !== 'running') {
          if (data.status === 'completed') {
            setLogs(prev => [...prev, '--- 完成 ---'])
          }
          setRunning(false)
          stopPolling()
        }
      } catch { /* ignore */ }
    }, 2000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollingRunIdRef.current = null
  }

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [])

  async function handleStep(step: typeof PIPELINE_STEPS[number]) {
    setRunningStep(step.key)
    setActiveStep(step.key)
    const url = testMode && 'isStream' in step && step.isStream ? `${step.endpoint}?test=true` : step.endpoint
    await run(url)
    setRunningStep(null)
    // Refresh runs after completion
    try {
      const res = await fetch('/api/pipeline/runs')
      if (res.ok) setStepRuns(await res.json())
    } catch { /* ignore */ }
  }

  async function handleCancel() {
    const id = runId ?? pollingRunIdRef.current
    if (!id) return
    try {
      await adminFetch('/api/pipeline/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: id }),
      })
      setLogs(prev => [...prev, '[取消] 已发送取消请求...'])
    } catch { /* ignore */ }
  }

  async function handleReset() {
    setShowResetConfirm(false)
    setResetStatus('重置中...')
    try {
      const res = await adminFetch('/api/admin/reset', { method: 'POST' })
      setResetStatus(res.ok ? '数据已重置' : '重置失败')
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

      {/* Test mode + controls */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--fg-title)' }}>流水线步骤</p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[11px]" style={{ color: testMode ? 'var(--accent)' : 'var(--fg-muted)' }}>
              {testMode ? '测试模式 (每表3条)' : '完整模式'}
            </span>
            <button
              onClick={() => setTestMode(v => !v)}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{ background: testMode ? 'var(--accent)' : 'var(--border)' }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ left: testMode ? '18px' : '2px' }} />
            </button>
          </label>
        </div>
      </Card>

      <Card>
        {loadingRuns ? (
          <p className="text-[12px] py-4 text-center" style={{ color: 'var(--fg-muted)' }}>加载状态...</p>
        ) : (
          <div className="space-y-2">
            {PIPELINE_STEPS.map(step => {
              const stepRun = stepRuns[step.pipelineType]
              const sc = statusColor(stepRun?.status)
              const isActive = activeStep === step.key
              return (
                <div key={step.key}
                  className="flex items-center justify-between py-2.5 px-3 rounded-md border cursor-pointer transition-colors"
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                  }}
                  onClick={() => {
                    if (stepRun) {
                      setActiveStep(step.key)
                      restore(stepRun.logs ?? [], stepRun.status, stepRun.id)
                      if (stepRun.status === 'running') startPolling(stepRun.id)
                    }
                  }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--fg-body)' }}>{step.label}</p>
                        {stepRun && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: sc.bg, color: sc.fg }}>
                            {sc.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        {step.desc}
                        {stepRun?.started_at && (
                          <span className="ml-2">· {formatTime(stepRun.started_at)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {runningStep === step.key && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel() }}
                        className="px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                        取消
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStep(step) }}
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
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Log panel with step context */}
      {logs.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--fg-muted)' }}>
              {activeStep ? PIPELINE_STEPS.find(s => s.key === activeStep)?.label + ' — ' : ''}日志
            </p>
            {running && (
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--accent)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                实时
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] leading-relaxed rounded-md p-3 overflow-auto"
            style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)', maxHeight: '500px' }}>
            {logs.map((log, i) => (
              <div key={i} style={{
                color: log.includes('[ERROR]') ? 'var(--danger)'
                  : log.includes('完成') || log.includes('--- 完成 ---') ? 'var(--success)'
                  : undefined
              }}>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </Card>
      )}

      {/* DEV: Data Reset */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold" style={{ color: 'var(--danger)' }}>数据重置</p>
            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>清空事实、快照、邮件、叙事、时间线，重置原始数据为未处理</p>
          </div>
          <div className="flex items-center gap-2">
            {resetStatus && (
              <span className="text-[11px]" style={{ color: resetStatus.includes('失败') ? 'var(--danger)' : 'var(--success)' }}>
                {resetStatus}
              </span>
            )}
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={running}
              className="px-4 py-1.5 rounded-md text-[12px] font-medium border transition-colors"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)', opacity: running ? 0.5 : 1 }}>
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
    adminFetch('/api/reports')
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
      const res = await adminFetch('/api/subscribers')
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
      const res = await adminFetch('/api/subscribe', {
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
      await adminFetch('/api/subscribers', {
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
  { key: 'pipeline', label: '流水线' },
  { key: 'preview', label: '预览邮件' },
  { key: 'subscribers', label: '订阅者' },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('pipeline')

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
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'preview' && <PreviewTab />}
      {tab === 'subscribers' && <SubscribersTab />}
    </div>
  )
}
