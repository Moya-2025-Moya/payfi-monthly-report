# MECE 模块划分 & 边界定义 V10

> 产品: StablePulse — 稳定币行业自动化周报
> 定位: **极致的自动化周报，email-first**。邮件是产品，Web 是邮件的镜像，不是 SaaS 平台。
> 目标用户: **VC 合伙人**（1-5 人内部工具）
> 架构核心: 原子事实是最小信息单位，所有事实必须经过多维度验证
>
> **AI 边界 (V10 核心原则)**:
> AI 输出仅限可验证事实。绝对禁止: 判断、预测、建议、"值得关注"、投资结论、portfolio 假设。
> AI = 事实聚合机器 (Bloomberg Terminal, not research report)
> 允许: 可比数据、时间线、利益相关方映射、量化背景、历史模式、监管状态
>
> **三层渐进式邮件 (V10 核心产品)**:
> Layer 1 (5s): 本周一句话 + 3 headlines
> Layer 2 (30s): 3 narratives (上周/本周/参考数据/时间线)
> Layer 3 (2min): 5 factual signals by category (里程碑/产品/数据)
> Footer: 验证统计一行
>
> **事件类型排序 (非重要性排序)**:
> 里程碑 (首次/突破/监管) > 产品/合作 > 数据变化 — 客观分类，非主观判断

---

## 模块全景图

```
┌───────────────────────────────────────────────────────────────────┐
│                  StablePulse V10 (VC 内部工具)                      │
├──────────┬──────────────────┬───────────┬──────────┬──────────────┤
│ Module A │    Module B      │ Module C  │ Module D │ Module E     │
│ 数据采集  │ AI原子化+验证层   │ 知识引擎   │ 展示层    │ 基础设施     │
├──────────┼──────────────────┼───────────┼──────────┼──────────────┤
│A1 链上    │B1 事实拆解       │C1 实体    │D1 邮件   │E1 DB        │
│A2 新闻    │  ─ 验证层 ─     │  档案     │  (产品)   │E2 配置      │
│  (多源)   │V0-V5 验证       │C2 时间线   │D2 Web   │E3 监控      │
│A3 上市公司│B2 实体识别       │C3 关系    │  (镜像)   │             │
│A4 产品    │B3 时间线归并     │           │D3 Admin │             │
│A5 融资    │B4 矛盾检测       │           │  (3tab) │             │
│A6 Twitter │B6 编排           │           │         │             │
│A7 监管    │                  │           │         │             │
└──────────┴──────────────────┴───────────┴──────────┴──────────────┘

邮件 = 产品。Web = 镜像 + Admin。
AI = 事实聚合，零判断。
```

> **V10 变更摘要** (基于 V9.1，产品重新定位):
>
> **产品重新定位**:
> - 从"SaaS 情报平台"变为"极致自动化周报"，email-first
> - 目标用户从泛 crypto 行业变为 VC 合伙人 (1-5人内部工具)
> - Web 从独立产品变为邮件镜像 (同内容 + 可展开来源)
> - AI 边界硬限制: 零判断、零预测、零 portfolio 假设
>
> **邮件重写 (核心产品变更)**:
> - 从"10新闻+3叙事"改为三层渐进式: 5s/30s/2min
> - 叙事格式: 上周→本周→时间线→参考数据 (无"下周预测"、无"关键问题")
> - 信号按事件类型排序 (milestone > product > data)，非重要性排序
> - 移除紧急度信号 (红/黄/绿)、移除"so what"、移除"终局预判"
> - 验证统计一行 footer: "32条事实 · 100%来源验证 · 14条多源交叉"
>
> **Pipeline 简化**:
> - 从 9步 简化为 5步: 统计→矛盾检测→AI选取(8项)→保存→生成邮件
> - AI 一次性选取+分类+生成上下文 (可比数据、时间线)
> - 移除密度异常检测、实体统计 (不再需要)
>
> **页面大规模删减**:
> - 删除: /entities, /narratives, /search, /admin/editorial, /admin/email-preview, /admin/subscribers
> - 删除: narrative-image PNG 渲染, FeedClient, AggregateView, WeeklySummary, MatrixView, TimelineView
> - 删除: entity/narrative 组件
> - `page.tsx` 从周报阅读页改为 redirect 到 `/weekly/{currentWeek}`
> - Admin 从 5按钮+3子页面 改为 1页面3tab (运行/预览/订阅者)
> - TopBar 从导航栏改为仅 logo + admin 齿轮
>
> **Weekly 页面 = 邮件镜像**:
> - `/weekly/[week]` 展示与邮件相同的内容
> - 可展开来源事实 (邮件无法做到的交互)
> - 验证统计 footer

