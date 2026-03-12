# MECE 模块划分 & 边界定义 V6

> 产品: StablePulse — 稳定币行业原子化知识引擎
> 定位: **双层架构** — 分发层（邮件推送周报触达读者）+ 分析层（网站为分析师提供深挖工具）
> 架构核心: 原子事实是最小信息单位，所有事实必须经过多维度验证
> 每个模块独立开发、独立测试，模块间通过Supabase数据库和TypeScript类型通信

---

## 模块全景图

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              StablePulse 系统                                 │
├──────────┬────────────────────────┬───────────┬──────────┬──────┬────────────┤
│ Module A │      Module B          │ Module C  │ Module D │Mod E │ Module F   │
│ 数据采集  │  AI原子化 + 验证层      │ 知识引擎   │ 展示层    │ 分发  │ 基础设施   │
├──────────┼────────────────────────┼───────────┼──────────┼──────┼────────────┤
│A1 链上    │ B1 事实拆解Agent       │C1 实体    │D1 Web    │E1 邮件│F1 DB      │
│A2 新闻    │ ─── 验证层 ⭐ ───      │  档案     │  (8页)   │E2 调度│F2 配置    │
│  (多源)   │ V0 裁决器 (纯代码)     │C2 时间线   │D2 API   │      │F3 认证    │
│A3 上市公司│ V1 来源回溯验证员      │C3 关系图谱 │D3 可视化 │      │F4 监控    │
│A4 产品    │ V2 多来源交叉验证员    │           │          │      │           │
│A5 融资    │ V3 数值合理性验证员    │           │          │      │           │
│  (免费多源)│ V4 链上锚定验证员      │           │          │      │           │
│A6 Twitter │ V5 时序一致性验证员    │           │          │      │           │
│  (特定账号)│ ─────────────────     │           │          │      │           │
│A7 监管    │ B2 实体识别Agent       │           │          │      │           │
│           │ B3 时间线归并Agent     │           │          │      │           │
│           │ B4 矛盾检测Agent      │           │          │      │           │
│           │ B6 编排Agent          │           │          │      │           │
└──────────┴────────────────────────┴───────────┴──────────┴──────┴────────────┘
```

> **V6 变更摘要**:
> - **产品定位**: 双层架构 — 分发触达 + 网站深挖分析
> - **首页重做**: 仪表盘（市值/事件统计）+ 周报落地页
> - **导航**: 砍掉 Sidebar，TopBar 平铺所有入口
> - **FactCard**: 默认干净（内容+来源+日期），展开后显示验证元数据。去掉左侧颜色条
> - **笔记功能**: 删除
> - **设置拆分**: `/settings`（用户偏好）+ `/admin`（pipeline 操作 + 数据质量）
> - **新增页面**: `/subscribe`（订阅）、`/admin`（管理）
> - **叙事时间线**: 增强（右侧详情面板、预测独立区块、追加主题入口）
> - **实体详情页**: 重做为档案卡 + 指标图表 + 事件流 + AI摘要
> - **字号**: 正文 14px，辅助 12px，最小 11px
> - **CSS变量**: 文字颜色合并为3级（`--fg`/`--fg-secondary`/`--fg-muted`）
> - **日期格式**: 周数改为日期范围（「3月10日 - 3月16日」）
> - **数据可视化**: 仪表盘完整图表 + 周报迷你图 + 实体页详细指标图
> - **搜索**: 结果按实体/事实/叙事分类
> - **中英混排**: prompt 规定 + 前端 pangu.js 兜底
> - **分发**: Subscribe 页面收集邮箱，网站提供周报内容 API，clawdbot 负责发送

---

## Module A: 数据采集层

> **职责**: 从多个数据源抓取原始数据，清洗后存入Supabase的raw_*表
> **边界**: 只负责"拿到原始数据并存储"。不做拆解、分析、归集、关联。
> **原则**: 同一类信息尽量多数据源采集，为后续交叉验证提供基础。每条原始数据必须附带source_url。

### A1 链上数据采集器
| 字段 | 说明 |
|---|---|
| **数据源** | DeFiLlama Stablecoins API (`stablecoins.llama.fi`，免费); [ROADMAP] +CoinGecko 交叉验证 |
| **采集内容** | 各稳定币市值(market_cap)、总供应量(total_supply)、各链分布(chain_circulating) |
| **匹配方式** | 按名称slug + symbol + aliases 匹配 watchlist 中的 `coin_ids.defillama` |
| **频率** | 每周 |
| **输出表** | `raw_onchain_metrics` |
| **关键字段** | `source` ('defillama'), `coin_id`, `coin_symbol`, `metric_name`, `metric_value`, `fetched_at` |
| **接口** | `collectOnChainData(): Promise<CollectorResult>` |
| **目录** | `src/modules/collectors/on-chain/` |

### A2 新闻媒体采集器 (全免费，多源)
| 字段 | 说明 |
|---|---|
| **数据源** | RSS feeds (免费，14个源) — The Block, CoinDesk, Decrypt, Cointelegraph, DLNews, Blockworks, The Defiant, Crypto Briefing, Unchained, CryptoSlate, BeInCrypto, Protos + 2个中文源 |
| **采集内容** | 标题、摘要、全文、来源名、source_url、发布时间 |
| **频率** | 每周 |
| **关键词双层过滤** | ⭐ 减少无关内容进入系统的核心机制 |
| | **强关键词**(直接通过): stablecoin, usdc, usdt, pyusd, circle, tether, ethena, makerdao, cbdc, genius act 等 |
| | **弱关键词**(需配合上下文): visa, jpmorgan, coinbase, sec, stripe 等 + 必须同时出现 crypto/payment/blockchain 等上下文词 |
| **全文抓取** | 所有通过关键词过滤的文章都抓取全文（解决 V1 来源回溯验证"原文不可达"问题） |
| **去重** | 内存去重(source_url) + DB去重(批量查已有URL) |
| **输出表** | `raw_news` |
| **关键字段** | `source_url` (必填), `collector` ('rss'), `title`, `summary`, `full_text`, `published_at`, `language` |
| **接口** | `collectNews(): Promise<CollectorResult>` |
| **目录** | `src/modules/collectors/news/` |

### A3 上市公司数据采集器
| 字段 | 说明 |
|---|---|
| **数据源** | SEC EDGAR API (免费), Yahoo Finance (`yahoo-finance2` npm), 公司IR页面RSS |
| **关注公司** | 配置在 `config/watchlist.ts` |
| **采集内容** | Filing (10-K/10-Q/8-K) 含filing URL, 股价, 持仓变化 |
| **频率** | 每周 |
| **输出表** | `raw_filings`, `raw_stock_data` |
| **关键字段** | `source_url` (SEC filing直链), `filing_type`, `company_cik` |
| **接口** | `collectCompanyData(): Promise<void>` |
| **目录** | `src/modules/collectors/companies/` |

### A4 产品动态采集器
| 字段 | 说明 |
|---|---|
| **数据源** | 产品官方Blog RSS, GitHub Releases API, Changelog页面 |
| **关注产品** | 配置在 `config/watchlist.ts` |
| **采集内容** | 更新标题、描述、source_url、版本号 |
| **频率** | 每周 |
| **输出表** | `raw_product_updates` |
| **接口** | `collectProductUpdates(): Promise<void>` |
| **目录** | `src/modules/collectors/products/` |

### A5 融资事件采集器
| 字段 | 说明 |
|---|---|
| **数据源1 (主)** | 新闻提取 — 从 A2 已采集的新闻中，用 AI (Claude Haiku) 识别融资事件，零额外 API 成本 |
| **数据源2 (备)** | [DeFiLlama /raises](https://api.llama.fi/raises) — best-effort，免费额度已受限(429)，作为补充源 |
| **采集内容** | 项目名、轮次、金额、估值、投资方、赛道、source_url |
| **频率** | 每周 |
| **多源策略** | 新闻提取为主源，DeFiLlama 为 fallback（可能 429），两源结果合并去重后入库 |
| **输出表** | `raw_funding` |
| **关键字段** | `source_url`, `collector` ('news_extraction' &#124; 'defillama_raises'), `amount`, `round`, `investors[]` |
| **接口** | `collectFunding(): Promise<CollectorResult>` |
| **目录** | `src/modules/collectors/funding/` |
| **Prompt** | `src/config/prompts/funding-extract.md` |

### A6 Twitter声音采集器 (twitterapi.io)
| 字段 | 说明 |
|---|---|
| **策略** | **追踪特定账号的新帖子**，不做搜索。账号列表经人工筛选，质量有保障 |
| **关注账号** | 配置在 `config/twitter-accounts.ts`，分4类: VC/投资人, KOL/分析师, 创始人/项目方, 社区用户 |
| **采集方式** | [twitterapi.io](https://twitterapi.io/twitter-stream) — 通过API注册监控账号，WebSocket实时接收推文 |
| **套餐** | Starter $29/月 (6个账号)，额外账号$5/个 |
| **采集内容** | 推文内容、作者、时间、互动量、作者类别、tweet_url |
| **频率** | 实时流式接收，每周汇总处理 |
| **输出表** | `raw_tweets` |
| **关键字段** | `source_url` (tweet链接), `author_handle`, `author_category` ('vc' | 'kol' | 'founder' | 'user') |
| **接口** | `collectTweets(): Promise<void>` |
| **目录** | `src/modules/collectors/twitter/` |

### A7 监管动态采集器
| 字段 | 说明 |
|---|---|
| **数据源** | SEC.gov RSS, SEC EFTS 全文搜索, 各地区监管RSS (配置在 `config/regions.ts`) |
| **采集内容** | 法案进展、监管公告、执法行动、牌照发放, source_url |
| **频率** | 每周 |
| **关键词双层过滤** | ⭐ 与A2相同的双层过滤机制 |
| **输出表** | `raw_regulatory` |
| **接口** | `collectRegulatory(): Promise<CollectorResult>` |
| **目录** | `src/modules/collectors/regulatory/` |

---

## Module B: AI原子化 + 验证层

> **职责**: 将原始数据拆解为原子事实，经过多维度独立验证后，再进行实体识别、时间线归并、矛盾检测
> **边界**: 读取raw_*表，写入atomic_facts表和知识图谱表
> **核心原则**:
> - AI零主观——只做结构化操作，不输出任何观点
> - 每个原子事实必须附带source_url，可追溯验证
> - 多维度独立验证，投票制裁决，少数服从多数
> - 提取和验证完全分离
> - 中文输出，中英文之间加空格，保留专有名词英文

### 完整Pipeline

```
raw_*表 (A层多源采集，双层关键词过滤)
      │
      ▼
