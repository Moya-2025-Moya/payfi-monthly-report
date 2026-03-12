import { PageHeader } from '@/components/ui/PageHeader'
import { NarrativesClient } from './NarrativesClient'

export default function NarrativesPage() {
  return (
    <div>
      <PageHeader title="叙事时间线" description="输入主题，AI 从已验证事实中生成带分叉的交互式时间线" />
      <NarrativesClient />
    </div>
  )
}
