import {db} from '../src/lib/db';
import {syncCardmarket} from '../src/lib/sync';
async function main() {
const [row]=await db()`SELECT EXISTS(SELECT 1 FROM catalog) AS populated`;
if (!row.populated) {
  const result=await syncCardmarket();
  console.log(`Initial Cardmarket import complete: ${result.products} products.`);
} else console.log('Cardmarket catalog already populated.');
}
main().catch(error=>{console.error('Initial catalog import failed.',error instanceof Error?error.message:'Unknown error');process.exitCode=1;});
