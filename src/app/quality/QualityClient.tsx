'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { CoverageMatrix } from '@/components/blind-spots/CoverageMatrix'
import { ContradictionsClient } from '@/app/contradictions/ContradictionsClient'
import type { BlindSpotReport, FactContradiction, AtomicFact } from '@/lib/types'

type Tab = 'blind-spots' | 'contradictions'

const ENTITY_TYPE_ZH: Record<string, string> = {
  stablecoin_issuer: '稳定币发行方',
  b2c_product: 'B2C 产品',
  b2b_infra: 'B2B 基础设施',
  tradfi: '传统金融',
  public_company: '上市公司',
  defi: 'DeFi',
  regulator: '监管机构',
}

interface Props {
  blindSpotReports: BlindSpotReport[]
  contradictions: FactContradiction[]
  factsMap: Record<string, AtomicFact>
}

export function QualityClient({ blindSpotReports, contradictions, factsMap }: Props) {
  const [tab, setTab] = useState<Tab>('blind-spots')
  const unresolvedCount = contradictions.filter(c => c.status === 'unresolved').length

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'blind-spots', label: '盲区检测', badge: blindSpotReports.length },
    { key: 'contradictions', label: '矛盾检测', badge: unresolvedCount },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--surface-alt)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: tab === t.key ? 'var(--surface)' : 'transparent',
              color: tab === t.key ? 'var(--fg-title)' : 'var(--fg-muted)',
              boxShadow: tab === t.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {t.label}
            {t.badge != null && (
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--surface-alt)', color: 'var(--fg-muted)' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'blind-spots' && (
        blindSpotReports.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-lg mb-1">暂无盲区报告</p>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              盲区报告每周自动生成。请在流水线运行后查看，或在设置页面手动触发。
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {blindSpotReports.map(r => (
              <div key={r.id}>
                <h3 className="text-sm font-semibold mb-2">
                  {ENTITY_TYPE_ZH[r.entity_type] ?? r.entity_type.replace(/_/g, ' ')}
                </h3>
                <CoverageMatrix data={r.report_data} />
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'contradictions' && (
        <ContradictionsClient contradictions={contradictions} factsMap={factsMap} />
      )}
    </div>
  )
}
