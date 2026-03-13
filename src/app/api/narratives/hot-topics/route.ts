// Hot topics: AI clusters recent verified facts into trending narrative themes
import { NextResponse } from 'next/server'
import { supabaseAdmin, getCurrentWeekNumber } from '@/db/client'
import { callHaikuJSON } from '@/lib/ai-client'

interface HotTopic {
  label: string
  description: string
  suggested_query: string
  fact_count: number
  key_entities: string[]
}

export async function GET() {
  const weekNumber = getCurrentWeekNumber()

  // Check cache
  try {
    const { data: cached } = await supabaseAdmin
      .from('narrative_hot_topics')
      .select('topics')
      .eq('week_number', weekNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cached?.topics) {
      return NextResponse.json({ topics: cached.topics, cached: true })
    }
  } catch {
    // Table may not exist or no cache — continue
  }

  // Fetch recent verified facts (last 14 days)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: facts } = await supabaseAdmin
    .from('atomic_facts')
    .select('id, content_zh, content_en, tags, fact_date')
    .in('verification_status', ['verified', 'partially_verified'])
    .gte('fact_date', fourteenDaysAgo)
    .order('fact_date', { ascending: false })
    .limit(200)

  if (!facts || facts.length === 0) {
    return NextResponse.json({ topics: [] })
  }

  // Build facts summary for AI
  const factsText = facts.map((f: Record<string, unknown>, i: number) => {
    const content = (f.content_zh || f.content_en || '') as string
    const tags = (f.tags as string[])?.join(', ') ?? ''
    return `[${i}] ${content.slice(0, 200)} | tags: ${tags}`
  }).join('\n')

  const prompt = `你是稳定币行业分析师。根据以下 ${facts.length} 条最近的已验证事实，识别 3-8 个热门叙事主线。

每个叙事应该是一个可以展开成时间线的主题（如 "Circle IPO 进展"、"欧盟 MiCA 实施"、"稳定币支付扩张" 等）。

## 事实列表
${factsText}

## 输出格式（严格 JSON 数组）
[
  {
    "label": "叙事标题（中文，中英文之间加空格）",
    "description": "一句话描述（中文）",
    "suggested_query": "推荐的搜索词（可中可英，用于检索相关事实）",
    "fact_count": 相关事实数量估计,
    "key_entities": ["实体1", "实体2"]
  }
]

规则：
- 输出 3-8 个叙事，按事实密度排序。事实不足时宁可输出 3 个而非硬凑
- 优先选择事实密度高、涉及多个实体、有时间跨度的叙事
- 中英文之间加空格（如 "Circle IPO 进展"）`

  try {
    const topics = await callHaikuJSON<HotTopic[]>(prompt)

    // Try to cache
    try {
      await supabaseAdmin.from('narrative_hot_topics').insert({
        week_number: weekNumber,
        topics,
      })
    } catch {
      // Cache table may not exist — that's fine
    }

    return NextResponse.json({ topics, cached: false })
  } catch (err) {
    console.error('[hot-topics] AI call failed:', err)
    return NextResponse.json({ topics: [] })
  }
}
