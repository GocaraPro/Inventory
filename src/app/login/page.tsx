import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string;mode?:string;saved?:string}>}) {
  const {error,mode,saved}=await searchParams;
  const recovery=mode==='email';
  async function login(form:FormData) {
    "use server";
    const email=String(form.get('email')??'').trim().toLowerCase();
    try {
      if(recovery) await signIn('resend',{email,redirectTo:'/account/password'});
      else await signIn('credentials',{email,password:String(form.get('password')??''),redirectTo:'/'});
    } catch(e){if(e instanceof AuthError)redirect(recovery?'/login?mode=email&error=signin':'/login?error=signin');throw e;}
  }
  return <main className="auth-screen"><section className="auth-card"><span className="pokeball"/><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h1>{recovery?'Set up or reset your password.':'Welcome to your inventory.'}</h1><p>{recovery?'Verify your email once, then choose a password.':'Sign in with your email and password.'}</p>
    {saved&&<p role="status">Password saved. Sign in with your new password.</p>}
    <form action={login}><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      {!recovery&&<label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128}/></label>}
      <button className="button primary" type="submit">{recovery?'Send verification link':'Sign in'} <span>→</span></button></form>
    {error&&<p className="error" role="alert">{recovery?'Could not send a verification link. Wait a minute and try again.':'Could not sign in. Check your email and password. After five attempts, wait 15 minutes or reset your password.'}</p>}
    <p className="auth-foot">{recovery?<a href="/login">Back to password sign-in</a>:<a href="/login?mode=email">First time here or forgot your password?</a>}</p>
    <p className="auth-foot">{recovery?'Verification links expire after 15 minutes.':'Private access · Stay signed in on this device for up to 30 days.'}</p>
  </section></main>;
}
