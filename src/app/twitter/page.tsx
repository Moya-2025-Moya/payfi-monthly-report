import { supabaseAdmin } from '@/db/client'
import { getCurrentWeekNumber } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { FactList } from '@/components/facts/FactList'
import type { AtomicFact } from '@/lib/types'

export default async function TwitterPage() {
  const week = getCurrentWeekNumber()
  const { data } = await supabaseAdmin
    .from('atomic_facts')
    .select('*')
    .eq('source_type', 'tweet')
    .in('verification_status', ['verified', 'partially_verified'])
    .eq('week_number', week)
    .order('fact_date', { ascending: false })
    .limit(100)
  const facts = (data ?? []) as AtomicFact[]
  return (
    <div>
      <PageHeader title="推特声音" description={`本周 ${facts.length} 条来自推特的已验证事实`} />
      {facts.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-lg mb-1">本周暂无推特事实</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>推特数据每周采集并处理，请在下次流水线运行后查看。</p>
        </Card>
      ) : (
        <FactList facts={facts} />
      )}
    </div>
  )
}
