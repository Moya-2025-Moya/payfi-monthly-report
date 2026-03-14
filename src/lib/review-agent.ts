// Review Agent V1 — SOP-based 邮件/周报审核 Agent
// 在快照生成后自动审核内容，修复小问题
// 高度 SOP 化：每个检查项有明确的判断标准和修复动作

import { callHaikuJSON } from '@/lib/ai-client'

// ── Types ──

interface ReviewIssue {
  type: 'duplicate_text' | 'missing_data' | 'date_duplication' | 'connector_mismatch' | 'format_error' | 'redundant_content'
  location: string        // e.g. "signals[2].structured_context.detail"
  description: string     // 问题描述
  fix?: string            // 建议修复值
  severity: 'critical' | 'warning' | 'info'
}

interface ReviewResult {
  issues: ReviewIssue[]
  fixed_data: Record<string, unknown> | null  // 如果有可自动修复的问题，返回修复后的数据
  passed: boolean
}

interface SignalForReview {
  text: string
  context?: string
  structured_context?: {
    event: string
    detail: string
    connector?: string
    source_url?: string
  }
}

interface NarrativeForReview {
  topic: string
  this_week?: string
  summary?: string
  events?: { title: string; description?: string; date?: string }[]
  context?: { event: string; detail: string }[]
}

interface ContentForReview {
  oneLiner: string
  signals: SignalForReview[]
  narratives: NarrativeForReview[]
  briefs?: { text: string }[]
}

// ── SOP 检查项 ──

/**
 * SOP 1: 文本重复检测
 * 判断标准: 标题中出现破折号分隔的两段文字，且两段内容高度重叠
 * 修复动作: 保留更完整的版本
 */
function checkDuplicateText(content: ContentForReview): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  // Check narratives for "Title — Title (duplicate)" pattern
  for (let i = 0; i < content.narratives.length; i++) {
    const n = content.narratives[i]
    const thisWeek = n.this_week || ''
    // Pattern: "Event Title — Same Event Title with more detail"
    const dashMatch = thisWeek.match(/^(.+?)\s*[—–]\s*(.+)$/)
    if (dashMatch) {
      const [, before, after] = dashMatch
      // Check if the after part starts with the same text as before
      if (after.startsWith(before.trim()) || before.trim().startsWith(after.substring(0, Math.min(before.trim().length, after.length)))) {
        issues.push({
          type: 'duplicate_text',
          location: `narratives[${i}].this_week`,
          description: `叙事"${n.topic}"的本周内容存在标题重复: "${before.trim()}" 和 "${after.substring(0, 30)}..."`,
          fix: after.length > before.length ? after : before.trim(),
          severity: 'critical',
        })
      }
    }
  }

  return issues
}

/**
 * SOP 2: 日期重复检测
 * 判断标准: 文本中出现连续的年份括号如 (2024年3月) (2024年3月)
 * 修复动作: 保留更详细的一个
 */
function checkDateDuplication(content: ContentForReview): ReviewIssue[] {
  const issues: ReviewIssue[] = []
  const datePattern = /(\([^)]*\d{4}[^)]*\))\s*(\([^)]*\d{4}[^)]*\))/g

  function scanText(text: string, location: string) {
    const matches = text.matchAll(datePattern)
    for (const match of matches) {
      issues.push({
        type: 'date_duplication',
        location,
        description: `日期重复: "${match[0]}"`,
        fix: match[1].length >= match[2].length ? match[1] : match[2],
        severity: 'critical',
      })
    }
  }

  for (let i = 0; i < content.signals.length; i++) {
    if (content.signals[i].context) scanText(content.signals[i].context!, `signals[${i}].context`)
    if (content.signals[i].structured_context?.detail) {
      scanText(content.signals[i].structured_context!.detail, `signals[${i}].structured_context.detail`)
    }
  }

  for (let i = 0; i < content.narratives.length; i++) {
    const n = content.narratives[i]
    if (n.context) {
      for (let j = 0; j < n.context.length; j++) {
        scanText(`${n.context[j].event} ${n.context[j].detail}`, `narratives[${i}].context[${j}]`)
      }
    }
  }

  return issues
}

/**
 * SOP 3: 缺失数据检测
 * 判断标准: 数值字段为空或只有单位没有数字
 * 修复动作: 标记为 critical，需要人工处理
 */
function checkMissingData(content: ContentForReview): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  for (let i = 0; i < content.narratives.length; i++) {
    const n = content.narratives[i]
    if (n.context) {
      for (let j = 0; j < n.context.length; j++) {
        const detail = n.context[j].detail
        // Check for missing numbers: "融资金额为 万美元" (missing actual number)
        if (/为\s*[万亿]/.test(detail) || /为\s*美元/.test(detail)) {
          issues.push({
            type: 'missing_data',
            location: `narratives[${i}].context[${j}].detail`,
            description: `数据缺失: "${detail}" — 数值字段没有实际数字`,
            severity: 'critical',
          })
        }
      }
    }
  }

  return issues
}

/**
 * SOP 4: 连接词语境检查
 * 判断标准: connector 是否与实际内容匹配
 * 修复动作: 替换为更合适的 connector
 */
