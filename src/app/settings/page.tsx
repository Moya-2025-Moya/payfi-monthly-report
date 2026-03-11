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
      if (res.ok) {
        setState('success')
        setMessage(json.message ?? 'Done')
      } else {
        setState('error')
        setMessage(json.error ?? json.message ?? `HTTP ${res.status}`)
      }
    } catch (e: unknown) {
      setState('error')
      setMessage(e instanceof Error ? e.message : 'Request failed')
    }
    setTimeout(() => { setState('idle'); setMessage('') }, 5000)
  }

  const colors: Record<ButtonState, string> = {
    idle: 'var(--border)',
    loading: '#93c5fd',
    success: '#86efac',
    error: '#fca5a5',
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="rounded-md px-3 py-1.5 text-xs font-medium border transition-colors"
        style={{ borderColor: colors[state], opacity: state === 'loading' ? 0.7 : 1 }}
      >
        {state === 'loading' ? '⟳ Running…' : label}
      </button>
      {message && (
        <p className="text-xs" style={{ color: state === 'error' ? '#ef4444' : '#16a34a' }}>{message}</p>
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
          <p className="text-sm font-semibold mb-3">Pipeline Controls</p>
          <div className="flex flex-wrap gap-3">
            <TriggerButton label="Trigger Collection" endpoint="/api/trigger/collect" />
            <TriggerButton label="Trigger Processing" endpoint="/api/trigger" />
            <TriggerButton label="Generate Snapshot" endpoint="/api/cron/snapshot" />
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold mb-3">System Health</p>
          {healthError ? (
            <p className="text-xs" style={{ color: '#ef4444' }}>Failed to load: {healthError}</p>
          ) : health === null ? (
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Checking…</p>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: health.status === 'ok' ? '#22c55e' : '#ef4444' }}
                />
                <span className="font-medium">API: {health.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: health.db === 'connected' ? '#22c55e' : '#ef4444' }}
                />
                <span>Database: {health.db}</span>
              </div>
              <p style={{ color: 'var(--muted-fg)' }}>Checked at: {new Date(health.timestamp).toLocaleTimeString()}</p>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-sm font-semibold mb-3">Pipeline Stats</p>
          {pipelineError ? (
            <p className="text-xs" style={{ color: '#ef4444' }}>Failed to load: {pipelineError}</p>
          ) : pipeline === null ? (
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>Loading…</p>
          ) : pipeline.message ? (
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>{pipeline.message}</p>
          ) : (
            <div className="space-y-1 text-xs">
              {pipeline.status && (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: pipeline.status === 'completed' ? '#22c55e' : pipeline.status === 'running' ? '#3b82f6' : '#f59e0b' }}
                  />
                  <span className="font-medium capitalize">Status: {pipeline.status}</span>
                </div>
              )}
              {pipeline.started_at && (
                <p style={{ color: 'var(--muted-fg)' }}>Started: {new Date(pipeline.started_at).toLocaleString()}</p>
              )}
              {pipeline.completed_at && (
                <p style={{ color: 'var(--muted-fg)' }}>Completed: {new Date(pipeline.completed_at).toLocaleString()}</p>
              )}
              {pipeline.facts_collected !== undefined && (
                <p>Facts collected: {pipeline.facts_collected}</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
