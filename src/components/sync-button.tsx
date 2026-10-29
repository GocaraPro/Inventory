'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function SyncButton() {
  const [pending,setPending]=useState(false),[message,setMessage]=useState('');
  const router=useRouter();
  return <div><button className="button secondary" disabled={pending} onClick={async()=>{
    setPending(true);setMessage('');
    try {
      const response=await fetch('/api/sync',{method:'POST'}),data=await response.json();
      if(!response.ok)throw new Error(data.error);
      setMessage(`${data.products.toLocaleString()} products updated. PSA: ${data.psa?.updated??0} refreshed.${data.psa?.error?` ${data.psa.error}`:""}`);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Import failed.');}
    finally{setPending(false);}
  }}>{pending?'Importing products…':'Refresh catalog & prices'}</button><p role="status">{message}</p></div>;
}
