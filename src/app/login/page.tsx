import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;
  async function login(form:FormData) {
    "use server";
    try {await signIn("resend",{email:String(form.get("email")??"").trim().toLowerCase(),redirectTo:"/"});}
    catch(e){if(e instanceof AuthError)redirect("/login?error=signin");throw e;}
  }
  return <main className="auth-screen"><section className="auth-card"><span className="pokeball"/><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h1>Welcome to your inventory.</h1><p>One place for your cards, sealed products, and graded favourites.</p><form action={login}><label>Email address<input name="email" type="email" placeholder="you@example.com" autoComplete="email" required maxLength={254}/></label><button className="button primary" type="submit">Send sign-in link <span>→</span></button></form>{error&&<p className="error" role="alert">We couldn’t sign you in. Check your owner email, wait a minute, and try again. Your link may have expired.</p>}<p className="auth-foot">Private access · No password to remember<br/>Sign-in links expire after 15 minutes.</p></section></main>;
}