---

## Module A: 数据采集层

> **职责**: 从多个数据源抓取原始数据，清洗后存入Supabase的raw_*表
> **边界**: 只负责"拿到原始数据并存储"。不做拆解、分析、归集、关联。
> **原则**: 同一类信息尽量多数据源采集，为后续交叉验证提供基础。每条原始数据必须附带source_url。

### A1 链上数据采集器
| 字段 | 说明 |
|---|---|
| **数据源** | DeFiLlama Stablecoins API (`stablecoins.llama.fi`，免费) |
| **采集内容** | 各稳定币市值(market_cap)、总供应量(total_supply)、各链分布(chain_circulating) |
| **匹配方式** | 按名称slug + symbol + aliases 匹配 watchlist 中的 `coin_ids.defillama` |
| **频率** | 每周 |
| **输出表** | `raw_onchain_metrics` |
| **目录** | `src/modules/collectors/on-chain/` |

### A2 新闻媒体采集器 (全免费，多源)
| 字段 | 说明 |
|---|---|
| **数据源** | RSS feeds (免费，14个源) — The Block, CoinDesk, Decrypt, Cointelegraph 等 |
| **关键词双层过滤** | 强关键词(stablecoin/usdc/usdt等直接通过) + 弱关键词(需配合上下文) |
| **全文抓取** | 通过过滤的文章抓全文 |
| **输出表** | `raw_news` |
| **目录** | `src/modules/collectors/news/` |

### A3-A7 (同 V9.1，此处省略重复)

| 采集器 | 数据源 | 输出表 |
|---|---|---|
| A3 上市公司 | SEC EDGAR + Yahoo Finance | `raw_filings`, `raw_stock_data` |
| A4 产品动态 | Blog RSS + GitHub Releases | `raw_product_updates` |
| A5 融资事件 | 新闻AI提取 + DeFiLlama | `raw_funding` |
| A6 Twitter | twitterapi.io | `raw_tweets` |
| A7 监管动态 | SEC.gov RSS + 各地区RSS | `raw_regulatory` |

---

## Module B: AI原子化 + 验证层

> **职责**: 将原始数据拆解为原子事实，经过多维度验证
> **边界**: 读取raw_*表，写入atomic_facts表和知识图谱表
> **AI 边界**: 只做结构化操作，不输出任何观点、判断、预测

### B1 事实拆解Agent ⭐

| 字段 | 说明 |
|---|---|
| **模型** | Claude Haiku 4.5 |
| **Prompt** | `src/config/prompts/fact-splitter-extract.md` |
| **核心规则** | 中文输出 + 稳定币范围限制 + 观点归因 |
| **目录** | `src/modules/ai-agents/fact-splitter/` |

### 验证层 V0-V5 (同 V9.1)

| 验证员 | 实现 | 职责 |
|---|---|---|
| V0 裁决器 | 纯代码 | 汇总投票，计算 confidence |
| V1 来源回溯 | Fetch + Haiku | source_url 匹配 |
| V2 多来源交叉 | 代码 + Haiku | 独立来源一致性 |
| V3 数值合理性 | 纯代码 | 数值量级检查 |
| V4 链上锚定 | 纯代码 | 与 DeFiLlama 对比 |
| V5 时序一致性 | 代码 + Haiku | 时间线矛盾检测 |

### B2-B6

