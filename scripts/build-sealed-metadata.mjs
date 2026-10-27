import { readFile, writeFile, mkdir } from 'node:fs/promises';
const headers = { 'User-Agent': 'GocaraPro-PokemonInventory/0.1.0' };
await mkdir('.cache', { recursive: true });
const stampResponse = await fetch('https://tcgcsv.com/last-updated.txt', { headers });
if (!stampResponse.ok) throw new Error(`TCGCSV timestamp ${stampResponse.status}`);
const sourceUpdatedAt = (await stampResponse.text()).trim();
let previousStamp = null;
try { previousStamp = (await readFile('.cache/tcgcsv-stamp.txt', 'utf8')).trim(); } catch {}
const refresh = previousStamp !== null && previousStamp !== sourceUpdatedAt;
async function cached(path, url) {
  if (!refresh) { try { return JSON.parse(await readFile(path, 'utf8')); } catch {} }
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`TCGCSV ${response.status}`);
  const data = await response.json();
  if (!data.success || !Array.isArray(data.results)) throw new Error('Invalid TCGCSV response');
  await writeFile(path, JSON.stringify(data));
  await new Promise(resolve => setTimeout(resolve, 150));
  return data;
}
// Refresh cached files only when TCGCSV has published a newer daily build.
// Only exact normalized product names are accepted; variant, pack and case markers are retained.
const normalize = name => name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sealed = JSON.parse(await readFile('.cache/sealed.json', 'utf8')).products;
const groups = (await cached('.cache/tcgcsv-groups.json', 'https://tcgcsv.com/tcgplayer/3/groups')).results;
const candidates = new Map();
for (const group of groups) {
  if (/japan|chinese|korean/i.test(group.name)) continue;
  const products = (await cached(`.cache/tcgcsv-${group.groupId}.json`, `https://tcgcsv.com/tcgplayer/3/${group.groupId}/products`)).results;
  for (const p of products) {
    if (p.extendedData?.some(e => ['Number', 'Rarity', 'Card Type'].includes(e.name)) || /code card/i.test(p.name)) continue;
    if (!p.imageUrl?.startsWith('https://tcgplayer-cdn.tcgplayer.com/product/')) continue;
    const key = normalize(p.name);
    candidates.set(key, [...(candidates.get(key) ?? []), p]);
  }
}
const counts = new Map();
for (const p of sealed) counts.set(normalize(p.name), (counts.get(normalize(p.name)) ?? 0) + 1);
const products = {};
for (const p of sealed) {
  const key = normalize(p.name), matches = candidates.get(key);
  if (counts.get(key) !== 1 || matches?.length !== 1) continue;
  const match = matches[0];
  products[p.idProduct] = { name: p.name, tcgplayerId: match.productId, sourceName: match.name, imageUrl: match.imageUrl, imageSource: 'TCGplayer via TCGCSV' };
}
await writeFile('data/sealed-metadata.json', JSON.stringify({ source: 'https://tcgcsv.com/', sourceUpdatedAt, generatedAt: new Date().toISOString(), products }, null, 2) + '\n');
await writeFile('.cache/tcgcsv-stamp.txt', sourceUpdatedAt);
console.log(`Mapped ${Object.keys(products).length} sealed products by unique exact normalized name.`);
