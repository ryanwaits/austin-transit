-- Newsletter signups collected by the public site's "What's next" section
-- (apps/api POST /v1/subscribe). We collect addresses only this sprint; no
-- confirmation/send flow yet.
CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
