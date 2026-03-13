import { supabaseAdmin } from '@/db/client'

export interface PipelineCheckpoint {
  pipeline: string          // e.g. 'snapshot'
  week_number: string       // e.g. '2026-W11'
  step: number              // completed step number
  step_name: string         // human-readable step name
  data: Record<string, unknown>  // intermediate results to resume from
  created_at: string
}

/**
 * Save checkpoint to weekly_snapshots.snapshot_data.checkpoint
 */
export async function saveCheckpoint(
  cp: Omit<PipelineCheckpoint, 'created_at'>
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', cp.week_number)
    .single()

  const sd = (existing?.snapshot_data ?? {}) as Record<string, unknown>
  sd.checkpoint = {
    pipeline: cp.pipeline,
    step: cp.step,
    step_name: cp.step_name,
    data: cp.data,
    created_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin.from('weekly_snapshots').upsert(
    {
      week_number: cp.week_number,
      snapshot_data: sd,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'week_number' }
  )
  if (error) {
    console.error(`[checkpoint] Failed to save checkpoint for ${cp.pipeline} step ${cp.step}:`, error.message)
  }
}

/**
 * Load latest checkpoint for a pipeline+week
 */
export async function loadCheckpoint(
  pipeline: string,
  weekNumber: string
): Promise<PipelineCheckpoint | null> {
  const { data } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', weekNumber)
    .single()

  if (!data?.snapshot_data) return null

  const sd = data.snapshot_data as Record<string, unknown>
  const cp = sd.checkpoint as {
    pipeline?: string
    step?: number
    step_name?: string
    data?: Record<string, unknown>
    created_at?: string
  } | undefined

  if (!cp || cp.pipeline !== pipeline || typeof cp.step !== 'number') return null

  return {
    pipeline: cp.pipeline,
    week_number: weekNumber,
    step: cp.step,
    step_name: cp.step_name ?? '',
    data: cp.data ?? {},
    created_at: cp.created_at ?? '',
  }
}

/**
 * Clear checkpoints after successful completion
 */
export async function clearCheckpoints(
  pipeline: string,
  weekNumber: string
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('weekly_snapshots')
    .select('snapshot_data')
    .eq('week_number', weekNumber)
    .single()

  if (!existing?.snapshot_data) return

  const sd = existing.snapshot_data as Record<string, unknown>
  const cp = sd.checkpoint as { pipeline?: string } | undefined

  // Only clear if the checkpoint belongs to this pipeline
  if (cp && cp.pipeline === pipeline) {
    delete sd.checkpoint

    await supabaseAdmin.from('weekly_snapshots').upsert(
      {
        week_number: weekNumber,
        snapshot_data: sd,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'week_number' }
    )
  }
}
