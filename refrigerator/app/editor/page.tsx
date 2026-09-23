'use client';
// Spec editor: edit a refrigerator spec in the browser; the generator runs client-side
// after each change and the 3D preview and checks update without a server.
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import ModelScene,{type SceneData} from '@/components/model-scene';
import {build,toObj} from '@/generator/build.mjs';
import {asset} from '@/lib/asset';
import {Fields,type Change} from './fields';
import '../hr24/style.css';
import './editor.css';
type Item={id:string;name:string;type?:string;notes?:string;[k:string]:unknown};
type Spec={schema:string;id:string;meta:{model:string;[k:string]:unknown};components:Item[];circuit:Item[];[k:string]:unknown};
type Result={errors:string[];model?:SceneData['model'];routes?:{routes:{id:string;name:string;outerDiameterMm:number;lengthMm:number;points:number[][]}[]};verification?:{failures:string[];overallWithHandleMm:{width:number;depth:number;height:number};partCount:number}};
const draftKey=(id:string)=>`refrigerator-editor:${id}`;
const readDraft=(id:string)=>{try{return localStorage.getItem(draftKey(id));}catch{return null;}};
const writeDraft=(id:string,text:string|null)=>{try{if(text===null)localStorage.removeItem(draftKey(id));else localStorage.setItem(draftKey(id),text);}catch{/* storage unavailable: drafts are a convenience only */}};
function setIn(obj:unknown,path:(string|number)[],value:unknown):unknown{
 if(!path.length)return value;const [k,...rest]=path;
 const copy=(Array.isArray(obj)?[...obj]:{...(obj as object)}) as Record<string|number,unknown>;copy[k]=setIn(copy[k],rest,value);return copy;}
const mentions=(text:string,id:string)=>new RegExp(`(^|[^a-z0-9_])${id}([^a-z0-9_]|$)`).test(text);
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}

