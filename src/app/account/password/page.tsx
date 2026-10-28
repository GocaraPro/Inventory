import { auth, signOut } from '@/auth';
import { db } from '@/lib/db';
import { hashPassword, validPassword } from '@/lib/password';
import { redirect } from 'next/navigation';

async function verifiedOwner() {
  const session = await auth();
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email || session?.user?.email?.toLowerCase() !== email || !session.emailVerifiedAt ||
    Date.now()-session.emailVerifiedAt > 15*60*1000) redirect('/login?mode=email');
  return {email,version:session.sessionVersion};
}
export default async function Password({searchParams}:{searchParams:Promise<{error?:string}>}) {
  await verifiedOwner();
  const {error}=await searchParams;
  async function save(form:FormData) {
    'use server';
    const {email,version}=await verifiedOwner();
    const password=String(form.get('password')??'');
    if (!validPassword(password) || password!==form.get('confirm')) redirect('/account/password?error=invalid');
    const hash=await hashPassword(password);
    // The version check makes each verified session single-use for password setup.
    const rows=await db()`UPDATE auth_users SET password_hash=${hash},session_version=session_version+1
      WHERE email=${email} AND session_version=${version} AND email_verified IS NOT NULL RETURNING id`;
    if (!rows.length) redirect('/login?mode=email');
    await db()`DELETE FROM password_attempts WHERE email=${email}`;
    await signOut({redirectTo:'/login?saved=1'});
  }
  return <main className="auth-screen"><section className="auth-card"><span className="pokeball"/><h1>Choose your password.</h1><p>Your email is verified. Use 12–128 characters. Saving signs out your other sessions.</p><form action={save}>
    <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>
    <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>
    <button className="button primary">Save password</button></form>
    {error&&<p className="error" role="alert">Use 12–128 characters and enter the same password in both fields.</p>}
  </section></main>;
}
