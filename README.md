# Pokémon Inventory

Private, English-language Pokémon collection app built with Next.js App Router, TypeScript, Neon Postgres, and Auth.js email magic links. Designed for Vercel.

## Included

- Responsive overview, collection search/filter/sort, and daily value chart.
- Official Cardmarket catalog search for singles and non-single products, including sealed products.
- Separate purchase entries with quantity, unit cost, date, notes, English language, and NM/Mint condition.
- Standard/holo price-series choice. Cardmarket Trend in EUR; no currency conversion.
- Graded cards with any grading company, grade, certificate, and manual valuation.
- Edit quantity, purchase cost, notes, and graded valuation; remove a purchase with confirmation.
- Daily scheduled import and historical portfolio snapshots. No sales in v1.
- Owner-only email sign-in, database sessions, 15-minute single-use links, login email throttling, authenticated inventory/catalog routes, origin checks on mutations, and a secret-protected cron endpoint.

## Local preview

Requires Node.js 22+ and npm.

```sh
npm ci
npm run catalog:download
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL`, **development only** uses clearly labelled illustrative demo inventory and history. Demo changes are saved in the browser. Catalog search uses the real downloaded Cardmarket catalog. Demo data is never inserted into Neon. Production does not allow a demo authentication bypass.

The `.cache` catalog is deliberately ignored by Git and excluded from production setup. If downloading fails, catalog search reports that it is unavailable.

## Connect Neon and email sign-in

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to your Neon pooled connection string.
2. Set `OWNER_EMAIL` to your own email. Only that address can sign in. Do not commit personal configuration or credentials.
3. Generate independent random `AUTH_SECRET` and `CRON_SECRET` values:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Email delivery uses **Resend**. Set `AUTH_RESEND_KEY` and `EMAIL_FROM` to a sender allowed by your Resend account (normally a verified domain). No email service is provisioned automatically. The sender address and recipient owner address can be different. No verification emails are sent during build or setup.
5. Set `AUTH_URL=http://localhost:3000` locally and `AUTH_TRUST_HOST=true` for this trusted local/Vercel deployment.
6. Initialize and import:

   ```sh
   npm run db:migrate
   npm run sync
   npm run dev
   ```

The initial full import must finish before products are available in production. Actual email delivery and Neon operations require your credentials; local demo does not verify those services.

## Deploy to Vercel

1. Import `GocaraPro/Inventory` in Vercel. Framework: Next.js. Root: repository root. Build: `npm run build`.
2. Add the environment variables above using Vercel's environment settings, and set `AUTH_URL` to the final HTTPS deployment origin. Use separate credentials/databases for previews if you enable them.
3. Run migration and first import against the intended Neon database from your configured local environment. Neither migrations nor full imports run during build.
4. Deploy. Sign in with the configured owner email and verify a real purchase before relying on the scheduled valuation.
5. `vercel.json` schedules `/api/cron/sync` daily at **06:00 UTC**. Vercel sends `Authorization: Bearer <CRON_SECRET>`. Check deployment plan execution limits and cron logs after the first run.

No database URL, email API key, or cron secret is sent to the client. GitHub/Vercel/Neon projects and deployments are not created by merely cloning or building this repository.

## Data and pricing

Official public inputs, no Cardmarket API key:

- [Singles catalog](https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json)
- [Non-singles catalog](https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json)
- [Daily price guide](https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json)

Products and prices are joined by `idProduct`. Imports validate schema version, preserve source timestamps, serialize concurrent imports with a PostgreSQL transaction lock, and commit all price updates and the snapshot atomically. Failed imports preserve the last successful prices and record a visible error. Older source data does not replace newer catalog prices. The source covers broader non-single categories too, so always check the displayed category before adding a sealed product.

**Market estimates, not executable offers:** the daily guide does not isolate English NM/Mint listings, shipping, or a grading company/grade. Standard and holo series are kept separate; missing holo prices never fall back to standard. Confirm Cardmarket product identity/series for ambiguous names; the catalog shows its product and expansion IDs. Images and expanded set metadata are not included in these files, so v1 uses category illustrations instead of unverified card photos. Graded valuations never use raw card trend prices.

Unknown prices are `null`, excluded from valued totals and unrealised gain; their count is shown. Total investment includes all purchases. Gain percentage uses the acquisition cost of priced items only. Prices older than 48 hours are labelled. Daily snapshots include additions/removals and manual valuations, and are **portfolio totals, not time-weighted investment returns**. Snapshots use the Europe/Berlin calendar date. History begins at your first successful import; no earlier history is fabricated. Catalog data can be stale if Cardmarket has not published a new file; source timestamps remain visible.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm audit
```

Domain tests cover missing prices, graded/holo isolation, zero-cost purchases, validation, source-version failures, and timezone parsing. Before production use, test Neon migrations/imports and actual email sign-in with your configured services.
