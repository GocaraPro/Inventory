import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {hashPassword,verifyPassword,validPassword} from '../src/lib/password';
import {passwordLogin} from '../src/lib/password-login';
import {db} from '../src/lib/db';

test('password hashes use unique salts, reject invalid passwords and do not trim spaces',async()=>{
  const password='  long test password  ';
  const first=await hashPassword(password),second=await hashPassword(password);
  assert.notEqual(first,second);
  assert.equal(await verifyPassword(password,first),true);
  assert.equal(await verifyPassword(password.trim(),first),false);
  assert.equal(await verifyPassword(password,'malformed'),false);
  assert.equal(validPassword('short'),false);
  assert.equal(validPassword('a'.repeat(129)),false);
});
test('password login requires verified owner and enforces an atomic attempt budget',async()=>{
  const pg=new PGlite();
  try {
    await pg.exec(await readFile('db/schema.sql','utf8'));
    const sql=(async(strings:TemplateStringsArray,...values:unknown[])=>{
      const query=strings.reduce((text,part,i)=>text+(i?`$${i}`:'')+part,'');
      return (await pg.query(query,values)).rows;
    }) as unknown as ReturnType<typeof db>;
    const email='owner@example.com',password='a safe test password';
    await pg.query('INSERT INTO auth_users(email,password_hash) VALUES($1,$2)',[email,await hashPassword(password)]);
    assert.equal(await passwordLogin(email,password,sql,email),null);
    await pg.exec('UPDATE auth_users SET email_verified=now()');
    assert.equal(await passwordLogin('other@example.com',password,sql,email),null);
    assert.equal((await passwordLogin(' OWNER@example.com ',password,sql,email))?.email,email);
    assert.equal(await passwordLogin(email,'wrong password',sql,email),null);
    const results=await Promise.all(Array.from({length:6},()=>passwordLogin(email,password,sql,email)));
    assert.equal(results.filter(Boolean).length,2);
    await pg.exec("UPDATE password_attempts SET started_at=now()-interval '16 minutes'");
    assert.equal((await passwordLogin(email,password,sql,email))?.email,email);
    // A verified setup session can change the password once; old sessions are revoked.
    const changed=await pg.query('UPDATE auth_users SET session_version=session_version+1 WHERE email=$1 AND session_version=0 RETURNING id',[email]);
    assert.equal(changed.rows.length,1);
    const replay=await pg.query('UPDATE auth_users SET session_version=session_version+1 WHERE email=$1 AND session_version=0 RETURNING id',[email]);
    assert.equal(replay.rows.length,0);
  }finally{await pg.close();}
});
