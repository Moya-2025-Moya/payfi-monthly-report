# StablePulse V12 — 产品与技术规范

## 产品定义

**一句话**: 自动化的稳定币行业上下文引擎，通过邮件推送给 VC 合伙人。

**核心差异化**: AI 为每条行业事实自动匹配历史可比数据——分析师手动做需要 2 小时的事实关联工作，pipeline 在 30 秒内完成。

**不是什么**: 不是 RSS 阅读器，不是 AI 摘要工具，不是情报 SaaS 平台。上下文引擎是产品的全部意义。如果上下文质量不够好，这个产品就没有存在价值。

**目标用户**: 1 个 VC 合伙人 + 其内部团队（1-5 人）。不做 B2B SaaS，不做公开订阅。

---

## AI 边界：零意见

| 禁止 (意见) | 允许 (上下文) |
|---|---|
| "Circle IPO 可能成功" | "Coinbase: S-1→上市 118 天 (2020.12→2021.04)" |
| "值得关注" | "USDC 市值 $25B→$60B (+140%) 同期" |
| "这对行业意义重大" | "GENIUS Act vs Lummis-Gillibrand: GENIUS 仅聚焦稳定币" |
| "建议关注 XX" | "SEC 对 Coinbase S-1 反馈窗口: 约 3 周" |
| 使用"可能""预计""前景""趋势" | 使用具体数字、日期、持续时间 |

**Enforcement 机制** (不是 regex 黑名单):
1. AI 输出结构化 JSON 字段（historical_event, date, metric, delta），不输出自然语言句子
2. 代码模板从结构化字段组装句子——AI 无法注入意见
3. 自由文本字段（one_liner, this_week）经过二次 AI 对抗校验
4. 验证失败 → 丢弃该条上下文，宁可没有也不要错的

---

## 产品形态

### 邮件 = 精选摘要 (push)

每周一封，三层渐进式：

```
STABLEPULSE                    3月10日 - 3月16日

USDC $60.2B (+2.1%) · USDT $144.1B (+0.8%)

Circle S-1 修订版提交; GENIUS Act 过参议院委员会

────────────────────────────────────────────

叙事追踪

┌──────────────────────────────────────────┐
│ Circle IPO 进程                    第4周  │
│ 起点: 2026.02.15 Circle 启动 IPO 流程    │
│                                          │
│ 上周  高盛+摩根确认联合承销               │
│ 本周  S-1 修订版提交                     │
│                                          │
│ 上下文                                   │
│ · Coinbase: S-1→上市 118 天 (2020.12→04) │
│ · Coinbase 上市估值 $85.8B               │
│ · Circle 启动→S-1 修订: 25 天            │
│                                          │
│ 时间线  SEC 反馈窗口 3.17 起             │
└──────────────────────────────────────────┘

────────────────────────────────────────────

本周事实

市场结构
· Ethena USDe TVL 突破 $5B
  → DAI 达 $5B 用时 18 个月; USDe 用时 10.5 个月

产品动态
· Fireblocks 新增 USDC 原生铸造 API

链上数据
· USDC 市值 $60.2B (+2.1% WoW)

────────────────────────────────────────────
数据来源: RSS + SEC EDGAR + DeFiLlama · AI 多源交叉验证
查看完整版（含全部 52 条事实）→
```

