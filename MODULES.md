# StablePulse V13 — 产品与技术规范

## 产品定义

**一句话**: 自动化的稳定币行业上下文引擎，通过邮件推送给 VC 合伙人。

**核心差异化**: AI 为每条行业事实自动匹配历史可比数据——分析师手动做需要 2 小时的事实关联工作，pipeline 在 30 秒内完成。

**不是什么**: 不是 RSS 阅读器，不是 AI 摘要工具，不是情报 SaaS 平台。上下文引擎是产品的全部意义。如果上下文质量不够好，这个产品就没有存在价值。

**目标用户**: 1 个 VC 合伙人 + 其内部团队（1-5 人）。不做 B2B SaaS，不做公开订阅。

**"前无古人"在哪里**:
1. **Context-first**: 行业里所有 newsletter 都是"新闻 + 分析师观点"。我们是"新闻 + 机器匹配的历史可比数据"。上下文是主角，不是脚注。
2. **Zero-opinion with structural insight**: 不说"值得关注"，而是用位置、篇幅、对比密度来隐性引导注意力。读者比任何分析师更信任自己的判断——我们给他判断的原材料。
3. **Self-growing institutional memory**: 第 1 周 80 条种子参考事件，第 50 周 300+ 条。没有人类分析师能维持这种制度化记忆。每条新事实都让引擎更聪明。
4. **Verification with teeth**: 5 层验证不是噱头——是邮件里每条信息的质量担保。VC 不需要知道 V1-V5 的细节，但他们会感受到"这个东西从来没出过错"。

**语言策略**: 中文为主，专有名词保持英文。
- 叙事标题、正文、信号描述 → 中文
- 实体名、metric、日期、金额 → 英文 (Circle, $60.2B, 2026.03.10)
- 邮件 header/footer → 英文 (品牌调性: 专业、国际化)
- 规则: 不翻译专有名词 (不写"环形公司"而是"Circle"，不写"创世法案"而是"GENIUS Act")

**质量契约**: 每封邮件发送前，operator 在 Admin 预览并确认。邮件页脚标注"AI 生成 · 人工审核"，而非"零人工编辑"。这不是 disclaimer，是质量信号——说明有人对内容负责。

**成功指标**:
- 邮件打开率 > 80% (小样本，1-5 人，应该很高)
- Web CTA 点击率 > 30% (说明邮件内容引发了"想看更多"的欲望)
- VC 口头反馈 (每月一次非正式 check-in)
- 上下文命中率 > 60% (pipeline 内部指标，说明引擎有用)
- 零事实错误 (任何一次错误都会摧毁信任)

**冷启动策略** (前 10 周):
第 1 周知识库有 80 条人工策展的种子事件 + 0 条自动积累的历史事实。上下文命中率预计 40-50%。

关键措施:
1. **种子库 80 条**: 覆盖 2019-2026 的重大事件 (IPO、监管、市值里程碑、崩盘、融资)。这是一次性人工投入，但直接决定前 10 周的产品质量。
2. **诚实呈现**: 没有上下文的事实就不显示上下文块。不填充低质量对比。宁可空白也不凑数。
3. **优先打磨叙事**: 前 10 周，叙事区的上下文可以手动补充 (operator 在 Admin 里编辑 reference_events)。等引擎积累后逐步减少人工干预。
4. **第 10 周评估点**: 到第 10 周时，知识库应有 80 + ~50 = 130 条。如果上下文命中率仍 < 40%，需要重新评估向量检索阈值或种子库覆盖度。

**Breaking news 机制**:
周报是固定节奏，但重大事件 (USDC 脱锚、重大监管行动、市场崩盘) 不能等一周。

方案: **Ad-hoc Alert** (V13.1)
- Operator 手动触发: Admin 里"发送快讯"按钮
- 格式: 单条事实 + 上下文 + "下期周报将详细追踪"
- 频率: 极少 (每季度 0-2 次)，保持稀缺性
- 不自动化——breaking news 的判断必须是人的决策

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

**隐性引导 (允许)**:
- 叙事排序 = 重要性排序（AI 选取时已排序，不额外标注）
- 上下文密度 = 隐含信号（3 条历史对比 vs 1 条 = "这件事有更多历史参照"）
- 位置 = 注意力引导（邮件第一条叙事 = 本周最重要的事）
- 这些都不是"意见"，是信息架构决策

