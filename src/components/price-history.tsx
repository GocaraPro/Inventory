"use client";
import { useEffect,useRef,useState } from 'react';
import { Search,TrendingUp,TrendingDown,Clock } from 'lucide-react';
import type { Product } from '@/lib/types';
import type { Movers,PricePoint } from '@/lib/market-history';
import { priceChange } from '@/lib/market-history';
import { productTitle } from '@/lib/product-display';
import { money } from '@/lib/valuation';
import ProductImage from './product-image';

export default function PriceHistory({demo}:{demo:boolean}){
  const chartRef=useRef<HTMLElement>(null);
  const [query,setQuery]=useState(''),[kind,setKind]=useState('card'),[results,setResults]=useState<Product[]>([]);
  const [selected,setSelected]=useState<Product|null>(null),[finish,setFinish]=useState('standard'),[days,setDays]=useState(30);
  const [points,setPoints]=useState<PricePoint[]>([]),[movers,setMovers]=useState<Movers|null>(null);
  const [searching,setSearching]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[searchError,setSearchError]=useState(''),[moverError,setMoverError]=useState('');
  const [hover,setHover]=useState<number|null>(null),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setMoverError('');
    fetch('/api/history',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();setMovers(await r.json());})
      .catch(()=>{if(!controller.signal.aborted)setMoverError('Market movers could not be loaded.');});
    return()=>controller.abort();
  },[retry]);
  useEffect(()=>{
    const controller=new AbortController();setResults([]);setSearchError('');setSearching(query.trim().length>=2);
    if(query.trim().length<2)return()=>controller.abort();
    const timer=setTimeout(()=>{
      fetch(`/api/catalog?q=${encodeURIComponent(query)}&kind=${kind}`,{signal:controller.signal})
        .then(async r=>{if(!r.ok)throw Error();setResults(await r.json());})
        .catch(()=>{if(!controller.signal.aborted)setSearchError('Catalog search is unavailable. Please try again.');})
        .finally(()=>{if(!controller.signal.aborted)setSearching(false);});
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,kind]);
  useEffect(()=>{
    const controller=new AbortController();setPoints([]);setError('');setHover(null);
    if(!selected)return()=>controller.abort();
    setLoading(true);
    fetch(`/api/history?id=${selected.id}&finish=${finish}`,{signal:controller.signal})
      .then(async r=>{if(!r.ok)throw Error();setPoints((await r.json()).points);})
      .catch(()=>{if(!controller.signal.aborted)setError('History could not be loaded. Please try again.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[selected,finish,retry]);
  function select(product:Product){setSelected(product);setFinish('standard');setQuery('');setResults([]);chartRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}
  const cutoff=new Date();cutoff.setUTCDate(cutoff.getUTCDate()-days+1);
  const data=points.filter(p=>p.date>=cutoff.toISOString().slice(0,10));
  const valid=data.filter((p):p is PricePoint & {price:number}=>p.price!==null);
  const first=valid[0],last=valid.at(-1),change=priceChange(first?.price??null,last?.price??null);
  const values=valid.map(p=>p.price),min=values.length?Math.min(...values)*.92:0,max=values.length?Math.max(...values)*1.08:1;
  const start=data.length?Date.parse(data[0].date):0,end=data.length?Date.parse(data.at(-1)!.date):1;
  const x=(date:string)=>start===end?420:70+(Date.parse(date)-start)/(end-start)*700;
  const y=(price:number)=>195-(price-min)/(max-min||1)*145;
  let pen=false;const line=data.map(p=>{if(p.price===null){pen=false;return '';}const segment=`${pen?'L':'M'}${x(p.date)},${y(p.price)}`;pen=true;return segment;}).join(' ');
  const point=hover===null?last:valid[hover]??last;
  return <div className="history-page">
    <section className="panel history-search"><div className="panel-heading"><div><h2>Explore a product</h2><p>Search the full catalog by name, set or card number.</p></div></div>
      <div className="history-search-controls"><div className="search-input"><Search size={18}/><input aria-label="Search price history" placeholder="Try Charizard 199 or 151 Elite Trainer Box…" value={query} onChange={e=>setQuery(e.target.value)}/></div><select aria-label="History product type" value={kind} onChange={e=>setKind(e.target.value)}><option value="card">Single cards</option><option value="sealed">Sealed products</option></select></div>
      <div aria-live="polite">{searching?<p className="history-message">Searching catalog…</p>:searchError?<p className="history-message" role="alert">{searchError}</p>:query.trim().length>=2&&!results.length?<p className="history-message">No matching products. Try a name, set or card number.</p>:null}</div>
      {!!results.length&&<div className="history-results">{results.map(p=><button key={p.id} onClick={()=>select(p)}><ProductImage item={p}/><span><strong>{productTitle(p)}</strong><small>{p.setName??p.category}</small></span><b>{p.trend===null?'Not priced':money(p.trend)}</b></button>)}</div>}
    </section>
    <section ref={chartRef} className="panel history-chart"><div className="panel-heading"><div>{selected?<div className="history-selected"><ProductImage item={selected}/><div><h2>{productTitle(selected)}</h2><p>{selected.setName??selected.category} · Cardmarket Trend · EUR / item</p></div></div>:<><h2>Individual price history</h2><p>Follow a product’s market price independently of your purchases.</p></>}</div><div className="history-chart-controls">{selected?.kind==='card'&&<select aria-label="History price series" value={finish} onChange={e=>setFinish(e.target.value)}><option value="standard">Standard trend</option><option value="holo">Holo trend</option></select>}<div className="segmented compact">{[7,30,90].map(d=><button key={d} className={days===d?'active':''} onClick={()=>{setDays(d);setHover(null);}}>{d}D</button>)}</div></div></div>
      {!selected?<div className="chart-empty"><Search size={30}/><strong>Which product are you watching?</strong><p>Search above or choose a market mover below.</p></div>:loading?<div className="chart-empty" role="status">Loading price history…</div>:error?<div className="chart-empty" role="alert"><p>{error}</p><button className="button secondary" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>:!valid.length?<div className="chart-empty"><Clock size={30}/><strong>No recorded prices for this series yet.</strong><p>History starts with the first daily import. Try a longer period or a different series.</p></div>:<>
        <div className="history-summary"><div><small>Latest recorded</small><strong>{money(last!.price)}</strong><span>{last!.date}</span></div><div><small>Change over available period</small><strong className={change&&change.change<0?'negative':'positive'}>{valid.length<2||!change?'—':`${change&&change.percent>=0?'+':''}${change?.percent.toFixed(2)??'—'}%`}</strong><span>{valid.length<2?'At least two observations needed':`${first.date} → ${last!.date}`}</span></div><div><small>Period low / high</small><strong>{money(Math.min(...values))} / {money(Math.max(...values))}</strong><span>{valid.length} recorded prices</span></div></div>
        <div className="history-readout" aria-live="polite">{point?.date} · {point?money(point.price):''}</div>
        <svg className="product-price-svg" viewBox="0 0 800 240" role="img" aria-label={`${productTitle(selected)} ${finish} price history in EUR`}>
          {[0,1,2,3].map(n=>{const price=min+(max-min)*n/3;return <g key={n}><line x1="70" x2="770" y1={y(price)} y2={y(price)} stroke="#e8ebe6" strokeDasharray="4 5"/><text x="4" y={y(price)+4} fontSize="11" fill="#798178">€{price.toFixed(price<10?2:0)}</text></g>;})}
          <path d={line} stroke="#39846a" strokeWidth="3" fill="none" strokeLinejoin="round"/>
          {valid.map((p,i)=><g key={p.date}><circle cx={x(p.date)} cy={y(p.price)} r="3" fill="#39846a"/><circle cx={x(p.date)} cy={y(p.price)} r="12" fill="transparent" tabIndex={0} aria-label={`${p.date}: ${money(p.price)}`} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}><title>{p.date}: {money(p.price)}</title></circle></g>)}
          {[...new Set([0,Math.floor((data.length-1)/2),data.length-1])].map(i=><text key={i} x={x(data[i].date)} y="230" textAnchor="middle" fontSize="11" fill="#798178">{data[i].date}</text>)}
        </svg>
        <details className="history-data"><summary>View daily prices</summary><div className="table-scroll"><table><thead><tr><th>Source date</th><th>Trend / item</th></tr></thead><tbody>{data.slice().reverse().map(p=><tr key={p.date}><td>{p.date}</td><td>{p.price===null?'Not available':money(p.price)}</td></tr>)}</tbody></table></div></details>
      </>}
      <div className="chart-caption">{demo?'Illustrative demo history — not actual historical market prices. ':'Up to 90 days of saved source prices. '}Missing prices are not treated as zero. Raw card trends do not represent PSA values.</div>
    </section>
    <div className="history-movers-heading"><div><h2>On the radar</h2><p>Top 5 rises and falls per category · by percentage · filtered 3-day median trend{movers?.demo?' · illustrative demo':''}</p><p>{movers?.from&&movers.to?`${movers.from} → ${movers.to} · two consecutive 3-observation windows`:'Six daily imports within eight days are needed to calculate filtered movements.'}</p></div></div>
    {moverError?<div className="notice warning" role="alert">{moverError}<button className="text-button" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>:!movers?<p role="status">Loading market movers…</p>:<>{(["cards","sealed"] as const).map(group=><section key={group} aria-label={group==="cards"?"Single card movers":"Sealed product movers"}><h3>{group==="cards"?"Single cards":"Sealed products"}</h3><div className="movers-grid">{(['gainers','losers'] as const).map(key=><section className="panel movers-panel" key={key}><div className="panel-heading"><h2>{key==='gainers'?<TrendingUp size={20}/>:<TrendingDown size={20}/>} {key==='gainers'?'Biggest risers':'Biggest fallers'}</h2></div>{movers[group][key].length?<ol>{movers[group][key].map(p=><li key={p.id}><button onClick={()=>select(p)}><ProductImage item={p}/><span className="mover-name"><strong>{productTitle(p)}</strong><small>{money(p.previous)} → {money(p.current)}</small></span><span className={key==='gainers'?'positive':'negative'}><b>{p.percent>0?'+':''}{p.percent.toFixed(2)}%</b><small>{p.change>0?'+':''}{money(p.change)}</small></span></button></li>)}</ol>:<div className="history-message">No qualifying {key==='gainers'?'rises':'falls'} yet. Prices must be at least €5 in both windows, move at least €1 and no more than 30%, with no daily price more than 30% from its window median.</div>}</section>)}</div></section>)}</>}
    <p className="valuation-note">Filters reduce outliers but cannot verify genuine demand. Market movements are reference signals, not sales-volume or liquidity measures. Trend does not isolate English NM/Mint sales. Graded cards are excluded.</p>
  </div>;
}
