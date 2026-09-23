import type {CycleTable} from './simulation';
export type FluidState={temperatureC:number;pressurePa:number;enthalpyJkg:number;quality:number|null;phase:string};
export type Stage={id:string;label:string;process:string;samples:FluidState[]};
export type DetailedPoint={te:number;tc:number;circuit:Stage[];nodes:(FluidState&{id:string})[];qEvapJkg:number;workElectricJkg:number;qCondenserJkg:number;suctionHeatJkg:number};
export type DetailedTable=Omit<CycleTable,'points'>&{points:(CycleTable['points'][number]&DetailedPoint)[]};
export type Pipe={id:string;name:string;fromPort:string;toPort:string;pointsMm:number[][];outerDiameterMm:number;innerDiameterMm:number;lengthMm:number;stages:string[];displayScale?:number;insulationOuterMm?:number;internal?:boolean};
export type Piping={routes:Pipe[];ports:Record<string,number[]>;assumptions:string[]};
// Choose an exact property-table operating point. Never interpolate phase labels.
export function operatingPoint(table:DetailedTable,ambient:number){const tc=Math.max(30,Math.min(65,Math.round((ambient+15)/5)*5));return table.points.find(p=>p.te===-10&&p.tc===tc)!;}
export function samplesFor(pipe:Pipe,point:DetailedPoint){return pipe.stages.flatMap(id=>point.circuit.find(s=>s.id===id)?.samples||[]);}
export function stateAt(pipe:Pipe,point:DetailedPoint,fraction:number){const states=samplesFor(pipe,point);return states[Math.min(states.length-1,Math.floor(Math.max(0,fraction)*states.length))];}
export function fluidColor(s:FluidState|undefined){if(!s)return '#a8bac2';if(s.phase==='two-phase')return '#b19bff';if(s.phase==='subcooled')return '#f3bd57';return s.temperatureC>20?'#ff735b':'#57dce6';}
export function phaseName(s:FluidState){return s.phase==='two-phase'?`기액 혼합 · 건도 ${((s.quality??0)*100).toFixed(1)}%`:s.phase==='subcooled'?'과냉 액체':'과열 증기';}