---

## 产品形态：四个表面

**优先级与审查边界**:
- **邮件** 是唯一面向 VC 的产品表面，所有产品评审/优化应以邮件质量为第一优先级
- **Web 阅读版、Console、Admin、Entity 目录** 均为 operator/开发者自用工具，不对 VC 暴露，不作为产品评审重点
- Web 端的 UI 风格、信息密度、功能丰富度均服务于 operator 效率，不需要遵循面向终端用户的设计规范
- 产品评审应聚焦: 邮件质量 > 上下文引擎质量 > Pipeline 可靠性 > 种子知识库准确度

```
┌─────────────────────────────────────────────────────────┐
│                    StablePulse V13                        │
│                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │  邮件     │   │  Web 阅读版   │   │  Console 终端    │ │
│  │  (push)   │──→│  (pull)       │   │  (operator)      │ │
│  │           │   │               │   │                  │ │
│  │ VC 每周读 │   │ 邮件 CTA 落地 │   │ 你的工具         │ │
│  │ 3 叙事    │   │ 全量事实      │   │ Depth/Focus/     │ │
│  │ 5 信号    │   │ 上下文展开    │   │ Entity/TrustSpine│ │
│  │ 上下文=主角│   │ 来源链接      │   │ 数据质量审查     │ │
│  └──────────┘   └──────────────┘   └──────────────────┘ │
│  ▲ 唯一产品面     ▲ operator 自用    ▲ operator 自用     │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Admin 运维后台                  ▲ operator 自用      ││
│  │  流水线 · 邮件预览 · 订阅者                           ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Surface 1: 邮件 = 产品 (push)

每周一封。80% 的产品精力在这里。VC 在手机上花 90 秒读完。

**信息节奏** (从密到疏，像一篇好文章的呼吸):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STABLEPULSE                      2026.03.10 - 03.16
Weekly Stablecoin Intelligence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USDC $60.2B (+2.1%)  ·  USDT $144.1B (+0.8%)

Circle S-1 修订版提交; GENIUS Act 过参议院委员会

──────────────────────────────────────────────────

NARRATIVES                                    ▎3 条

┌─ Circle IPO 进程 ─────────────────── 第4周 ─┐
│                                              │
│  上周  高盛+摩根确认联合承销                 │
│  本周  S-1 修订版提交                        │
│                                              │
│  ┌ 历史对比 ─────────────────────────────┐   │
│  │                                       │   │
│  │  Coinbase IPO                         │   │
│  │  S-1→上市: 118 天 (2020.12→2021.04)   │   │
│  │  上市估值: $85.8B                     │   │
│  │                                       │   │
│  │  Circle 当前                          │   │
│  │  启动→S-1 修订: 25 天                 │   │
│  │  (Coinbase 同阶段: 31 天)             │   │
│  │                                       │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  下周关注  SEC 反馈窗口 3.17 起              │
│                                              │
└──────────────────────────────────────────────┘

┌─ Ethena 增长曲线 ────────────────── 第2周 ─┐
│  ...                                        │
└─────────────────────────────────────────────┘

──────────────────────────────────────────────────

SIGNALS                                       ▎5 条

市场
· Ethena USDe TVL 突破 $5B
  历史对比: DAI 达 $5B 用时 18 个月; USDe 10.5 个月 (-42%)

产品
· Fireblocks 新增 USDC 原生铸造 API
  (无历史对比时，不显示对比块，只保留事实本身)

链上
· USDC 市值 $60.2B (+2.1% WoW)

──────────────────────────────────────────────────

52 条事实 · 47 条已验证 · 14 个数据源
AI 多源交叉验证 · 人工审核 · 零观点

查看完整版 →

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**邮件设计原则**:

1. **"历史对比"块是视觉主角**: 有独立背景色（#f0f7ff 浅蓝灰）、左边框（#3b82f6 蓝色 3px）、等宽字体数字。比事实本身更抢眼。这是我们和所有 newsletter 的根本区别。
2. **信息密度曲线**: 开头密（市值+标题）→ 中段深（叙事+对比）→ 结尾快（信号列表）→ 收尾轻（统计+CTA）。像呼吸。
3. **叙事卡片有边框**: 每个叙事是一个视觉独立的"故事容器"，不是纯文本列表。
4. **"第 N 周" 是唯一的 opinion proxy**: 不说重要，但追踪了 4 周 = 暗示持续性。
5. **Signal 区域紧凑**: 一行事实 + 一行对比 (如有)，不展开。快速扫描。无上下文的 signal 只显示事实本身，不留空位。

**Signal 分类** (固定 5 类，按此顺序显示，空分类不显示):
1. 市场 (market_structure) — 市值变化、TVL、交易量
2. 产品 (product) — 新功能、集成、合作
3. 链上 (onchain_data) — 链上指标、地址活跃度
4. 监管 (regulatory) — 法案、执法行动、牌照
5. 融资 (funding) — 融资轮次、估值

**One-liner 生成规则**:
one_liner 是 AI 生成的自由文本 (1 句话，≤ 40 字)，概括本周最重要的 1-2 件事。
- 输入: 本周全部已验证事实 + 选取的叙事标题
- 约束: 只能包含事实性陈述，不能包含判断词 ("可能""预计""值得")
- 校验: 经过对抗性校验 (二次 Haiku 判断是否含意见)
- 示例: "Circle S-1 修订版提交; GENIUS Act 过参议院委员会" ← 两个事实拼接，无观点
- 失败回退: 如果对抗性校验不通过，用本周事实数 + 叙事数模板: "本周 52 条事实 · 3 条叙事追踪"

**邮件技术约束**:
- 纯 `<table>` 布局，不用 `<div>`, `<p>`
- 浅色背景 (#ffffff body, #f7f7f7 section, #f0f7ff context block)
- 所有颜色 6 位 hex，不用 rgba/hsl
- font-size >= 13px (Gmail 移动端强制放大阈值)
- 不用 border-radius, box-shadow, CSS3 属性
- Outlook MSO 条件注释 fallback
- Context block: `border-left: 3px solid #3b82f6; background: #f0f7ff; padding: 12px 16px`

