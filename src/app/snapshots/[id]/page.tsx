import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/db/client'
import type { WeeklySnapshot } from '@/lib/types'

export default async function SnapshotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabaseAdmin.from('weekly_snapshots').select('week_number').eq('id', id).single()
  if (!data) redirect('/snapshots')
  const s = data as Pick<WeeklySnapshot, 'week_number'>
  redirect(`/?week=${encodeURIComponent(s.week_number)}`)
}
