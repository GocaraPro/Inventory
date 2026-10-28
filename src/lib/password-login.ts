import { db } from './db';
import { validPassword, verifyPassword } from './password';
export async function passwordLogin(email: unknown, password: unknown, sql = db(), owner = process.env.OWNER_EMAIL?.trim().toLowerCase()) {
  if (typeof email !== 'string' || typeof password !== 'string' || !validPassword(password)) return null;
  const normalized = email.trim().toLowerCase();
  if (!owner || normalized !== owner) return null;
  // Reserve attempts atomically, including concurrent requests. A successful login
  // does not reset the window, so racing requests cannot bypass the limit.
  const attempts = await sql`INSERT INTO password_attempts(email,attempts,started_at) VALUES (${owner},1,now())
    ON CONFLICT(email) DO UPDATE SET
      attempts=CASE WHEN password_attempts.started_at < now()-interval '15 minutes' THEN 1 ELSE password_attempts.attempts+1 END,
      started_at=CASE WHEN password_attempts.started_at < now()-interval '15 minutes' THEN now() ELSE password_attempts.started_at END
    WHERE password_attempts.started_at < now()-interval '15 minutes' OR password_attempts.attempts < 5 RETURNING email`;
  if (!attempts.length) return null;
  const [user] = await sql`SELECT id,email,name,image,email_verified,password_hash FROM auth_users WHERE email=${owner}`;
  if (!user?.email_verified || !user.password_hash || !await verifyPassword(password,user.password_hash)) return null;
  return {id:String(user.id),email:user.email,name:user.name,image:user.image};
}