### Surface 2: Web 阅读版 = 邮件做不到的事 (pull)

邮件末尾 CTA 链接到 `/weekly/[week]`。VC 在手机上点开。

**Web 的存在意义**: 邮件是静态文本。Web 能做邮件做不到的三件事:
1. **展开来源事实**: 每条叙事下面可以展开看 5-10 条原始事实 + 来源链接 (邮件里放不下)
2. **搜索和筛选**: 52 条全量事实可以按实体、类型、日期筛选 (邮件不能交互)
3. **历史对比点击穿透**: 上下文块里的参照事件可以点击，跳转到该事件首次出现的周报 (邮件不能超链接到内部页面)

如果做不到至少 1 件邮件做不到的事，Web 就没有存在价值。

**设计原则: 读，不是用**

这个页面的用户不是"用户"，是"读者"。他们不需要交互，不需要工具，不需要学习任何 UI 概念。他们需要：扫一眼标题 → 看叙事 → 如果感兴趣点开看更多 → 关掉。

```
/weekly/[week]
├── 固定顶栏: StablePulse logo · ← 上周 / 下周 →
├── 头部
│   ├── 市值行 (USDC $60.2B · USDT $144.1B) — 小字等宽
│   └── One-liner 标题 — 大字加粗 (20px)
├── 叙事区 (与邮件同构，但可展开)
│   ├── 叙事卡片 × 3
│   │   ├── 标题 + "第N周" badge (第1周叙事: 无"上周"行，只显示"起点"+"本周")
│   │   ├── 上周 → 本周 (高亮) → 下周关注 (虚线)
│   │   ├── 【历史对比】块 (蓝色左边框，默认可见，醒目)
│   │   │   └── 参照事件名可点击 → 跳转到该事件首次出现的周报
│   │   └── 展开: "查看 N 条来源事实" → 折叠面板 (含原文链接)
│   └── 叙事间距: 24px
├── 信号区
│   ├── 分类标题 (仅显示有内容的分类)
│   └── 每条: 事实 + 内联上下文
├── 分隔线
├── 全部事实 (本周 52 条)
│   ├── 搜索框 (带防抖)
│   ├── 分类筛选 (tag pills，仅显示本周出现的 tag)
│   └── 事实列表 (按日期倒序)
│       ├── 事实内容
│       ├── 【历史对比】块 (如有，默认可见；无则不显示，不留空白)
│       ├── 来源链接 (小字灰色，可点击)
│       └── 置信度标签: ✓ 已验证 / ◐ 部分验证
└── 页脚: 数据源说明 · 方法论 · Console 入口 (小字链接)
```