**邮件技术约束**:
- 纯 `<table>` 布局，不用 `<div>`, `<p>`
- 浅色背景 (#ffffff body, #f7f7f7 section)
- 所有颜色 6 位 hex，不用 rgba/hsl
- font-size >= 13px (Gmail 移动端强制放大阈值)
- 不用 border-radius, box-shadow, CSS3 属性
- Outlook MSO 条件注释 fallback

### Web = 完整版 (pull)

邮件末尾的 CTA 链接到 Web。Web 提供邮件做不到的东西：

```
/weekly/[week]
├── 上半部分: 邮件内容 (one-liner + narratives + signals)
│   ├── 上下文块可展开查看引用来源
│   └── 叙事可展开查看原始事实
└── 下半部分: 本周全部事实
    ├── 搜索框 (带防抖)
    ├── 标准 tag 筛选
    └── 按日期排列的事实列表 (含来源链接)
```

Web 不叫"镜像"，叫"完整版"。邮件是 8 条精选，Web 是 50+ 条全量。

### Admin = 运维后台

3 个 Tab:
- **流水线**: 逐步执行 (collect → process → snapshot) + 一键全部 + DEV 数据重置
- **预览邮件**: 报告列表 + iframe 预览
- **订阅者**: 添加/管理

所有 admin/cron API 需要 `x-admin-token` 鉴权。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        StablePulse V12                          │
├───────────┬──────────────┬──────────────┬───────────┬──────────┤
│  Layer 1  │   Layer 2    │   Layer 3    │  Layer 4  │ Layer 5  │
│  采集     │ 原子化+验证   │ 上下文引擎   │  选取+分发 │ 基础设施  │
├───────────┼──────────────┼──────────────┼───────────┼──────────┤
│ RSS (14源) │ B1 事实拆解  │ 向量检索     │ AI 选取   │ Supabase │
│ SEC EDGAR │ V0-V5 验证   │ (pgvector)   │ 模板组装  │ pgvector │
│ DeFiLlama │ B2 实体识别  │ 参考知识库   │ 邮件生成  │ Vercel   │
│ Twitter   │ B3 时间线    │ (DB, 自增长) │ Web 渲染  │ Anthropic│
│ Blog RSS  │ Tag 标准化   │ 结构化输出   │ Admin     │ Voyage   │
│           │              │ 对抗性校验   │           │          │
└───────────┴──────────────┴──────────────┴───────────┴──────────┘
```

---

## Layer 1: 数据采集

> 职责: 抓取原始数据 → raw_* 表。不做拆解/分析。

| 采集器 | 数据源 | 输出表 | 频率 |
|---|---|---|---|
| 链上数据 | DeFiLlama Stablecoins API | `raw_onchain_metrics` | 每周 |
| 新闻 | RSS (14 源) + 全文抓取 | `raw_news` | 每周 |
| 上市公司 | SEC EDGAR + Yahoo Finance | `raw_filings`, `raw_stock_data` | 每周 |
| 产品动态 | Blog RSS + GitHub | `raw_product_updates` | 每周 |
| Twitter | twitterapi.io | `raw_tweets` | 每周 |
| 监管 | SEC.gov RSS + 各地区 | `raw_regulatory` | 每周 |

代码: `src/modules/collectors/`

---

## Layer 2: 原子化 + 验证 + Tag 标准化

> 职责: raw_* → atomic_facts (verified, tagged, embedded)

### B1 事实拆解

| 字段 | 说明 |
|---|---|
| 模型 | Claude Haiku 4.5 |
| Prompt | `src/config/prompts/fact-splitter-extract.md` |
| 输出 | content_zh, fact_type, tags, fact_date, metric_* |
| Tag 规则 | Prompt 内置标准 tag 词汇表 (从 watchlist 生成)，AI 优先使用标准 tag |

### Tag 标准化

```
src/config/tag-vocabulary.ts

AI 原始 tag → normalizeTags() → 标准化 tag

标准化规则:
1. watchlist entity name/alias → canonical entity tag
   "USDC" → "circle", "usd-coin" → "circle"
2. 主题 tag 白名单: ipo, regulation, market-cap, tvl, funding, ...
3. 未匹配的 tag → 模糊匹配 → 仍然未匹配则丢弃

调用时机: B1 saveCandidates() 存入 DB 前
```

### 验证层 V0-V5

按 fact_type 选择验证器组合 (verification-strategy.ts):

| fact_type | 验证器 |
|---|---|
| metric | V1 + V3 + V4 |
| event | V1 + V2 |
| quote | V1 |
| relationship | V1 + V2 |
| status_change | V1 + V2 + V5 |

| 验证器 | 实现 | 职责 |
|---|---|---|
| V0 裁决器 | 纯代码 | 加权投票 → confidence (high/medium/low/rejected) |
| V1 来源回溯 | Fetch + Haiku | 原文匹配 |
| V2 多来源交叉 | 代码 + Haiku | 独立来源一致性 |
| V3 数值合理性 | 纯代码 | 量级检查 |
| V4 链上锚定 | 纯代码 | 与 DeFiLlama 数据对比 |
| V5 时序一致性 | 代码 + Haiku | 时间线矛盾检测 |

### Embedding 生成

验证通过的事实 → Voyage AI (`voyage-3-lite`) 生成 1024 维 embedding → 存入 `atomic_facts.embedding`

---

## Layer 3: 上下文引擎 (Context Engine)

> 核心差异化。把"RSS 聚合器"变成"上下文引擎"的关键模块。

### 架构

```
事实 → [Stage 1: 分类] → [Stage 2: 向量检索] → [Gate 1] → [Stage 3: 结构化生成] → [Gate 2] → 输出
         规则+embedding     pgvector             候选≥1?     AI填字段→模板组装       schema校验?
```

### Stage 1: 事件分类

```
Pass 1: 高置信度规则匹配 (明确关键词)
  /s-1|ipo|招股/ → ipo_filing
  /wells notice|罚款.*\$/ → enforcement

Pass 2: 规则未命中 → embedding 找最近参考事件
  nearest reference_event similarity > 0.8 → 取其 type

Pass 3: 都未命中 → null (不分类，仍然检索)
```

### Stage 2: 向量检索 (替代 tag overlap)

```sql
-- Supabase RPC function
CREATE FUNCTION match_facts(
  query_embedding vector(1024),
  match_threshold float,
  match_count int,
  exclude_week text
) RETURNS TABLE(id uuid, content_zh text, fact_date date, similarity float)
AS $$
  SELECT id, content_zh, fact_date,
    1 - (embedding <=> query_embedding) as similarity
  FROM atomic_facts
  WHERE week_number != exclude_week
    AND verification_status IN ('verified', 'partially_verified')
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;
```

同时检索:
- `reference_events` 表 (策展知识库，也有 embedding)
- `atomic_facts` 历史 (所有过往周的已验证事实)

### Quality Gate 1: 候选充分性

候选数 == 0 → 不生成上下文，返回空。宁可没有也不编造。

### Stage 3: 结构化生成

AI 不写自然语言。AI 填结构化字段：

```json
{
  "comparisons": [
    {
      "reference_event": "Coinbase IPO",
      "metric_label": "S-1 提交到上市",
      "metric_value": "118 天",
      "date_range": "2020.12→2021.04",
      "used_candidate_index": 0
    },
    {
      "reference_event": "Coinbase IPO",
      "metric_label": "上市估值",
      "metric_value": "$85.8B",
      "date_range": "2021.04",
      "used_candidate_index": 0
    }
  ],
  "confidence": "high"
}
```

代码从结构化字段组装句子:
```typescript
// 模板组装，AI 不控制最终文案
`${comp.reference_event}: ${comp.metric_label} ${comp.metric_value} (${comp.date_range})`
// → "Coinbase IPO: S-1 提交到上市 118 天 (2020.12→2021.04)"
```

### Quality Gate 2: Schema 校验

- `used_candidate_index` 必须指向真实存在的候选
- `metric_value` 必须包含数字
- `confidence == 'low'` → 丢弃
- 组装后的句子长度 5-80 字

### Self-Growing 知识库

每周 pipeline 完成后，从本周叙事中提取结构化事件存入 `reference_events` 表:

```
条件: narrative 的 context confidence == high 且包含具体数字
操作: 提取 entity, type, milestones, metrics → INSERT INTO reference_events
效果: 第1周 20 条 → 第10周 50+ 条 → 第50周 200+ 条
```

---

## Layer 4: 选取 + 分发

### Snapshot Pipeline (5 步)

```
Step 1: 统计事实 + 置信度分布
Step 2: 跨周矛盾检测 (4 周历史, Haiku batch)
Step 3: AI 选取 + Context Engine
  3A. 从 narrative_thread_entries 读上周数据 (不让 AI 编 last_week)
  3B. AI 选取 3 narratives + 5 signals + one_liner + market_line
  3C. 对每条 narrative/signal 调 Context Engine
  3D. 自由文本对抗性校验 (二次 Haiku 判断是否含意见)
Step 4: 保存快照 + Self-Growing KB 入库
Step 5: 生成邮件 HTML + 写入 reports 表
```

### 叙事 last_week 数据流

```
narrative_thread_entries 表
  → 查上一周的 summary 字段
  → 注入 AI prompt: "已有叙事: Circle IPO 进程, 上周(W10): 高盛+摩根确认承销"
  → AI 基于真实数据改写 last_week 字段
```

不从 AI 训练数据"回忆"，从 DB 读取真实记录。

### 邮件生成

```
src/lib/email-template.ts

输入: EmailData (market_line, one_liner, narratives with context, signals with context)
输出: email-safe HTML

约束:
- 纯 <table> 布局
- 浅色主题 (#fff/#f7f7f7)
- 6位 hex 颜色
- font-size >= 13px
- 无 CSS3 属性
- MSO 条件注释
```

---

## Layer 5: 基础设施

### 数据库 Schema

```
── 原始数据层 ──
raw_onchain_metrics, raw_news, raw_filings, raw_stock_data,
raw_product_updates, raw_funding, raw_tweets, raw_regulatory

── 原子事实层 ──
atomic_facts
  content_zh, content_en, fact_type, tags (标准化),
  confidence, verification_status, v1-v5_result,
  embedding vector(1024)  ← V12 新增

── 知识库 ──
reference_events  ← V12: 从 .ts 文件迁移到 DB，自增长
  entity, type, milestones (jsonb), metrics (jsonb),
  tags, embedding vector(1024)

── 知识图谱 ──
entities, fact_entities, entity_relationships,
timelines, timeline_facts

── 叙事层 ──
narrative_threads, narrative_thread_entries

── 分发层 ──
subscriptions, reports, email_logs

── 系统层 ──
weekly_snapshots, pipeline_runs, pipeline_checkpoints
```

### 配置

```
src/config/
├── watchlist.ts              # 关注实体 (23 个)
├── tag-vocabulary.ts         # 标准 tag 词汇表 (从 watchlist 自动生成 + 主题白名单)
├── reference-events.ts       # 初始种子知识库 (20 条, 运行后从 DB 读)
├── twitter-accounts.ts
├── sources.ts
├── prompts/
└── schedule.ts
```

### 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=              # V12 新增: embedding
TWITTERAPI_IO_KEY=
ADMIN_SECRET=                # V12 新增: admin API 鉴权
BRAVE_SEARCH_API_KEY=
SEC_EDGAR_USER_AGENT=
```

### 月成本

| 项目 | 预估 |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free (含 pgvector) | $0 |
| Claude Haiku (pipeline + context) | ~$12-15 |
| Voyage AI (embedding) | ~$1-2 |
| twitterapi.io | $29 |
| RSS + Brave | $0 |
| **合计** | **~$42-46** |

---

## 页面结构

```
src/app/
├── page.tsx                       # redirect → /weekly/{currentWeek}
├── weekly/
│   ├── page.tsx                   # 周报归档列表
│   └── [week]/
│       ├── page.tsx               # 完整版 (server component)
│       └── WeeklyReport.tsx       # 客户端组件 (叙事+信号+全部事实)
├── admin/
│   └── page.tsx                   # 3-tab: 流水线 | 预览邮件 | 订阅者
├── api/
│   ├── admin/reset/route.ts       # POST (需鉴权)
│   ├── cron/
│   │   ├── collect/route.ts       # 数据采集 (需鉴权)
│   │   ├── process/stream/route.ts # AI 处理 (SSE, 需鉴权)
│   │   ├── snapshot/stream/route.ts # 快照生成 (SSE, 需鉴权)
│   │   └── narrative/stream/route.ts
│   ├── reports/route.ts
│   ├── subscribe/route.ts
│   └── subscribers/route.ts
└── unsubscribe/page.tsx
```

### 设计系统

```
字号 (4 级，间距 ≥ 2px):
  xs: 11px    # 标签、时间戳、辅助信息
  sm: 13px    # 正文、按钮、列表项
  base: 15px  # 标题、强调
  lg: 18px    # 页面标题

语义颜色:
  蓝 #3b82f6  = 叙事追踪 (持续性事件)
  绿 #16a34a  = 上下文/数据 (事实性内容)
  灰阶       = 文本层级 (--fg-title, --fg-secondary, --fg-muted)

导航:
  TopBar: Logo [StablePulse] ──────── [Admin] [Theme]
  MobileNav: [周报] [历史] [管理]
```

---

## 实施路线 (V12)

```
Phase 0: 基础设施
  0A. Supabase: enable pgvector, add embedding columns
  0B. src/config/tag-vocabulary.ts: 标准 tag 词汇表
  0C. Admin API 鉴权 (x-admin-token)

Phase 1: 数据质量
  1A. B1 prompt: 加标准 tag 列表
  1B. normalizeTags(): 存入前标准化
  1C. 叙事 last_week: 从 narrative_thread_entries 读取注入

Phase 2: Context Engine 重建
  2A. Voyage AI embedding 集成 + 批量生成
  2B. Supabase match_facts RPC
  2C. reference_events → DB 表 + embedding
  2D. context-engine.ts 重写: 向量检索 + 结构化输出 + 模板组装
  2E. Self-growing: pipeline 后自动入库
  2F. 对抗性校验 (二次 Haiku)

Phase 3: 邮件重写
  3A. 纯 table + 浅色 + Outlook 兼容

Phase 4: 前端
  4A. Design token (字号/颜色)
  4B. Admin 3-tab + pipeline bug 修复
  4C. WeeklyReport 组件 (搜索防抖, 语义化样式)
```
