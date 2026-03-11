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

function PipelineTrigger({
  label,
  description,
  endpoint,
  method = 'POST',
}: {
  label: string
  description: string
  endpoint: string
  method?: string
}) {
  const [state, setState] = useState<ButtonState>('idle')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logRef = useRef<HTMLDivElement>(null)

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

  async function handleClick() {
    setState('loading')
    setLogs([])
    addLog(`开始执行: ${label}`, 'info')

    // Check if the endpoint supports SSE streaming
    const sseEndpoint = endpoint + '/stream'

    try {
      // Try SSE first
      const evtSource = new EventSource(sseEndpoint)
      let gotMessage = false

      const timeout = setTimeout(() => {
        if (!gotMessage) {
          // SSE not available, fall back to regular fetch
          evtSource.close()
          fallbackFetch()
        }
      }, 3000)

      evtSource.onmessage = (event) => {
        gotMessage = true
        clearTimeout(timeout)
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'log') {
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
          if (state === 'loading') {
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
          // Parse results for detailed display
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
          <p className="text-sm font-semibold" style={{ color: 'var(--fg-title)' }}>{label}</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-faint)' }}>{description}</p>
        </div>
        <button
          onClick={handleClick}
          disabled={state === 'loading'}
          className="shrink-0 rounded-md px-4 py-2 text-xs font-medium border transition-colors"
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
              <span className="shrink-0 opacity-50" style={{ color: 'var(--fg-faint)' }}>{log.time}</span>
              <span style={{ color: logColors[log.type] }}>{log.message}</span>
            </div>
          ))}
          {state === 'loading' && (
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--info)' }} />
              <span style={{ color: 'var(--fg-faint)' }}>处理中...</span>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

type HealthData = { status: string; db: string; timestamp: string }
type PipelineData = {
  id?: string; status?: string; started_at?: string; completed_at?: string
  facts_collected?: number; stats?: Record<string, unknown>; message?: string
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [pipelineError, setPipelineError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setHealth)
      .catch(e => setHealthError(e.message))

    fetch('/api/pipeline')
      .then(r => r.json())
      .then(setPipeline)
      .catch(e => setPipelineError(e.message))
  }, [])

  return (
    <div>
      <PageHeader title="设置" description="系统配置与流水线控制" />
      <div className="space-y-4 max-w-2xl">

        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>流水线控制</h2>
          <div className="space-y-3">
            <PipelineTrigger
              label="数据采集"
              description="从 DeFiLlama、新闻源、SEC、GitHub 等采集最新数据，存入原始数据表"
              endpoint="/api/trigger/collect"
              method="POST"
            />
            <PipelineTrigger
              label="推特采集"
              description="从 twitterapi.io 拉取监控账号的推文（周任务，通常每周日自动运行）"
              endpoint="/api/cron/twitter"
              method="GET"
            />
            <PipelineTrigger
              label="AI 处理"
              description="运行事实拆分 (B1)、六层验证 (V1-V5)、裁决 (V0)、实体识别 (B2)、时间线归并 (B3)、矛盾检测 (B4)、翻译 (B5)"
              endpoint="/api/cron/process"
              method="GET"
            />
            <PipelineTrigger
              label="生成周报快照"
              description="生成本周快照并通过邮件和 Telegram 分发"
              endpoint="/api/cron/snapshot"
              method="GET"
            />
          </div>
        </div>

        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>系统健康</p>
          {healthError ? (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>加载失败: {healthError}</p>
          ) : health === null ? (
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>检查中...</p>
          ) : (
            <div className="space-y-1 text-xs">
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
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>流水线状态</p>
          {pipelineError ? (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>加载失败: {pipelineError}</p>
          ) : pipeline === null ? (
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
          ) : pipeline.message ? (
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{pipeline.message}</p>
          ) : (
            <div className="space-y-1 text-xs">
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
      </div>
    </div>
  )
}