**边界情况处理**:
- 叙事第 1 周 (无"上周"): 只显示"起点: [origin]" + "本周: [this_week]"，跳过"上周"行
- 信号分类只有 1 条: 正常显示，不隐藏分类标题
- 事实无上下文: 不显示上下文块，不留空白占位。事实之间间距不变。
- 搜索无结果: 显示"未找到匹配的事实"，不显示空列表

**与当前设计的关键差异**:

| 现在 | V13 |
|---|---|
| DepthControl (4级) 在页面顶部 | 删除。阅读版不需要 |
| EntityTags (20个标签) 在叙事上方 | 删除。移到 Console |
| FactPulse (80根柱状图) | 删除。无信息价值 |
| KnowledgeHeartbeat (12周趋势) | 删除。移到 Console |
| TrustSpine (5个彩色圆点) | 替换为简单的 ✓/◐ 标签 |
| NarrativeRiver (水平流式+SVG箭头) | 简化为垂直卡片，文字流 |
| 上下文在 Depth 1 才可见 | **默认可见，蓝色左边框，最醒目** |
| Focus Lens (实体聚焦) | 删除。移到 Console |
| Cmd+K Console | 删除。移到 Console |

**移动端优先**:
- 单列布局，max-width: 680px (阅读最佳宽度)
- 叙事卡片全宽
- 触摸友好的展开/折叠
- 无固定底部导航栏（不需要 MobileNav）
- 底部只有一个小字链接到 Console

**排版**:
```
标题: 20px, font-weight 700, --fg-title
市值行: 13px, font-mono, --fg-muted
叙事标题: 16px, font-weight 600, --fg-title
叙事正文: 14px, --fg-body, line-height 1.6
上下文块: 13px, font-mono (数字部分), --fg-secondary
  背景: var(--context-bg) = #f0f7ff (light) / #1a2332 (dark)
  左边框: 3px solid var(--info) = #3b82f6
信号: 14px, --fg-body
事实列表: 14px, --fg-secondary
来源: 12px, --fg-muted, hover underline
置信度标签: 11px, inline badge
```

### Surface 3: Console = 操作终端 (operator tool)

`/console` — 你自己用的全功能分析终端。不需要对 VC 友好。

```
/console
├── 固定顶栏: StablePulse · Console · [周选择器] · [Cmd+K]
├── 左侧栏 (可折叠, desktop only)
│   ├── 周报导航 (周列表)
│   ├── 实体目录 (分类折叠)
│   └── 数据质量概览
│       ├── 本周采集 → 拆解 → 验证 → 上下文 漏斗
│       ├── 各层通过率
│       └── 上下文匹配率
├── 主区域
│   ├── DepthControl (4级, 键盘 1234)
│   ├── EntityTags + Focus Lens
│   ├── FactPulse 可视化
│   ├── KnowledgeHeartbeat (12周趋势)
│   ├── 叙事 NarrativeRiver (完整版，水平流式)
│   ├── 全部事实 (带 TrustSpine + Evidence Drawer)
│   └── 搜索 + Tag 筛选
├── Console Modal (Cmd+K)
│   ├── depth N
│   ├── focus EntityName
│   └── 自由文本查询
└── FocusOverlay (实体聚焦浮层)
```

**Console 设计原则**:
- 信息密度最大化，不怕复杂
- 暗色模式在这里有意义（长时间使用）
- 所有当前的高级功能都迁移到这里
- 新增：数据质量漏斗、跨周叙事甘特图、实体活跃度热力图

### Surface 4: Admin = 运维后台

保持现有 3-tab 结构，新增数据质量仪表盘:

