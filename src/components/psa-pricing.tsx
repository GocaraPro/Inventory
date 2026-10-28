"use client";
import {useState} from 'react';
import {money} from '@/lib/valuation';
export type PsaSelection={enabled:boolean;id:string;printing:string;confirmed:boolean;usd:number|null;date:string|null};
type Lookup={id:string;name:string;set:string;number:string;options:{printing:string;quote:{usd:number;eur:number;date:string;sales:number}|null}[]};
export default function PsaPricing({value,onChange,grade,company,productId,automaticId}:{productId?:number;automaticId?:number|null;value:PsaSelection;onChange:(v:PsaSelection)=>void;grade:string;company:string}){
  const [result,setResult]=useState<Lookup|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function lookup(automatic=false){
    setBusy(true);setError('');setResult(null);onChange({...value,printing:'',confirmed:false,usd:null,date:null});
    try{const res=await fetch('/api/psa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(automatic?{productId,grade}:{id:Number(value.id),grade})});const body=await res.json();if(!res.ok)throw new Error(body.error??'Lookup failed.');setResult(body);onChange({...value,id:String(body.id),printing:"",confirmed:false,usd:null,date:null});}catch(e){setError(e instanceof Error?e.message:'Lookup failed.');}finally{setBusy(false);}
  }
  return <div className="full-width psa-editor"><label className="psa-toggle"><input type="checkbox" checked={value.enabled} disabled={busy||company.trim().toUpperCase()!=='PSA'} onChange={e=>onChange({...value,enabled:e.target.checked})}/>Automatic PSA pricing</label>
    {value.enabled&&<><p>Find the linked card automatically, then confirm its printing. Its PSA {grade} price will refresh daily.</p>
      {automaticId&&<button className="button secondary" type="button" disabled={busy} onClick={()=>lookup(true)}>{busy?"Finding PSA price…":"Find PSA price automatically"}</button>}
      {!automaticId&&<p>No verified automatic match is available for this card yet. You can use its TCGplayer ID below.</p>}
      <details><summary>Manual TCGplayer ID (optional)</summary><label>TCGplayer product ID<input type="number" min="1" step="1" disabled={busy} value={value.id} placeholder="Number from the TCGplayer product URL" onChange={e=>{setResult(null);onChange({...value,id:e.target.value,printing:'',confirmed:false,usd:null,date:null});}}/></label>
      <button className="button secondary" type="button" disabled={busy||!value.id} onClick={()=>lookup(false)}>{busy?'Looking up…':'Look up PSA card'}</button></details>
      {result&&<div className="psa-match"><strong>{result.name} · {result.number}</strong><p>{result.set} · PSA {grade} · <a href={`https://www.tcgplayer.com/product/${result.id}`} target="_blank" rel="noreferrer">View source card</a></p><label>Exact printing<select value={value.printing} onChange={e=>{const quote=result.options.find(o=>o.printing===e.target.value)?.quote;onChange({...value,printing:e.target.value,confirmed:false,usd:quote?.usd??null,date:quote?.date??null});}}><option value="">Choose printing…</option>{result.options.map(o=><option key={o.printing}>{o.printing}</option>)}</select></label>
        {value.printing&&(value.usd===null?<p>No dated PSA sales median for this printing and grade. Keep manual pricing for now.</p>:<><p><b>{money(value.usd)}</b> · EU estimate · USD 1:1<br/>Source median: ${value.usd.toFixed(2)} USD · Latest reported sale: {value.date?.slice(0,10)}</p><label className="psa-toggle"><input type="checkbox" checked={value.confirmed} onChange={e=>onChange({...value,confirmed:e.target.checked})}/>I confirm this is the same card, set, printing and PSA grade.</label></>)}
      </div>}
      {!result&&value.confirmed&&<p>Linked: TCGplayer #{value.id} · {value.printing} · PSA {grade}{value.usd!==null?` · ${money(value.usd)}`:''}</p>}
      {error&&<p className="error" role="alert">{error}</p>}
      <small>EU estimate keeps the USD number unchanged: $100 → €100. No exchange rate is applied. Up to 45 unique card lookups per UTC day; repeated successful lookups are cached.</small>
    </>}
  </div>;
}
