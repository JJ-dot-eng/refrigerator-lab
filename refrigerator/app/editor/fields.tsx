'use client';
// Generic form for any spec entry: numbers, [x,y,z] points, nested objects and lists.
import {useState} from 'react';
type Key=string|number;
export type Change=(path:Key[],value:unknown)=>void;
const LABELS:Record<string,string>={body:'외곽 상자',voids:'빈 공간',primitives:'도형',box:'상자',cylinder:'원기둥',from:'시작점',to:'끝점',radius:'반지름',radius2:'끝 반지름',segments:'분할 수',items:'선반',rod:'철선',outer:'테두리 굵기',inner:'속 철선 굵기',count:'개수',inset:'안쪽 여백',
 center:'중심',floorZ:'바닥 높이',shell:'쉘',width:'폭',depth:'깊이',height:'높이',base:'받침',plateThickness:'받침판 두께',grommetHeight:'방진고무 높이',plate:'받침판',grommet:'방진고무',dx:'X 간격',dy:'Y 위치',stubs:'연결관',port:'포트',od:'외경',length:'길이',crimp:'끝 압착',relay:'릴레이',stubPart:'연결관 표시',
 wall:'벽 두께',bracket:'브래킷',x0:'시작 X',x1:'끝 X',zBot:'아래 Z',zTop:'위 Z',legs:'열 수',tubeOd:'관 외경',wire:'와이어',wires:'와이어 표시',pitch:'피치',brackets:'브래킷',tabs:'고정 탭',fins:'핀',endPlates:'끝판',tubes:'관',cols:'열 Y 위치',rows:'단 Z 위치',bendX:'굽힘 X',inletX:'입구 X',outletX:'출구 X',bendRadius:'굽힘 반경',dripTray:'물받이',lip:'턱 높이',
 diameter:'지름',inletOd:'입구 외경',outletOd:'출구 외경',shroud:'슈라우드',opening:'개구 반폭',ring:'링',motor:'모터',hub:'허브',blades:'날개',thickness:'두께',rpm:'회전수',reach:'길이',rotor:'날개 표시',path:'경로',hinge:'힌지',helix:'코일',turns:'감은 수',startDeg:'시작각',extraDeg:'추가각',stepsPerTurn:'분할',component:'부품 내부 유로',offset:'오프셋',keepOut:'배관 회피 공간',auto:'자동 경로',ignore:'무시할 부품',grid:'탐색 간격',
 name:'이름',notes:'설명',color:'색',x:'X',y:'Y',z:'Z'};
const HIDDEN=new Set(['id','type','group','page','basis']);
const label=(k:Key)=>typeof k==='number'?`#${k+1}`:LABELS[k]??k;
const isNum=(v:unknown):v is number=>typeof v==='number';

// Keeps the typed text while it is not a valid number yet ("-", "1.").
function NumberInput({value,onChange,title}:{value:number;onChange:(v:number)=>void;title?:string}){
 const [text,setText]=useState<string|null>(null),[seen,setSeen]=useState(value);
 // Value changed from outside (undo, JSON edit): drop the stale typed text.
 if(value!==seen){setSeen(value);if(text!==null&&Number(text)!==value)setText(String(value));}
 return <input className="ed-num" type="text" inputMode="decimal" title={title} aria-label={title} value={text??String(value)} onFocus={()=>setText(String(value))} onBlur={()=>setText(null)}
  onChange={e=>{setText(e.target.value);const v=Number(e.target.value);if(e.target.value.trim()!==''&&Number.isFinite(v))onChange(v);}}
  onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const step=e.shiftKey?10:1,next=Math.round((value+(e.key==='ArrowUp'?step:-step))*1000)/1000;setText(String(next));onChange(next);}}}/>;
}

