-- ============================================
-- StablePulse Newsletter - Database Schema
-- ============================================

-- 1. 订阅者表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT DEFAULT 'active',           -- 'active' | 'unsubscribed'
  welcomed BOOLEAN DEFAULT false,         -- 是否已发送欢迎邮件
  unsubscribe_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_welcomed ON subscriptions(welcomed) WHERE welcomed = false;
CREATE INDEX IF NOT EXISTS idx_subscriptions_token ON subscriptions(unsubscribe_token);

-- 2. 周报内容表
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                  -- HTML 邮件内容
  date TEXT NOT NULL,                     -- 期号日期 'YYYY-MM-DD'
  subject TEXT,                           -- 邮件标题（可选）
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_date ON reports(date);

-- 3. 发送日志表
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  email TEXT NOT NULL,
  report_date TEXT NOT NULL,
  type TEXT DEFAULT 'weekly',             -- 'welcome' | 'weekly'
  status TEXT DEFAULT 'sent',             -- 'sent' | 'failed'
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_date ON email_logs(report_date);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Allow public insert') THEN
    CREATE POLICY "Allow public insert" ON subscriptions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON subscriptions FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON reports FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON email_logs FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
