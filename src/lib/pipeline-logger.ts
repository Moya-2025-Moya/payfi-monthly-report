// Pipeline logger — writes logs to both SSE stream and database
// Ensures logs survive page refresh/close

import { supabaseAdmin } from '@/db/client'

export type PipelineType = 'collect' | 'process' | 'twitter' | 'snapshot' | 'narrative'

export interface PipelineLogEntry {
  time: string
  message: string
  level: 'info' | 'success' | 'error' | 'progress'
}

export interface PipelineRun {
  id: string
  pipeline_type: PipelineType
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at: string | null
  logs: PipelineLogEntry[]
  stats: Record<string, unknown> | null
}

export class PipelineCancelledError extends Error {
  constructor() { super('Pipeline cancelled by user') }
}

/**
 * Create a pipeline logger that writes to both SSE and DB.
 * Usage in stream endpoints:
 *   const logger = await createPipelineLogger('collect', sendFn)
 *   logger.log('message', 'info')
 *   logger.progress('1/6', 'doing something')
 *   await logger.done({ totalItems: 5 })
 */
export async function createPipelineLogger(
  type: PipelineType,
  send: (data: Record<string, unknown>) => void
) {
  // Create a run record
  const { data: run, error } = await supabaseAdmin
    .from('pipeline_runs')
    .insert({
      pipeline_type: type,
      status: 'running',
      logs: [],
      stats: null,
    })
    .select('id')
    .single()

  if (error || !run) {
    console.error('[pipeline-logger] Failed to create run:', error?.message)
  }

  const runId = run?.id as string | undefined
  const logs: PipelineLogEntry[] = []

  // Debounced DB write: accumulate logs and flush periodically
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let flushPromise: Promise<void> | null = null

  async function flushLogs() {
    if (!runId) return
    const { error: e } = await supabaseAdmin
      .from('pipeline_runs')
      .update({ logs: [...logs] })
      .eq('id', runId)
    if (e) console.error('[pipeline-logger] DB write error:', e.message)
  }

  function scheduleFlush() {
    if (flushTimer) return // already scheduled
    flushTimer = setTimeout(() => {
      flushTimer = null
      flushPromise = flushLogs()
    }, 1000) // flush at most once per second
  }

  async function appendLog(entry: PipelineLogEntry) {
    logs.push(entry)
    scheduleFlush()
  }

  async function ensureFlushed() {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    if (flushPromise) await flushPromise
    await flushLogs() // final flush
  }

  return {
    runId,

    log(message: string, level: PipelineLogEntry['level'] = 'info') {
      const time = new Date().toISOString()
      send({ type: 'log', message, level })
      appendLog({ time, message, level })
    },

    progress(step: string, message: string) {
      const time = new Date().toISOString()
      send({ type: 'progress', step, message })
      appendLog({ time, message: `[${step}] ${message}`, level: 'progress' })
    },

    /** Check if cancellation was requested. Throws PipelineCancelledError if so. */
    async checkCancelled() {
      if (!runId) return
      const { data } = await supabaseAdmin
        .from('pipeline_runs')
        .select('status, error')
        .eq('id', runId)
        .single()
      // Detect cancellation: either explicit 'cancelled' status or 'failed' with cancellation marker
      if (data?.status === 'cancelled' || (data?.status === 'failed' && data?.error === 'cancelled_by_user')) {
        throw new PipelineCancelledError()
      }
    },

    async cancel() {
      const time = new Date().toISOString()
      logs.push({ time, message: '用户取消', level: 'error' })
      send({ type: 'error', message: '用户取消' })
      await ensureFlushed()
      if (runId) {
        // Try 'cancelled' first, fall back to 'failed' if DB constraint doesn't allow it
        const { error: err1 } = await supabaseAdmin
          .from('pipeline_runs')
          .update({ status: 'cancelled', completed_at: time, logs, error: 'cancelled_by_user' })
          .eq('id', runId)
        if (err1) {
          await supabaseAdmin
            .from('pipeline_runs')
            .update({ status: 'failed', completed_at: time, logs, error: 'cancelled_by_user' })
            .eq('id', runId)
        }
      }
    },

    async done(extraData?: Record<string, unknown>) {
      const time = new Date().toISOString()
      logs.push({ time, message: '执行完成', level: 'success' })

      send({ type: 'done', ...extraData })

      // Ensure all pending log writes are flushed before final status update
      await ensureFlushed()

      if (runId) {
        await supabaseAdmin
          .from('pipeline_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            logs,
            stats: extraData ?? null,
          })
          .eq('id', runId)
      }
    },

    async fail(message: string) {
      const time = new Date().toISOString()
      logs.push({ time, message, level: 'error' })

      send({ type: 'error', message })

      await ensureFlushed()

      if (runId) {
        await supabaseAdmin
          .from('pipeline_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            logs,
            error: message,
          })
          .eq('id', runId)
      }
    },
  }
}

/**
 * Get the latest run for each pipeline type.
 */
export async function getLatestRuns(): Promise<Record<PipelineType, PipelineRun | null>> {
  const types: PipelineType[] = ['collect', 'process', 'twitter', 'snapshot', 'narrative']
  const result: Record<string, PipelineRun | null> = {}

  for (const type of types) {
    const { data } = await supabaseAdmin
      .from('pipeline_runs')
      .select('*')
      .eq('pipeline_type', type)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    result[type] = data as PipelineRun | null
  }

  return result as Record<PipelineType, PipelineRun | null>
}

/**
 * Get a specific run by ID (for polling).
 */
export async function getRunById(id: string): Promise<PipelineRun | null> {
  const { data } = await supabaseAdmin
    .from('pipeline_runs')
    .select('*')
    .eq('id', id)
    .single()

  return data as PipelineRun | null
}
