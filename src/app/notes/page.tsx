import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { NotesClient } from './NotesClient'
import type { Note } from '@/lib/types'

export default async function NotesPage() {
  const { data } = await supabaseAdmin
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const notes = (data ?? []) as Note[]

  return (
    <div>
      <PageHeader title="团队笔记" description={`共 ${notes.length} 条笔记`} />
      <NotesClient initialNotes={notes} />
    </div>
  )
}