export function Fields({value,path,onChange,pathList}:{value:Record<string,unknown>;path:Key[];onChange:Change;pathList?:boolean}){
 return <div className="ed-fields">{Object.entries(value).filter(([k])=>!HIDDEN.has(k)).map(([k,v])=><Field key={k} k={k} v={v} path={[...path,k]} onChange={onChange} pathList={pathList&&k==='path'}/>)}</div>;
}
function Field({k,v,path,onChange,pathList}:{k:Key;v:unknown;path:Key[];onChange:Change;pathList?:boolean}){
 if(isNum(v))return <label className="ed-row"><span>{label(k)}</span><NumberInput value={v} title={String(label(k))} onChange={n=>onChange(path,n)}/></label>;
 if(typeof v==='boolean')return <label className="ed-row"><span>{label(k)}</span><input type="checkbox" checked={v} onChange={e=>onChange(path,e.target.checked)}/></label>;
 if(typeof v==='string'){
  if(k==='color')return <label className="ed-row"><span>색</span><input type="color" value={v} onChange={e=>onChange(path,e.target.value)}/></label>;
  return <label className="ed-row ed-wide"><span>{label(k)}</span><input type="text" value={v} onChange={e=>onChange(path,e.target.value)}/></label>;}
 if(Array.isArray(v)){
  if(v.every(isNum)){const names=v.length===3?['X','Y','Z']:v.length===2?(k==='center'?['X','Y']:['최소','최대']):null;
   return <div className="ed-row"><span>{label(k)}</span><div className="ed-nums">{v.map((n,i)=><NumberInput key={i} value={n} title={`${label(k)} ${names?.[i]??i+1}`} onChange={x=>onChange([...path,i],x)}/>)}</div></div>;}
  return <fieldset className="ed-group"><legend>{label(k)}</legend>{v.map((item,i)=><div key={i} className="ed-item">
   <PathItem item={item} i={i} path={[...path,i]} onChange={onChange}/>
   {pathList&&<div className="ed-item-actions"><button title="이 점 뒤에 경유점 추가" onClick={()=>onChange(path,[...v.slice(0,i+1),newPoint(v,i),...v.slice(i+1)])}>＋</button>
    <button title="이 점 뒤에 자동 경로 구간 추가 (부품과 다른 배관을 피해 경로를 찾음)" disabled={i===v.length-1||isAuto(item)||isAuto(v[i+1])} onClick={()=>onChange(path,[...v.slice(0,i+1),{auto:{}},...v.slice(i+1)])}>⤳</button>
    <button title="이 항목 삭제" disabled={v.length<2} onClick={()=>onChange(path,v.filter((_,j)=>j!==i))}>✕</button></div>}
  </div>)}</fieldset>;}
 if(v&&typeof v==='object')return <fieldset className="ed-group"><legend>{label(k)}</legend><Fields value={v as Record<string,unknown>} path={path} onChange={onChange}/></fieldset>;
 return null;
}
const isAuto=(x:unknown)=>!!x&&typeof x==='object'&&'auto' in x;
const isPoint=(x:unknown):x is number[]=>Array.isArray(x)&&x.length===3&&x.every(isNum);
// New waypoint after index i: midpoint of numeric neighbours, else a copy of the nearest numeric point.
function newPoint(list:unknown[],i:number):number[]{
 const a=list[i],b=list[i+1];
 if(isPoint(a)&&isPoint(b))return a.map((n,k)=>Math.round((n+b[k])/2*100)/100);
 const near=list.slice(0,i+1).reverse().find(isPoint)??list.slice(i+1).find(isPoint);
 return near?[...near]:[0,0,0];
}
function PathItem({item,i,path,onChange}:{item:unknown;i:number;path:Key[];onChange:Change}){
 if(isAuto(item))return <div className="ed-row ed-wide"><span>{label(i)} 자동 경로</span><small className="ed-sub">앞뒤 점 사이를 부품과 다른 배관을 피해 자동으로 잇습니다</small></div>;
 if(typeof item==='string')return <label className="ed-row ed-wide"><span>{label(i)} 포트</span><input type="text" value={item} onChange={e=>onChange(path,e.target.value)}/></label>;
 if(Array.isArray(item)&&item.every(isNum))return <div className="ed-row"><span>{label(i)}</span><div className="ed-nums">{item.map((n,j)=><NumberInput key={j} value={n} title={`${label(i)} ${'XYZ'[j]??j}`} onChange={x=>onChange([...path,j],x)}/>)}</div></div>;
 if(item&&typeof item==='object')return <div><small className="ed-sub">{label(i)}</small><Fields value={item as Record<string,unknown>} path={path} onChange={onChange}/></div>;
 return null;
}