```
/admin
├── Tab 1: 流水线
│   ├── 5-step pipeline (collect → twitter → process → snapshot → narrative)
│   ├── SSE 日志
│   ├── 测试模式 toggle
│   ├── 取消/停止
│   └── 新增: Pipeline 历史 (最近 10 次运行，耗时、处理量、错误数)
├── Tab 2: 数据质量 (新增)
│   ├── 本周漏斗: 原始数据 → 拆解事实 → 验证通过 → 上下文匹配 → 邮件选取
│   ├── 各层通过率趋势 (最近 8 周)
│   ├── 上下文引擎命中率
│   └── 知识库增长曲线
├── Tab 3: 邮件
│   ├── 预览邮件 (iframe) + "确认并发送" 按钮 (operator review gate)
│   ├── 发送测试邮件 (发给自己)
│   ├── 发送快讯 (ad-hoc alert, 单条事实+上下文, 极少使用)
│   └── 发送历史 (含打开率/点击率，如果邮件服务商支持)
├── Tab 4: 订阅者
│   ├── 添加/管理
│   └── 退订列表
└── 数据重置 (底部，需二次确认)
```

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        StablePulse V13                          │
├───────────┬──────────────┬──────────────┬───────────┬──────────┤
│  Layer 1  │   Layer 2    │   Layer 3    │  Layer 4  │ Layer 5  │
│  采集     │ 原子化+验证   │ 上下文引擎   │  选取+分发 │ 基础设施  │
├───────────┼──────────────┼──────────────┼───────────┼──────────┤
│ RSS (14源) │ B1 事实拆解  │ 向量检索     │ AI 选取   │ Supabase │
│ SEC EDGAR │ V0-V5 验证   │ (pgvector)   │ 模板组装  │ pgvector │
│ DeFiLlama │ B2 实体识别  │ 参考知识库   │ 邮件生成  │ Vercel   │
│ Twitter   │ B3 时间线    │ (DB, 自增长) │ Web 渲染  │ Anthropic│
│ Blog RSS  │ Tag 标准化   │ 结构化输出   │ Console   │ Voyage   │
│           │              │ 对抗性校验   │ Admin     │          │
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
事实 → [Stage 1: 分类] → [Stage 2: 向量检索] → [Gate 1] → [Stage 3: 结构化生成] → [Gate 2] → [Gate 3] → 输出
         规则+embedding     pgvector             候选≥1?     AI填字段→模板组装       schema校验   insight校验
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

### Quality Gate 3: Insight 校验 (V13 新增)

Schema 通过不等于有洞察。以下对比技术上合法但无价值:
- "USDC 市值达 $60B；此前曾达 $50B" → 同一个指标的历史值，不是对比
- "Circle 提交 S-1；Tether 也提交过财务报告" → 不可比事件

Insight Gate 规则:
1. **不能是相邻周的同指标数据**: "USDC 市值 $60B; 上周 $58.8B" 不是历史对比，那只是周度变化 (已经在 metric_change 里了)。合法的同实体对比必须跨越有意义的时间段 (e.g., "USDC $60B; 2023.01 时 $25B → +140%")
2. **delta 必须有意义**: 差异 < 5% 或绝对值变化不显著 → 丢弃
3. **参照事件必须有结局**: "Coinbase S-1→上市 118 天"有结局 (上市了)；"XX 公司也在申请 IPO"没有结局、无可比性 → 丢弃
4. 实现: 纯规则 (不需要 AI)，在 Gate 2 之后执行

### Self-Growing 知识库

每周 pipeline 完成后，从本周叙事中提取结构化事件存入 `reference_events` 表:

```
条件: narrative 的 context confidence == high 且包含具体数字
操作: 提取 entity, type, milestones, metrics → INSERT INTO reference_events
效果: 第1周 80 条种子 → 第10周 130+ 条 → 第50周 300+ 条
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
      叙事选取标准 (按优先级排序):
        i.   持续性: 跨周叙事优先于新叙事 (第4周 > 第1周)
        ii.  上下文密度: 有更多历史对比的优先
        iii. 实体权重: watchlist 核心实体优先 (Circle > 小型 DeFi 项目)
        iv.  事实支撑: 本周有 3+ 条事实支撑的叙事优先于只有 1 条的
      这些标准作为 scoring rubric 注入 AI prompt，不是让 AI 自由选
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

模板结构:
1. Header strip: STABLEPULSE + date range
2. Market line: 等宽字体，灰色
3. One-liner: 最大字号，加粗
4. Narratives: 带边框卡片，内含"历史对比"蓝色块
5. Signals: 紧凑列表，内联上下文
6. Footer: 统计 + CTA + 退订

"历史对比"块样式:
  border-left: 3px solid #3b82f6
  background: #f0f7ff
  padding: 12px 16px
  font-family: monospace (数字部分)

约束:
- 纯 <table> 布局
- 浅色主题 (#fff/#f7f7f7/#f0f7ff)
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
  embedding vector(1024)

── 知识库 ──
reference_events
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
├── reference-events.ts       # 初始种子知识库 (80 条, 运行后从 DB 读)
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
VOYAGE_API_KEY=
TWITTERAPI_IO_KEY=
ADMIN_SECRET=
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
│   ├── page.tsx                   # 周报归档列表 (含跨周趋势)
│   └── [week]/
│       ├── page.tsx               # 阅读版 (server component)
│       └── WeeklyReader.tsx       # 客户端组件 (干净阅读体验)
├── console/
│   ├── page.tsx                   # 操作终端 (redirect → 当前周)
│   └── [week]/
│       ├── page.tsx               # 终端 (server component)
│       └── ConsoleView.tsx        # 客户端组件 (全功能)
├── admin/
│   └── page.tsx                   # 4-tab: 流水线 | 数据质量 | 邮件 | 订阅者
├── api/
│   ├── admin/reset/route.ts
│   ├── cron/
│   │   ├── collect/route.ts
│   │   ├── process/stream/route.ts
│   │   ├── snapshot/stream/route.ts
│   │   └── narrative/stream/route.ts
│   ├── pipeline/
│   │   ├── runs/route.ts
│   │   └── cancel/route.ts
│   ├── reports/route.ts
│   ├── subscribe/route.ts
│   └── subscribers/route.ts
└── unsubscribe/page.tsx
```

### 设计系统

```
排版 (阅读版):
  headline:  20px, weight 700    # one-liner
  narrative: 16px, weight 600    # 叙事标题
  body:      14px, weight 400    # 正文，line-height 1.6
  context:   13px, mono (数字)    # 历史对比块
  meta:      12px, weight 400    # 来源、时间戳
  badge:     11px, weight 500    # 标签、置信度

阅读版最大宽度: 680px (阅读最佳)
Console 最大宽度: 1400px (信息密度)

语义颜色:
  蓝 #3b82f6  = 上下文/历史对比 (产品核心色)
  灰阶       = 文本层级 (--fg-title, --fg-secondary, --fg-muted)
  绿 #16a34a  = 已验证 badge
  橙 #d97706  = 部分验证 badge

上下文块 (Context Block) — 全产品统一样式:
  border-left: 3px solid var(--info)
  background: var(--context-bg)
  padding: 12px 16px
  border-radius: 0 (邮件) / 4px (web)

导航:
  阅读版 TopBar: Logo [StablePulse] ─── [← 上周] [下周 →] ─── [Console]
  Console TopBar: Logo [StablePulse · Console] ─── [周选择] ─── [Admin] [Cmd+K]
  无 MobileNav (阅读版不需要，Console 是桌面工具)
```

---

## V13 实施路线

### Phase 1: 表面分离 (架构重构)

> 目标: 把现有的 WeeklyMirror 拆成 WeeklyReader (阅读版) + ConsoleView (终端)

```
1A. 创建 /console/[week] 路由
    - 把现有 WeeklyMirror 整体迁移过去
    - 包含: DepthControl, EntityTags, FocusLens, FactPulse,
            KnowledgeHeartbeat, NarrativeRiver, TrustSpine,
            EvidenceDrawer, ConsoleModal
    - 保持暗色模式

1B. 重写 /weekly/[week] 的 WeeklyReader
    - 移动端优先，max-width 680px
    - 无 Depth 系统，无 Focus Lens
    - 叙事: 垂直卡片 (非水平流式)
    - 上下文: 默认可见，蓝色左边框块
    - 置信度: 简单 ✓/◐ badge (替代 TrustSpine)
    - 展开/折叠: 来源事实

1C. 首页 redirect
    - / → /weekly/{currentWeek}
    - 删除现有首页 dashboard

1D. TopBar 简化
    - 阅读版: Logo + 上周/下周 + Console 小字链接
    - Console: Logo + 周选择器 + Admin + Cmd+K
    - 删除 MobileNav
```

### Phase 2: 邮件重写

> 目标: 邮件成为产品的最高质量表面

