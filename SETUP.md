# StablePulse — Setup 指南

## 0. 前提

- Node.js 18+
- npm
- Git
- 一张信用卡（twitterapi.io 和 Anthropic 需要）

---

## 1. Supabase (数据库 + 认证) — 免费

### 创建项目

1. 打开 https://supabase.com → Sign Up / Sign In
2. 点击 "New Project"
3. 填写：
   - **Organization**: 选已有的或创建新的
   - **Project Name**: `stablepulse`
   - **Database Password**: 记住这个密码（后面连接数据库用）
   - **Region**: 选离你最近的（推荐 `Northeast Asia (Tokyo)` 或 `US East`）
4. 等待项目创建完成（约2分钟）

### 获取 Keys

1. 进入项目 → 左侧菜单 **Settings** → **API**
2. 找到：
   - **Project URL** → 填入 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (点击 Reveal) → 填入 `SUPABASE_SERVICE_ROLE_KEY`

### 初始化数据库

1. 进入项目 → 左侧菜单 **SQL Editor**
2. 点击 "New query"
3. 把 `src/db/schema.sql` 的**全部内容**复制粘贴到编辑器
4. 点击 "Run" 执行
5. 确认左侧 **Table Editor** 中出现了所有表（raw_onchain_metrics, raw_news, atomic_facts, entities, ...）

### 免费层限制

- 500MB 数据库存储
- 1GB 文件存储
- 50,000 月活用户
- 对我们的规模完全够用

---

## 2. Anthropic API (AI) — ~$29-34/月

### 获取 API Key

1. 打开 https://console.anthropic.com
2. 注册/登录
3. 左侧菜单 **API Keys** → "Create Key"
4. 复制 key → 填入 `ANTHROPIC_API_KEY`

### 充值

1. **Settings** → **Billing** → 添加信用卡
2. 充值 $20 足够初期使用（月预算约 $24-34 AI 部分）
3. 建议设置 **Usage Limit** 为 $50/月，防止意外

### 确认模型可用

我们用的模型：
- `claude-haiku-4-5-20251001` — 事实提取和验证（便宜）
- `claude-sonnet-4-6-20250514` — AI 对话（质量高）

---

## 3. DeFiLlama (链上数据 + 融资数据) — 免费

完全免费，无需 API key。默认配置已设好：
```
DEFILLAMA_API_BASE=https://api.llama.fi
```

测试：
```bash
# 稳定币数据
curl "https://api.llama.fi/stablecoins"

# 融资数据 (也用于A5融资采集)
curl "https://api.llama.fi/raises"
```

---

## 4. free-crypto-news (新闻) — 免费

完全免费，无需 API key，无需注册。

Base URL: `https://cryptocurrency.cv/api`

测试：
```bash
# 获取最新新闻
curl "https://cryptocurrency.cv/api/news?limit=10"

# 搜索稳定币相关
curl "https://cryptocurrency.cv/api/search?q=stablecoin"

# 搜索 USDC 相关
curl "https://cryptocurrency.cv/api/search?q=USDC"
```

主要端点：
| 端点 | 用途 |
|---|---|
| `/api/news` | 最新新闻 (300+来源聚合) |
| `/api/search?q=` | 全文搜索 |
| `/api/archive` | 历史文章 (66万+) |
| `/api/stream` | 实时 SSE 推送 |

> 注意：之前的 `free-crypto-news.p.rapidapi.com` 需要 RapidAPI key，实际的免费端点是 `cryptocurrency.cv/api`

---

## 5. SEC EDGAR (Filing 数据) — 免费

无需注册，只需要设置 User-Agent：

```
SEC_EDGAR_USER_AGENT=StablePulse your-email@example.com
```

SEC 要求 User-Agent 中包含公司名和联系邮箱。用你自己的邮箱即可。

---

## 6. twitterapi.io (Twitter 数据) — $29/月

### 注册

1. 打开 https://twitterapi.io/twitter-stream
2. 注册账号
3. 选择 **Starter Plan** ($29/月, 追踪6个账号)
   - 如果需要追踪更多账号，额外 $5/账号
   - Growth Plan $79/月支持20个账号

### 获取 Key

1. 登录后进入 Dashboard
2. 获取 API Key → 填入 `TWITTERAPI_IO_KEY`

### 配置追踪账号

通过 API 调用添加监控账号（不是在 Dashboard 上操作）。系统启动时会自动调用：

```bash
# 添加一个监控账号
curl -X POST https://api.twitterapi.io/oapi/x_user_stream/add_user_to_monitor_tweet \
  -H "X-API-Key: YOUR_TWITTERAPI_IO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"x_user_name": "jerallaire"}'
```

Starter 限额6个账号，优先这6个：

