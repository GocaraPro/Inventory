import { matchesSearch,searchText } from './product-display';
import dataset from '../../data/card-metadata.json';
export type ProductMetadata={tcgdexId?:string|null;cardName?:string|null;cardNumber?:string|null;setTotal?:number|null;setName?:string|null;setCode?:string|null;imageUrl?:string|null;customImageUrl?:string|null};
type Entry=Omit<ProductMetadata,'customImageUrl'>;
const cards:Record<string,Entry>=dataset.cards;
const sets:Record<string,{setName:string;setCode:string}>=dataset.sets;
export function metadataFor(id:number,expansionId?:number):Entry{return cards[id]??(expansionId?sets[expansionId]??{}:{});}
export function enrich<T extends {expansionId:number;id?:number|string;productId?:number}>(item:T):T&Entry{return {...item,...metadataFor(item.productId??Number(item.id),item.expansionId)};}
export function matchingMetadataIds(query:string):number[]{return Object.entries(cards).filter(([id,m])=>matchesSearch(searchText({name:m.cardName??'',...m,id:Number(id)}),query)).map(([id])=>Number(id));}
