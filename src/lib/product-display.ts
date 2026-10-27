import type { ProductMetadata } from './product-metadata';
export function productTitle(item:{name:string}&ProductMetadata){
  const name=item.cardName||item.name;
  return item.cardNumber?`${name} · ${item.cardNumber}${item.setTotal?`/${item.setTotal}`:''}`:name;
}
export function searchText(item:{name:string;productId?:number;id?:number|string}&ProductMetadata){return [item.name,item.cardName,item.cardNumber,item.setTotal,item.setName,item.setCode,item.productId??item.id].filter(v=>v!=null).join(' ');}
export function tokens(query:string){return query.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);}
export function matchesSearch(text:string,query:string){const haystack=tokens(text).join(' ');return tokens(query).every(t=>/^\d+$/.test(t)?haystack.split(' ').some(w=>/^\d+$/.test(w)&&Number(w)===Number(t)):haystack.includes(t));}
export function safeImageUrl(value:string|null|undefined):string|null{
  if(!value)return null;
  if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)&&value.length<=600000)return value;
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
