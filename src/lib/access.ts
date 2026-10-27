import { auth } from "@/auth";
import { isDemo,databaseUrl } from "./db";
export async function isOwner() {
  if (isDemo()) return true;
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!owner || !databaseUrl() || !process.env.AUTH_SECRET) return false;
  const session = await auth();
  return session?.user?.email?.toLowerCase() === owner;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : new URL(request.url).origin;
  return origin === expected;
}