| Agent | 职责 | 目录 |
|---|---|---|
| B2 实体识别 | 匹配/创建实体 | `src/modules/ai-agents/entity-resolver/` |
| B3 时间线归并 | 事实归属时间线 | `src/modules/ai-agents/timeline-merger/` |
| B4 矛盾检测 | 数值+文本矛盾 | `src/modules/ai-agents/contradiction-detector/` |
| B6 编排器 | 协调完整pipeline | `src/app/api/cron/process/stream/route.ts` |

---

## Module C: 知识引擎层

> **职责**: 在verified原子事实之上提供知识结构
> **边界**: 被 D 层调用，不直接面向用户

| 模块 | 功能 |
|---|---|
| C1 实体档案 | CRUD实体档案 |
| C2 时间线 | CRUD时间线 |
| C3 关系图谱 | 维护实体间关系 |

---

## Module D: 展示层 (V10 大幅简化)

> **职责**: D1 邮件是产品，D2 Web 是镜像，D3 Admin 是运营后台
> **V10 核心变化**: 删除 80% Web 页面，Web 只保留邮件镜像 + 归档 + Admin

### D1 邮件模板 ⭐ (核心产品)

| 字段 | 说明 |
|---|---|
| **文件** | `src/lib/email-template.ts` |
| **格式** | 三层渐进式，email-safe inline styles |

```
STABLEPULSE · W11 · 3.10-16

本周一句话:
Circle S-1 修订提交; GENIUS Act 过委员会。

━━ 叙事追踪 ━━

▎Circle IPO [第4周]
│ 上周: 高盛+摩根确认联合承销
│ 本周: S-1 修订版提交，估值区间 $4.5-5.5B
│ 时间线: SEC 反馈窗口 3.17 起
│ 参考: Coinbase S-1→IPO 用时 5 个月 (2020.12-2021.04)

━━ 本周事实 ━━

里程碑:
· Ethena USDe TVL 突破 $5B (历史最大偏离 -0.8%, 2025.04)

产品/合作:
· Fireblocks 新增 USDC 原生铸造 API

数据:
· USDC 市值 $60.2B (+2.1% WoW)

━━━━━━━━━━━━━━━━━━━━━━
32条事实 · 100%来源验证 · 14条多源交叉
[浏览器中查看 →]
```

### D2 Web 前端 (邮件镜像)

| 字段 | 说明 |
|---|---|
| **框架** | Next.js 16 App Router + Tailwind 4 |
| **目录** | `src/app/` |

#### 页面结构 (V10 精简)
```
src/app/
├── page.tsx                       # redirect → /weekly/{currentWeek}
├── weekly/
│   ├── page.tsx                   # 周报归档列表
│   └── [week]/
│       ├── page.tsx               # 邮件镜像 (server component)
│       └── WeeklyMirror.tsx       # 镜像客户端组件 (可展开来源)
├── admin/
│   └── page.tsx                   # 统一 3-tab: 运行周报 | 预览邮件 | 订阅者
└── api/                           # API Routes
```

#### 已删除页面 (V10)
- `/entities` + `/entities/[id]` — 实体页
- `/narratives` — 叙事页
- `/search` — 搜索页
- `/admin/editorial` — 合并入 admin
- `/admin/email-preview` — 合并入 admin
- `/admin/subscribers` — 合并入 admin

#### 导航 (V10 极简)
```
TopBar: Logo [StablePulse] ────────────── [⚙ Admin] [🌙 Theme]
```
> 无导航链接。Logo 点击 → 当前周报。齿轮 → Admin。

#### WeeklyMirror 设计
```
┌─────────────────────────────────────────────┐
│ 稳定币周报                    [← 上周] [本周] │
│ 2026-W11 · 3月10日 - 3月16日                 │
├─────────────────────────────────────────────┤
│ 本周一句话 + 3 headlines                     │
├─────────────────────────────────────────────┤
│ 叙事追踪 (3条)                               │
│ ┌─ Circle IPO ──────────────────────────┐   │
│ │ 上周: ...                              │   │
│ │ 本周: ... (绿色左边框)                  │   │
│ │ 时间线: ...                             │   │
│ │ 参考: ...                               │   │
│ │ [查看 3 条来源事实 →]  ← 可展开          │   │
│ └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ 本周事实 (按类型分组)                         │
│ 里程碑: · ... [来源]                         │
│ 产品/合作: · ... [来源]                      │
│ 数据: · ... [来源]                           │
├─────────────────────────────────────────────┤
│ 32条事实 · 100%来源验证 · 14条多源交叉        │
└─────────────────────────────────────────────┘
```