══════════════════════════════════════════════════
  阶段 1: 提取
══════════════════════════════════════════════════
      │
┌─────▼──────┐
│ B1 事实     │  两次prompt (中文输出):
│ 拆解Agent  │    Prompt1: 提取候选事实 → content_zh
│            │    Prompt2: 反向自查 (有依据/无依据)
└─────┬──────┘   输出: 候选原子事实[] (状态: pending_verification)
      │          批处理: 5条并发，批间2秒
      ▼
══════════════════════════════════════════════════
  阶段 2: 多维度独立验证 (5个验证员并行)
══════════════════════════════════════════════════
      │
      ├──→ V1 来源回溯验证员     fetch source_url → 事实是否在原文中?
      ├──→ V2 多来源交叉验证员   同一事件不同来源 → 一致吗? 少数服从多数
      ├──→ V3 数值合理性验证员   数字量级/范围合理吗? (纯代码)
      ├──→ V4 链上锚定验证员     声称的链上数据与A1实际数据匹配吗? (纯代码)
      └──→ V5 时序一致性验证员   时间线有无矛盾?
      │
      ▼
┌─────────────┐
│ V0 裁决器    │  纯代码: 汇总V1-V5投票结果
│ (纯代码)     │  计算最终confidence + verification_status
│             │  rejected的事实不进入系统
└─────┬───────┘
      │ 只有 verified/partially_verified 的事实继续
      ▼
