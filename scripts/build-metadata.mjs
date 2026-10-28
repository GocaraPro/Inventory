import ts from 'typescript';
import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
// Parse literals only. Imports, expressions, functions, and source code are never executed.
function literal(node) {
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
  if(ts.isNumericLiteral(node))return Number(node.text);
  if(ts.isArrayLiteralExpression(node))return node.elements.map(literal);
  if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText().replace(/^['"]|['"]$/g,''),literal(p.initializer)]));
  return undefined;
}
async function readObject(file) {
  const ast=ts.createSourceFile(file,await readFile(file,'utf8'),ts.ScriptTarget.Latest,true);
  for(const stmt of ast.statements)if(ts.isVariableStatement(stmt))for(const decl of stmt.declarationList.declarations)if(decl.initializer&&ts.isObjectLiteralExpression(decl.initializer))return literal(decl.initializer);
  return {};
}
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.name.endsWith('.ts'))out.push(p);}return out;}
const root=path.resolve('.cache/tcgdex-source/data');
const cards=new Map(JSON.parse(await readFile('.cache/tcgdex-cards.json','utf8')).map(c=>[c.id,c]));
const metadata={},sets={},conflicts=new Set();
for(const serie of await readdir(root,{withFileTypes:true})){
  if(!serie.isDirectory())continue;
  const dir=path.join(root,serie.name);
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(!entry.isFile()||!entry.name.endsWith('.ts'))continue;
    const set=await readObject(path.join(dir,entry.name));
    if(!set.id||!set.name?.en)continue;
    if(Number.isInteger(set.thirdParty?.cardmarket))sets[set.thirdParty.cardmarket]={setName:set.name.en,setCode:set.id};
    let files;try{files=await walk(path.join(dir,entry.name.slice(0,-3)));}catch{continue;}
    for(const file of files){
      const source=await readObject(file),id=`${set.id}-${path.basename(file,'.ts')}`,card=cards.get(id);
      if(!card||!source.name?.en)continue;
      const mappings=[source.thirdParty?.cardmarket,...(Array.isArray(source.variants)?source.variants.map(v=>v?.thirdParty?.cardmarket):[])];
      const ids=[...new Set(mappings.filter(Number.isInteger))];
      for(const productId of ids){
        if(metadata[productId]&&metadata[productId].tcgdexId!==id){conflicts.add(productId);continue;}
        const links=[source,...(Array.isArray(source.variants)?source.variants:[])];
        const exact=links.filter(v=>v.thirdParty?.cardmarket===productId);
        const tcgIds=[...new Set(exact.map(v=>v.thirdParty?.tcgplayer).filter(Number.isInteger))];
        metadata[productId]={tcgdexId:id,tcgplayerId:tcgIds.length===1?tcgIds[0]:null,cardName:card.name,cardNumber:card.localId,setTotal:set.cardCount?.official??null,setName:set.name.en,setCode:set.id,imageUrl:card.image?`${card.image}/high.webp`:null};
      }
    }
  }
}
for(const id of conflicts)delete metadata[id];
if(!metadata[733794]||metadata[733794].cardNumber!=='199')throw new Error('Expected Charizard 199 mapping missing; refusing to replace metadata');
await mkdir('data',{recursive:true});
await writeFile('data/card-metadata.json',JSON.stringify({source:'TCGdex',generatedAt:new Date().toISOString(),cards:metadata,sets}));
await copyFile('.cache/tcgdex-source/LICENSE','data/TCGDEX-LICENSE');
console.log(`Mapped ${Object.keys(metadata).length} Cardmarket products and ${Object.keys(sets).length} sets; omitted ${conflicts.size} ambiguous IDs.`);
