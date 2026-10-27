import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { NeonEmailAdapter } from "@/lib/auth-adapter";
import { db } from "@/lib/db";
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NeonEmailAdapter(),
  providers: [Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.EMAIL_FROM, maxAge: 15 * 60 })],
  session: { strategy: "database", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login", verifyRequest: "/login/sent", error: "/login" },
  callbacks: {
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