══════════════════════════════════════════════════
  阶段 3-5: 归集
══════════════════════════════════════════════════
      │
┌─────▼──────┐
│ B2 实体     │  识别涉及的实体，关联到实体档案
│ 识别Agent  │  (串行处理)
└─────┬──────┘
      │
┌─────▼──────┐
│ B3 时间线   │  判断事实是否属于已有时间线
│ 归并Agent  │  (串行处理)
└─────┬──────┘
      │
┌─────▼──────┐
│ B4 矛盾     │  检测已验证事实之间的矛盾
│ 检测Agent  │  数值矛盾(纯代码) + 文本矛盾(AI)
└─────┬──────┘
      │
      ▼
  atomic_facts表 (status: verified, confidence: high/medium/low, 仅中文)
```

---

### B1 事实拆解Agent ⭐ (提取核心)

| 字段 | 说明 |
|---|---|
| **模型** | Claude Haiku 4.5 |
| **输入** | raw_*表中的新记录 |
| **实现** | 两次prompt流水线 |

#### Prompt 1: 提取 (详见 `src/config/prompts/fact-splitter-extract.md`)

```
核心规则:
- 中文输出: content字段一律用中文，保留专有名词英文 (USDC, SEC, S-1 等)
- 中英文之间加空格 (如 "Circle 于2026年" 而非 "Circle于2026年")
- 范围限制: 只提取稳定币行业相关事实
  覆盖: 稳定币发行、B2B基础设施、B2C支付、上市公司动态、监管、DeFi稳定币部分、传统金融布局
  排除: BTC价格、NFT、GameFi、Meme、与稳定币无关的一般加密新闻
