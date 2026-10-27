import {PGlite} from '@electric-sql/pglite';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
test('Postgres history: retries, stale source, series, rankings and retention',async()=>{
const db=new PGlite();
try {
const schema=await readFile('db/schema.sql','utf8');await db.exec(schema);await db.exec(schema);
await db.exec(`INSERT INTO catalog(id,name,category,kind,expansion_id,trend,holo_trend,price_date) SELECT i,'Product '||i,'Single','card',1,100,200,'2026-10-26T00:45:00Z' FROM generate_series(1,30) i`);
const sync=await readFile('src/lib/sync.ts','utf8');
const insert=sync.match(/sql`(INSERT INTO market_history[\s\S]*?)`/)![1].replaceAll('${sourceDate}','$1');
const clean=sync.match(/sql`(DELETE FROM market_history[\s\S]*?)`/)![1];
await db.query(insert,['2026-10-26T00:45:00Z']);
await db.query(insert,['2026-10-26T00:45:00Z']);
assert.equal((await db.query<{n:number}>('select count(*)::int n from market_history')).rows[0].n,1);
await db.exec(`UPDATE catalog SET trend=CASE WHEN id=1 THEN 120 WHEN id=2 THEN 50 WHEN id=3 THEN 0 WHEN id=4 THEN NULL ELSE 100 END,price_date='2026-10-27T00:45:00Z'`);
await db.query(insert,['2026-10-27T00:45:00Z']);
await db.exec(`INSERT INTO catalog(id,name,category,kind,expansion_id,trend,price_date) VALUES(31,'Older feed product','Single','card',1,5,'2026-10-25T00:45:00Z')`);
await db.query(insert,['2026-10-25T00:45:00Z']);
assert.equal((await db.query<{n:number}>('select count(*)::int n from market_history')).rows[0].n,2);
const route=await readFile('src/app/api/history/route.ts','utf8');
const query=route.match(/sql`(WITH pair[\s\S]*?)`/)![1].replaceAll('${dates[0].date}','$1').replaceAll('${dates[1].date}','$2');
const rows=(await db.query<{id:number}>(query,['2026-10-27','2026-10-26'])).rows;
assert.deepEqual(rows.map(r=>r.id),[1,3,2]);
const history=route.match(/sql`(SELECT date,\(prices[\s\S]*?)`/)![1].replaceAll('${String(id)}','$1').replaceAll('${finish}','$2');
assert.deepEqual((await db.query<{price:number|null}>(history,['1',0])).rows.map(r=>Number(r.price)),[100,120]);
assert.deepEqual((await db.query<{price:number|null}>(history,['1',1])).rows.map(r=>Number(r.price)),[200,200]);
await db.exec(`INSERT INTO market_history VALUES('2026-01-01','2026-01-01','{}')`);await db.exec(clean);
assert.equal((await db.query<{n:number}>('select count(*)::int n from market_history')).rows[0].n,2);
}finally{await db.close();}
});
