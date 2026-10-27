"use client";
import { useState } from "react";
import { Box,Layers,ShieldCheck,ImageOff } from "lucide-react";
import type { ProductMetadata } from "@/lib/product-metadata";
import { safeImageUrl } from "@/lib/product-display";
export default function ProductImage({item,large=false}:{item:{name:string;kind:string;grade?:string|null}&ProductMetadata;large?:boolean}){
  const url=safeImageUrl(item.customImageUrl||item.imageUrl),[failed,setFailed]=useState<string|null>(null);
  const Icon=item.kind==='sealed'?Box:item.kind==='graded'?ShieldCheck:Layers;
  return <span className={`product-art ${item.kind} ${large?'large':''} ${url&&failed!==url?'has-image':''}`}>
    {url&&failed!==url?<img src={url} alt={item.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(url)}/>:<Icon size={large?42:24}/>}
    {large&&(!url||failed===url)&&<small><ImageOff size={12}/> No image available</small>}
    {item.kind==='graded'&&<span className="grade-tag">{item.grade}</span>}
  </span>;
}
