import type { Adapter, AdapterUser } from "next-auth/adapters";
import { db } from "./db";
function user(row: Record<string, unknown>): AdapterUser {
  return { id: String(row.id), email: String(row.email), name: row.name as string | null,
    image: row.image as string | null, emailVerified: row.email_verified ? new Date(String(row.email_verified)) : null };
}
export function NeonEmailAdapter(): Adapter {
  return {
    async createUser(u) {
      const [row] = await db()`INSERT INTO auth_users (email,name,email_verified,image) VALUES (${u.email.toLowerCase()},${u.name ?? null},${u.emailVerified ?? null},${u.image ?? null}) RETURNING *`;
      return user(row);
    },
    async getUser(id) { const [r] = await db()`SELECT * FROM auth_users WHERE id=${id}`; return r ? user(r) : null; },
    async getUserByEmail(email) { const [r] = await db()`SELECT * FROM auth_users WHERE email=${email.toLowerCase()}`; return r ? user(r) : null; },
    async updateUser(u) {
      const [r] = await db()`UPDATE auth_users SET email_verified=COALESCE(${u.emailVerified ?? null},email_verified), name=COALESCE(${u.name ?? null},name) WHERE id=${u.id} RETURNING *`;
      return user(r);
    },
    async createSession(s) {
      await db()`INSERT INTO auth_sessions(session_token,user_id,expires) VALUES (${s.sessionToken},${s.userId},${s.expires})`; return s;
    },
    async getSessionAndUser(token) {
      const [r] = await db()`SELECT u.*, s.expires, s.session_token FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.session_token=${token} AND s.expires>now()`;
      return r ? { user: user(r), session: { userId: String(r.id), sessionToken: String(r.session_token), expires: new Date(r.expires) } } : null;
    },
    async updateSession(s) {
      const [r] = await db()`UPDATE auth_sessions SET expires=COALESCE(${s.expires ?? null},expires) WHERE session_token=${s.sessionToken} RETURNING *`;
      return r ? { sessionToken: r.session_token, userId: r.user_id, expires: new Date(r.expires) } : null;
    },
    async deleteSession(token) { await db()`DELETE FROM auth_sessions WHERE session_token=${token}`; },
    async createVerificationToken(t) {
      await db()`INSERT INTO auth_verification_tokens(identifier,token,expires) VALUES (${t.identifier},${t.token},${t.expires})`; return t;
    },
    async useVerificationToken({identifier, token}) {
      const [r] = await db()`DELETE FROM auth_verification_tokens WHERE identifier=${identifier} AND token=${token} RETURNING *`;
      return r ? { identifier: r.identifier, token: r.token, expires: new Date(r.expires) } : null;
    }
  };
}
