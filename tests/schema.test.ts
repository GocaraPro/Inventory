import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('fresh database supports email login and repeated migration preserves users and tokens', async () => {
  const pg = new PGlite();
  try {
    const schema = await readFile('db/schema.sql', 'utf8');
    await pg.exec(schema);
    await pg.exec(`INSERT INTO auth_users(email) VALUES ('owner@example.com');
      INSERT INTO auth_verification_tokens(identifier,token,expires)
      VALUES ('owner@example.com','test-token',now()+interval '15 minutes');
      INSERT INTO login_throttle(email,sent_at) VALUES ('owner@example.com',now());`);
    await pg.exec(schema);
    assert.equal((await pg.query('SELECT * FROM auth_users')).rows.length, 1);
    assert.equal((await pg.query('SELECT * FROM login_throttle')).rows.length, 1);
    const token = await pg.query(`DELETE FROM auth_verification_tokens WHERE token='test-token' RETURNING *`);
    assert.equal(token.rows.length, 1);
    assert.equal((await pg.query('SELECT * FROM auth_verification_tokens')).rows.length, 0);
  } finally {
    await pg.close();
  }
});
