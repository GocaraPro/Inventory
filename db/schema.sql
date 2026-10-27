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
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS custom_image_url text;
