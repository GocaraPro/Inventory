import { mkdir, writeFile } from 'node:fs/promises';
const base = 'https://downloads.s3.cardmarket.com/productCatalog/';
await mkdir('.cache', { recursive: true });
for (const [name, path] of Object.entries({ singles: 'productList/products_singles_6.json', sealed: 'productList/products_nonsingles_6.json', prices: 'priceGuide/price_guide_6.json' })) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.version !== 1) throw new Error('Unsupported Cardmarket data version');
  await writeFile(`.cache/${name}.json`, JSON.stringify(data));
  console.log(`${name}: ${data.createdAt}, ${(data.products ?? data.priceGuides).length} records`);
}
