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
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  logs: PipelineLogEntry[]
  stats: Record<string, unknown> | null
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

  async function appendLog(entry: PipelineLogEntry) {
    logs.push(entry)
    // Write to DB (best-effort, don't block)
    if (runId) {
      supabaseAdmin
        .from('pipeline_runs')
        .update({ logs })
        .eq('id', runId)
        .then(({ error: e }) => {
          if (e) console.error('[pipeline-logger] DB write error:', e.message)
        })
    }
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

    async done(extraData?: Record<string, unknown>) {
      const time = new Date().toISOString()
      logs.push({ time, message: '执行完成', level: 'success' })

      send({ type: 'done', ...extraData })

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
