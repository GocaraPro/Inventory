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
- Product-level price search, separate standard/holo charts (7/30/90 days), daily prices, and top-five market rises/falls.
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

**Market estimates, not executable offers:** the daily guide does not isolate English NM/Mint listings, shipping, or a grading company/grade. Standard and holo series are kept separate; missing holo prices never fall back to standard. Confirm Cardmarket product identity/series for ambiguous names; the catalog shows its product and expansion IDs. Numbers, set names and card artwork are enriched from TCGdex using explicit Cardmarket product IDs. Ambiguous mappings are omitted; unmatched items keep their original catalog names and placeholder illustrations. Graded valuations never use raw card trend prices.

Unknown prices are `null`, excluded from valued totals and unrealised gain; their count is shown. Total investment includes all purchases. Gain percentage uses the acquisition cost of priced items only. Prices older than 48 hours are labelled. Daily snapshots include additions/removals and manual valuations, and are **portfolio totals, not time-weighted investment returns**. Snapshots use the Europe/Berlin calendar date. History begins at your first successful import; no earlier history is fabricated. Catalog data can be stale if Cardmarket has not published a new file; source timestamps remain visible.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm audit
```

Domain tests cover missing prices, graded/holo isolation, zero-cost purchases, validation, source-version failures, and timezone parsing. Before production use, test Neon migrations/imports and actual email sign-in with your configured services.


## Card numbers and product images

- Search in any order, e.g. `Charizard 199 151`, `199/165 Charizard`, or `151 Charizard`. Titles show `Charizard ex · 199/165` with the set alongside it. Production and local search use the same bundled metadata snapshot.
- TCGdex provides English card artwork via verified Cardmarket IDs. Graded items display card artwork unless you upload a photo of your own slab; this is labelled in the item details.
- Every item supports a custom HTTPS image URL or a PNG/JPEG/WebP upload up to 400 KB. This includes sealed items. Cardmarket's public catalog does not supply product-image URLs, so sealed photos are not guessed from IDs. Images that fail to load fall back to a category illustration.
- Custom uploads are stored as compact data URLs in the private holding record (Neon text column) or browser storage in demo. Remote URLs load directly in the browser without a referrer. Browser storage limits still apply to demo collections with many photos.
- Run `npm run db:migrate` on an existing database to add `holdings.custom_image_url` before deploying this update. Migration is additive and keeps existing purchases.
- Metadata can be refreshed separately with `npm run metadata:refresh`; see `data/README.md`. Prices continue to come only from the official Cardmarket daily guide.

## Sealed images

The bundled `data/sealed-metadata.json` maps 522 sealed/non-single catalog products to TCGplayer image URLs from [TCGCSV](https://tcgcsv.com/). Matching requires a unique exact normalized name on both sides; accents and punctuation are normalized, but edition, quantity, case and variant words are retained. Uncertain matches are omitted. Custom photos always take priority. Images are loaded directly from the source CDN and can fall back to an icon if unavailable. Product artwork belongs to its respective owners.

Run `npm run metadata:sealed` after downloading the Cardmarket catalog. The build uses `.cache/tcgcsv-*.json` to avoid repeat requests. The script checks TCGCSV's `last-updated.txt` and refreshes cached files only when a different daily build is published. This is a metadata build step, never a browser API request. Review the generated mapping before committing it. It does not replace Cardmarket prices with TCGplayer prices.

## Product history and market movers

Run `npm run db:migrate` before the next sync to add `market_history`. Each successful sync stores compact standard/holo price pairs for the whole catalog in a JSONB snapshot keyed by Cardmarket's Europe/Berlin source date. Re-imports update that day; stale data cannot create a new observation. Snapshots and catalog updates commit atomically. The latest 90 calendar days relative to the newest source day are retained to bound storage. Monitor actual Neon storage as the catalog grows. No previous dates are backfilled or fabricated.

Price history searches the full catalog, including products you do not own. The chart uses actual calendar spacing and leaves breaks for recorded missing prices. Its percentage change compares the first and last available price within the selected window, with their dates shown. Overview retains the portfolio chart.

“On the radar” ranks the entire catalog by percentage change in standard trend between the two latest available source days; actual dates are shown because imports can be missed. Separate lists show up to five positive and five negative moves each for single cards and sealed/non-single products. Missing prices, zero starting prices and unchanged prices are excluded; a genuine numeric zero at the end remains a valid -100% move. Graded estimates and acquisition costs are never included. The daily guide does not provide language/condition-specific prices or sales volume. Two source days are required. Demo graphs and rankings are explicitly illustrative and do not claim real historical market movements.

Automatic PSA pricing is not enabled. A future PokemonPriceTracker integration requires a server-side API key, exact card/variant/grader/grade matching and the owner’s EU estimation rule: retain the numeric USD amount as the EUR estimate (USD 100 → estimated EUR 100), without applying an exchange rate. Preserve the original USD price and source timestamp, and label the result “EU estimate · USD 1:1”. This is a custom valuation assumption, not measured EU sales or currency conversion; raw Cardmarket trend must never substitute for a graded price.
