import { PageHeader } from '@/components/ui/PageHeader'
import { DensityChart } from '@/components/density/DensityChart'
import type { DensityAnomaly } from '@/lib/types'

async function fetchAnomalies(): Promise<DensityAnomaly[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/density/anomalies`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export default async function DensityPage() {
  const anomalies = await fetchAnomalies()
  return (
    <div>
      <PageHeader title="信息密度" description="按主题、实体或板块检测事实数量异常波动" />
      <DensityChart anomalies={anomalies} />
    </div>
  )
}