```
2A. 重写 email-template.ts
    - 信息节奏: Header → Market → Headline → Narratives → Signals → Footer
    - "历史对比"块: 蓝色左边框 + 浅蓝背景，视觉主角
    - 叙事卡片: 有边框容器
    - 等宽数字 (metric_value, date_range)
    - 纯 table 布局 + MSO fallback

2B. 邮件发送集成
    - 接通 SMTP (Moya 负责)
    - Admin "发送测试邮件" 按钮
    - 发送历史记录

2C. 邮件 A/B 测试框架 (可选)
    - 两种上下文呈现方式对比
    - 打开率 / 点击率追踪
```

### Phase 3: 上下文引擎强化

> 目标: 上下文质量从"有"到"惊艳"

```
3A. Context Engine 输出增强
    - 新增字段: delta_label (e.g., "快42%", "大1.7倍")
    - 新增字段: current_progress (e.g., "Circle 当前: 25天, Coinbase 同阶段: 31天")
    - 模板组装: 不只列对比，还算差异

3B. 叙事上下文增强
    - 每个叙事的上下文从"1-2条对比"提升到"结构化对比框"
    - 包含: 参照事件、关键里程碑对比表、当前进度 vs 参照进度

3C. 知识库种子扩充 (冷启动关键)
    - reference_events 80 条种子 (一次性人工投入，已计入冷启动策略)
    - 覆盖 2019-2026:
      IPO: Coinbase, Robinhood, Circle
      监管: GENIUS Act, MiCA, Lummis-Gillibrand, SEC vs Ripple
      市值里程碑: USDC $10B/$25B/$50B, USDT $50B/$100B, DAI $5B
      崩盘: UST/Luna, SVB→USDC 脱锚, FTX→行业影响
      融资: Circle Series F, Tether investment rounds
      产品: PYUSD launch, FDUSD launch, Ethena USDe launch
    - 每条种子事件必须有: entity, type, milestones (含日期), metrics (含数字), embedding
```

### Phase 4: Admin 数据质量

> 目标: 运营可观测性

```
4A. 新增 "数据质量" Tab
    - 漏斗图: 原始数据 → 拆解事实 → 验证通过 → 上下文匹配 → 邮件选取
    - 各层通过率 (本周 + 趋势)
    - 上下文引擎命中率 (有多少比例的事实匹配到了历史对比)

4B. Pipeline 历史
    - 最近 10 次运行记录
    - 耗时、处理量、错误数、token 消耗

4C. DB 约束修复
    - ALTER pipeline_runs status CHECK → 加 'cancelled'
    - ALTER pipeline_runs pipeline_type CHECK → 加实际使用的类型
```

### Phase 5: 周报归档升级

> 目标: 归档页从列表变成趋势仪表盘

```
5A. 跨周叙事时间线
    - 甘特图: 横轴=周数, 纵轴=叙事线程
    - 显示每个叙事的起止、当前状态

5B. 实体活跃度热力图
    - 行=实体, 列=周, 颜色=提及频率
    - 快速看到哪些实体最近最活跃

5C. 周度统计趋势
    - 事实数量、验证通过率、上下文命中率
```

### Phase 6: Console 增强

> 目标: 终端越来越强

```
6A. 迁移现有功能
    - 从 WeeklyMirror 迁移所有交互组件
    - 确保 Depth/Focus/TrustSpine/Evidence 正常工作

6B. 新增: 数据质量面板
    - 同 Admin 数据质量 Tab，但在 Console 侧边栏常驻

6C. 新增: 跨周叙事甘特图 (同归档页)

6D. 新增: 实体画像增强
    - 实体详情页迁移到 Console 内
    - 新增: 实体相关事实的上下文命中率
    - 新增: 实体时间线
```

---

## 优先级总结

| 优先级 | Phase | 目标 | 估计工作量 |
|--------|-------|------|-----------|
| **P0** | 1A-1D | 表面分离 (Reader vs Console) | 重构，2-3 天 |
| **P0** | 2A-2B | 邮件重写 + 发送 | 1-2 天 |
| **P1** | 3A-3B | 上下文引擎输出增强 | 1 天 |
| **P1** | 4A | 数据质量 Tab | 1 天 |
| **P2** | 4B-4C | Pipeline 历史 + DB 修复 | 0.5 天 |
| **P2** | 3C | 知识库扩充 | 0.5 天 |
| **P3** | 5A-5C | 归档页升级 | 1-2 天 |
| **P3** | 6A-6D | Console 增强 | 持续 |