- 宁缺毋滥: 无依据不提取，整篇无关则返回空数组 []
- fact_type: event | metric | quote | relationship | status_change
- 每条事实必须附带 evidence_sentence (原文引用)
```

#### Prompt 2: 反向自查

```
过滤逻辑:
✅ SUPPORTED → 保留，进入验证层
⚠️ PARTIAL → 保留但降低初始置信度
❌ UNSUPPORTED → 丢弃，不进入系统
```

| **输出表** | `atomic_facts` (status: `pending_verification`) |
| **目录** | `src/modules/ai-agents/fact-splitter/` |

---

### 验证层 (V0-V5) ⭐

#### V0 裁决器
| 字段 | 说明 |
|---|---|
| **实现** | **纯TypeScript代码**，不用AI |
| **输入** | V1-V5的全部验证结果 |
| **输出** | 最终 `confidence` 和 `verification_status` |
| **目录** | `src/modules/ai-agents/validators/adjudicator.ts` |

**裁决规则**: 硬性否决（V1 no_match / V3 likely_error / V4 mismatch / V2 minority → rejected）；高置信（需≥2独立来源一致+来源匹配+数值正常+时序一致）；中置信（来源已验证但无独立交叉验证）；其余低置信。

#### V1-V5 验证员

| 验证员 | 实现 | 职责 |
|---|---|---|
| V1 来源回溯 | Fetch + Haiku | source_url 内容是否匹配事实 |
| V2 多来源交叉 | 纯代码 + Haiku | 多独立信息源是否一致 |
| V3 数值合理性 | 纯代码 | 数值量级/范围检查 |
| V4 链上锚定 | 纯代码 | 与 DeFiLlama 实际数据对比 |
| V5 时序一致性 | 纯代码 + Haiku | 时间线逻辑有无矛盾 |

> **V6 时间线归属验证**: 设计中，尚未实现。

---

### B2-B4 + B6

| Agent | 职责 | 目录 |
|---|---|---|
| B2 实体识别 | 匹配entities表(含aliases)，未匹配创建新实体 | `src/modules/ai-agents/entity-resolver/` |
| B3 时间线归并 | 判断事实归属已有时间线或创建新时间线 | `src/modules/ai-agents/timeline-merger/` |
| B4 矛盾检测 | 数值矛盾(纯代码) + 文本矛盾(AI) | `src/modules/ai-agents/contradiction-detector/` |
| B6 编排器 | 协调完整pipeline，SSE流式进度汇报 | `src/app/api/cron/process/stream/route.ts` |

---

### AI调用成本估算

```
每篇原始数据处理成本 (Haiku 4.5):         ~$0.027
优化后每周原始数据量 (双层过滤):           ~50-80篇
每周AI成本:                              ~$1.5-2
月成本(AI部分):                          ~$6-8
```

---

## Module C: 知识引擎层

> **职责**: 在verified原子事实之上提供知识结构和分析计算
> **边界**: 提供查询和计算能力，被D层和E层调用

### C1 实体档案管理
| 字段 | 说明 |
|---|---|
| **功能** | CRUD实体档案，按实体查所有verified原子事实 |
| **前端** | `/entities` 列表页 + `/entities/[id]` 详情页（档案卡+指标图表+事件流+AI摘要+关联实体） |
| **目录** | `src/modules/knowledge/entities/` |

### C2 事件时间线管理
| 字段 | 说明 |
|---|---|
| **功能** | CRUD时间线，每节点关联verified原子事实 |
| **前端** | `/narratives` 页面（预生成 Top 3 叙事时间线 + 追加主题实时生成） |
| **目录** | `src/modules/knowledge/timelines/` |

### C3 关系图谱管理
| 字段 | 说明 |
|---|---|
| **功能** | 维护实体间关系，查询图谱 |
| **前端** | 无独立页面，关联信息在实体详情页展示 |
| **目录** | `src/modules/knowledge/graph/` |

### C4-C8 (后端保留，无独立前端)

| 模块 | 功能 | 归属 |
|---|---|---|
| C4 赛道视图 | 按赛道组织原子事实 | 数据用于周报摘要 |
| C5 监管追踪 | 按地区组织监管事实 | 融入周报 Top 10 |
| C6 盲区探测 | 检测实体覆盖盲区 | `/admin` 数据质量 |
| C7 Diff生成 | 对比两周变化 | 融入周报摘要 |
| C8 密度统计 | 事实密度异常检测 | `/admin` 数据质量 |

---

## Module D: 展示层

> **职责**: Web界面和API，展示知识引擎，支持分析师深挖
> **边界**: 从C层查询数据
> **V6 重做**: 首页重做为仪表盘+周报落地页，导航改为TopBar平铺，FactCard简化，笔记删除，设置拆分

### D1 Web前端

| 字段 | 说明 |
|---|---|
| **框架** | Next.js 16 App Router + Tailwind 4 |
| **目录** | `src/app/` |

#### 页面结构 (8页面)
```
src/app/
├── page.tsx                       # ⭐ 首页: 仪表盘(市值+事件统计) + 周报落地页(Top10+叙事+迷你图)
├── entities/
│   ├── page.tsx                   # 实体列表 (watchlist兜底，搜索/筛选)
│   └── [id]/page.tsx              # ⭐ 实体档案: 档案卡头部 + 指标图表 + 事件流 + AI摘要 + 关联实体
├── narratives/page.tsx            # ⭐ 叙事时间线: 预生成Top3 + 追加主题入口 + 右侧详情面板 + 预测独立区
├── snapshots/
│   ├── page.tsx                   # 历史周报归档
│   └── [id]/page.tsx              # 重定向到 /?week=...
├── subscribe/page.tsx             # 🆕 订阅页: 收集邮箱
├── search/page.tsx                # 搜索结果: 按实体/事实/叙事分类展示
├── settings/page.tsx              # 用户偏好 (主题、语言等)
├── admin/page.tsx                 # 🆕 管理面板: pipeline操作 + 数据质量(盲区+矛盾)
└── api/                           # API Routes
```

#### 导航结构 (TopBar 平铺，无 Sidebar)
```
TopBar 左侧: Logo + 页面入口平铺
  周报(/) | 实体(/entities) | 叙事(/narratives) | 历史(/snapshots) | 订阅(/subscribe)
  (溢出时用下拉分组)

