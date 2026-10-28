'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import EditSaleModal from './edit-sale-modal';
import type {Sale} from '@/lib/types';
import {saleTotals} from '@/lib/sales-math';
import {money} from '@/lib/valuation';
import {productTitle} from '@/lib/product-display';
import ProductImage from './product-image';
export default function SalesHistory({sales}:{sales:Sale[]}){
  const [query,setQuery]=useState('');
  const router=useRouter();
  const [editing,setEditing]=useState<{sale:Sale;restore:boolean}|null>(null);
  const [message,setMessage]=useState('');
  const totals=sales.reduce((sum,s)=>{const t=saleTotals(s.quantity,s.purchasePrice,s.salePrice,s.fees);return {net:sum.net+t.net,profit:sum.profit+t.profit,fees:sum.fees+s.fees};},{net:0,profit:0,fees:0});
  const filtered=sales.filter(s=>`${productTitle(s.product)} ${s.notes}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel sales-panel"><div className="panel-heading"><div><h2>Sales & realised profit</h2><p>Completed sales, separate from your active collection’s estimated gains.</p></div></div>
    <div className="sale-summary"><span>Net proceeds <b>{money(totals.net)}</b></span><span>Selling costs <b>{money(totals.fees)}</b></span><span>Realised profit <b className={totals.profit>=0?'positive':'negative'}>{money(totals.profit)}</b></span></div>
    <div className="sales-search"><input aria-label="Search sales" placeholder="Search sold products or notes…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    {message&&<p role="status">{message}</p>}
    {editing&&<EditSaleModal sale={editing.sale} restore={editing.restore} onClose={()=>setEditing(null)} onSaved={()=>{setMessage(editing.restore?'Sale cancelled. Items returned to My collection.':'Sale updated. Profit recalculated.');setEditing(null);router.refresh();}}/>}
    <div className="table-scroll"><table className="inventory-table"><thead><tr><th>Product</th><th>Date</th><th>Qty sold</th><th>Purchase / item</th><th>Sale / item</th><th>Total costs</th><th>Realised profit</th><th>Actions</th></tr></thead><tbody>{filtered.map(s=>{const t=saleTotals(s.quantity,s.purchasePrice,s.salePrice,s.fees);return <tr key={s.id}><td><div className="product-cell"><ProductImage item={s.product}/><span><strong>{productTitle(s.product)}</strong><small>{s.product.kind==='graded'?`${s.product.gradingCompany} ${s.product.grade}`:s.product.category}</small>{s.notes&&<small>{s.notes}</small>}</span></div></td><td>{s.saleDate}</td><td>{s.quantity}</td><td>{money(s.purchasePrice)}</td><td>{money(s.salePrice)}</td><td>{money(s.fees)}</td><td className={t.profit>=0?'positive':'negative'}>{money(t.profit)}</td><td><div className="row-actions"><button className="button secondary" onClick={()=>setEditing({sale:s,restore:false})}>Edit sale</button><button className="button secondary" onClick={()=>setEditing({sale:s,restore:true})}>Return to inventory</button></div></td></tr>;})}</tbody></table></div>
    {!filtered.length&&<div className="empty-state"><h3>{sales.length?'No matching sales':'No sales recorded yet.'}</h3><p>Use Sell beside a product in My collection to record your first sale.</p></div>}
  </section>;
}
