import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntitiesClient } from './EntitiesClient'
import type { Entity } from '@/lib/types'

export default async function EntitiesPage() {
  const { data } = await supabaseAdmin.from('entities').select('*').order('name')
  const entities = (data ?? []) as Entity[]
  return (
    <div>
      <PageHeader title="Entities" description={`${entities.length} tracked entities`} />
      <EntitiesClient entities={entities} />
    </div>
  )
}
