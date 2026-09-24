'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- Accessible SVG engineering plot. */
// Refrigerant cycle along the pipes of the spec-generated T-19-HC model: the runs are painted by the
// cycle-table state at each point, and the inspector shows the state and the P-h diagram of the step.
import {useEffect,useState} from 'react';
import Link from 'next/link';
import ModelScene from './model-scene';
import {operatingPoint,phaseName,fluidColor,t19Steps,stepSamples,stepStateAt} from '@/lib/circuit';
import type {DetailedTable} from '@/lib/circuit';
import {asset} from '@/lib/asset';
type Run={id:string;name:string;outerDiameterMm:number;lengthMm:number;notes?:string};
const MODEL='/models/t-19-hc';
const STEP_IDS=new Set(t19Steps(.5).map(s=>s.id));
// focus: part picked in the page's parts list; parts that are also a step here (compressor, condenser, evaporator) select that step.
export default function RefrigerantCircuit({ambient,focus}:{ambient:number;focus?:string}){
 const [data,setData]=useState<{table:DetailedTable;runs:Run[]}|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState(()=>focus&&STEP_IDS.has(focus)?focus:'discharge'),[seenFocus,setSeenFocus]=useState(focus),[flow,setFlow]=useState(true),[view,setView]=useState('rear'),[shell,setShell]=useState(true),[sample,setSample]=useState(0);
 if(focus!==seenFocus){setSeenFocus(focus);if(focus&&STEP_IDS.has(focus)){setSelected(focus);setSample(0);}}
 useEffect(()=>{Promise.all([fetch(asset('/reference/cycle-table.json')).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<DetailedTable>;}),fetch(asset(`${MODEL}/routes.json`)).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<{routes:Run[]}>;})])
  .then(([table,routes])=>{if(!table.points[0]?.circuit)throw Error();setData({table,runs:routes.routes});}).catch(()=>setError('냉매 회로 데이터를 불러오지 못했습니다.'));},[]);
 if(error)return <p role="alert">{error}</p>;if(!data)return <p className="circuit-loading">냉매 상태와 배관 읽는 중…</p>;
 const point=operatingPoint(data.table,ambient),len=(id:string)=>data.runs.find(r=>r.id===id)?.lengthMm??0;
 const share=len('capillary')/((len('capillary')+len('capillary_hx'))||1),steps=t19Steps(share);
 const step=steps.find(s=>s.id===selected)??steps[0],run=data.runs.find(r=>r.id===step.id),samples=stepSamples(step,point),current=samples[Math.min(sample,samples.length-1)];
 const stageIds=step.stages.map(s=>s[0]);
 const pipeColor=(id:string,f:number)=>{const st=steps.find(s=>s.id===id&&s.kind==='route');return st?fluidColor(stepStateAt(st,point,f)):null;};
 const select=(id:string)=>{if(steps.some(s=>s.id===id)){setSelected(id);setSample(0);}};
 const states=point.circuit.flatMap(s=>s.samples),hs=states.map(s=>s.enthalpyJkg/1000),ps=states.map(s=>s.pressurePa/100000),hmin=Math.min(...hs)-20,hmax=Math.max(...hs)+20,pmin=Math.min(...ps)*.8,pmax=Math.max(...ps)*1.2;
 const x=(h:number)=>45+(h/1000-hmin)/(hmax-hmin)*440,y=(p:number)=>170-(Math.log(p/100000)-Math.log(pmin))/(Math.log(pmax)-Math.log(pmin))*145;
 return <div className="circuit-work"><div className="circuit-heading"><div><h2>배관을 따라 보는 냉매 사이클</h2><p>R290 · 증발 {point.te}°C / 응축 {point.tc}°C · 정상상태 운전점</p></div><button onClick={()=>setFlow(!flow)}>{flow?'흐름 일시정지':'흐름 재생'}</button></div>
 <div className="circuit-legend"><span style={{color:'#ff735b'}}>● 고온 과열 증기</span><span style={{color:'#f3bd57'}}>● 과냉 액체</span><span style={{color:'#b19bff'}}>● 기액 혼합</span><span style={{color:'#57dce6'}}>● 저온 과열 증기</span></div>
 <div className="circuit-visual"><ModelScene src={asset(MODEL)} selected={selected} onSelect={select} view={view} transparent flow={flow} door={false} hideShell={!shell} pipeColor={pipeColor} colorKey={`${point.te}/${point.tc}/${share}`}/>
  <div className="ref-toolbar"><button onClick={()=>setShell(!shell)}>{shell?'배관만 보기':'외함 함께 보기'}</button><select aria-label="배관 시점" value={view} onChange={e=>setView(e.target.value)}><option value="rear">후면 입체</option><option value="front">전면 입체</option><option value="left">측면</option><option value="top">평면</option><option value="machine">기계실 확대</option><option value="selected">선택 구간 확대</option></select></div>
  <div className="circuit-caption">배관 색은 그 위치의 냉매 상태, 흰 점은 흐름 방향입니다(실제 유속이 아님). 운전 중에는 응축기·증발기 팬이 돕니다.<br/>관경은 실제 치수(모세관 Ø2mm)로 그렸습니다. 배관이나 부품을 클릭하면 그 구간을 봅니다.</div></div>
 <div className="circuit-path">{steps.map((s,i)=><button key={s.id} className={selected===s.id?'selected':''} onClick={()=>select(s.id)}>{i+1}. {data.runs.find(r=>r.id===s.id)?.name??s.name} →</button>)}</div>
 <div className="circuit-inspector"><section><h3>{run?.name??step.name}</h3><p>{run?.notes??step.note}</p>
  {run&&<div className="circuit-numbers"><span>배관 길이<b>{(run.lengthMm/1000).toFixed(3)} m</b></span><span>외경<b>{run.outerDiameterMm} mm</b></span></div>}
  <label>구간 상태점 {Math.min(sample,samples.length-1)+1} / {samples.length}<input aria-label="냉매 상태점" type="range" min="0" max={samples.length-1} value={Math.min(sample,samples.length-1)} onChange={e=>setSample(+e.target.value)}/></label>
  {current&&<><h4 style={{color:fluidColor(current)}}>{phaseName(current)}</h4><div className="circuit-numbers"><span>압력 · 절대압<b>{(current.pressurePa/100000).toFixed(2)} bar</b></span><span>온도<b>{current.temperatureC.toFixed(2)} °C</b></span><span>비엔탈피<b>{(current.enthalpyJkg/1000).toFixed(2)} kJ/kg</b></span></div></>}
  <p className="ref-note">한 배관 안의 색 경계(예: 응축관의 과열 제거 → 응축 → 과냉)는 상태점 수에 비례해 나눈 설명용 위치이며, 열전달 해석으로 구한 위치가 아닙니다.</p></section>
 <section><h3>압력–엔탈피 선도 <small>압력: 로그 축</small></h3><svg viewBox="0 0 540 210" role="img" aria-label="R290 냉동 사이클 압력 엔탈피 선도"><path d="M45 20V170H485" stroke="#66828a" fill="none"/>{point.circuit.map(s=><path key={s.id} d={s.samples.map((v,i)=>`${i?'L':'M'}${x(v.enthalpyJkg)},${y(v.pressurePa)}`).join(' ')} fill="none" stroke={stageIds.includes(s.id)?'#ffffff':fluidColor(s.samples[Math.floor(s.samples.length/2)])} strokeWidth={stageIds.includes(s.id)?4:2}/>)}{current&&<circle cx={x(current.enthalpyJkg)} cy={y(current.pressurePa)} r="5" fill="white" stroke="#15262f"/>}<text x="45" y="194" fill="#a6bfc9" fontSize="12">{hmin.toFixed(0)}</text><text x="400" y="194" fill="#a6bfc9" fontSize="12">{hmax.toFixed(0)} kJ/kg</text><text x="0" y="28" fill="#a6bfc9" fontSize="12">{pmax.toFixed(1)}</text><text x="0" y="168" fill="#a6bfc9" fontSize="12">{pmin.toFixed(1)} bar</text></svg><p>모세관: 단열 스로틀링 h 일정, 압력 하강에 따라 플래시 가스 발생.<br/>증발기 출구 2 K 과열 + 흡입관에서 3 K 추가 과열.</p></section></div>
 <details className="circuit-notes"><summary>배관 배치와 계산의 설계 근거</summary>
  <p>3D는 사양서 기반 생성기로 만든 T-19-HC 모델입니다(<Link href="/models">모델 목록</Link>과 같은 모델). 외형 치수, 하부 응축 유닛, R290은 제조사 사양서를 따르고, 압축기·핀-튜브 응축기와 팬·드라이어·모세관 코일·천장 증발기의 형상과 배관 경로·관경은 이 급 리치인의 일반값입니다. 회로 연결, 배관 간격, 부품 관통을 자동 검사합니다. 제조사 배관 원도면은 아닙니다.</p>
  <p>계산표의 10개 구간(압축 → 토출 → 과열 제거 → 응축 → 과냉 → 액관·드라이어 → 모세관 → 증발 → 출구 과열 → 흡입)을 배관 순서대로 칠합니다. 모세관 구간은 흡입관에 붙기 전과 후의 길이 비율로 나눴습니다.</p>
  <p>CoolProp의 압력·엔탈피 상태 계산을 사용합니다. 3D에서는 일반 설치 방식대로 모세관이 흡입관에 붙어 있지만, 계산은 단열 모세관으로 단순화해 그 열교환을 넣지 않았습니다. 압축기 성능맵과 모세관 유량의 연립해, 냉매 충전량, 정지 후 압력 평형, 오일 회수, 구간별 마찰 압력손실은 포함하지 않습니다. 이 탭은 정상 운전점의 흐름 설명이며 냉각 실험의 기동·정지 시간과 독립적입니다.</p>
  <a href="https://www.secop.com/fileadmin/user_upload/technical-literature/danfoss-lectures/operational_defects_in_hermetic_compressors_and_refrigerating_systems.pdf" target="_blank" rel="noreferrer">Secop 밀폐 냉동시스템 회로 설명 ↗</a><br/>
  <a href={asset(`${MODEL}/routes.json`)} download>배관 경로·관경 (JSON)</a> · <a href={asset(`${MODEL}/model.obj`)} download>3D 모델 (OBJ)</a> · <a href={asset(`${MODEL}/spec.json`)} download>사양서 (JSON)</a></details></div>;
}
