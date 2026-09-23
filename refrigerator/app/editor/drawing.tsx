'use client';
// 2D drawing view: the model projected onto front / rear / side / top, with the user's own
// drawing (image or PDF page) behind it. Align the drawing to the cabinet outline, then drag
// parts onto where the drawing shows them. Files stay in the browser.
import {useRef,useState,type PointerEvent as RPointerEvent,type WheelEvent as RWheelEvent} from 'react';
import type {SceneData} from '@/components/model-scene';
type V3=[number,number,number];
type Proj={label:string;to:(p:number[])=>[number,number];delta:(du:number,dv:number)=>V3};
// Screen axes: u to the right, v downwards (SVG), in mm.
const PROJECTIONS:Record<string,Proj>={
 front:{label:'정면',to:p=>[p[0],-p[2]],delta:(du,dv)=>[du,0,-dv]},
 rear:{label:'후면',to:p=>[-p[0],-p[2]],delta:(du,dv)=>[-du,0,-dv]},
 side:{label:'측면 (앞이 오른쪽)',to:p=>[-p[1],-p[2]],delta:(du,dv)=>[0,-du,-dv]},
 top:{label:'평면 (앞이 아래)',to:p=>[p[0],-p[1]],delta:(du,dv)=>[du,-dv,0]},
};
type Backdrop={src:string;w:number;h:number;x:number;y:number;scale:number;opacity:number};
type Mode='parts'|'image'|'scale';
type Props={model:SceneData['model']|null;routes:{routes:{id:string;points:number[][];outerDiameterMm?:number}[]}|null;movable:Set<string>;names:Record<string,string>;
 selected:string;onSelect:(id:string)=>void;onMove:(id:string,d:V3)=>void;bad:Set<string>};

