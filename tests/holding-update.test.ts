import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('actual holding update SQL accepts null and numeric manual prices for every kind',async()=>{
  const pg=new PGlite();
  try{
    await pg.exec(await readFile('db/schema.sql','utf8'));
    await pg.exec("INSERT INTO catalog(id,name,category,kind,expansion_id) VALUES(1,'Card','Single','card',1)");
    const source=await readFile('src/app/api/holdings/[id]/route.ts','utf8');
    const template=source.match(/db\(\)`(UPDATE holdings SET[\s\S]*?)`/)![1];
    for(const kind of ['card','sealed','graded'])for(const price of [null,0,45.50]){
      const row=(await pg.query<{id:string}>("INSERT INTO holdings(product_id,kind,finish,condition,quantity,purchase_price,purchase_date) VALUES(1,$1,'standard','NM',1,10,'2026-01-01') RETURNING id",[kind])).rows[0];
      const bindings:Record<string,unknown>={'v.quantity':2,'v.purchasePrice':12.50,'v.notes':'edited','v.customImageUrl??null':null,'v.psaEnabled':false,'v.psaTcgplayerId??null':null,'v.psaPrinting??null':null,'quote?.usd??null':null,'quote?.date??null':null,'unchanged?existing.psa_error:null':null,'v.manualPrice':price,'id':row.id};
      const values:unknown[]=[];
      const query=template.replace(/\$\{([^}]+)\}/g,(_,key)=>{assert.ok(key in bindings,key);values.push(bindings[key]);return `$${values.length}`;});
      await pg.query(query,values);
      const saved=(await pg.query<{quantity:number;notes:string;manual_price:string|null}>('SELECT quantity,notes,manual_price FROM holdings WHERE id=$1',[row.id])).rows[0];
      assert.equal(saved.quantity,2);assert.equal(saved.notes,'edited');
      assert.equal(saved.manual_price===null?null:Number(saved.manual_price),kind==='graded'?price:null);
    }
  }finally{await pg.close();}
});
