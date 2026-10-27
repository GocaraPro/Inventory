"use client";
import { useState } from "react";
import type { Snapshot } from "@/lib/types";
import { money } from "@/lib/valuation";
export default function Chart({snapshots}:{snapshots:Snapshot[]}) {
  const [range,setRange]=useState(30),[hover,setHover]=useState<number|null>(null);
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-range);
  const data=range===0?snapshots:snapshots.filter(s=>s.date>=cutoff.toISOString().slice(0,10));
  const min=data.length?Math.min(...data.map(p=>p.value))*.88:0,max=data.length?Math.max(...data.map(p=>p.value))*1.08:1;
  const y=(v:number)=>178-(v-min)/(max-min||1)*145;
  const x=(i:number)=>data.length===1?400:60+i/(data.length-1)*700;
  const line=data.map((p,i)=>`${i===0?"M":"L"}${x(i)},${y(p.value)}`).join(" ");
  const point=hover===null?null:data[hover];
  return <section className="panel chart-panel"><div className="panel-heading"><div><h2>Collection value</h2><p>Your collection, over time</p></div><div className="segmented compact">{[[7,"7D"],[30,"30D"],[90,"90D"],[365,"1Y"],[0,"All"]].map(([v,t])=><button key={v} onClick={()=>{setRange(Number(v));setHover(null);}} className={range===v?"active":""}>{t}</button>)}</div></div>
    {data.length===0?<div className="chart-empty"><span className="empty-chart-icon">↗</span><strong>A little time tells a bigger story.</strong><p>Your first daily price update will start your chart.</p></div>:<div className="chart-wrap"><div className="chart-readout" aria-live="polite">{point?<><b>{money(point.value)}</b><span>{new Date(point.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}{point.unpriced?` · ${point.unpriced} unpriced`:""}</span></>:<><b>{money(data[data.length-1].value)}</b><span>Latest recorded value</span></>}</div><svg viewBox="0 0 800 220" role="img" aria-label="Daily collection value in euros"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#368063" stopOpacity=".15"/><stop offset="100%" stopColor="#368063" stopOpacity="0"/></linearGradient></defs>{[0,1,2,3].map(n=>{const v=min+(max-min)*n/3;return <g key={n}><line x1="60" x2="760" y1={y(v)} y2={y(v)} stroke="#eceeea" strokeDasharray="4 5"/><text x="0" y={y(v)+4} fill="#929790" fontSize="11">€{Math.round(v).toLocaleString("en")}</text></g>;})}
    <path d={`${line} L${x(data.length-1)},185 L${x(0)},185 Z`} fill="url(#chart-fill)"/><path d={line} fill="none" stroke="#39846a" strokeWidth="2.8" strokeLinejoin="round"/>{data.map((p,i)=><g key={p.date} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}><circle cx={x(i)} cy={y(p.value)} r={data.length===1||hover===i?4:0} fill="#39846a"/><circle cx={x(i)} cy={y(p.value)} r="12" fill="transparent"><title>{`${p.date}: ${money(p.value)}`}</title></circle></g>)}{[...new Set([0,Math.floor((data.length-1)/3),Math.floor((data.length-1)*2/3),data.length-1])].map(i=><text key={i} x={x(i)} y="212" textAnchor="middle" fill="#929790" fontSize="11">{new Date(data[i].date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</text>)}</svg></div>}
    <div className="chart-caption">Daily portfolio snapshots · Purchases and removals also affect the total.</div></section>;
}
