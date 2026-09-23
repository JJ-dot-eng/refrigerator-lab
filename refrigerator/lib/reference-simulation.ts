import {interpolate} from './simulation.ts';
import type {CycleTable} from './simulation.ts';
export type Conditions={ambient:number;target:number;door:boolean;power:boolean;light:boolean;ua:number;massFlow:number;loadKg:number};
export const referenceDefaults:Conditions={ambient:25,target:2,door:false,power:true,light:false,ua:1.8,massFlow:.0007,loadKg:15};
export const referenceInitial=()=>({t:0,air:25,food:25,run:false,lastSwitch:-180,watts:0,wh:0,heatJ:0,removedJ:0,cycles:0,history:[{t:0,air:25,food:25}],q:0});
export type ReferenceState=ReturnType<typeof referenceInitial>;
// Explicit assumed two-node model; no claim of factory firmware or measured performance.
export function stepReference(s:ReferenceState,c:Conditions,table:CycleTable,seconds:number){
 if(!Number.isFinite(seconds)||seconds<0||seconds>86400)throw Error('invalid duration');
 if(!Object.values(c).every(v=>typeof v==='boolean'||Number.isFinite(v))||c.ua<=0||c.massFlow<=0||c.loadKg<=0)throw Error('invalid conditions');
 const cycle=interpolate(table,-10,Math.max(30,Math.min(65,c.ambient+15)));
 while(seconds>0){const dt=Math.min(seconds,1);seconds-=dt;s.t+=dt;
  if(s.run&&(!c.power||(s.air<=c.target-.7&&s.t-s.lastSwitch>=120))){s.run=false;s.lastSwitch=s.t;}
  if(!s.run&&c.power&&s.air>=c.target+.7&&s.t-s.lastSwitch>=180){s.run=true;s.lastSwitch=s.t;s.cycles++;}
  s.q=s.run?c.massFlow*cycle.qEvapJkg:0;
  const heat=(c.ua+(c.door?18:0))*(c.ambient-s.air)+(c.power?3:0)+(c.power&&c.light?3:0);
  const exchange=8*(s.food-s.air);
  s.air+=(heat+exchange-s.q)*dt/35000;s.food-=exchange*dt/(c.loadKg*3500);
  s.watts=c.power?3+(c.light?3:0)+(s.run?12+c.massFlow*cycle.workElectricJkg:0):0;
  s.wh+=s.watts*dt/3600;s.heatJ+=heat*dt;s.removedJ+=s.q*dt;
  if(s.t-s.history.at(-1)!.t>=60){s.history.push({t:s.t,air:s.air,food:s.food});if(s.history.length>1441)s.history.shift();}
 }return cycle;
}