export default function EditorPage(){
 const [index,setIndex]=useState<{id:string;model:string}[]>([]),[baseId,setBaseId]=useState('');
 const [original,setOriginal]=useState<Spec|null>(null),[spec,setSpec]=useState<Spec|null>(null),[history,setHistory]=useState<Spec[]>([]);
 const [result,setResult]=useState<Result|null>(null),[scene,setScene]=useState<SceneData|null>(null),[restored,setRestored]=useState(false),[specBase,setSpecBase]=useState('');
 const [selected,setSelected]=useState('compressor'),[view,setView]=useState('rear'),[transparent,setTransparent]=useState(true),[flow,setFlow]=useState(false),[door,setDoor]=useState(false);
 const [rawDraft,setRawDraft]=useState<string|null>(null),[rawError,setRawError]=useState(''),[fileError,setFileError]=useState('');
 const fileInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{fetch(asset('/models/index.json')).then(r=>r.json() as Promise<{models:{id:string;model:string}[]}>).then(d=>{setIndex(d.models);setBaseId(d.models[0]?.id??'');}).catch(()=>setIndex([]));},[]);
 // Load the base spec (or the saved draft for it).
 useEffect(()=>{if(!baseId)return;let live=true;
  fetch(asset(`/models/${baseId}/spec.json`)).then(r=>r.json() as Promise<Spec>).then(s=>{if(!live)return;
   const draft=readDraft(baseId);let start=s,fromDraft=false;
   if(draft){try{const d=JSON.parse(draft) as Spec;if(JSON.stringify(d)!==JSON.stringify(s)){start=d;fromDraft=true;}}catch{writeDraft(baseId,null);}}
   setOriginal(s);setSpec(start);setSpecBase(baseId);setHistory([]);setRestored(fromDraft);setScene(null);setSelected('compressor');}).catch(()=>{if(live)setFileError('사양서를 불러오지 못했습니다.');});
  return()=>{live=false;};},[baseId]);
 // Rebuild shortly after each edit; keep the last good 3D while the spec is broken.
 useEffect(()=>{if(!spec)return;
  const t=setTimeout(()=>{let out:Result;try{out=build(spec) as Result;}catch(e){out={errors:[`생성 중 오류: ${(e as Error).message}`]};}
   setResult(out);if(out.model&&out.routes)setScene({model:out.model,routes:out.routes});
   // Drafts are keyed by the base the spec was loaded from, not the currently selected base.
   if(specBase)writeDraft(specBase,original&&JSON.stringify(spec)===JSON.stringify(original)?null:JSON.stringify(spec));},250);
  return()=>clearTimeout(t);},[spec,specBase,original]);
 const change:Change=(path,value)=>{if(!spec)return;setHistory(h=>[...h.slice(-49),spec]);setSpec(setIn(spec,path,value) as Spec);};
 const undo=()=>{const prev=history.at(-1);if(prev){setHistory(history.slice(0,-1));setSpec(prev);}};
 const problems=result?[...result.errors,...(result.verification?.failures??[])]:[];
 const items=spec?[...spec.components.map(c=>({...c,kind:'component'})),...spec.circuit.map(c=>({...c,kind:'circuit'}))]:[];
 const bad=new Set(items.filter(i=>problems.some(p=>mentions(p,i.id))).map(i=>i.id));
 const listIndex=spec?spec.components.findIndex(c=>c.id===selected):-1,circuitIndex=spec?spec.circuit.findIndex(c=>c.id===selected):-1;
 const current=listIndex>=0?spec!.components[listIndex]:circuitIndex>=0?spec!.circuit[circuitIndex]:null;
 const currentPath=listIndex>=0?['components',listIndex]:['circuit',circuitIndex];
 const v=result?.verification;
 async function upload(file:File){setFileError('');try{const s=JSON.parse(await file.text()) as Spec;
  if(s?.schema!=='refrigerator-spec/1')throw Error('schema가 "refrigerator-spec/1"이 아닙니다');setHistory(h=>spec?[...h.slice(-49),spec]:h);setSpec(s);setRestored(false);}
  catch(e){setFileError(`불러오기 실패: ${(e as Error).message}`);}}
 const raw=rawDraft??(spec?JSON.stringify(spec,null,2):'');
 function applyRaw(){try{const s=JSON.parse(raw) as Spec;setHistory(h=>spec?[...h.slice(-49),spec]:h);setSpec(s);setRawDraft(null);setRawError('');}catch(e){setRawError(`JSON 형식 오류: ${(e as Error).message}`);}}

 return <main className="hr-app"><header><div><small>SPEC EDITOR</small><h1>사양서 <b>편집기</b></h1></div><nav><Link href="/models">모델 목록</Link><Link href="/">HR24B 도면 대조</Link></nav></header>
 <div className="hr-summary">값을 바꾸면 0.25초 뒤 브라우저에서 모델을 다시 생성하고 검사합니다<span>작업 내용은 이 브라우저에 자동 저장됩니다</span><b>{spec?.meta.model}</b></div>
 <div className="hr-work"><aside className="hr-parts"><h2>기준 모델</h2>
  <select className="ed-base" aria-label="기준 모델" value={baseId} onChange={e=>setBaseId(e.target.value)}>{index.map(m=><option key={m.id} value={m.id}>{m.model}</option>)}</select>
  {restored&&<p className="ed-note">저장된 작업을 불러왔습니다. <button className="ed-link" onClick={()=>{if(original){setHistory(h=>spec?[...h,spec]:h);setSpec(original);setRestored(false);}}}>원본으로 되돌리기</button></p>}
  <h2 style={{marginTop:20}}>부품</h2>{items.filter(i=>i.kind==='component').map(i=><button key={i.id} className={selected===i.id?'active':''} onClick={()=>setSelected(i.id)}>{bad.has(i.id)&&<i className="ed-bad" title="검사 문제"/>}{i.name}</button>)}
  <h2 style={{marginTop:20}}>냉매 회로</h2>{items.filter(i=>i.kind==='circuit').map((i,n)=><button key={i.id} className={selected===i.id?'active':''} onClick={()=>setSelected(i.id)}><span>{String(n+1).padStart(2,'0')}</span>{bad.has(i.id)&&<i className="ed-bad" title="검사 문제"/>}{i.name}</button>)}
 </aside>
 <section className="hr-model"><div className="hr-tools"><select aria-label="시점" value={view} onChange={e=>setView(e.target.value)}><option value="rear">후면 입체</option><option value="back">후면 정면</option><option value="front">전면 입체</option><option value="left">좌측면</option><option value="machine">기계실 확대</option></select><button className={transparent?'active':''} onClick={()=>setTransparent(!transparent)}>외함 투명</button><button onClick={()=>setDoor(!door)}>문 {door?'닫기':'열기'}</button><button onClick={()=>setFlow(!flow)} className={flow?'active':''}>운전 표시</button><button onClick={undo} disabled={!history.length}>되돌리기</button></div>
  <ModelScene data={scene} fitKey={baseId} selected={selected} onSelect={id=>{if(spec&&[...spec.components,...spec.circuit].some(c=>c.id===id))setSelected(id);}} view={view} transparent={transparent} flow={flow} door={door}/>
  <div className="ed-editor">{current?<><h2>{current.name} <small>{String(current.type??'냉매 배관')} · {current.id}</small></h2>
   {typeof current.notes==='string'&&<p className="ed-desc">{current.notes}</p>}
   <Fields value={current} path={currentPath} onChange={change} pathList={circuitIndex>=0}/>
   <p className="ed-help">단위 mm. 좌표는 정면 기준 X 오른쪽, Y 뒤쪽, Z 위. 숫자 칸에서 ↑↓는 1mm, Shift+↑↓는 10mm씩 바꿉니다.{circuitIndex>=0&&' 경로의 ＋는 경유점, ⤳는 자동 경로 구간(부품과 다른 배관을 피해 경로를 찾음)을 추가하고 ✕는 삭제합니다. 포트 기준 점(port + offset)은 부품을 옮기면 함께 움직입니다.'}</p></>
   :<p className="ed-desc">왼쪽 목록이나 3D 화면에서 부품을 고르세요.</p>}</div>
 </section>
 <section className="hr-source ed-side"><h2>검사 결과</h2>
  {!result?<p>생성 중…</p>:problems.length===0?<p className="ed-ok">통과: 회로 연결, 배관 간격, 부품 관통, 전체 치수</p>
   :<><p className="ed-fail">문제 {problems.length}건. 고치면 3D가 다시 갱신됩니다.</p><ul className="ed-problems">{problems.map((p,i)=><li key={i}>{p}</li>)}</ul></>}
  {v&&<p>부품 {v.partCount}개 · 전체 {v.overallWithHandleMm.width} × {v.overallWithHandleMm.depth} × {v.overallWithHandleMm.height} mm</p>}
  {result?.routes&&<ol className="hr-circuit">{result.routes.routes.map(r=><li key={r.id}><button className={selected===r.id?'active':''} onClick={()=>setSelected(r.id)}>{r.name}</button><span>Ø{r.outerDiameterMm} · {(r.lengthMm/1000).toFixed(2)} m</span></li>)}</ol>}
  <h2 style={{marginTop:20}}>파일</h2>
  <div className="ed-files"><button onClick={()=>spec&&download(`${spec.id}.json`,JSON.stringify(spec,null,2),'application/json')}>사양서 JSON 저장</button>
   <button disabled={!result?.model} onClick={()=>spec&&result?.model&&download(`${spec.id}.obj`,toObj(result.model,spec.meta.model) as string,'model/obj')}>3D 모델 OBJ 저장</button>
   <button onClick={()=>fileInput.current?.click()}>사양서 JSON 열기</button>
   <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}}/></div>
  {fileError&&<p className="ed-fail">{fileError}</p>}
  <p className="ed-help">열기는 파일을 이 브라우저 안에서만 읽습니다. 서버로 보내지 않습니다.</p>
  <details className="ed-raw"><summary>JSON 직접 편집</summary><textarea aria-label="사양서 JSON" value={raw} spellCheck={false} onChange={e=>setRawDraft(e.target.value)}/><button onClick={applyRaw}>적용</button>{rawDraft!==null&&<button onClick={()=>{setRawDraft(null);setRawError('');}}>편집 취소</button>}{rawError&&<p className="ed-fail">{rawError}</p>}</details>
 </section></div>
 <footer><strong>사양서 양식</strong><p>부품 종류와 항목 설명은 저장소의 refrigerator/specs/README.md에 있습니다. 새 부품 추가나 삭제는 JSON 직접 편집에서 할 수 있습니다.</p></footer></main>;
}
