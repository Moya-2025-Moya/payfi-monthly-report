-- Newsletter tables for StablePulse email distribution
-- Moya (external partner) reads these tables to send emails via SMTP

-- 1. Subscribers
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT DEFAULT 'active',           -- 'active' | 'unsubscribed'
  welcomed BOOLEAN DEFAULT false,         -- Moya sets true after sending welcome email
  unsubscribe_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_welcomed ON subscriptions(welcomed) WHERE welcomed = false;
CREATE INDEX IF NOT EXISTS idx_subscriptions_token ON subscriptions(unsubscribe_token);

-- 2. Email reports (HTML content for Moya to send)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                  -- Full HTML email content
  date TEXT NOT NULL,                     -- Issue date 'YYYY-MM-DD'
  subject TEXT,                           -- Email subject line
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_date ON reports(date);

-- 3. Send logs (written by Moya)
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

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow public insert" ON subscriptions FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service role full access subs" ON subscriptions FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Service role full access reports" ON reports FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Service role full access logs" ON email_logs FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
