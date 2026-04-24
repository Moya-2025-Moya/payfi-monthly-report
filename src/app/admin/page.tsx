'use client'

import { useEffect, useState, useCallback, useRef, Fragment } from 'react'

// ─── Admin auth helper ───
function getAdminHeaders(): Record<string, string> {
  const token = process.env.NEXT_PUBLIC_ADMIN_TOKEN
  return token ? { 'x-admin-token': token } : {}
}

function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = { ...getAdminHeaders(), ...(init?.headers ?? {}) }
  return fetch(url, { ...init, headers })
}

// ─── Types ───
type Tab = 'pipeline' | 'watchlist'

interface PipelineLog {
  timestamp: string
  level: 'info' | 'success' | 'error' | 'progress'
  message: string
}

interface PipelineRun {
  id: string
  pipeline_type: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at: string | null
  logs: PipelineLog[] | null
  stats: Record<string, unknown> | null
  error: string | null
}

interface WatchlistEntity {
  id: string
  name: string
  aliases: string[]
  category: string
  active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

const CATEGORY_OPTIONS = [
  'issuer', 'payments', 'institutional', 'regulatory',
  'infrastructure', 'enterprise', 'rwa', 'defi',
] as const

const PIPELINE_TYPES = [
  { key: 'collect', label: 'Collection', endpoint: '/api/cron/collect', buttonLabel: 'Run Collection' },
  { key: 'process', label: 'Processing', endpoint: '/api/cron/process', buttonLabel: 'Run Processing' },
  { key: 'daily_push', label: 'Daily Push', endpoint: '/api/cron/daily-push', buttonLabel: 'Push Daily' },
  { key: 'weekly_summary', label: 'Weekly Summary', endpoint: '/api/cron/weekly-summary', buttonLabel: 'Push Weekly' },
] as const

// ─── Helpers ───
function formatTime(iso: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return '-' }
}

