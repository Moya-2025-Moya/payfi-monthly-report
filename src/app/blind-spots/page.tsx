import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { CoverageMatrix } from '@/components/blind-spots/CoverageMatrix'
import type { BlindSpotReport } from '@/lib/types'

const ENTITY_TYPE_ZH: Record<string, string> = {
  stablecoin_issuer: '稳定币发行方',
  b2c_product: 'B2C 产品',
  b2b_infra: 'B2B 基础设施',
  tradfi: '传统金融',
  public_company: '上市公司',
  defi: 'DeFi',
  regulator: '监管机构',
}

export default async function BlindSpotsPage() {
  const week = getCurrentWeekNumber()
  const { data } = await supabaseAdmin
    .from('blind_spot_reports')
    .select('*')
    .eq('week_number', week)
    .order('entity_type')

  const reports = (data ?? []) as BlindSpotReport[]
  return (
    <div>
      <PageHeader title="盲区检测" description="追踪实体的信息覆盖缺口" />
      {reports.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">暂无盲区报告</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>盲区报告每周自动生成。请在流水线运行后查看，或在设置页面手动触发。</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {reports.map(r => (
            <div key={r.id}>
              <h3 className="text-sm font-semibold mb-2">{ENTITY_TYPE_ZH[r.entity_type] ?? r.entity_type.replace(/_/g, ' ')}</h3>
              <CoverageMatrix data={r.report_data} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
