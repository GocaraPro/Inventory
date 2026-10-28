import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {recordSale,saleInput} from '../src/lib/sales';
import {saleTotals} from '../src/lib/sales-math';
import {db} from '../src/lib/db';
test('sales preserve cost basis, reduce stock once and keep full sell-out history',async()=>{
  const pg=new PGlite();
  try{
    await pg.exec(await readFile('db/schema.sql','utf8'));
    await pg.exec("INSERT INTO catalog(id,name,category,kind,expansion_id) VALUES(1,'Box','Box','sealed',1)");
    const holdingId=randomUUID();
    await pg.query("INSERT INTO holdings(id,product_id,kind,finish,condition,quantity,purchase_price,purchase_date) VALUES($1,1,'sealed','standard','NM',3,10.10,'2026-01-01')",[holdingId]);
    type Query={text:string;values:unknown[]};
    const tag=(strings:TemplateStringsArray,...values:unknown[]):Query=>({text:strings.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,''),values});
    const sql=Object.assign(tag,{transaction:async(queries:Query[])=>pg.transaction(async tx=>{
      const results=[];for(const q of queries)results.push((await tx.query(q.text,q.values)).rows);return results;
    })}) as unknown as ReturnType<typeof db>;
    const sale={id:randomUUID(),holdingId,quantity:2,salePrice:20.20,fees:3.30,saleDate:'2026-02-01',notes:'Test sale'};
    assert.equal(await recordSale(sale,sql),true);
    assert.equal(await recordSale(sale,sql),true);
    assert.equal(await recordSale({...sale,salePrice:99},sql),false);
    assert.equal((await pg.query<{quantity:number}>('SELECT quantity FROM holdings')).rows[0].quantity,1);
    assert.equal((await pg.query('SELECT * FROM sales')).rows.length,1);
    assert.deepEqual(saleTotals(2,10.10,20.20,3.30),{gross:40.4,cost:20.2,net:37.1,profit:16.9});
    assert.equal(await recordSale({...sale,id:randomUUID()},sql),false);
    assert.equal(await recordSale({...sale,id:randomUUID(),quantity:1,saleDate:'2025-01-01'},sql),false);
    assert.equal(await recordSale({...sale,id:randomUUID(),quantity:1,salePrice:0,fees:2},sql),true);
    assert.equal((await pg.query('SELECT * FROM holdings')).rows.length,0);
    assert.equal((await pg.query('SELECT * FROM sales')).rows.length,2);
    assert.equal(saleTotals(1,10.10,0,2).profit,-12.1);
    assert.equal(saleInput.safeParse({...sale,fees:-1}).success,false);
    assert.equal(saleInput.safeParse({...sale,salePrice:0.001}).success,false);
    assert.equal(saleInput.safeParse({...sale,saleDate:'2026-02-30'}).success,false);
  }finally{await pg.close();}
});