function statusBadge(status: string | undefined) {
  const map: Record<string, string> = {
    running: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-500'
  return <span className={`px-2 py-0.5 rounded text-xs font-mono ${cls}`}>{status ?? 'never run'}</span>
}

// ══════════════════════════════════════════
// Tab 1: Pipeline
// ══════════════════════════════════════════
const ACTION_BUTTONS = [
  {
    key: 'undo_today',
    endpoint: '/api/admin/undo-today',
    label: '撤回今日处理',
    running: '撤回中…',
    confirm: '确认撤回今日处理？将删除今日创建的事件并重置 raw_items 的 processed 状态（不影响采集）。',
    method: 'POST' as const,
  },
  {
    key: 'repush_daily',
    endpoint: '/api/admin/repush-daily',
    label: '重新发送今日日报',
    running: '发送中…',
    confirm: '确认重新发送今日日报？',
    method: 'POST' as const,
  },
] as const

function PipelineTab() {
  const [runs, setRuns] = useState<Record<string, PipelineRun | null>>({})
  const [loading, setLoading] = useState(true)
  const [triggerStatus, setTriggerStatus] = useState<Record<string, string>>({})
  const [logOutput, setLogOutput] = useState<string[]>([])
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})

  const loadRuns = useCallback(async () => {
    try {
      const res = await adminFetch('/api/pipeline/runs')
      if (res.ok) setRuns(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadRuns() }, [loadRuns])

  // Poll every 2s while any pipeline is in 'running' state. Stop as soon as
  // they all settle — no point burning requests when nothing's live.
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const anyRunning = Object.values(runs).some(r => r?.status === 'running')
  useEffect(() => {
    if (anyRunning && !pollTimer.current) {
      pollTimer.current = setInterval(loadRuns, 2000)
    } else if (!anyRunning && pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [anyRunning, loadRuns])

  // `statusKey` is the triggerStatus map slot used purely for the button's
  // transient "I just clicked" spinner (cleared when the trigger request
  // resolves). The actual pipeline running state is driven by polled DB
  // rows and rendered separately in the table.
  async function triggerPipeline(statusKey: string, endpoint: string, method: 'GET' | 'POST' = 'GET') {
    setTriggerStatus(prev => ({ ...prev, [statusKey]: 'running' }))
    setLogOutput(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] → ${statusKey}: request sent (backend may take up to 5 min)`,
    ])

    // Fire trigger as a background promise — don't await the full roundtrip,
    // so the UI can poll /api/pipeline/runs and surface live logs while the
    // long-running backend task is still executing.
    adminFetch(endpoint, { method })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        const tag = res.ok ? 'completed' : `FAILED (${res.status})`
        setLogOutput(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ← ${statusKey}: ${tag} ${JSON.stringify(data).slice(0, 200)}`,
        ])
        loadRuns()
      })
      .catch(err => {
        setLogOutput(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ← ${statusKey}: network error: ${err instanceof Error ? err.message : String(err)}`,
        ])
        loadRuns()
      })
      .finally(() => {
        setTriggerStatus(prev => ({ ...prev, [statusKey]: '' }))
      })

    // Kick off the first poll quickly so the pipeline_runs row appears
    // before the 2s polling interval's first tick.
    setTimeout(loadRuns, 500)
  }

  async function cancelPipeline(pipelineType: string) {
    if (!confirm(`取消正在运行的 ${pipelineType}？注意：后端任务会继续跑完，仅 UI 停止跟进。`)) return
    setLogOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Cancelling ${pipelineType}…`])
    try {
      const res = await adminFetch('/api/pipeline/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_type: pipelineType }),
      })
      const data = await res.json().catch(() => ({}))
      setLogOutput(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Cancel result: ${JSON.stringify(data).slice(0, 200)}`,
      ])
    } catch (err) {
      setLogOutput(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Cancel error: ${err instanceof Error ? err.message : String(err)}`,
      ])
    }
    loadRuns()
  }

  async function triggerAction(action: typeof ACTION_BUTTONS[number]) {
    if (!confirm(action.confirm)) return
    await triggerPipeline(action.key, action.endpoint, action.method)
  }

  function toggleLogs(key: string) {
    setExpandedLogs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function renderLogLine(log: PipelineLog, i: number) {
    const color =
      log.level === 'error' ? '#ef4444'
      : log.level === 'success' ? '#16a34a'
      : log.level === 'progress' ? '#3b82f6'
      : 'var(--fg-secondary)'
    const t = new Date(log.timestamp).toLocaleTimeString()
    return (
      <div key={i} style={{ color }}>
        <span style={{ color: 'var(--fg-muted)' }}>{t}</span>{' '}
        {log.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Latest Run Status */}
      <div className="border rounded p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>Latest Run Status</h2>
        {loading ? (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Loading...</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--fg-muted)' }}>
                <th className="text-left py-1 pr-4 font-medium">Pipeline</th>
                <th className="text-left py-1 pr-4 font-medium">Status</th>
                <th className="text-left py-1 pr-4 font-medium">Started</th>
                <th className="text-left py-1 pr-4 font-medium">Completed</th>
                <th className="text-left py-1 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE_TYPES.map(p => {
                const run = runs[p.key]
                const isRunning = run?.status === 'running'
                const logs = run?.logs ?? []
                const latestLog = logs[logs.length - 1]
                const isOpen = !!expandedLogs[p.key]
                const elapsed = isRunning && run?.started_at
                  ? Math.floor((Date.now() - new Date(run.started_at).getTime()) / 1000)
                  : null

                return (
                  <Fragment key={p.key}>
                    <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--fg-body)' }}>{p.label}</td>
                      <td className="py-2 pr-4">
                        {statusBadge(run?.status)}
                        {elapsed !== null && (
                          <span className="ml-2 font-mono text-xs" style={{ color: 'var(--fg-muted)' }}>
                            {elapsed}s
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 font-mono" style={{ color: 'var(--fg-secondary)' }}>
                        {formatTime(run?.started_at ?? null)}
                      </td>
                      <td className="py-2 pr-4 font-mono" style={{ color: 'var(--fg-secondary)' }}>
                        {formatTime(run?.completed_at ?? null)}
                      </td>
                      <td className="py-2">
                        {isRunning ? (
                          <button
                            onClick={() => cancelPipeline(p.key)}
                            className="px-3 py-1 rounded text-xs font-medium border"
                            style={{
                              borderColor: '#ef4444',
                              color: '#ef4444',
                              background: 'var(--surface)',
                            }}>
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerPipeline(p.key, p.endpoint)}
                            className="px-3 py-1 rounded text-xs font-medium border"
                            style={{
                              borderColor: 'var(--border)',
                              color: 'var(--fg-body)',
                              background: 'var(--surface)',
                            }}>
                            {p.buttonLabel}
                          </button>
                        )}
                        {logs.length > 0 && (
                          <button
                            onClick={() => toggleLogs(p.key)}
                            className="ml-2 text-xs underline"
                            style={{ color: 'var(--fg-muted)' }}>
                            {isOpen ? 'Hide logs' : `Logs (${logs.length})`}
                          </button>
                        )}
                      </td>
                    </tr>
                    {latestLog && !isOpen && (
                      <tr style={{ borderColor: 'var(--border)' }}>
                        <td colSpan={5} className="pb-2 pl-4 text-xs font-mono" style={{ color: 'var(--fg-muted)' }}>
                          ↳ {latestLog.message.slice(0, 200)}
                        </td>
                      </tr>
                    )}
                    {isOpen && logs.length > 0 && (
                      <tr>
                        <td colSpan={5} className="pb-2 pl-4 pr-4">
                          <div className="font-mono text-xs leading-relaxed rounded p-2 max-h-64 overflow-auto"
                            style={{ background: 'var(--surface-alt)' }}>
                            {logs.map(renderLogLine)}
                          </div>
                          {run?.error && (
                            <div className="mt-1 font-mono text-xs text-red-600">
                              error: {run.error}
                            </div>
                          )}
                          {run?.stats && (
                            <div className="mt-1 font-mono text-xs" style={{ color: 'var(--fg-muted)' }}>
                              stats: {JSON.stringify(run.stats)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions: undo today's processing + re-push daily */}
      <div className="border rounded p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>Daily Digest Actions</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
          撤回今日的数据处理（仅删除今日事件和重置 raw_items 的 processed 状态，<b>不会撤回采集</b>），或直接重新发送今日日报以测试排版。
        </p>
        <div className="flex flex-wrap gap-2">
          {ACTION_BUTTONS.map(action => {
            const running = triggerStatus[action.key] === 'running'
            return (
              <button
                key={action.key}
                onClick={() => triggerAction(action)}
                disabled={running}
                className="px-3 py-1.5 rounded text-xs font-medium border"
                style={{
                  borderColor: 'var(--border)',
                  color: running ? 'var(--fg-muted)' : 'var(--fg-body)',
                  opacity: running ? 0.5 : 1,
                  background: 'var(--surface)',
                }}>
                {running ? action.running : action.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Log output */}
      {logOutput.length > 0 && (
        <div className="border rounded p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg-title)' }}>Log</h2>
            <button onClick={() => setLogOutput([])} className="text-xs underline" style={{ color: 'var(--fg-muted)' }}>Clear</button>
          </div>
          <div className="font-mono text-xs leading-relaxed rounded p-3 overflow-auto max-h-64"
            style={{ background: 'var(--surface-alt)', color: 'var(--fg-secondary)' }}>
            {logOutput.map((line, i) => (
              <div key={i} style={{ color: line.includes('FAILED') || line.includes('ERROR') ? '#ef4444' : line.includes('completed') ? '#16a34a' : undefined }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════
// Tab 2: Watchlist
// ══════════════════════════════════════════
function WatchlistTab() {
  const [entities, setEntities] = useState<WatchlistEntity[]>([])
  const [loading, setLoading] = useState(true)
  // Add form
  const [newName, setNewName] = useState('')
  const [newAliases, setNewAliases] = useState('')
  const [newCategory, setNewCategory] = useState<string>(CATEGORY_OPTIONS[0])
  const [adding, setAdding] = useState(false)
  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAliases, setEditAliases] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const loadEntities = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/watchlist')
      if (res.ok) {
        const data = await res.json()
        setEntities(data.entities ?? [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadEntities() }, [loadEntities])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || adding) return
    setAdding(true)
    try {
      const aliases = newAliases.split(',').map(a => a.trim()).filter(Boolean)
      const res = await adminFetch('/api/admin/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), aliases, category: newCategory }),
      })
      if (res.ok) {
        setNewName('')
        setNewAliases('')
        loadEntities()
      }
    } catch { /* ignore */ }
    finally { setAdding(false) }
  }

  async function handleToggleActive(entity: WatchlistEntity) {
    try {
      await adminFetch('/api/admin/watchlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entity.id, active: !entity.active }),
      })
      loadEntities()
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entity?')) return
    try {
      await adminFetch(`/api/admin/watchlist?id=${id}`, { method: 'DELETE' })
      loadEntities()
    } catch { /* ignore */ }
  }

  function startEdit(entity: WatchlistEntity) {
    setEditId(entity.id)
    setEditName(entity.name)
    setEditAliases(entity.aliases.join(', '))
    setEditCategory(entity.category)
  }

  async function saveEdit() {
    if (!editId) return
    try {
      const aliases = editAliases.split(',').map(a => a.trim()).filter(Boolean)
      await adminFetch('/api/admin/watchlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, name: editName.trim(), aliases, category: editCategory }),
      })
      setEditId(null)
      loadEntities()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="border rounded p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>Add Entity</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Entity name"
              className="px-2 py-1.5 rounded border text-xs outline-none w-40"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Aliases (comma-separated)</label>
            <input
              type="text"
              value={newAliases}
              onChange={e => setNewAliases(e.target.value)}
              placeholder="alias1, alias2"
              className="px-2 py-1.5 rounded border text-xs outline-none w-48"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>Category</label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="px-2 py-1.5 rounded border text-xs outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }}>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', opacity: adding ? 0.5 : 1 }}>
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>

      {/* Entity table */}
      <div className="border rounded p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>
          Entities ({entities.length})
        </h2>
        {loading ? (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Loading...</p>
        ) : entities.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>No entities yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--fg-muted)' }}>
                <th className="text-left py-1 pr-3 font-medium">Name</th>
                <th className="text-left py-1 pr-3 font-medium">Aliases</th>
                <th className="text-left py-1 pr-3 font-medium">Category</th>
                <th className="text-left py-1 pr-3 font-medium">Active</th>
                <th className="text-left py-1 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entities.map(entity => (
                <tr key={entity.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  {editId === entity.id ? (
                    <>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="px-1 py-0.5 rounded border text-xs w-full outline-none"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={editAliases}
                          onChange={e => setEditAliases(e.target.value)}
                          className="px-1 py-0.5 rounded border text-xs w-full outline-none"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          className="px-1 py-0.5 rounded border text-xs outline-none"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-body)' }}>
                          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3" />
                      <td className="py-2">
                        <button onClick={saveEdit} className="text-xs underline mr-2" style={{ color: 'var(--accent)' }}>Save</button>
                        <button onClick={() => setEditId(null)} className="text-xs underline" style={{ color: 'var(--fg-muted)' }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 pr-3 font-medium" style={{ color: 'var(--fg-body)' }}>{entity.name}</td>
                      <td className="py-2 pr-3 font-mono" style={{ color: 'var(--fg-secondary)' }}>
                        {entity.aliases.length > 0 ? entity.aliases.join(', ') : '-'}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">{entity.category}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => handleToggleActive(entity)}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${entity.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {entity.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-2">
                        <button onClick={() => startEdit(entity)} className="text-xs underline mr-2" style={{ color: 'var(--accent)' }}>Edit</button>
                        <button onClick={() => handleDelete(entity.id)} className="text-xs underline text-red-600">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// Auth Gate
// ══════════════════════════════════════════
const ADMIN_PASSWORD = 'ZIAN'

function AdminGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin-unlocked') === '1') setUnlocked(true)
  }, [])

  if (unlocked) return <>{children}</>

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="w-80 text-center">
        <p className="text-sm font-medium mb-4" style={{ color: 'var(--fg-secondary)' }}>Enter password</p>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (input === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin-unlocked', '1')
            setUnlocked(true)
          } else {
            setError(true)
            setInput('')
          }
        }}>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false) }}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-2.5 text-sm rounded border text-center outline-none"
            style={{
              borderColor: error ? '#ef4444' : 'var(--border)',
              background: 'var(--surface)',
              color: 'var(--fg-title)',
            }}
          />
          {error && <p className="text-xs mt-2 text-red-500">Wrong password</p>}
        </form>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════
const TABS: { key: Tab; label: string }[] = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'watchlist', label: 'Watchlist' },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('pipeline')

  return (
    <AdminGate>
      <div>
        <div className="mb-6">
          <h1 className="text-lg font-bold" style={{ color: 'var(--fg-title)' }}>Admin</h1>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2 text-sm font-medium transition-colors"
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
        {tab === 'watchlist' && <WatchlistTab />}
      </div>
    </AdminGate>
  )
}
