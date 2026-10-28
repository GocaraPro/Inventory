// Vercel provides database credentials to the build. Apply additive migrations
// before publishing, so a fresh Neon database is ready for the first sign-in.
if (process.env.VERCEL === '1') {
  await import('./migrate.mjs');
  await import('./audit-psa.mjs');
  const {execFileSync}=await import('node:child_process');
  execFileSync(process.execPath,['--import','tsx','scripts/bootstrap-catalog.ts'],{stdio:'inherit'});
}