TopBar 右侧: 全局搜索 + 主题切换 + 管理入口(/admin) + 设置(/settings)
```

#### 日期格式
- 周数统一显示为日期范围：「3月10日 - 3月16日」
- 去掉 ISO 周数格式 (2026-W11)

#### 字号体系
- 正文: 14px
- 辅助信息: 12px
- 最小(极次要标签): 11px

#### CSS 变量 (文字颜色3级)
```css
--fg            /* 正文 */
--fg-secondary  /* 次要 */
--fg-muted      /* 最淡 */
```
> 砍掉 `--fg-dim`、`--fg-faint`。`--fg-title`、`--fg-body` 等语义变量保留。

---

### 首页设计 ⭐

```
┌─────────────────────────────────────────────────┐
│  仪表盘 (上半)                                    │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ 左: 市值/链上数据   │  │ 右: 事件统计          │  │
│  │ - 稳定币总市值趋势  │  │ - 本周事实数/按类别分布│  │
│  │ - Top5 份额饼图    │  │ - 高影响力事件数      │  │
│  │ - 各币种周变化率   │  │ - 新增实体数          │  │
│  └──────────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────┤
│  周报落地页 (下半)                                 │
│  - 日期范围导航 (← 3月10日-3月16日 →)              │
│  - WeeklySummary Top 10 (中英双语切换)             │
│  - 本周市值变化迷你图                              │
│  - Top 3 叙事时间线预览 (链接到 /narratives)        │
│  - 聚合视图 / 时间线视图 切换                       │
└─────────────────────────────────────────────────┘
```

### FactCard 设计 ⭐

```
默认态 (干净):
┌──────────────────────────────────────┐
│ 事实内容文字 (14px)                    │
│ 来源域名 · 日期 · fact_type文字标签     │
└──────────────────────────────────────┘

