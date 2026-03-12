import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { NotesClient } from './NotesClient'
import type { Note, AtomicFact } from '@/lib/types'

export default async function NotesPage() {
  const { data } = await supabaseAdmin
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const notes = (data ?? []) as Note[]

  // Fetch all related facts in one query
  const factIds = [...new Set(notes.map(n => n.fact_id).filter(Boolean))] as string[]
  const factsMap: Record<string, AtomicFact> = {}
  if (factIds.length > 0) {
    const { data: facts } = await supabaseAdmin.from('atomic_facts').select('*').in('id', factIds)
    for (const f of (facts ?? []) as AtomicFact[]) factsMap[f.id] = f
  }

  return (
    <div>
      <PageHeader title="团队笔记" />
      <NotesClient initialNotes={notes} factsMap={factsMap} />
    </div>
  )
}
