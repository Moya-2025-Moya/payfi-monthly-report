import { PageHeader } from '@/components/ui/PageHeader'
import { NarrativesClient } from './NarrativesClient'

export default function NarrativesPage() {
  return (
    <div>
      <PageHeader title="叙事时间线" />
      <NarrativesClient />
    </div>
  )
}
