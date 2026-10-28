import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { passwordLogin } from "@/lib/password-login";
import { NeonEmailAdapter } from "@/lib/auth-adapter";
import { db } from "@/lib/db";
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NeonEmailAdapter(),
  providers: [Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.EMAIL_FROM, maxAge: 15 * 60 }),
    Credentials({credentials:{email:{type:'email'},password:{type:'password'}},authorize:credentials=>passwordLogin(credentials.email,credentials.password)})],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", verifyRequest: "/login/sent", error: "/login" },
  callbacks: {
    async jwt({token,user,account}) {
      if (!token.email || token.email.toLowerCase() !== process.env.OWNER_EMAIL?.trim().toLowerCase()) return null;
      const [row] = await db()`SELECT session_version,email_verified FROM auth_users WHERE email=${token.email.toLowerCase()}`;
      if (!row?.email_verified) return null;
      if (user) {
        token.sessionVersion = row.session_version;
        token.emailVerifiedAt = account?.provider === 'resend' ? Date.now() : 0;
      }
      if (token.sessionVersion !== row.session_version) return null;
      return token;
    },
    async session({session,token}) {
      session.emailVerifiedAt = Number(token.emailVerifiedAt ?? 0);
      session.sessionVersion = Number(token.sessionVersion);
      return session;
    },
    async signIn({ user, email }) {
      const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
      if (!owner || user.email?.toLowerCase() !== owner) return false;
      if (email?.verificationRequest) {
        const rows = await db()`INSERT INTO login_throttle(email,sent_at) VALUES (${owner},now()) ON CONFLICT(email) DO UPDATE SET sent_at=now() WHERE login_throttle.sent_at < now() - interval '60 seconds' RETURNING email`;
        if (!rows.length) return false;
      }
      return true;
    }
  }
});
