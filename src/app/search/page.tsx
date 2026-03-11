import { supabaseAdmin } from '@/db/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchClient } from './SearchClient'
import type { AtomicFact } from '@/lib/types'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  let facts: AtomicFact[] = []
  if (q) {
    const { data } = await supabaseAdmin
      .from('atomic_facts')
      .select('*')
      .in('verification_status', ['verified', 'partially_verified'])
      .or(`content_en.ilike.%${q}%,content_zh.ilike.%${q}%`)
      .order('fact_date', { ascending: false })
      .limit(100)
    facts = (data ?? []) as AtomicFact[]
  }
  return (
    <div>
      <PageHeader title="搜索" description="搜索所有已验证的原子事实" />
      <SearchClient initialQuery={q ?? ''} initialResults={facts} />
    </div>
  )
}