### D3 Admin (统一 3-tab)

```
┌─────────────────────────────────────────────┐
│ 管理后台                                     │
│ [运行周报] [预览邮件] [订阅者]                  │
├─────────────────────────────────────────────┤
│ Tab 1: 运行周报                              │
│ ┌──────────────────────────────────────┐    │
│ │ 生成本周周报                    [执行]  │    │
│ │ 统计→矛盾检测→AI选取→保存→邮件         │    │
│ └──────────────────────────────────────┘    │
│ [实时日志流]                                 │
├─────────────────────────────────────────────┤
│ Tab 2: 预览邮件                              │
│ [报告列表] | [HTML iframe 预览]               │
├─────────────────────────────────────────────┤
│ Tab 3: 订阅者                                │
│ [添加] + [列表 (活跃/退订切换)]                │
└─────────────────────────────────────────────┘
```

---

### D4 API层

```
# 原子事实
GET  /api/facts?tags=...&week=...
GET  /api/facts/search?q=...
GET  /api/facts/:id
GET  /api/facts/:id/verification

# 知识结构
GET  /api/entities
GET  /api/entities/:id

# 订阅 & 邮件
POST /api/subscribe
GET  /api/reports

# 管理
GET  /api/cron/snapshot/stream         # 周报生成 (SSE, 5步)
GET  /api/cron/process/stream          # AI处理 (SSE)
POST /api/trigger/collect              # 数据采集
GET  /api/health
GET  /api/pipeline/runs
POST /api/dev/reset
```

---

## Module E: 基础设施

### E1 数据库Schema

```
── 原始数据层 (A层) ──
raw_onchain_metrics, raw_news, raw_filings, raw_stock_data,
raw_product_updates, raw_funding, raw_tweets, raw_regulatory

── 原子事实层 (B层) ⭐ ──
atomic_facts  # 主表 (content_zh, verification, confidence, v1-v5_result)

── 知识图谱层 ──
entities, fact_entities, entity_relationships,
timelines, timeline_facts, sectors, fact_sectors

── 叙事层 ──
narrative_threads, narrative_thread_entries, narrative_predictions

── 分发层 ──
subscriptions, reports, email_logs

── 系统层 ──
weekly_snapshots  # 含 weekly_summary_detailed (V10 格式 JSON)
pipeline_runs
pipeline_checkpoints
```

### E2 配置

```
src/config/
├── watchlist.ts              # 关注实体列表
├── twitter-accounts.ts       # Twitter账号
├── sources.ts                # 数据源
├── prompts/                  # Prompt模板
└── schedule.ts               # 采集时间表
```

---

## Pipeline (V10 简化为 5 步)

```
步骤 1: 统计事实 + 置信度分布
步骤 2: 跨周矛盾检测 (4周历史)
步骤 3: AI 选取 8 项 + 生成上下文
         → 3 narratives (topic/上周/本周/时间线/参考数据)
         → 5 signals (by category: milestone/product/data)
         → one_liner + 3 headlines
         → AI 规则: 零判断、零预测、纯事实+可比数据
步骤 4: 保存快照到 weekly_snapshots
步骤 5: 生成邮件 HTML → 写入 reports 表
```

---

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
TWITTERAPI_IO_KEY=
BRAVE_SEARCH_API_KEY=
SEC_EDGAR_USER_AGENT=
```

---

## 月成本预估

| 项目 | 预估 |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Claude Haiku (pipeline) | ~$8-10 |
| twitterapi.io | $29 |
| 新闻/搜索 (RSS+Brave) | $0 |
| **合计** | **~$37-39** |
