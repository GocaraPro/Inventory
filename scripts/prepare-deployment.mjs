// Vercel provides database credentials to the build. Apply additive migrations
// before publishing, so a fresh Neon database is ready for the first sign-in.
if (process.env.VERCEL === '1') {
  await import('./migrate.mjs');
}
