import { neon } from "@neondatabase/serverless";
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(process.env.DATABASE_URL);
}
export const isDemo = () => !process.env.DATABASE_URL && process.env.NODE_ENV !== "production" && !process.env.VERCEL;