| 账号 | 身份 | 为什么追踪 |
|---|---|---|
| jerallaire | Circle CEO | 稳定币发行商一把手 |
| paaborsch | Tether CTO | 最大稳定币核心人物 |
| cdixon | a16z Crypto GP | 顶级VC观点 |
| nic__carter | Castle Island Ventures | 稳定币研究深度 |
| MessariCrypto | Messari | 行业研究机构 |
| tokenterminal | Token Terminal | 链上数据分析 |

账号列表配置在 `src/config/twitter-accounts.ts`，A6 采集器启动时自动调用 API 注册监控。添加账号后需要约20分钟完成初始化。

后续升级套餐可添加更多账号（Growth $79/月支持20个）。

### 特性

- 认证方式：`X-API-Key` header
- 实时流式推送（WebSocket）
- ~1.2s 平均延迟
- 99.9% uptime
- 监控内容：直发、引用、回复、转推

---

## 7. Resend (邮件推送) — 免费

### 注册

1. 打开 https://resend.com → Sign Up
2. 免费层：100 emails/day, 3000 emails/month（完全够用）

### 获取 Key

1. 登录 → **API Keys** → "Create API Key"
2. 复制 → 填入 `RESEND_API_KEY`

### 配置发送域名（可选）

如果要用自定义域名发送（如 noreply@stablepulse.app）：
1. **Domains** → "Add Domain"
2. 按提示添加 DNS 记录
3. 不配置也行，默认用 Resend 的域名

---

## 8. Telegram Bot (推送) — 免费

### 创建 Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot`
3. 按提示起名（如 `StablePulse Bot`）和用户名（如 `stablepulse_bot`）
4. 获得 **Bot Token** → 填入 `TELEGRAM_BOT_TOKEN`

### 获取 Chat ID

1. 创建一个 Telegram 群组（或用私聊）
2. 把 Bot 加入群组
3. 在群组中发一条消息
4. 访问：
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```
5. 在返回的 JSON 中找到 `chat.id` → 填入 `TELEGRAM_CHAT_ID`
   - 群组的 chat_id 通常是负数（如 `-100xxxxxxxxxx`）
   - 私聊的 chat_id 是正数

---

## 9. Vercel (部署) — 免费

### 部署

1. 打开 https://vercel.com → Sign Up (用 GitHub)
2. 点击 "Add New" → "Project"
3. Import 你的 GitHub repo
4. **Environment Variables**: 把 `.env.local` 中的所有变量逐个添加
5. Deploy

### 环境变量设置

在 Vercel Dashboard → Project Settings → Environment Variables 中添加所有 key。
- 选择 "Production" + "Preview" + "Development" 全部环境

### Cron Jobs

`vercel.json` 中已配置了 5 个定时任务，Vercel Hobby Plan 支持每天最多 1 个 cron（Pro Plan 不限）。如果需要全部 5 个 cron，需要 Vercel Pro ($20/月）或者合并部分 cron 为一个。

**免费方案替代**: 用 https://cron-job.org（免费）调用 API route，绕过 Vercel cron 限制。

---

## 10. 认证密钥

生成随机密钥：

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# SHARE_TOKEN_SECRET
openssl rand -base64 32
```

把生成的值填入 `.env.local`。

`SHARE_BASE_URL` 填你的 Vercel 域名，如 `https://stablepulse.vercel.app`

---

## 月成本总览

| 服务 | 费用 | 必须？ |
|---|---|---|
| Supabase Free | $0 | ✅ |
| Anthropic (Haiku + Sonnet) | ~$29-34 | ✅ |
| twitterapi.io Starter | $29 | ✅ |
| DeFiLlama (链上 + 融资) | $0 | ✅ |
| free-crypto-news + RSS | $0 | ✅ |
| SEC EDGAR | $0 | ✅ |
| Resend Free | $0 | ✅ |
| Telegram | $0 | ✅ |
| Vercel Hobby | $0 | ✅ |
| **总计** | **~$58-63/月** | |

### [ROADMAP] 后续集成

| 服务 | 用途 | 费用 |
|---|---|---|
| CoinGecko API | 链上数据交叉验证（与DeFiLlama互校） | 免费层 |
| CryptoRank API | 融资数据交叉验证 | 免费层 |

---

## 验证

全部配置好后，本地启动验证：

```bash
npm run dev
```

打开 http://localhost:3000 应该看到 Next.js 默认页面。

后续开发 API 后可以测试各个数据源连接：
```bash
# 测试 Supabase
curl http://localhost:3000/api/health

# 手动触发采集
curl -X POST http://localhost:3000/api/trigger/collect

# 手动触发处理
curl -X POST http://localhost:3000/api/trigger/process
```
