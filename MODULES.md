# MECE 模块划分 & 边界定义 V5

> 产品: StablePulse — 稳定币行业原子化知识引擎
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
│A2 新闻    │ ─── 验证层 ⭐ ───      │  档案     │  (6页)   │E2 TG │F2 配置    │
│  (多源)   │ V0 裁决器 (纯代码)     │C2 时间线   │D2 API   │E3 调度│F3 认证    │
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

> **V5 变更**: V6 时间线归属验证员尚未实现，暂不在流水线中。
> **B5 变更**: 翻译Agent已从流水线移除。B1直接输出中文，系统仅保留中文输出。
> **V6 精简**: 展示层从15+页面精简到6页面。D4 AI对话、D5 分享已移除。
> **C层精简**: C4赛道视图、C5监管追踪、C6盲区探测、C7 Diff、C8密度统计 — 后端模块保留但不再有独立前端页面。监管内容融入周报摘要，矛盾检测信息保留在FactCard内。

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
| **采集内容** | 标题、摘要、全文(强关键词命中时)、来源名、source_url、发布时间 |
| **频率** | 每周 |
| **关键词双层过滤** | ⭐ 减少无关内容进入系统的核心机制 |
| | **强关键词**(直接通过): stablecoin, usdc, usdt, pyusd, circle, tether, ethena, makerdao, cbdc, genius act 等 |
| | **弱关键词**(需配合上下文): visa, jpmorgan, coinbase, sec, stripe 等 + 必须同时出现 crypto/payment/blockchain 等上下文词 |
| **全文抓取分层** | ⭐ 强关键词命中 → 抓取全文(信息量充分); 弱关键词命中 → 仅用 title+summary(省带宽+token) |
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
| **采集方式** | [twitterapi.io](https://twitterapi.io/twitter-stream) — 通过API注册监控账号 (`POST /oapi/x_user_stream/add_user_to_monitor_tweet`)，WebSocket实时接收推文 |
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
| | **强关键词**(直接通过): stablecoin, usdc, usdt, pyusd, circle, tether, paxos, cbdc, genius act, mica, money transmission, e-money |
| | **弱关键词**(需配合上下文): digital asset, crypto, virtual currency, payment, defi, blockchain + 必须同时出现 stablecoin/payment system/remittance/settlement 等上下文词 |
| **输出表** | `raw_regulatory` |
| **接口** | `collectRegulatory(): Promise<CollectorResult>` |
| **目录** | `src/modules/collectors/regulatory/` |

---

## Module B: AI原子化 + 验证层

> **职责**: 将原始数据拆解为原子事实，经过多维度独立验证后，再进行实体识别、时间线归并、矛盾检测、翻译
> **边界**: 读取raw_*表，写入atomic_facts表和知识图谱表
> **核心原则**:
> - AI零主观——只做结构化操作，不输出任何观点
> - 每个原子事实必须附带source_url，可追溯验证
> - 多维度独立验证，投票制裁决，少数服从多数
> - 提取和验证完全分离

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

> **B5 翻译已移除**: B1 直接输出中文。系统仅保留 `content_zh`，不翻译英文。
> **V6 时间线归属验证**: 设计中，尚未实现。未来可作为B3后的独立验证。

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
- 范围限制: 只提取稳定币行业相关事实
  覆盖: 稳定币发行、B2B基础设施、B2C支付、上市公司动态、监管、DeFi稳定币部分、传统金融布局
  排除: BTC价格、NFT、GameFi、Meme、与稳定币无关的一般加密新闻
- 宁缺毋滥: 无依据不提取，整篇无关则返回空数组 []
- fact_type: event | metric | quote | relationship | status_change
- 每条事实必须附带 evidence_sentence (原文引用)
```

#### Prompt 2: 反向自查

```
你是一个严格的事实审查员。以下是从一篇文章中提取的事实列表。
请逐条检查每个事实是否在原文中有明确依据。

对于每个事实，判断:
- ✅ SUPPORTED: 原文中有明确对应内容
- ⚠️ PARTIAL: 部分有依据，部分是推测
- ❌ UNSUPPORTED: 原文中找不到依据

原文:
{source_text}

提取的事实:
{facts_from_prompt1}
```

#### 过滤逻辑 (纯代码)
- ✅ SUPPORTED → 保留，进入验证层
- ⚠️ PARTIAL → 保留但降低初始置信度
- ❌ UNSUPPORTED → 丢弃，不进入系统

| **输出表** | `atomic_facts` (status: `pending_verification`) |
| **目录** | `src/modules/ai-agents/fact-splitter/` |

---

### 验证层 (V0-V6) ⭐

#### V0 裁决器

| 字段 | 说明 |
|---|---|
| **实现** | **纯TypeScript代码**，不用AI |
| **输入** | V1-V5的全部验证结果 |
| **输出** | 最终 `confidence` 和 `verification_status` |
| **目录** | `src/modules/ai-agents/validators/adjudicator.ts` |

**裁决规则**:

```typescript
function adjudicate(v1: V1Result, v2: V2Result, v3: V3Result, v4: V4Result, v5: V5Result): Verdict {

  // 硬性否决 — 任一条件触发则rejected
  if (v1.status === 'no_match') return { status: 'rejected', reason: '来源原文中无依据' }
  if (v3.sanity === 'likely_error') return { status: 'rejected', reason: '数值明显错误' }
  if (v4.anchor_status === 'mismatch') return { status: 'rejected', reason: '与链上实际数据严重不符' }
  if (v2.cross_validation === 'inconsistent' && v2.is_minority) return { status: 'rejected', reason: '多来源中处于少数方' }

  // 高置信度 — 必须有独立信息源的交叉验证
  if (v1.status === 'matched'
      && v2.source_count >= 2
      && v2.independent_sources === true     // ⭐ 信息源必须独立
      && v2.cross_validation === 'consistent'
      && v3.sanity === 'normal'
      && v5.temporal_status === 'consistent') {
    return { status: 'verified', confidence: 'high' }
  }

  // 中置信度 — 来源已验证但无独立交叉验证
  if (v1.status === 'matched'
      && v3.sanity === 'normal') {
    return { status: 'verified', confidence: 'medium' }
  }

  // 低置信度
  return { status: 'partially_verified', confidence: 'low' }
}
```

> **关键**: 高置信度必须同时满足 `independent_sources === true`。即使有多个来源，如果它们实质上是同一信息源（转载/引用同一原始报道），也只能得到中置信度。

#### V1 来源回溯验证员

| 字段 | 说明 |
|---|---|
| **实现** | Fetch + Claude Haiku |
| **输入** | 候选原子事实 + source_url |
| **过程** | 1. Fetch source_url内容 (用 `@mozilla/readability` 提取正文) 2. AI判断事实与原文是否匹配 |
| **目录** | `src/modules/ai-agents/validators/source-traceback.ts` |

**Prompt**:
```
你是事实核查员。判断以下事实是否在原文中有明确依据。

事实: {fact.content}
原文: {fetched_article_text}

回答JSON:
{
  status: "matched" | "partial" | "no_match",
  evidence_quote: "原文中支持该事实的具体段落（原文引用）",
  match_score: 0-100
}

如果原文中找不到任何支持该事实的内容，status必须为"no_match"。
```

**输出**: `{ status, evidence_quote, match_score }`

**边界情况**:
- source_url 404/付费墙 → `status: 'source_unavailable'`，不否定也不确认
- 原文太长(>10000字) → 截断到与事实最相关的段落再比对

#### V2 多来源交叉验证员

| 字段 | 说明 |
|---|---|
| **实现** | 纯代码(metric+信息源独立性) + Claude Haiku(event) |
| **输入** | 同一事件的多个候选原子事实 (来自不同collector) |
| **核心原则** | **交叉验证只有在信息源相互独立时才有意义**。每条事实的source_url必须精确到具体页面URL |
| **目录** | `src/modules/ai-agents/validators/cross-source.ts` |

**过程**:

```
Step 0 (纯代码，强制执行): 验证信息源独立性 ⭐
  对每组事实，检查source_url:
  - source_url完全相同 → 同源，不算交叉验证
  - source_url域名相同但路径不同 → 可能独立，标记待确认
  - source_url域名不同 → 初步判定独立
  - 对event类型: AI额外检查内容是否大段重复(转载检测)
  - 输出: independent_sources: true/false, source_urls[]

  不独立的情况:
  - 同一篇文章拆出的多条事实 → 同源
  - A媒体全文转载B媒体 → 实质同源
  - 都引用同一官方声明 → partially_independent

Step 1 (纯代码): 找到描述同一事件的事实组
  - 匹配规则: 同一entity + 同一周 + 标题相似度>0.7 或 tags重叠>50%
  - 额外约束: 每组中的事实source_url必须来自不同原始信息源
  - 输出: fact_groups[] (每组是关于同一事件的多条独立来源事实)

Step 2 (分类处理):
  metric类型 → 纯代码比数值:
    前提: 确认source_url不同且独立
    同一metric_name的不同来源的metric_value
    差异<5% → consistent
    差异5-20% → deviation (可能口径不同)
    差异>20% → inconsistent

  event类型 → AI判断 (prompt中包含每条事实的精确source_url):
    "以下N条描述来自N个独立信息源（URL已列出）。
     先确认这些来源是否真正独立（非转载/非引用同一原始报道）。
     然后判断核心事实是否一致。"

Step 3 (投票):
  ≥2个独立来源一致 → 多数方标记 consistent
  只有1个独立来源 → 标记 single_source (不否定，但置信度不升)
  不一致 → 少数方标记 is_minority=true
  信息源不独立 → 不算交叉验证，标记 independent_sources=false
```

**输出**: `{ source_count, consistent_count, cross_validation, is_minority, independent_sources, source_urls[], source_independence_note }`

#### V3 数值合理性验证员

| 字段 | 说明 |
|---|---|
| **实现** | **纯TypeScript代码**，不用AI |
| **输入** | metric类型的原子事实 |
| **目录** | `src/modules/ai-agents/validators/numerical-sanity.ts` |

**规则引擎** (配置在 `config/numerical-ranges.ts`):

```typescript
const SANITY_RULES = {
  // 稳定币市值范围
  'market_cap_usdt': { min: 50e9, max: 200e9 },
  'market_cap_usdc': { min: 10e9, max: 100e9 },
  'market_cap_*':    { min: 0, max: 50e9 },

  // 交易量
  'weekly_volume_*': { min: 0, max: 500e9 },

  // 融资金额
  'funding_seed':    { min: 0, max: 50e6 },
  'funding_series_a': { min: 0, max: 200e6 },

  // 百分比
  'percentage_*':    { min: 0, max: 100 },

  // 周变化
  'weekly_change_*': { anomaly_threshold: 50 }, // >50%标记异常
}
```

**还会与历史数据对比**:
- 查 `raw_onchain_metrics` 中该metric的最近值
- 偏差>30% → anomaly (异常但未必错)
- 偏差>10x → likely_error (量级错误，如$52B写成$520B)

**输出**: `{ sanity: 'normal' | 'anomaly' | 'likely_error', reason, historical_reference? }`

#### V4 链上数据锚定验证员

| 字段 | 说明 |
|---|---|
| **实现** | **纯TypeScript代码**，不用AI |
| **输入** | 声称链上数据的原子事实 + `raw_onchain_metrics` 中的实际数据 |
| **适用范围** | 只有metric类型且涉及链上可验证数据的事实 (市值、TVL、交易量、链分布等) |
| **目录** | `src/modules/ai-agents/validators/onchain-anchor.ts` |

**过程**:
```
1. 从atomic_fact中识别metric_name (如 'usdc_market_cap')
2. 在raw_onchain_metrics中查对应日期±1天的实际值
3. 比对:
   差异<5%  → anchored (确认)
   差异5-20% → deviation (可能时间差/口径差)
   差异>20% → mismatch (不匹配)
   查不到   → no_anchor_data (无法验证，不否定)
```

**输出**: `{ anchor_status: 'anchored' | 'deviation' | 'mismatch' | 'no_anchor_data', claimed_value, actual_value, deviation_pct }`

#### V5 时序一致性验证员

| 字段 | 说明 |
|---|---|
| **实现** | 纯代码规则 + Claude Haiku(复杂情况) |
| **输入** | 原子事实 + 该实体的已有时间线 |
| **目录** | `src/modules/ai-agents/validators/temporal-consistency.ts` |

**过程**:
```
Step 1 (纯代码):
  - 事实日期不能是未来日期
  - 事实日期不能早于实体创建日期
  - 同一事件的事实日期应在合理范围内 (±7天)

Step 2 (AI辅助，仅在有时间线冲突时调用):
  "以下是实体X的时间线和一条新事实。
   新事实: {fact}
   已有时间线: {timeline_events}
   新事实与时间线有无逻辑矛盾?
   例如: 时间线显示'S-1已提交'但新事实说'尚未提交S-1'
   回答: consistent / conflict + 说明"
```

**输出**: `{ temporal_status: 'consistent' | 'conflict' | 'unchecked', conflict_detail? }`

#### V6 时间线归属验证员

| 字段 | 说明 |
|---|---|
| **实现** | Claude Haiku |
| **输入** | B3的归属建议 (事实X → 时间线Y) + 时间线Y的定义和已有节点 |
| **目录** | `src/modules/ai-agents/validators/timeline-attribution.ts` |

**Prompt**:
```
你是一个时间线归属审查员。

时间线: {timeline.name}
时间线描述: {timeline.description}
已有节点:
{timeline_events}

B3建议将以下事实归入此时间线:
事实: {fact.content}
日期: {fact.fact_date}

判断: 这个事实是否确实属于此时间线?
回答JSON:
{
  confirmed: true/false,
  confidence: 0-100,
  reason: "归属理由或拒绝理由"
}
```

**与B3的关系**: B3做初步归属，V6做独立验证。二者一致→确认；不一致→标记 `attribution_uncertain`，前端显示为待确认。

---

### B2 实体识别Agent

| 字段 | 说明 |
|---|---|
| **模型** | Claude Haiku 4.5 |
| **输入** | verified/partially_verified 的原子事实 |
| **职责** | 识别事实涉及的实体，匹配已有entities表（含aliases），未匹配则创建新实体 |
| **输出** | 更新 `fact_entities`, `entities`, `entity_relationships` |
| **目录** | `src/modules/ai-agents/entity-resolver/` |

### B3 时间线归并Agent

| 字段 | 说明 |
|---|---|
| **模型** | Claude Haiku 4.5 |
| **输入** | verified原子事实 + 已有timelines表 |
| **职责** | 判断新事实是否属于已有时间线，或需要创建新时间线 |
| **输出** | 归属建议 → 交给V6验证确认 |
| **目录** | `src/modules/ai-agents/timeline-merger/` |

### B4 矛盾检测Agent

| 字段 | 说明 |
|---|---|
| **实现** | 纯代码(数值矛盾) + Claude Haiku(文本矛盾) |
| **输入** | verified原子事实 + 已有同实体/同metric的事实 |
| **数值矛盾** | 纯代码: 同一entity同一metric_name，不同source的value差异超阈值 |
| **文本矛盾** | AI: 两条事实描述同一件事但内容不一致 |
| **输出** | `fact_contradictions` 表: `{ fact_id_a, fact_id_b, type, difference_description, status }` |
| **关键** | difference_description只描述差异，不判断谁对 |
| **目录** | `src/modules/ai-agents/contradiction-detector/` |

### ~~B5 翻译Agent~~ (已移除)

> **已从流水线移除**。B1 直接输出中文 (`content_zh`)，系统仅保留中文输出，不再需要翻译步骤。
> 代码文件保留在 `src/modules/ai-agents/translator/` 以备将来需要双语时重新启用。

### B6 编排Agent (Orchestrator)

| 字段 | 说明 |
|---|---|
| **实现** | 纯TypeScript代码 + SSE 流式进度汇报 |
| **职责** | 协调完整pipeline: B1 → V1-V5(并行)+V0裁决 → B2 → B3 → B4 |
| **错误处理** | 某验证员失败时标记该维度为unchecked，不阻塞流程 |
| **超时** | maxDuration=600s，AI 单次请求超时 60s，3次重试 |
| **批处理** | B1: 5条并发/批; V1-V5: 20条/批; B5已移除 |
| **目录** | `src/app/api/cron/process/stream/route.ts` (SSE端点) |
| | `src/modules/ai-agents/orchestrator/` (旧编排器) |

---

### 置信度体系

```typescript
// 每个原子事实的验证信息
interface FactVerification {
  // V0裁决结果
  verification_status: 'verified' | 'partially_verified' | 'rejected'
  confidence: 'high' | 'medium' | 'low'
  confidence_reasons: string[]
  // 例: ["multi_source_verified", "onchain_anchored", "source_matched"]
  // 或: ["single_source", "source_unavailable"]

  // 各验证员结果
  v1_source_traceback: { status, evidence_quote, match_score }
  v2_cross_source: { source_count, consistent_count, cross_validation }
  v3_numerical_sanity: { sanity, reason }
  v4_onchain_anchor: { anchor_status, deviation_pct }
  v5_temporal: { temporal_status }

  // 时间线归属 (如适用)
  v6_timeline_attribution?: { confirmed, confidence }
}

// 前端显示
// 🟢 高置信 — 多来源验证 + 来源匹配 + 数据锚定
// 🔵 中置信 — 单来源但来源已验证 + 数值合理
// 🟡 低置信 — 来源不可用或仅部分验证
// (rejected的事实不显示)
```

---

### AI调用成本估算

```
每篇原始数据的处理成本 (Haiku 4.5):
  B1 事实拆解 (2次prompt):                ~$0.005
  V1 来源回溯 (~5事实/篇):                ~$0.010
  V2 多来源交叉 (event类型比对):           ~$0.003
  V3 数值合理性:                          $0 (纯代码)
  V4 链上锚定:                            $0 (纯代码)
  V5 时序一致性 (仅冲突时调AI):            ~$0.001
  B2 实体识别:                            ~$0.003
  B3 时间线归并:                          ~$0.003
  B4 矛盾检测 (条件性AI):                 ~$0.002
  ─────────────────────────────────────
  每篇总成本:                             ~$0.027

  优化后每周原始数据量 (双层过滤):          ~50-80篇 (之前~200篇)
  每周AI成本:                             ~$1.5-2
  月成本(AI部分):                         ~$6-8
```

> **优化效果**: 双层关键词过滤使原始数据量减少 60-75%，去掉 B5 翻译再省 ~15%，
> 弱关键词命中跳过全文抓取进一步减少 B1 的 token 消耗。

---

## Module C: 知识引擎层

> **职责**: 在verified原子事实之上提供知识结构和分析计算
> **边界**: 提供查询和计算能力，被D层和E层调用
> **注意**: C4-C8 后端模块代码保留，但不再有独立前端页面。监管内容融入周报摘要，矛盾信息保留在FactCard展开详情中。

### C1 实体档案管理
| 字段 | 说明 |
|---|---|
| **功能** | CRUD实体档案，按实体查所有verified原子事实 |
| **前端** | `/entities` 页面 + `/entities/[id]` 详情页 |
| **接口** | `getEntityProfile(id)`, `getEntityFacts(id, filters)`, `listEntities(filters)` |
| **目录** | `src/modules/knowledge/entities/` |

### C2 事件时间线管理
| 字段 | 说明 |
|---|---|
| **功能** | CRUD时间线，每节点关联verified原子事实 |
| **前端** | `/narratives` 页面（叙事时间线，CSS垂直时间线渲染，不再使用ReactFlow） |
| **接口** | `getTimeline(id)`, `listTimelines(filters)`, `getEntityTimelines(entityId)` |
| **目录** | `src/modules/knowledge/timelines/` |

### C3 关系图谱管理
| 字段 | 说明 |
|---|---|
| **功能** | 维护实体间关系，查询图谱 |
| **前端** | 无独立页面，关联信息在实体详情页展示 |
| **关系类型** | 投资、合作、竞争、依赖、收购、发行 |
| **接口** | `getEntityGraph(id, depth)`, `getFullGraph()` |
| **目录** | `src/modules/knowledge/graph/` |

### C4-C8 (后端保留，无独立前端)

| 模块 | 功能 | 前端归属 |
|---|---|---|
| **C4 赛道视图** | 按赛道组织原子事实 | 数据用于周报摘要生成 |
| **C5 监管追踪** | 按地区组织监管事实 | 监管内容融入周报 Top 10 |
| **C6 盲区探测** | 检测实体覆盖盲区 | 无前端（内部质量工具） |
| **C7 Diff生成** | 对比两周变化 | Diff内容融入周报摘要 |
| **C8 密度统计** | 事实密度异常检测 | 无前端（内部质量工具） |

---

## Module D: 展示层

> **职责**: Web界面和API，展示知识引擎，支持用户交互
> **边界**: 从C层查询数据，用户操作写入协作表
> **V6 精简**: 从15+页面精简到6页面。移除: AI对话、分享链接、独立搜索页、关系图谱页、Twitter页、Diff页、密度页、盲区页、矛盾页、监管页。搜索功能改为TopBar全局搜索框。

### D1 Web前端

| 字段 | 说明 |
|---|---|
| **框架** | Next.js 15 App Router + Tailwind + shadcn/ui |
| **目录** | `src/app/` |

#### 页面结构 (6页面)
```
src/app/
├── page.tsx                       # 周报首页 (聚合视图/时间线视图 + 周报摘要)
├── entities/
│   ├── page.tsx                   # 实体列表 (watchlist兜底)
│   └── [id]/page.tsx              # 实体档案
├── notes/page.tsx                 # 团队笔记
├── narratives/page.tsx            # 叙事时间线 (CSS垂直时间线)
├── snapshots/
│   ├── page.tsx                   # 历史周报归档
│   └── [id]/page.tsx              # 重定向到 /?week=...
├── settings/page.tsx              # 设置 (采集/AI处理/周报生成触发)
└── api/                           # API Routes
```

#### 导航结构 (TopBar, 3组6项)
```
浏览:     周报(/) | 实体(/entities) | 笔记(/notes)
分析:     叙事时间线(/narratives)
系统:     历史周报(/snapshots) | 设置(/settings)
+ TopBar右侧全局搜索框 (替代原/search独立页面)
```

#### 周报摘要 (WeeklySummary组件)
- **简略版**: Top 10 稳定币行业要闻，编号列表
- **详细版**: 可展开，每条含 Background / What happened / Insight + 原文链接 + tags
- **存储**: `weekly_snapshots.snapshot_data` 中 `weekly_summary` (简文本) + `weekly_summary_detailed` (JSON)
- **聚焦**: 稳定币B2C/B2B基础设施、美国上市公司动态、监管、融资
- **格式**: 英文输出，无markdown，无地域偏向

**原子事实卡片展示**:
- 置信度标记(🟢🔵🟡) + 来源链接 + 验证详情(可展开)
- match_score=0 显示"原文不可达"而非"原文0%"
- 按fact_type显示不同颜色条和图标

### D2 API层

```
# 原子事实查询
GET  /api/facts?tags=...&entities=...&type=...&confidence=high,medium&week=...
GET  /api/facts/search?q=...                # TopBar全局搜索使用
GET  /api/facts/:id
GET  /api/facts/:id/verification            # 查看该事实的完整验证详情
GET  /api/facts/summarize                   # AI摘要生成

# 两视图 (矩阵视图已移除)
GET  /api/feed?view=aggregate|timeline&week=...

# 知识结构
GET  /api/entities
GET  /api/entities/:id
GET  /api/entities/:id/facts?week=...&type=...

# 叙事时间线
GET  /api/narratives/search?q=...           # 叙事搜索

# 团队协作
POST /api/notes
GET  /api/notes
POST /api/comments
GET  /api/comments

# 管理
POST /api/trigger/collect
POST /api/trigger/process
POST /api/trigger/snapshot
GET  /api/health
GET  /api/pipeline/stats                    # 验证层统计
```

> **已移除的API**: `/api/chat`, `/api/diff`, `/api/share`, `/api/bookmarks`, `/api/questions`,
> `/api/blind-spots`, `/api/contradictions`, `/api/density`, `/api/graph`, `/api/regulatory`,
> `/api/sectors`, `/api/timelines`, `/api/timeline-generate`, `/api/twitter-voices`

### D3 数据可视化

| 组件 | 说明 |
|---|---|
| 时间线 | CSS垂直时间线 (NarrativeTimeline, 替代原ReactFlow) |
| 聚合视图 | 按实体分组的事实卡片 |
| 时间线视图 | 按日期分组的事实流 |
| 周报摘要 | WeeklySummary组件 (简略/详细切换) |
| **验证详情** | 折叠面板: 展示V1-V6各验证员的具体结果 |
| **目录** | `src/components/` |

> **已移除的可视化**: ReactFlow图谱 (@xyflow/react已移除)、Matrix热力格、CoverageMatrix盲区矩阵、react-force-graph关系图、DensityChart、DiffDisplay

---

## Module E: 分发层

### E1 邮件推送
| 字段 | 说明 |
|---|---|
| **服务** | Resend |
| **内容** | 周报快照: Diff + 密度异常 + 新矛盾 + 盲区变化 + 团队标注 + 验证统计 |
| **目录** | `src/modules/distributors/email/` |

### E2 Telegram Bot
| 字段 | 说明 |
|---|---|
| **库** | grammy |
| **命令** | /latest, /entity [name], /diff, /contradictions |
| **目录** | `src/modules/distributors/telegram/` |

### E3 推送调度器
| 字段 | 说明 |
|---|---|
| **触发** | Vercel Cron 每周一 9:00 AM |
| **目录** | `src/modules/distributors/scheduler/` |

---

## Module F: 基础设施

### F1 数据库Schema

```
目录: src/db/

── 原始数据层 (A层写入) ──
raw_onchain_metrics       # 链上指标每日快照 (DeFiLlama; [ROADMAP] +CoinGecko)
raw_news                  # 新闻 (free-crypto-news + RSS)
raw_filings               # SEC Filing
raw_stock_data            # 股价
raw_product_updates       # 产品更新
raw_funding               # 融资事件 (新闻AI提取为主, DeFiLlama fallback; [ROADMAP] +CryptoRank/RootData 付费)
raw_tweets                # Twitter推文 (twitterapi.io 特定账号流)
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
timeline_facts            # 时间线↔事实 关联 (含v6_result)
sectors                   # 赛道分类
fact_sectors              # 事实↔赛道 关联
regulatory_trackers       # 监管追踪状态

── 质量层 ──
fact_contradictions       # 事实矛盾 (含status: unresolved/resolved/dismissed)
blind_spot_reports        # 盲区报告快照 (每周生成)

── 协作层 ──
users                     # 团队成员
notes                     # 笔记
comments                  # 评论讨论
user_preferences          # 偏好

── 系统层 ──
weekly_snapshots          # 周报快照
pipeline_runs             # 运行日志 (含验证统计: 通过率/拒绝率/各验证员数据)
```

### F2 配置管理

```
目录: src/config/

watchlist.ts              # 关注实体列表
twitter-accounts.ts       # Twitter账号列表 (按角色分类)
sources.ts                # 数据源URL和API Key
sectors.ts                # 赛道分类
regions.ts                # 监管追踪地区
fact-dimensions.ts        # 各实体类型的事实维度模板 (盲区检测用)
numerical-ranges.ts       # 数值合理性范围 (V3用)
prompts/                  # Prompt模板
  fact-splitter-extract.md    # B1 提取prompt (中文输出+稳定币范围限制+自含性要求)
  fact-splitter-verify.md     # B1 反向自查prompt (含不自含陷阱检测)
  source-traceback.md         # V1 来源回溯prompt
  cross-source.md             # V2 多来源交叉prompt (event类型)
  temporal-consistency.md     # V5 时序一致性prompt
  timeline-attribution.md    # V6 时间线归属prompt
  entity-resolver.md          # B2 实体识别prompt
  timeline-merger.md          # B3 时间线归并prompt
  contradiction-detector.md   # B4 矛盾检测prompt
  narrative-timeline.md       # 叙事时间线生成prompt
schedule.ts               # 采集和推送时间表
```

### F3 认证
| 字段 | 说明 |
|---|---|
| **方案** | Supabase Auth (邮箱邀请制) |
| **角色** | Admin, Member |
| **分享** | token-based只读 |

### F4 监控
| 字段 | 说明 |
|---|---|
| **日志** | `pipeline_runs` 含验证统计 |
| **告警** | 失败时Telegram通知 |
| **验证仪表盘** | `/api/pipeline/stats` — 各验证员通过率、拒绝率、平均置信度 |

---

## 完整目录结构

```
payfi-monthly-report/
├── src/
│   ├── app/                            # [D1] Next.js 前端 (6页面)
│   │   ├── page.tsx                    # 周报首页
│   │   ├── FeedClient.tsx              # 聚合/时间线视图切换
│   │   ├── entities/                   # 实体
│   │   ├── notes/                      # 团队笔记
│   │   ├── narratives/                 # 叙事时间线
│   │   ├── snapshots/                  # 历史周报归档
│   │   ├── settings/                   # 设置
│   │   ├── api/                        # API Routes
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── feed/
│   │   │   ├── AggregateView.tsx       # 按实体分组视图
│   │   │   ├── TimelineView.tsx        # 按日期分组视图
│   │   │   └── WeeklySummary.tsx       # ⭐ 周报摘要 (简略/详细切换)
│   │   ├── facts/
│   │   │   ├── FactCard.tsx            # 含置信度标记+来源链接+类型图标
│   │   │   ├── FactList.tsx
│   │   │   ├── FactDetail.tsx
│   │   │   └── VerificationDetail.tsx  # ⭐ V1-V6验证详情展开面板
│   │   ├── entity/
│   │   ├── narrative/
│   │   │   ├── NarrativeTimeline.tsx   # CSS垂直时间线 (替代原ReactFlow)
│   │   │   ├── NarrativeChat.tsx
│   │   │   ├── NarrativeTabBar.tsx
│   │   │   └── HotTopicsList.tsx
│   │   ├── collab/
│   │   │   └── CommentBox.tsx
│   │   └── layout/
│   │       ├── TopBar.tsx              # 含全局搜索框
│   │       └── Sidebar.tsx
│   │
│   ├── modules/
│   │   ├── collectors/                 # [Module A]
│   │   │   ├── on-chain/
│   │   │   ├── news/                   # 多源 RSS (全免费，双层关键词过滤)
│   │   │   ├── companies/
│   │   │   ├── products/
│   │   │   ├── funding/
│   │   │   ├── twitter/
│   │   │   └── regulatory/
│   │   │
│   │   ├── ai-agents/                 # [Module B]
│   │   │   ├── fact-splitter/          # B1 (两次prompt, 中文输出)
│   │   │   ├── validators/             # ⭐ 验证层
│   │   │   │   ├── adjudicator.ts      # V0 裁决器 (纯代码)
│   │   │   │   ├── source-traceback.ts # V1 来源回溯
│   │   │   │   ├── cross-source.ts     # V2 多来源交叉
│   │   │   │   ├── numerical-sanity.ts # V3 数值合理性 (纯代码)
│   │   │   │   ├── onchain-anchor.ts   # V4 链上锚定 (纯代码)
│   │   │   │   ├── temporal-consistency.ts # V5 时序一致性
│   │   │   │   └── timeline-attribution.ts # V6 时间线归属
│   │   │   ├── entity-resolver/        # B2
│   │   │   ├── timeline-merger/        # B3
│   │   │   ├── contradiction-detector/ # B4
│   │   │   └── orchestrator/           # B6
│   │   │
│   │   ├── knowledge/                 # [Module C] (后端保留)
│   │   │   ├── entities/
│   │   │   ├── timelines/
│   │   │   ├── graph/
│   │   │   ├── sectors/
│   │   │   ├── regulatory/
│   │   │   ├── blind-spots/
│   │   │   ├── diff/
│   │   │   └── density/
│   │   │
│   │   ├── distributors/              # [Module E]
│   │   │   ├── email/
│   │   │   ├── telegram/
│   │   │   └── scheduler/
│   │   │
│   │   └── monitoring/                # [F4]
│   │
│   ├── db/
│   │   ├── schema.sql
│   │   ├── migrations/
│   │   └── client.ts
│   │
│   ├── config/
│   │   ├── watchlist.ts
│   │   ├── twitter-accounts.ts
│   │   ├── sources.ts
│   │   ├── sectors.ts
│   │   ├── regions.ts
│   │   ├── fact-dimensions.ts
│   │   ├── numerical-ranges.ts         # ⭐ V3数值范围配置
│   │   ├── schedule.ts
│   │   └── prompts/
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── ai-client.ts
│   │   ├── auth.ts
│   │   └── types.ts
│   │
│   └── emails/
│       └── weekly-snapshot.tsx
│
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.local
├── PRODUCT_DESIGN.md
└── MODULES.md
```

---

## Pipeline 执行顺序

```
每周 Pipeline (手动触发或 Cron):

  ┌─ 数据采集 (并行) ─────────────────────────────────────────────────┐
  │  A1 链上数据 (DeFiLlama)                                         │
  │  A2 新闻 (14个RSS源，双层关键词过滤，强匹配抓全文)                    │
  │  A3 上市公司 (SEC + Yahoo Finance)                                │
  │  A4 产品更新 (Blog RSS + GitHub)                                  │
  │  A5 融资 (DeFiLlama Raises)                                      │
  │  A6 Twitter (特定账号)                                            │
  │  A7 监管 (SEC RSS/EFTS + 地区RSS，双层关键词过滤)                   │
  └──────────────────────────────────────────────────────────────────┘
          │
          ▼
  ┌─ AI 处理流水线 (5个阶段，串行) ─────────────────────────────────────┐
  │                                                                   │
  │  阶段1: B1 事实拆解 (提取+自查，批内5条并发)                         │
  │         输出: candidate_facts (status: pending_verification)       │
  │                                                                   │
  │  阶段2: V1-V5 并行验证 + V0 裁决 (批量20条)                        │
  │         输出: verified / partially_verified / rejected             │
  │                                                                   │
  │  阶段3: B2 实体识别 (串行)                                         │
  │         输出: fact_entities 关联                                   │
  │                                                                   │
  │  阶段4: B3 时间线归并 (串行)                                       │
  │         输出: timelines + timeline_facts                          │
  │                                                                   │
  │  阶段5: B4 矛盾检测 (串行)                                        │
  │         输出: fact_contradictions                                  │
  └──────────────────────────────────────────────────────────────────┘
          │
          ▼
  ┌─ 周报生成 (可选) ─────────────────────────────────────────────────┐
  │  AI生成 Top 10 结构化摘要 (callHaikuJSON)                          │
  │  存储: weekly_summary (简文本) + weekly_summary_detailed (JSON)     │
  │  组装周报快照 → E1 邮件, E2 Telegram 推送                          │
  └──────────────────────────────────────────────────────────────────┘
```

> **频率**: 整个流水线每周运行一次（采集+AI处理一次性完成）。
> **B5 翻译**: 已移除。B1 直接输出中文，不再翻译。
> **V6 时间线归属验证**: 尚未实现，未来可作为 B3 后的第二双眼睛。

---

## 开发分工 (给子Agent)

| Agent | 模块 | 前置 | 说明 |
|---|---|---|---|
| **Agent 0** | F1 + F2 + types.ts | 无 | DB Schema + 配置 + TypeScript类型。**必须先完成** |
| **Agent 1** | A1-A7 | F1 | 7个采集器 (含twitterapi.io/DeFiLlama raises集成) |
| **Agent 2** | B1 + V0-V6 | F1 | ⭐ 事实拆解 + 完整验证层 (最核心) |
| **Agent 3** | B2-B5 + C1-C8 | F1 | 归集Agents + 知识引擎 |
| **Agent 4** | D1-D3 | F1 (可mock) | 前端(6页面) + API + 可视化 + 验证详情面板 |
| **Agent 5** | E1-E3 + B6 | F1 | 分发 + 编排器 |

**Agent 0 先行**，然后 **Agent 1-5 并行**。

---

## 环境变量

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=

# 数据源 (全免费)
DEFILLAMA_API_BASE=https://api.llama.fi
# [ROADMAP] COINGECKO_API_KEY=
# [ROADMAP] CRYPTORANK_API_KEY=
SEC_EDGAR_USER_AGENT=

# Twitter (twitterapi.io — $29/月)
TWITTERAPI_IO_KEY=

# 分发
RESEND_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# 认证
NEXTAUTH_SECRET=

# 搜索 (可选)
# BRAVE_SEARCH_API_KEY=
```

---

## 月成本预估

| 项目 | 预估 |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Claude Haiku (B1+V1-V5+B2-B4+周报摘要) | ~$6-8 |
| twitterapi.io Starter (6账号) | $29 |
| 新闻采集 (RSS) | $0 |
| 融资数据 (新闻提取 + DeFiLlama fallback) | $0 (AI 成本含在 Haiku 内) |
| Resend/其他 | $0 |
| **合计** | **~$35-37** |

> 相比 V4 版本，AI 成本从 ~$24/月降至 ~$6-8/月（-70%），主要因为：
> 1. 双层关键词过滤减少无关数据进入系统
> 2. 移除 B5 翻译阶段
> 3. 弱关键词命中跳过全文抓取，减少 token
> 4. 移除 D4 AI对话 (Sonnet)，节省 ~$5-10/月

---

## 未来方向：付费数据源升级

以下数据源可显著提升融资数据覆盖率和准确性，但需要付费订阅：

| 数据源 | 费用 | 能力 | 优先级 |
|---|---|---|---|
| **CryptoRank API** | 需注册免费 Sandbox 测试；正式版价格待确认 | 10,874 条融资轮次，含金额/轮次/投资方，结构化数据 | P1 |
| **RootData API** | Basic 免费 (1,000 credits/月)；融资接口需 Plus ($128/月) | 9,815 条融资，含估值，投资方详细信息 | P2 |
| **DeFiLlama Raises** | 免费额度已受限 (429)，付费 plan 价格见 defillama.com/subscription | 当前作为 fallback，恢复后可作为补充验证源 | P2 |

> 当前实现：用 AI 从已采集的新闻中提取融资事件（零额外 API 成本），覆盖率取决于新闻源质量。
> 建议：优先注册 CryptoRank Sandbox 测试免费额度是否够用，不够再考虑 RootData Plus。
