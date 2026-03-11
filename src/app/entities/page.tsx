import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntitiesClient } from './EntitiesClient'
import type { Entity } from '@/lib/types'

export default async function EntitiesPage() {
  const { data } = await supabaseAdmin.from('entities').select('*').order('name')
  const entities = (data ?? []) as Entity[]
  return (
    <div>
      <PageHeader title="实体" description={`共 ${entities.length} 个追踪实体`} />
      <EntitiesClient entities={entities} />
    </div>
  )
}
