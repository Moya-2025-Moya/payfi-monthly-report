'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

function TriggerButton({ label, endpoint, method = 'POST' }: { label: string; endpoint: string; method?: string }) {
  const [state, setState] = useState<ButtonState>('idle')
  const [message, setMessage] = useState<string>('')

  async function handleClick() {
    setState('loading')
    setMessage('')
    try {
      const res = await fetch(endpoint, { method })
      const json = await res.json().catch(() => ({}))
      const nextState: ButtonState = res.ok ? 'success' : 'error'
      setState(nextState)
      setMessage(res.ok ? (json.message ?? 'Done') : (json.error ?? json.message ?? `HTTP ${res.status}`))
      if (nextState === 'error') setTimeout(() => { setState('idle'); setMessage('') }, 5000)
    } catch (e: unknown) {
      setState('error')
      setMessage(e instanceof Error ? e.message : 'Request failed')
      setTimeout(() => { setState('idle'); setMessage('') }, 5000)
    }
  }

  const styles: Record<ButtonState, React.CSSProperties> = {
    idle: { borderColor: 'var(--border)', color: 'var(--fg-secondary)' },
    loading: { borderColor: 'var(--info)', color: 'var(--info)', opacity: 0.7 },
    success: { borderColor: 'var(--success)', color: 'var(--success)' },
    error: { borderColor: 'var(--danger)', color: 'var(--danger)' },
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="rounded-md px-3 py-1.5 text-xs font-medium border transition-colors"
        style={styles[state]}
      >
        {state === 'loading' ? 'Running...' : label}
      </button>
      {message && (
        <p className="text-xs" style={{ color: state === 'error' ? 'var(--danger)' : 'var(--success)' }}>{message}</p>
      )}
    </div>
  )
}

type HealthData = { status: string; db: string; timestamp: string }
type PipelineData = { id?: string; status?: string; started_at?: string; completed_at?: string; facts_collected?: number; message?: string }

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
      <PageHeader title="Settings" description="System configuration and pipeline controls" />
      <div className="space-y-4 max-w-xl">
        <Card>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg-title)' }}>Pipeline Controls</p>
          <p className="text-[11px] font-mono mb-4" style={{ color: 'var(--fg-faint)' }}>Manually trigger pipeline stages. Collection fetches new data, Processing runs AI analysis, Snapshot generates the weekly report.</p>
          <div className="flex flex-wrap gap-3">
            <TriggerButton label="Trigger Collection" endpoint="/api/trigger/collect" />
            <TriggerButton label="Trigger Processing" endpoint="/api/cron/process" method="GET" />
            <TriggerButton label="Generate Snapshot" endpoint="/api/cron/snapshot" method="GET" />
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>System Health</p>
          {healthError ? (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>Failed to load: {healthError}</p>
          ) : health === null ? (
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Checking...</p>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full"
                  style={{ background: health.status === 'ok' ? 'var(--success)' : 'var(--danger)' }} />
                <span className="font-medium" style={{ color: 'var(--fg)' }}>API: {health.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full"
                  style={{ background: health.db === 'connected' ? 'var(--success)' : 'var(--danger)' }} />
                <span style={{ color: 'var(--fg)' }}>Database: {health.db}</span>
              </div>
              <p style={{ color: 'var(--fg-muted)' }}>Checked at: {new Date(health.timestamp).toLocaleTimeString()}</p>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--fg-title)' }}>Pipeline Stats</p>
          {pipelineError ? (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>Failed to load: {pipelineError}</p>
          ) : pipeline === null ? (
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Loading...</p>
          ) : pipeline.message ? (
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{pipeline.message}</p>
          ) : (
            <div className="space-y-1 text-xs">
              {pipeline.status && (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full"
                    style={{ background: pipeline.status === 'completed' ? 'var(--success)' : pipeline.status === 'running' ? 'var(--info)' : 'var(--warning)' }} />
                  <span className="font-medium capitalize" style={{ color: 'var(--fg)' }}>Status: {pipeline.status}</span>
                </div>
              )}
              {pipeline.started_at && (
                <p style={{ color: 'var(--fg-muted)' }}>Started: {new Date(pipeline.started_at).toLocaleString()}</p>
              )}
              {pipeline.completed_at && (
                <p style={{ color: 'var(--fg-muted)' }}>Completed: {new Date(pipeline.completed_at).toLocaleString()}</p>
              )}
              {pipeline.facts_collected !== undefined && (
                <p style={{ color: 'var(--fg)' }}>Facts collected: {pipeline.facts_collected}</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
