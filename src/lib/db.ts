import { neon } from "@neondatabase/serverless";
export const databaseUrl = () => process.env.DATABASE_URL?.trim() || process.env.inventory_DATABASE_URL?.trim();
export function db() {
  const url=databaseUrl();
  if (!url) throw new Error("DATABASE_URL or inventory_DATABASE_URL is not configured");
  return neon(url);
}
export const isDemo = () => !databaseUrl() && process.env.NODE_ENV !== "production" && !process.env.VERCEL;
