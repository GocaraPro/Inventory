'use client';
import {useEffect,useRef,useState} from 'react';
import type {Sale} from '@/lib/types';
import {money} from '@/lib/valuation';
import {saleTotals} from '@/lib/sales-math';
import {productTitle} from '@/lib/product-display';
export default function EditSaleModal({sale,restore,onClose,onSaved}:{sale:Sale;restore:boolean;onClose:()=>void;onSaved:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  const [price,setPrice]=useState(String(sale.salePrice)),[fees,setFees]=useState(String(sale.fees)),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{ref.current?.showModal();},[]);
  const totals=saleTotals(sale.quantity,sale.purchasePrice,Number(price),Number(fees));
  return <dialog ref={ref} className="item-modal" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <div className="modal-heading"><div><h2>{restore?'Return to inventory':'Edit sale'}</h2><p>{productTitle(sale.product)} · {sale.quantity} sold</p></div><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Close">×</button></div>
    <div className="modal-content"><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const form=new FormData(e.currentTarget);
      try{const response=await fetch('/api/sales',{method:restore?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:sale.id,revision:sale.revision,...(!restore?{salePrice:Number(price),fees:Number(fees),saleDate:form.get('date'),notes:form.get('notes')}:{})})});const data=await response.json().catch(()=>null);if(!response.ok||!data?.ok)throw new Error(data?.error||'Could not update sale. Refresh and try again.');onSaved();}
      catch(err){setError(err instanceof Error?err.message:'Could not update sale.');setBusy(false);}
    }}><fieldset disabled={busy} className="sale-fields">
      {restore?<p>This cancels the entire sale and returns {sale.quantity} item(s) as a separate purchase entry, with the original purchase cost of {money(sale.purchasePrice)} per item and original product details. This sale’s proceeds, costs and profit will be removed from Sales totals. No payment or refund is sent.</p>:<>
        <div className="form-grid"><label>Sale price / item (EUR)<input type="number" required min={0} max={10000000} step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label>
        <label>Total fees & costs (EUR)<input type="number" required min={0} max={10000000} step="0.01" value={fees} onChange={e=>setFees(e.target.value)}/></label>
        <label>Sale date<input name="date" type="date" required max={new Date().toISOString().slice(0,10)} defaultValue={sale.saleDate}/></label>
        <label className="full-width">Notes<textarea name="notes" maxLength={2000} defaultValue={sale.notes}/></label></div>
        <div className="sale-summary"><span>Net proceeds <b>{money(totals.net)}</b></span><span>Realised profit <b className={totals.profit>=0?'positive':'negative'}>{money(totals.profit)}</b></span></div>
        <p className="muted">To correct the product or quantity, return this sale to inventory, then record a new sale.</p>
      </>}
      {error&&<p className="error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit">{busy?'Saving…':restore?'Return to inventory':'Save changes'}</button></div>
    </fieldset></form></div>
  </dialog>;
}
