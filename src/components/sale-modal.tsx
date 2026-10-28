'use client';
import {useEffect,useRef,useState} from 'react';
import type {Holding} from '@/lib/types';
import {money} from '@/lib/valuation';
import {saleTotals} from '@/lib/sales-math';
import {productTitle} from '@/lib/product-display';
import ProductImage from './product-image';
export default function SaleModal({item,onClose,onSold}:{item:Holding;onClose:()=>void;onSold:()=>void}){
  const ref=useRef<HTMLDialogElement>(null),submission=useRef('');
  const [quantity,setQuantity]=useState(1),[price,setPrice]=useState(String(item.currentPrice??'')),[fees,setFees]=useState('0'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{ref.current?.showModal();submission.current=crypto.randomUUID();},[]);
  const totals=saleTotals(quantity,item.purchasePrice,Number(price),Number(fees));
  return <dialog ref={ref} className="item-modal" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><div className="modal-heading"><div><h2>Record a sale</h2><p>Record payment received and keep your profit history.</p></div><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Close sale">×</button></div><div className="modal-content">
    <div className="selected-product"><ProductImage item={item}/><div><strong>{productTitle(item)}</strong><p>{item.quantity} available · Purchase / item: {money(item.purchasePrice)}</p></div></div>
    <form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);
      try {const response=await fetch('/api/sales',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:submission.current,holdingId:item.id,quantity,salePrice:Number(price),fees:Number(fees),saleDate:form.get('date'),notes:form.get('notes')})});const data=await response.json();if(!response.ok)throw new Error(data.error);onSold();}
      catch(e){setError(e instanceof Error?e.message:'Sale could not be recorded.');setBusy(false);}
    }}><fieldset disabled={busy} className="sale-fields"><div className="form-grid">
      <label>Quantity sold<input type="number" required min={1} max={item.quantity} step={1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
      <label>Sale price / item (EUR)<input type="number" required min={0} max={10000000} step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label>
      <label>Total fees & costs (EUR)<input type="number" required min={0} max={10000000} step="0.01" value={fees} onChange={e=>setFees(e.target.value)}/></label>
      <label>Sale date<input type="date" name="date" required min={item.purchaseDate} max={new Date().toISOString().slice(0,10)} defaultValue={new Date().toISOString().slice(0,10)}/></label>
      <label className="full-width">Notes<textarea name="notes" maxLength={2000} placeholder="Marketplace, shipping, order reference…"/></label>
    </div><div className="sale-summary"><span>Net proceeds <b>{money(totals.net)}</b></span><span>Purchase cost <b>{money(totals.cost)}</b></span><span>Realised profit <b className={totals.profit>=0?'positive':'negative'}>{money(totals.profit)}</b></span></div>
    <p className="muted">Include marketplace fees, shipping you paid and other selling costs in the total. Sold units leave your active collection.</p>
    {error&&<p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary">{busy?'Recording…':'Record sale'}</button></div></fieldset></form>
  </div></dialog>;
}
