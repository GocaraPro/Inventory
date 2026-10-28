CREATE TABLE IF NOT EXISTS catalog (
  id integer PRIMARY KEY, name text NOT NULL, category text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('card','sealed')), expansion_id integer NOT NULL,
  trend numeric(14,2), holo_trend numeric(14,2), price_date timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_name_idx ON catalog (lower(name));
CREATE TABLE IF NOT EXISTS holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id integer NOT NULL REFERENCES catalog(id),
  kind text NOT NULL CHECK (kind IN ('card','sealed','graded')),
  finish text NOT NULL CHECK (finish IN ('standard','holo')),
  condition text NOT NULL CHECK (condition IN ('NM','MINT')),
  quantity integer NOT NULL CHECK (quantity > 0), purchase_price numeric(14,2) NOT NULL CHECK (purchase_price >= 0),
  purchase_date date NOT NULL, notes text NOT NULL DEFAULT '',
  grading_company text, grade text, certificate text, manual_price numeric(14,2) CHECK (manual_price >= 0),
  manual_price_date timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS snapshots (
  date date PRIMARY KEY, value numeric(16,2) NOT NULL, cost numeric(16,2) NOT NULL,
  unpriced integer NOT NULL, source_date timestamptz
);
CREATE TABLE IF NOT EXISTS sync_state (
  id integer PRIMARY KEY CHECK(id=1), last_success timestamptz, source_date timestamptz, error text
);
CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL,
  name text, email_verified timestamptz, image text
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  session_token text PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_verification_tokens (
  identifier text NOT NULL, token text NOT NULL, expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);
CREATE TABLE IF NOT EXISTS login_throttle (
  email text PRIMARY KEY, sent_at timestamptz NOT NULL
);
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS password_attempts (
  email text PRIMARY KEY, attempts integer NOT NULL, started_at timestamptz NOT NULL
);
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS custom_image_url text;
CREATE TABLE IF NOT EXISTS market_history (
  date date PRIMARY KEY,
  source_date timestamptz NOT NULL,
  prices jsonb NOT NULL
);
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_tcgplayer_id integer;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_printing text;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_price_usd numeric(14,2);
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_price_date timestamptz;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_error text;
CREATE TABLE IF NOT EXISTS psa_cache (
  tcgplayer_id integer PRIMARY KEY, data jsonb NOT NULL, fetched_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS psa_requests (
  tcgplayer_id integer NOT NULL, date date NOT NULL, PRIMARY KEY(tcgplayer_id,date)
);
CREATE TABLE IF NOT EXISTS psa_budget (
  date date PRIMARY KEY, credits integer NOT NULL
);
CREATE TABLE IF NOT EXISTS psa_provider_state (
  id integer PRIMARY KEY CHECK(id=1), blocked_until timestamptz NOT NULL
);
