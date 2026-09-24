import type {CycleTable} from './simulation';
export type FluidState={temperatureC:number;pressurePa:number;enthalpyJkg:number;quality:number|null;phase:string};
export type Stage={id:string;label:string;process:string;samples:FluidState[]};
export type DetailedPoint={te:number;tc:number;circuit:Stage[];nodes:(FluidState&{id:string})[];qEvapJkg:number;workElectricJkg:number;qCondenserJkg:number;suctionHeatJkg:number};
export type DetailedTable=Omit<CycleTable,'points'>&{points:(CycleTable['points'][number]&DetailedPoint)[]};
// Choose an exact property-table operating point. Never interpolate phase labels.
export function operatingPoint(table:DetailedTable,ambient:number){const tc=Math.max(30,Math.min(65,Math.round((ambient+15)/5)*5));return table.points.find(p=>p.te===-10&&p.tc===tc)!;}
export function fluidColor(s:FluidState|undefined){if(!s)return '#a8bac2';if(s.phase==='two-phase')return '#b19bff';if(s.phase==='subcooled')return '#f3bd57';return s.temperatureC>20?'#ff735b':'#57dce6';}
export function phaseName(s:FluidState){return s.phase==='two-phase'?`기액 혼합 · 건도 ${((s.quality??0)*100).toFixed(1)}%`:s.phase==='subcooled'?'과냉 액체':'과열 증기';}

// ---------- cycle stages laid onto the T-19-HC spec model (public/models/t-19-hc) ----------
// A step is a pipe run (route) or a part the refrigerant passes through; it carries one or more
// stages of the cycle table, optionally only a share of a stage ([id, from, to] as fractions).
export type StageSpan=[stage:string,from:number,to:number];
export type CircuitStep={id:string;name:string;kind:'route'|'part';stages:StageSpan[];note?:string};
// capillaryShare: the free capillary's share of the total capillary length; the rest runs soldered to the suction line.
export function t19Steps(capillaryShare:number):CircuitStep[]{return [
 {id:'discharge',name:'토출관',kind:'route',stages:[['discharge',0,1]]},
 {id:'condenser',name:'응축관',kind:'route',stages:[['condenser_desuperheat',0,1],['condenser_condense',0,1],['condenser_subcool',0,1]]},
 {id:'liquid_line',name:'액관',kind:'route',stages:[['filter_drier',0,1]]},
 {id:'drier',name:'필터 드라이어',kind:'part',stages:[['filter_drier',0,1]],note:'Ø19×100mm 동 쉘. 수분과 이물을 거릅니다. 압력 변화는 계산에서 무시합니다.'},
 {id:'capillary',name:'모세관',kind:'route',stages:[['capillary',0,capillaryShare]]},
 {id:'capillary_hx',name:'모세관·흡입관 열교환부',kind:'route',stages:[['capillary',capillaryShare,1]]},
 {id:'evaporator',name:'증발관',kind:'route',stages:[['evaporator_boil',0,1],['evaporator_superheat',0,1]]},
 {id:'suction',name:'흡입관',kind:'route',stages:[['suction',0,1]]},
 {id:'compressor',name:'압축기 내부',kind:'part',stages:[['compressor',0,1]],note:'밀폐 쉘 안의 압축 과정(개략). 쉘 내부는 배관이 아닙니다.'},
];}
export function stepSamples(step:CircuitStep,point:DetailedPoint){
 return step.stages.flatMap(([id,from,to])=>{const all=point.circuit.find(c=>c.id===id)?.samples??[],a=Math.round(from*all.length);return all.slice(a,Math.max(a+1,Math.round(to*all.length)));});
}
// State at a fraction (0..1) along the step; each sample covers an equal share of the length (explanatory, not a heat-transfer result).
export function stepStateAt(step:CircuitStep,point:DetailedPoint,fraction:number){const s=stepSamples(step,point);return s[Math.min(s.length-1,Math.floor(Math.max(0,fraction)*s.length))];}
