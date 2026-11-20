import { useEffect, useRef, useState, type ReactNode } from 'react';

export function FirstTimeHint({ id, enabled, className, children }: { id:string; enabled:boolean; className:string; children:ReactNode }) {
  const key=`lohas-rush:hint:${id}:v1`;
  const [hidden,setHidden]=useState(()=>{try{return localStorage.getItem(key)==='seen';}catch{return false;}});
  const shown=useRef(false);
  useEffect(()=>{
    if(!enabled&&shown.current){setHidden(true);return;}
    if(!enabled||hidden)return;
    // Media-query and pause updates may settle in successive commits on rotation.
    // Count a hint as seen only after it remains available to read.
    let expiry:ReturnType<typeof setTimeout>|undefined;
    const start=setTimeout(()=>{
      shown.current=true;
      try{localStorage.setItem(key,'seen');}catch{/* The hint still expires during this visit. */}
      expiry=setTimeout(()=>setHidden(true),8000);
    },150);
    return()=>{clearTimeout(start);clearTimeout(expiry);};
  },[enabled,hidden,key]);
  return enabled&&!hidden?<div className={className} role="status">{children}</div>:null;
}
