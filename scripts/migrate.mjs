import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
const databaseUrl=process.env.DATABASE_URL?.trim() || process.env.inventory_DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('Set DATABASE_URL or inventory_DATABASE_URL first.');
const sql = neon(databaseUrl);
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
await sql.transaction([
  sql.query('SELECT pg_advisory_xact_lock(738201)'),
  ...schema.split(';').map(s => s.trim()).filter(Boolean).map(s => sql.query(s))
]);
console.log('Database schema is ready.');
