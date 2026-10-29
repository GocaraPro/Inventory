import {db} from './db';
// Additive migration, also included in db/schema.sql for fresh installations.
export const psaSchema=[
  'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_checked_at timestamptz',
  'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_enabled boolean NOT NULL DEFAULT false',
  'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_tcgplayer_id integer',
  'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_printing text',
  'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_price_usd numeric(14,2)',
  'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_price_date timestamptz',
  'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS psa_error text',
  'CREATE TABLE IF NOT EXISTS psa_cache (tcgplayer_id integer PRIMARY KEY, data jsonb NOT NULL, fetched_at timestamptz NOT NULL)',
  'CREATE TABLE IF NOT EXISTS psa_requests (tcgplayer_id integer NOT NULL, date date NOT NULL, PRIMARY KEY(tcgplayer_id,date))',
  "ALTER TABLE psa_requests ADD COLUMN IF NOT EXISTS attempted_at timestamptz NOT NULL DEFAULT '1970-01-01'",
  'ALTER TABLE psa_requests ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1',
  'CREATE TABLE IF NOT EXISTS psa_budget (date date PRIMARY KEY, credits integer NOT NULL)',
  'CREATE TABLE IF NOT EXISTS psa_provider_state (id integer PRIMARY KEY CHECK(id=1), blocked_until timestamptz NOT NULL)'
];
let ready:Promise<unknown>|null=null;
export async function ensurePsaSchema(){
  if(!ready){const sql=db();ready=sql.transaction([sql`SELECT pg_advisory_xact_lock(738202)`,...psaSchema.map(statement=>sql.query(statement))]).catch(error=>{ready=null;throw error;});}
  await ready;
}
