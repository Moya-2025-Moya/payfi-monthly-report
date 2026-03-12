'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'error' | 'progress'
}

// Map endpoint to pipeline type for DB persistence
const ENDPOINT_TO_TYPE: Record<string, string> = {
  '/api/trigger/collect': 'collect',
  '/api/cron/process': 'process',
  '/api/cron/twitter': 'twitter',
  '/api/cron/snapshot': 'snapshot',
  '/api/cron/narrative': 'narrative',
}

function PipelineTrigger({
  label,
  description,
  endpoint,
  method = 'POST',
  initialLogs,
  initialState,
  initialRunId,
}: {
  label: string
  description: string
  endpoint: string
  method?: string
  initialLogs?: LogEntry[]
  initialState?: ButtonState
  initialRunId?: string
}) {
  const [state, setState] = useState<ButtonState>(initialState ?? 'idle')
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs ?? [])
  const [runId, setRunId] = useState<string | null>(initialRunId ?? null)
  const logRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN')
    setLogs(prev => [...prev, { time, message, type }])
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  // Poll for updates if we have a running run (restored from DB)
  useEffect(() => {
    if (state !== 'loading' || !runId) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline/runs?id=${runId}`)
        if (!res.ok) return

        const run = await res.json()
        if (!run || !run.logs) return

        // Update logs from DB
        const dbLogs: LogEntry[] = run.logs.map((l: { time: string; message: string; level: string }) => ({
          time: new Date(l.time).toLocaleTimeString('zh-CN'),
          message: l.message,
          type: l.level as LogEntry['type'],
        }))
        setLogs(dbLogs)

        // Check if run completed
        if (run.status === 'completed') {
          setState('success')
          if (pollRef.current) clearInterval(pollRef.current)
        } else if (run.status === 'failed') {
          setState('error')
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [state, runId])

  async function handleClick() {
    setState('loading')
    setLogs([])
    setRunId(null)
    addLog(`开始执行: ${label}`, 'info')

    // Check if the endpoint supports SSE streaming
    const sseEndpoint = endpoint + '/stream'

    try {
      // Try SSE first
      const evtSource = new EventSource(sseEndpoint)
      let gotMessage = false

      const timeout = setTimeout(() => {
        if (!gotMessage) {
          evtSource.close()
          fallbackFetch()
        }
      }, 3000)

      evtSource.onmessage = (event) => {
        gotMessage = true
        clearTimeout(timeout)
        try {
          const data = JSON.parse(event.data)

          // Capture runId for polling on reconnect
          if (data.type === 'init' && data.runId) {
            setRunId(data.runId)
          } else if (data.type === 'log') {
            addLog(data.message, data.level ?? 'info')
          } else if (data.type === 'progress') {
            addLog(`[${data.step}] ${data.message}`, 'progress')
          } else if (data.type === 'done') {
            addLog('执行完成', 'success')
            setState('success')
            evtSource.close()
          } else if (data.type === 'error') {
            addLog(`错误: ${data.message}`, 'error')
            setState('error')
            evtSource.close()
          }
        } catch {
          addLog(event.data, 'info')
        }
      }

      evtSource.onerror = () => {
        clearTimeout(timeout)
        if (!gotMessage) {
          evtSource.close()
          fallbackFetch()
        } else {
          evtSource.close()
          // Connection lost — if we have a runId, poll DB for updates
          if (runId) {
            addLog('SSE 连接断开，切换到轮询模式...', 'info')
            // State stays 'loading', poll effect will pick up
          } else if (state === 'loading') {
            addLog('连接断开', 'error')
            setState('error')
          }
        }
      }
    } catch {
      fallbackFetch()
    }

    async function fallbackFetch() {
      addLog('使用普通请求模式...', 'info')
      try {
        const res = await fetch(endpoint, { method })
        const json = await res.json().catch(() => ({}))
        if (res.ok) {
          if (json.results) {
            for (const [name, status] of Object.entries(json.results)) {
              addLog(`  ${name}: ${status === 'ok' ? '成功' : '失败'}`, status === 'ok' ? 'success' : 'error')
            }
          }
          if (json.stats) {
            const s = json.stats
            if (s.raw_items_processed !== undefined) addLog(`  原始数据处理: ${s.raw_items_processed} 条`, 'info')
            if (s.candidates_extracted !== undefined) addLog(`  候选事实提取: ${s.candidates_extracted} 条`, 'info')
            if (s.verified_high !== undefined) addLog(`  高可信验证: ${s.verified_high} 条`, 'success')
            if (s.verified_medium !== undefined) addLog(`  中可信验证: ${s.verified_medium} 条`, 'info')
            if (s.rejected !== undefined) addLog(`  拒绝: ${s.rejected} 条`, 'error')
          }
          if (json.duration_ms) addLog(`  耗时: ${(json.duration_ms / 1000).toFixed(1)}s`, 'info')
          addLog(json.message ?? '执行完成', 'success')
          setState('success')
        } else {
          addLog(`错误: ${json.error ?? json.message ?? `HTTP ${res.status}`}`, 'error')
          setState('error')
        }
      } catch (e: unknown) {
        addLog(`请求失败: ${e instanceof Error ? e.message : '未知错误'}`, 'error')
        setState('error')
      }
    }
  }

  const logColors: Record<LogEntry['type'], string> = {
    info: 'var(--fg-muted)',
    success: 'var(--success)',
    error: 'var(--danger)',
    progress: 'var(--info)',
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--fg-title)' }}>{label}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{description}</p>
        </div>
        <button
          onClick={handleClick}
          disabled={state === 'loading'}
          className="shrink-0 rounded-md px-4 py-2 text-[11px] font-medium border transition-colors"
          style={
            state === 'loading'
              ? { borderColor: 'var(--info)', color: 'var(--info)', opacity: 0.7 }
              : state === 'success'
              ? { borderColor: 'var(--success)', color: 'var(--success)' }
              : state === 'error'
              ? { borderColor: 'var(--danger)', color: 'var(--danger)' }
              : { borderColor: 'var(--border)', color: 'var(--fg-secondary)' }
          }
        >
          {state === 'loading' ? '执行中...' : state === 'success' ? '已完成' : state === 'error' ? '失败' : '执行'}
        </button>
      </div>

      {/* Log output */}
      {logs.length > 0 && (
        <div
          ref={logRef}
          className="mt-3 rounded-md border p-3 max-h-60 overflow-y-auto font-mono text-[11px] space-y-0.5"
          style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
        >
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 opacity-50" style={{ color: 'var(--fg-muted)' }}>{log.time}</span>
              <span style={{ color: logColors[log.type] }}>{log.message}</span>
            </div>
          ))}
          {state === 'loading' && (
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--info)' }} />
              <span style={{ color: 'var(--fg-muted)' }}>处理中...</span>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── Dev Mode Reset Button ───

function DevResetButton({
  label,
  description,
  mode,
}: {
  label: string
  description: string
  mode: 'processed' | 'all'
}) {
  const [state, setState] = useState<ButtonState>('idle')
  const [result, setResult] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function handleReset() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setConfirming(false)
    setState('loading')
    setResult(null)

    try {
      const res = await fetch('/api/dev/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const json = await res.json()
      if (res.ok) {
        const hasErrors = json.results?.some((r: { status: string }) => r.status === 'error')
        setResult(json.message)
        setState(hasErrors ? 'error' : 'success')
      } else {
        setResult(`错误: ${json.error ?? `HTTP ${res.status}`}`)
        setState('error')
      }
    } catch (e: unknown) {
      setResult(`请求失败: ${e instanceof Error ? e.message : '未知错误'}`)
      setState('error')
    }
  }

  function handleCancel() {
    setConfirming(false)
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-[11px] font-medium" style={{ color: 'var(--fg)' }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{description}</p>
        {result && (
          <p className="text-[11px] mt-1" style={{ color: state === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {result}
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        {confirming && (
          <button
            onClick={handleCancel}
            className="rounded-md px-3 py-1.5 text-[11px] border"
            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
          >
            取消
          </button>
        )}
        <button
          onClick={handleReset}
          disabled={state === 'loading'}
          className="rounded-md px-3 py-1.5 text-[11px] font-medium border transition-colors"
          style={
            confirming
              ? { borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }
              : state === 'loading'
              ? { borderColor: 'var(--border)', color: 'var(--fg-muted)', opacity: 0.7 }
              : { borderColor: 'var(--danger)', color: 'var(--danger)' }
          }
        >
          {state === 'loading' ? '执行中...' : confirming ? '确认重置' : '重置'}
        </button>
      </div>
    </div>
  )
}

type HealthData = { status: string; db: string; timestamp: string }
type PipelineData = {
  id?: string; status?: string; started_at?: string; completed_at?: string
  facts_collected?: number; stats?: Record<string, unknown>; message?: string
}

// Restored pipeline state from DB
interface RestoredState {
  logs: LogEntry[]
  state: ButtonState
  runId?: string
}

type SettingsTab = 'config' | 'pipeline'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('config')
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [restored, setRestored] = useState<Record<string, RestoredState>>({})

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setHealth)
      .catch(e => setHealthError(e.message))

    fetch('/api/pipeline')
      .then(r => r.json())
      .then(setPipeline)
      .catch(e => setPipelineError(e.message))

    // Fetch latest pipeline runs to restore logs on page load
    fetch('/api/pipeline/runs')
      .then(r => r.json())
      .then((runs: Record<string, { id: string; status: string; logs: { time: string; message: string; level: string }[] } | null>) => {
        const restoredState: Record<string, RestoredState> = {}

        for (const [type, run] of Object.entries(runs)) {
          if (!run || !run.logs || run.logs.length === 0) continue

          const logs: LogEntry[] = run.logs.map(l => ({
            time: new Date(l.time).toLocaleTimeString('zh-CN'),
            message: l.message,
            type: l.level as LogEntry['type'],
          }))

          const state: ButtonState =
            run.status === 'running' ? 'loading' :
            run.status === 'completed' ? 'success' :
            run.status === 'failed' ? 'error' : 'idle'

          restoredState[type] = { logs, state, runId: run.id }
        }

        setRestored(restoredState)
      })
      .catch(() => {})
  }, [])

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'config', label: '系统配置' },
    { key: 'pipeline', label: '流水线操作' },
  ]

  // Helper to get restored state for a pipeline type
  function getRestored(endpoint: string): RestoredState | undefined {
    const type = ENDPOINT_TO_TYPE[endpoint]
    return type ? restored[type] : undefined
  }

  return (
    <div>
      <PageHeader title="设置" />

      {/* Tab switcher */}
      <div className="flex gap-0 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 text-[13px] font-medium tracking-wider transition-colors -mb-px border-b-2"
            style={{
              borderColor: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? 'var(--accent)' : 'var(--fg-muted)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 max-w-2xl">
        {tab === 'config' && (
          <>
            <Card>
              <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>系统健康</p>
              {healthError ? (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>加载失败: {healthError}</p>
              ) : health === null ? (
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>检查中...</p>
              ) : (
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full"
                      style={{ background: health.status === 'ok' ? 'var(--success)' : 'var(--danger)' }} />
                    <span className="font-medium" style={{ color: 'var(--fg)' }}>API: {health.status === 'ok' ? '正常' : health.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full"
                      style={{ background: health.db === 'connected' ? 'var(--success)' : 'var(--danger)' }} />
                    <span style={{ color: 'var(--fg)' }}>数据库: {health.db === 'connected' ? '已连接' : health.db}</span>
                  </div>
                  <p style={{ color: 'var(--fg-muted)' }}>检查时间: {new Date(health.timestamp).toLocaleTimeString('zh-CN')}</p>
                </div>
              )}
            </Card>

            <Card>
              <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>流水线状态</p>
              {pipelineError ? (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>加载失败: {pipelineError}</p>
              ) : pipeline === null ? (
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
              ) : pipeline.message ? (
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{pipeline.message}</p>
              ) : (
                <div className="space-y-1 text-[11px]">
                  {pipeline.status && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full"
                        style={{ background: pipeline.status === 'completed' ? 'var(--success)' : pipeline.status === 'running' ? 'var(--info)' : 'var(--warning)' }} />
                      <span className="font-medium" style={{ color: 'var(--fg)' }}>
                        状态: {pipeline.status === 'completed' ? '已完成' : pipeline.status === 'running' ? '运行中' : pipeline.status === 'failed' ? '失败' : pipeline.status}
                      </span>
                    </div>
                  )}
                  {pipeline.started_at && (
                    <p style={{ color: 'var(--fg-muted)' }}>开始时间: {new Date(pipeline.started_at).toLocaleString('zh-CN')}</p>
                  )}
                  {pipeline.completed_at && (
                    <p style={{ color: 'var(--fg-muted)' }}>完成时间: {new Date(pipeline.completed_at).toLocaleString('zh-CN')}</p>
                  )}
                  {pipeline.facts_collected !== undefined && (
                    <p style={{ color: 'var(--fg)' }}>采集事实数: {pipeline.facts_collected}</p>
                  )}
                </div>
              )}
            </Card>

            {/* Dev Mode */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>开发模式</h2>
                <span className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                  style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                  DEV
                </span>
              </div>
              <Card>
                <div className="space-y-4">
                  <DevResetButton
                    label="重置处理数据"
                    description="清空所有 AI 处理结果（事实、实体、时间线、矛盾），保留原始采集数据并标记为未处理，可重新运行 AI 处理"
                    mode="processed"
                  />
                  <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                  <DevResetButton
                    label="全部清空"
                    description="清空所有数据（包括原始采集数据），恢复到空白状态，需要重新采集"
                    mode="all"
                  />
                </div>
              </Card>
            </div>
          </>
        )}

        {tab === 'pipeline' && (
          <div className="space-y-3">
            <PipelineTrigger
              label="数据采集"
              description="从 DeFiLlama、新闻源、SEC、GitHub 等采集最新数据，存入原始数据表"
              endpoint="/api/trigger/collect"
              method="POST"
              initialLogs={getRestored('/api/trigger/collect')?.logs}
              initialState={getRestored('/api/trigger/collect')?.state}
              initialRunId={getRestored('/api/trigger/collect')?.runId}
            />
            <PipelineTrigger
              label="推特采集"
              description="从 twitterapi.io 拉取监控账号的推文（周任务，通常每周日自动运行）"
              endpoint="/api/cron/twitter"
              method="GET"
              initialLogs={getRestored('/api/cron/twitter')?.logs}
              initialState={getRestored('/api/cron/twitter')?.state}
              initialRunId={getRestored('/api/cron/twitter')?.runId}
            />
            <PipelineTrigger
              label="AI 处理"
              description="运行事实拆分 (B1)、六层验证 (V1-V5+V0)、实体识别 (B2)、时间线归并 (B3)、矛盾检测 (B4)"
              endpoint="/api/cron/process"
              method="GET"
              initialLogs={getRestored('/api/cron/process')?.logs}
              initialState={getRestored('/api/cron/process')?.state}
              initialRunId={getRestored('/api/cron/process')?.runId}
            />
            <PipelineTrigger
              label="生成周报快照"
              description="生成本周快照并通过邮件和 Telegram 分发"
              endpoint="/api/cron/snapshot"
              method="GET"
              initialLogs={getRestored('/api/cron/snapshot')?.logs}
              initialState={getRestored('/api/cron/snapshot')?.state}
              initialRunId={getRestored('/api/cron/snapshot')?.runId}
            />
            <PipelineTrigger
              label="生成叙事时间线"
              description="自动发现 Top 3 叙事主题，生成时间线（含外部搜索补充 + 预测节点）"
              endpoint="/api/cron/narrative"
              method="GET"
              initialLogs={getRestored('/api/cron/narrative')?.logs}
              initialState={getRestored('/api/cron/narrative')?.state}
              initialRunId={getRestored('/api/cron/narrative')?.runId}
            />
            <PipelineTrigger
              label="发布周报邮件"
              description="将本周周报内容生成 HTML 邮件模板，写入 reports 表供 Moya 端批量发送"
              endpoint="/api/newsletter/publish"
              method="POST"
            />
          </div>
        )}
      </div>
    </div>
  )
}