展开态 (点击后):
┌──────────────────────────────────────┐
│ 事实内容文字                          │
│ 来源域名 · 日期 · fact_type文字标签     │
│ ─────────────────────────────────── │
│ 验证详情:                             │
│   V1 来源回溯: matched (85%)          │
│   V2 交叉验证: 2独立源一致             │
│   V4 链上锚定: anchored (偏差2.1%)    │
│ 来源URL列表 (可点击)                   │
│ 标签: [B2B] [Stablecoin] [Stripe]    │
│ 矛盾警告 (如有)                       │
└──────────────────────────────────────┘
```

> 去掉左侧颜色条。验证badges从默认态移到展开态。"原文不可达"警告保留在默认态（信任信号）。

### 叙事时间线设计 ⭐

```
┌─────────────────────────────────────────────────────────────┐
│ [Topic 1] [Topic 2] [Topic 3]  [+ 追加主题]                  │
├───────────────────────────────────┬──────────────────────────┤
│                                   │                          │
│  摘要: ...                        │  (右侧滑出详情面板)         │
│                                   │                          │
│  时间线节点                        │  关联事实列表              │
│  ● 2026.03.08 事件A               │  来源链接                 │
│  ● 2026.03.10 事件B               │  验证详情                 │
│  ◆ 2026.03.11 网络补充C           │                          │
│  ● 2026.03.12 事件D               │                          │
│                                   │                          │
│  ─── 后续关注 ──────────────────  │                          │
│  ◇ 预测节点1                      │                          │
│  ◇ 预测节点2     [设为关注]        │                          │
│                                   │                          │
├───────────────────────────────────┴──────────────────────────┤
│ 图例: ● 事实来源  ◆ 网络补充  ◇ 后续关注                       │
└─────────────────────────────────────────────────────────────┘

节点类型:
- 事实来源: 来自 atomic_facts 数据库
- 网络补充: 来自 Brave+Google 搜索 (含 externalUrl)
- 预测节点: AI 生成的后续关注方向，独立区块，支持「设为关注」标记
  - 被关注的预测在下周生成时自动检查是否已发生，在下周周报中高亮回顾

