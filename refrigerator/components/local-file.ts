'use client';
import {useEffect,useState} from 'react';
// Manufacturer documents are kept locally only (not redistributed in git), so pages
// check whether the file exists and fall back to the manufacturer's link otherwise.
export function useLocalFile(url:string){
 const [ok,setOk]=useState<boolean|null>(null);
 useEffect(()=>{let live=true;fetch(url,{method:'HEAD'}).then(r=>{if(live)setOk(r.ok&&!(r.headers.get('content-type')||'').includes('text/html'));}).catch(()=>{if(live)setOk(false);});return()=>{live=false;};},[url]);
 return ok;
}