async function pdfPage(file:File,page:number):Promise<{src:string;w:number;h:number;pages:number}>{
 const pdfjs=await import('pdfjs-dist');
 // ?url makes the bundler emit the worker as a file and give back its URL (works under the Pages sub-path).
 pdfjs.GlobalWorkerOptions.workerSrc=(await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
 const doc=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
 const p=await doc.getPage(Math.min(Math.max(1,page),doc.numPages)),vp=p.getViewport({scale:2});
 const canvas=document.createElement('canvas');canvas.width=vp.width;canvas.height=vp.height;
 // 'print' renders in one go; the display intent waits on animation frames, which stall in background tabs.
 await p.render({canvas,viewport:vp,intent:'print'}).promise;
 return {src:canvas.toDataURL('image/png'),w:vp.width,h:vp.height,pages:doc.numPages};
}
function imageSize(src:string){return new Promise<{w:number;h:number}>((ok,fail)=>{const i=new Image();i.onload=()=>ok({w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>fail(Error('그림을 읽지 못했습니다'));i.src=src;});}

export default function DrawingView(p:Props){
 const [view,setView]=useState('front'),[mode,setMode]=useState<Mode>('parts');
 const [backs,setBacks]=useState<Record<string,Backdrop>>({}),[file,setFile]=useState<{f:File;pages:number;page:number}|null>(null),[msg,setMsg]=useState('');
 const [zoom,setZoom]=useState<{cx:number;cy:number;k:number}|null>(null),[scalePts,setScalePts]=useState<[number,number][]>([]),[realLen,setRealLen]=useState('');
 // Drags remember where they started (pointer, image origin, view centre) so fast moves never accumulate error.
 const [drag,setDrag]=useState<{kind:'part'|'image'|'pan';id?:string;start:[number,number];moved:[number,number];origin:[number,number]}|null>(null);
 const svg=useRef<SVGSVGElement>(null),fileInput=useRef<HTMLInputElement>(null);
 const proj=PROJECTIONS[view],back=backs[view];
 // Group part bounds by component; pipes as projected polylines.
 const groups:Record<string,{min:number[];max:number[]}>={};
 for(const part of p.model?.parts??[]){if(part.kind==='pipe')continue;const b=(part as unknown as {boundsMm:{min:number[];max:number[]}}).boundsMm,id=part.group||part.id;
  const g=groups[id]??={min:[...b.min],max:[...b.max]};for(let i=0;i<3;i++){g.min[i]=Math.min(g.min[i],b.min[i]);g.max[i]=Math.max(g.max[i],b.max[i]);}}
 const rect=(g:{min:number[];max:number[]})=>{const cs=[0,1].flatMap(a=>[0,1].flatMap(b=>[0,1].map(c=>proj.to([[g.min[0],g.max[0]][a],[g.min[1],g.max[1]][b],[g.min[2],g.max[2]][c]]))));
  const us=cs.map(c=>c[0]),vs=cs.map(c=>c[1]);return {x:Math.min(...us),y:Math.min(...vs),w:Math.max(...us)-Math.min(...us),h:Math.max(...vs)-Math.min(...vs)};};
 const cab=groups.cabinet?rect(groups.cabinet):{x:-400,y:-1000,w:800,h:1000};
 const pad=Math.max(cab.w,cab.h)*.08,base={x:cab.x-pad,y:cab.y-pad,w:cab.w+2*pad,h:cab.h+2*pad};
 const vb=zoom?{w:base.w/zoom.k,h:base.h/zoom.k,x:zoom.cx-base.w/zoom.k/2,y:zoom.cy-base.h/zoom.k/2}:base;
 const toMm=(e:{clientX:number;clientY:number}):[number,number]=>{const s=svg.current!,pt=s.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(s.getScreenCTM()!.inverse());return [q.x,q.y];};
 const setBack=(b:Partial<Backdrop>)=>setBacks(all=>({...all,[view]:{...all[view],...b}}));

 async function load(f:File,page=1){setMsg('');try{
  if(f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf')){const r=await pdfPage(f,page);setFile({f,pages:r.pages,page:Math.min(page,r.pages)});place(r.src,r.w,r.h);}
  else{const src=URL.createObjectURL(f);const s=await imageSize(src);setFile(null);place(src,s.w,s.h);}
 }catch(e){setMsg(`도면을 열지 못했습니다: ${(e as Error).message}`);}}
 // First placement: fit the drawing to the cabinet outline height; the user then aligns it.
 function place(src:string,w:number,h:number){const scale=cab.h/h;setBack({src,w,h,scale,x:cab.x+cab.w/2-w*scale/2,y:cab.y,opacity:.55});setMode('image');}
 function applyScale(){const [a,b]=scalePts,len=Number(realLen);if(!back||!a||!b||!(len>0))return;
  const measured=Math.hypot(b[0]-a[0],b[1]-a[1]),k=len/measured,s=back.scale*k;
  setBack({scale:s,x:a[0]-(a[0]-back.x)*k,y:a[1]-(a[1]-back.y)*k});setScalePts([]);setRealLen('');setMode('image');}

 function down(e:RPointerEvent<SVGElement>,kind:'part'|'image'|'pan',id?:string){
  e.stopPropagation();const at=toMm(e);
  if(mode==='scale'){if(back)setScalePts(pts=>pts.length>=2?[at]:[...pts,at]);return;}
  if(kind==='part'&&id){p.onSelect(id);if(!p.movable.has(id)){kind='pan';}}
  const z=zoom??{cx:base.x+base.w/2,cy:base.y+base.h/2,k:1},origin:[number,number]=kind==='image'&&back?[back.x,back.y]:[z.cx,z.cy];
  try{(e.target as Element).setPointerCapture(e.pointerId);}catch{/* capture is a nicety; dragging works without it */}
  setDrag({kind,id,start:at,moved:[0,0],origin});}
 function move(e:RPointerEvent<SVGSVGElement>){if(!drag)return;const at=toMm(e),d:[number,number]=[at[0]-drag.start[0],at[1]-drag.start[1]];
  // Panning shifts the view, so measure the pointer in screen-stable terms: undo the shift already applied.
  if(drag.kind==='pan'){const z=zoom??{cx:base.x+base.w/2,cy:base.y+base.h/2,k:1},applied=[drag.origin[0]-z.cx,drag.origin[1]-z.cy];setZoom({...z,cx:drag.origin[0]-(d[0]+applied[0]),cy:drag.origin[1]-(d[1]+applied[1])});return;}
  if(drag.kind==='image'&&back){setBack({x:drag.origin[0]+d[0],y:drag.origin[1]+d[1]});return;}
  setDrag({...drag,moved:d});}
 function up(){if(drag?.kind==='part'&&drag.id&&(Math.abs(drag.moved[0])>.5||Math.abs(drag.moved[1])>.5)){
  const d=proj.delta(drag.moved[0],drag.moved[1]).map(v=>Math.round(v*10)/10) as V3;p.onMove(drag.id,d);}setDrag(null);}
 function wheel(e:RWheelEvent<SVGSVGElement>){const at=toMm(e),f=e.deltaY<0?1.12:1/1.12;
  if(mode==='image'&&back){setBack({scale:back.scale*f,x:at[0]-(at[0]-back.x)*f,y:at[1]-(at[1]-back.y)*f});return;}
  const z=zoom??{cx:base.x+base.w/2,cy:base.y+base.h/2,k:1},k=Math.min(20,Math.max(1,z.k*f));setZoom({k,cx:at[0]-(at[0]-z.cx)*z.k/k,cy:at[1]-(at[1]-z.cy)*z.k/k});}

 const order=Object.entries(groups).sort(([,a],[,b])=>(b.max[0]-b.min[0])*(b.max[2]-b.min[2])-(a.max[0]-a.min[0])*(a.max[2]-a.min[2]));
 return <div className="dw">
  <div className="hr-tools dw-tools">
   {Object.entries(PROJECTIONS).map(([k,v])=><button key={k} className={view===k?'active':''} onClick={()=>{setView(k);setZoom(null);setScalePts([]);}}>{v.label}</button>)}
   <span className="dw-sep"/>
   <button onClick={()=>fileInput.current?.click()}>도면 열기 (그림·PDF)</button>
   <input ref={fileInput} type="file" accept="image/*,.pdf,application/pdf" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void load(f);e.target.value='';}}/>
   {file&&file.pages>1&&<label className="dw-page">쪽 <input type="number" min={1} max={file.pages} value={file.page} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=file.pages)void load(file.f,n);}}/> / {file.pages}</label>}
  </div>
  {back&&<div className="hr-tools dw-tools">
   <button className={mode==='parts'?'active':''} onClick={()=>setMode('parts')}>부품 옮기기</button>
   <button className={mode==='image'?'active':''} onClick={()=>setMode('image')}>도면 맞추기</button>
   <button className={mode==='scale'?'active':''} onClick={()=>{setMode('scale');setScalePts([]);}}>두 점으로 축척</button>
   <label className="dw-page">투명도 <input type="range" min={.1} max={1} step={.05} value={back.opacity} onChange={e=>setBack({opacity:Number(e.target.value)})}/></label>
   <button onClick={()=>setBacks(all=>{const n={...all};delete n[view];return n;})}>도면 지우기</button>
  </div>}
  <p className="ed-help dw-help">{!back?'이 시점의 도면(정면도, 측면도 등)을 열면 배경에 깔립니다. 도면 없이도 부품 상자를 끌어 옮길 수 있습니다.'
   :mode==='image'?'도면을 끌어 옮기고 휠로 크기를 바꿔 외함 윤곽(굵은 선)에 맞추세요.'
   :mode==='scale'?(scalePts.length<2?`도면에서 길이를 아는 두 점을 클릭하세요 (${scalePts.length}/2).`:'두 점 사이의 실제 길이를 넣으세요.')
   :'부품 상자를 도면 위치로 끌어 놓으면 사양서 좌표가 바뀝니다. 빈 곳을 끌면 화면 이동, 휠은 확대입니다.'}
   {mode==='scale'&&scalePts.length===2&&<span className="dw-scale"><input type="number" placeholder="mm" value={realLen} onChange={e=>setRealLen(e.target.value)}/><button onClick={applyScale}>축척 적용</button></span>}</p>
  {msg&&<p className="ed-fail">{msg}</p>}
  <svg ref={svg} className="dw-svg" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} onPointerDown={e=>down(e,mode==='image'?'image':'pan')} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onWheel={wheel}>
   {back&&<image href={back.src} x={back.x} y={back.y} width={back.w*back.scale} height={back.h*back.scale} opacity={back.opacity} preserveAspectRatio="none" style={{pointerEvents:'none'}}/>}
   {order.map(([id,g])=>{const r=rect(g),isCab=id==='cabinet',sel=id===p.selected,dd=drag?.kind==='part'&&drag.id===id?drag.moved:[0,0];
    return <g key={id} transform={`translate(${dd[0]} ${dd[1]})`}><rect x={r.x} y={r.y} width={r.w} height={r.h} vectorEffect="non-scaling-stroke"
     className={`dw-box${isCab?' dw-cab':''}${sel?' dw-sel':''}${p.bad.has(id)?' dw-bad':''}${p.movable.has(id)?' dw-move':''}`}
     onPointerDown={e=>{if(mode==='parts'&&!isCab)down(e,'part',id);}}><title>{p.names[id]??id}</title></rect></g>;})}
   {p.routes?.routes.map(r=><polyline key={r.id} points={r.points.map(pt=>proj.to(pt).join(',')).join(' ')} className={`dw-pipe${r.id===p.selected?' dw-sel':''}${p.bad.has(r.id)?' dw-bad':''}`} style={{strokeWidth:Math.max(1.5,r.outerDiameterMm??3)}}
     onPointerDown={e=>{if(mode==='parts'){e.stopPropagation();p.onSelect(r.id);}}}/>)}
   {scalePts.map((q,i)=><circle key={i} cx={q[0]} cy={q[1]} r={vb.w/150} className="dw-pt"/>)}
  </svg>
 </div>;
}