追加主题入口: 接受等待，实时生成 (fact base + Brave+Google 外部搜索)
```

### 实体详情页设计 ⭐

```
┌─────────────────────────────────────────────────┐
│ 档案卡头部                                        │
│ 实体名 · 类别 · Aliases                           │
│ 背景/主要产品/市场地位 (AI生成或手动维护)            │
│ 官网链接                                          │
├─────────────────────────────────────────────────┤
│ 关键指标图表 (完整折线图，带坐标轴和数值)             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ 市值趋势  │ │ 供应量    │ │ 链分布    │         │
│ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│ 近期事件流 + AI摘要                                │
│ "本周 Circle 主要动态: ..."                       │
│ FactCard列表 (按时间倒序)                          │
├─────────────────────────────────────────────────┤
│ 关联实体                                          │
│ [Coinbase: partner] [Visa: partner] [Tether: competitor] │
└─────────────────────────────────────────────────┘
```

### 中英混排处理
- **Prompt层**: B1 提取和周报摘要 prompt 规定「中英文之间加空格」
- **前端层**: pangu.js 渲染时兜底，自动在中英文交界处插入半角空格

---

### D2 API层

```
# 原子事实查询
GET  /api/facts?tags=...&entities=...&type=...&confidence=high,medium&week=...
GET  /api/facts/search?q=...                # 全局搜索 (返回实体+事实+叙事分类结果)
GET  /api/facts/:id
GET  /api/facts/:id/verification            # 完整验证详情
GET  /api/facts/summarize                   # AI摘要生成

# Feed
GET  /api/feed?view=aggregate|timeline&week=...

# 知识结构
GET  /api/entities
GET  /api/entities/:id
GET  /api/entities/:id/facts?week=...&type=...

# 叙事时间线
GET  /api/narratives/search?q=...           # 追加主题实时生成 (SSE streaming)

# 订阅
POST /api/subscribe                         # 收集订阅邮箱
GET  /api/weekly-report                     # 🆕 周报内容API (供 clawdbot 调用)

# 管理 (通过 /admin 页面调用)
POST /api/trigger/collect                   # → /api/cron/collect/stream (SSE)
GET  /api/cron/process/stream               # AI处理流水线 (SSE)
GET  /api/cron/snapshot/stream              # 周报快照生成 (SSE)
GET  /api/cron/narrative/stream             # 叙事时间线生成 (SSE)
GET  /api/health
GET  /api/pipeline                          # 最新 pipeline run
GET  /api/pipeline/runs                     # pipeline 运行历史
POST /api/dev/reset                         # 开发模式重置
```

### D3 数据可视化

| 位置 | 可视化内容 |
|---|---|
| **仪表盘** | 稳定币总市值趋势折线图、Top 5 份额饼图、各币种周变化率 |
| **周报落地页** | 本周市值变化迷你图 |
| **实体详情页** | 关键指标完整折线图（带坐标轴、数值标签、时间轴） |
| **叙事时间线** | CSS垂直时间线（事实/外部/预测三种节点样式） |

---

## Module E: 分发层

### E1 邮件推送
| 字段 | 说明 |
|---|---|
| **方式** | 网站提供 `/api/weekly-report` 内容 API，clawdbot 负责发送 |
| **内容** | Top 10 摘要 + 关键指标变化 + 叙事亮点，底部「查看完整报告」链接到网站 |
| **订阅** | `/subscribe` 页面收集邮箱 |

### E2 推送调度器
| 字段 | 说明 |
|---|---|
| **触发** | Vercel Cron 每周一 9:00 AM 生成内容，clawdbot 拉取后发送 |

---

## Module F: 基础设施

### F1 数据库Schema

```
目录: src/db/

── 原始数据层 (A层写入) ──
raw_onchain_metrics       # 链上指标每日快照
raw_news                  # 新闻
raw_filings               # SEC Filing
raw_stock_data            # 股价
raw_product_updates       # 产品更新
raw_funding               # 融资事件
raw_tweets                # Twitter推文
raw_regulatory            # 监管公告

