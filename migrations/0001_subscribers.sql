CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  consented_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  source_page TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  unsubscribed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