function checkConnectors(content: ContentForReview): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  const usedConnectors = new Set<string>()
  for (let i = 0; i < content.signals.length; i++) {
    const sc = content.signals[i].structured_context
    if (!sc?.connector) continue

    // Check for duplicate connectors
    if (usedConnectors.has(sc.connector)) {
      issues.push({
        type: 'connector_mismatch',
        location: `signals[${i}].structured_context.connector`,
        description: `连接词"${sc.connector}"在本期已被使用过`,
        severity: 'warning',
      })
    }
    usedConnectors.add(sc.connector)

    // Check banned connectors
    if (sc.connector.includes('相比之下') || sc.connector.includes('值得注意')) {
      issues.push({
        type: 'connector_mismatch',
        location: `signals[${i}].structured_context.connector`,
        description: `禁止使用的连接词: "${sc.connector}"`,
        fix: '作为参照，',
        severity: 'critical',
      })
    }
  }

  return issues
}

/**
 * SOP 5: 信号对比完整性
 * 判断标准: 每条信号是否都有 structured_context
 */
function checkContextCoverage(content: ContentForReview): ReviewIssue[] {
  const issues: ReviewIssue[] = []

  for (let i = 0; i < content.signals.length; i++) {
    const s = content.signals[i]
    if (!s.structured_context && !s.context) {
      issues.push({
        type: 'missing_data',
        location: `signals[${i}]`,
        description: `信号"${s.text.substring(0, 30)}..."缺少历史对比`,
        severity: 'warning',
      })
    }
  }

  return issues
}

// ── AI 审核 (补充规则检查无法覆盖的语义问题) ──

async function aiReview(content: ContentForReview): Promise<ReviewIssue[]> {
  try {
    const compactContent = {
      oneLiner: content.oneLiner,
      signals: content.signals.map(s => ({
        text: s.text.substring(0, 80),
        context: s.structured_context ? `${s.structured_context.connector || ''}${s.structured_context.event}，${s.structured_context.detail}` : s.context?.substring(0, 80),
      })),
      narratives: content.narratives.map(n => ({
        topic: n.topic,
        this_week: (n.this_week || '').substring(0, 80),
        context_count: n.context?.length ?? 0,
      })),
    }

    const result = await callHaikuJSON<{ issues: ReviewIssue[] }>(
      `你是周报质量审核工具。审核以下内容，找出问题。

内容:
${JSON.stringify(compactContent, null, 2)}

═══ SOP 审核清单 ═══
1. 信号(signal)的对比(context)是否和信号本身有逻辑关系？对比能否推导出有价值的结论？
2. 叙事(narrative)的本周内容是否存在"标题 — 重复标题"模式？
3. 连接词是否重复（同一期不能用两个相同的连接词）？
4. 信号之间的对比内容是否有重叠（引用了相同的历史事件）？

只报告你发现的问题，格式:
{"issues": [{"type": "...", "location": "...", "description": "...", "severity": "warning"|"critical"}]}

如果没有问题，返回 {"issues": []}`,
      { system: '周报质量审核工具。只输出 JSON。', maxTokens: 500 }
    )

    return result.issues ?? []
  } catch {
    return []
  }
}

// ── 自动修复 ──

function autoFix(content: ContentForReview, issues: ReviewIssue[]): ContentForReview {
  const fixed = JSON.parse(JSON.stringify(content)) as ContentForReview

  for (const issue of issues) {
    if (!issue.fix) continue

    // Fix duplicate text in narratives
    if (issue.type === 'duplicate_text' && issue.location.startsWith('narratives[')) {
      const idx = parseInt(issue.location.match(/\[(\d+)\]/)?.[1] ?? '-1')
      if (idx >= 0 && idx < fixed.narratives.length) {
        fixed.narratives[idx].this_week = issue.fix
      }
    }

    // Fix banned connectors
    if (issue.type === 'connector_mismatch' && issue.location.includes('connector')) {
      const idx = parseInt(issue.location.match(/signals\[(\d+)\]/)?.[1] ?? '-1')
      if (idx >= 0 && idx < fixed.signals.length && fixed.signals[idx].structured_context) {
        fixed.signals[idx].structured_context!.connector = issue.fix
      }
    }

    // Fix date duplication in context
    if (issue.type === 'date_duplication' && issue.fix) {
      const signalMatch = issue.location.match(/signals\[(\d+)\]\.structured_context\.detail/)
      if (signalMatch) {
        const idx = parseInt(signalMatch[1])
        if (idx >= 0 && idx < fixed.signals.length && fixed.signals[idx].structured_context) {
          fixed.signals[idx].structured_context!.detail = fixed.signals[idx].structured_context!.detail.replace(
            /(\([^)]*\d{4}[^)]*\))\s*(\([^)]*\d{4}[^)]*\))/g,
            issue.fix
          )
        }
      }
    }
  }

  return fixed
}

// ── 主入口 ──

export async function reviewContent(content: ContentForReview): Promise<ReviewResult> {
  // Phase 1: 规则检查（确定性）
  const ruleIssues = [
    ...checkDuplicateText(content),
    ...checkDateDuplication(content),
    ...checkMissingData(content),
    ...checkConnectors(content),
    ...checkContextCoverage(content),
  ]

  // Phase 2: AI 语义检查（补充）
  const aiIssues = await aiReview(content)

  const allIssues = [...ruleIssues, ...aiIssues]
  const hasCritical = allIssues.some(i => i.severity === 'critical')

  // Phase 3: 自动修复可修复的问题
  let fixedData: Record<string, unknown> | null = null
  const fixableIssues = allIssues.filter(i => i.fix)
  if (fixableIssues.length > 0) {
    const fixed = autoFix(content, fixableIssues)
    fixedData = fixed as unknown as Record<string, unknown>
  }

  return {
    issues: allIssues,
    fixed_data: fixedData,
    passed: !hasCritical,
  }
}