── 原子事实层 (B层写入) ⭐ ──
atomic_facts              # 原子事实主表
  # 内容: content_en, content_zh, fact_type, tags[]
  # 指标: metric_name, metric_value, metric_unit, metric_period, metric_change
  # 来源: source_id, source_type, source_url, source_credibility
  # 验证: verification_status, confidence, confidence_reasons[]
  # 验证详情: v1_result, v2_result, v3_result, v4_result, v5_result (JSONB)
  # 时间: fact_date, collected_at, week_number

── 知识图谱层 ──
entities                  # 实体主表 (含aliases[])
fact_entities             # 原子事实↔实体 关联
entity_relationships      # 实体间关系
timelines                 # 时间线主表
timeline_facts            # 时间线↔事实 关联
sectors                   # 赛道分类
fact_sectors              # 事实↔赛道 关联

── 质量层 ──
fact_contradictions       # 事实矛盾
blind_spot_reports        # 盲区报告快照

── 系统层 ──
weekly_snapshots          # 周报快照 (含 narratives, weekly_summary, weekly_summary_detailed)
pipeline_runs             # 运行日志
subscribers               # 🆕 订阅邮箱列表
narrative_predictions     # 🆕 叙事预测追踪 (关注标记 + 下周回顾)
```

### F2 配置管理

```
目录: src/config/

watchlist.ts              # 关注实体列表 (23个实体)
twitter-accounts.ts       # Twitter账号列表
sources.ts                # 数据源URL和API Key
sectors.ts                # 赛道分类
regions.ts                # 监管追踪地区
fact-dimensions.ts        # 各实体类型的事实维度模板
numerical-ranges.ts       # 数值合理性范围 (V3用)
prompts/                  # Prompt模板
schedule.ts               # 采集和推送时间表
```

### F3 认证
| 字段 | 说明 |
|---|---|
| **方案** | Supabase Auth (邮箱邀请制) |
| **角色** | Admin, Member |

### F4 监控
| 字段 | 说明 |
|---|---|
| **日志** | `pipeline_runs` 含验证统计 |
| **告警** | 失败时Telegram通知 |

---

## 实施优先级

### P0 核心体验重塑
1. 首页重做（仪表盘 + 周报落地页）
2. FactCard 简化（默认干净，展开看元数据，去掉颜色条）
3. 导航改为 TopBar 平铺，砍 Sidebar
4. 周数格式改为日期范围
5. 字号提大（14/12/11）
6. CSS 变量合并为3级

### P1 高价值增强
7. 实体详情页重做（档案卡+图表+事件流+AI摘要）
8. 叙事时间线增强（右侧面板、预测独立区、追加入口）
9. 仪表盘数据可视化（市值趋势、份额饼图、周报迷你图）
10. 全局搜索分类结果

### P2 架构整理
11. 设置页拆分（settings + /admin）
12. 砍笔记页
13. 中英混排空格处理
14. Subscribe 页面 + 周报内容 API

### P3 后续迭代
15. 预测节点关注标记 + 下周自动回顾
16. 叙事时间线追加主题入口
17. 实体页关联图谱完善

---

## 环境变量

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=

# 数据源
DEFILLAMA_API_BASE=https://api.llama.fi
SEC_EDGAR_USER_AGENT=

# Twitter (twitterapi.io — $29/月)
TWITTERAPI_IO_KEY=

# 搜索 (叙事时间线外部补充)
BRAVE_SEARCH_API_KEY=
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_CX=

# 分发 (clawdbot 外部处理)
# 邮件由 clawdbot 调用 /api/weekly-report 获取内容后发送

# 认证
NEXTAUTH_SECRET=
```

---

## 月成本预估

| 项目 | 预估 |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Claude Haiku (B1+V1-V5+B2-B4+周报摘要+叙事生成) | ~$8-10 |
| twitterapi.io Starter (6账号) | $29 |
| 新闻采集 (RSS) | $0 |
| Brave Search API | $0 (免费额度) |
| Google Custom Search | $0 (100次/天免费) |
| **合计** | **~$37-39** |
