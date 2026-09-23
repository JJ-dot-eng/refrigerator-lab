// Browser side of CAD import: OpenCascade (WebAssembly) is loaded only when a STEP/IGES file is
// opened, and the original files are kept in this browser's IndexedDB so a reload can rebuild
// the model. Nothing is uploaded anywhere.
import {parseCad} from '@/generator/cad.mjs';

export type CadMesh={name:string;positions:number[];indices:number[]};
export type CadFile={meshes:CadMesh[];triangles:number};

type Occt={ReadStepFile:(b:Uint8Array,p:unknown)=>unknown;ReadIgesFile:(b:Uint8Array,p:unknown)=>unknown};
let occt:Promise<Occt>|null=null;
function getOcct(){
 occt??=(async()=>{
  const [{default:factory},{default:wasmUrl}]=await Promise.all([import('occt-import-js'),import('occt-import-js/dist/occt-import-js.wasm?url')]);
  return (factory as unknown as (o:{locateFile:()=>string})=>Promise<Occt>)({locateFile:()=>wasmUrl});
 })();
 return occt;
}

export async function parseCadFile(name:string,bytes:Uint8Array):Promise<CadFile>{return parseCad(name,bytes,getOcct) as Promise<CadFile>;}

// ---------- IndexedDB: original CAD files by name ----------
const DB='refrigerator-cad',STORE='files';
function db(){return new Promise<IDBDatabase>((ok,fail)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);});}
function tx<T>(mode:IDBTransactionMode,run:(s:IDBObjectStore)=>IDBRequest<T>){return db().then(d=>new Promise<T>((ok,fail)=>{const r=run(d.transaction(STORE,mode).objectStore(STORE));r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);}));}
export const saveCadBytes=(name:string,bytes:Uint8Array)=>tx('readwrite',s=>s.put(bytes,name));
export const loadCadBytes=(name:string)=>tx<Uint8Array|undefined>('readonly',s=>s.get(name) as IDBRequest<Uint8Array|undefined>);
