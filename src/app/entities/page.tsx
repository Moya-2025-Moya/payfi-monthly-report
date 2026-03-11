import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityCard } from '@/components/entity/EntityCard'
import type { Entity } from '@/lib/types'

export default async function EntitiesPage() {
  const { data } = await supabaseAdmin.from('entities').select('*').order('name')
  const entities = (data ?? []) as Entity[]
  return (
    <div>
      <PageHeader title="Entities" description={`${entities.length} tracked entities`} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {entities.map(e => <EntityCard key={e.id} entity={e} />)}
      </div>
    </div>
  )
}
