export type CyclePoint = {te:number;tc:number;pLowPa:number;pHighPa:number;h1:number;h2:number;h3:number;h4:number;qEvapJkg:number;workElectricJkg:number;cop:number};
export type CycleTable = {refrigerant:string;evaporatingC:number[];condensingC:number[];points:CyclePoint[]};
export type Fault = 'none'|'sensor'|'communication'|'fan';
export type Settings = {ambient:number;target:number;door:boolean;power:boolean;fault:Fault;insulation:number;loadKg:number};
export type Sample = {t:number;air:number;food:number;power:number};
export type State = {time:number;air:number;food:number;run:boolean;rpm:number;watts:number;cooling:number;wh:number;removedWh:number;heatInWh:number;lastSwitch:number;phase:string;alarm:string;cycles:number;history:Sample[];events:{time:number;text:string}[];cycle:CyclePoint|null;heatLeak:number;heartbeat:number};
export const defaults:Settings={ambient:25,target:4,door:false,power:true,fault:'none',insulation:50,loadKg:5};
export function initialState():State{return {time:0,air:25,food:25,run:false,rpm:0,watts:0,cooling:0,wh:0,removedWh:0,heatInWh:0,lastSwitch:-180,phase:'대기',alarm:'',cycles:0,history:[{t:0,air:25,food:25,power:0}],events:[{time:0,text:'가상 제어기 부팅 · 설정 온도 4°C'}],cycle:null,heatLeak:0,heartbeat:0};}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export function interpolate(table:CycleTable,te:number,tc:number):CyclePoint {
 const bounds=(arr:number[],v:number)=>{const x=clamp(v,arr[0],arr.at(-1)!);const hi=arr.findIndex(a=>a>=x);const lo=Math.max(0,hi-1);return [arr[lo],arr[hi],arr[lo]===arr[hi]?0:(x-arr[lo])/(arr[hi]-arr[lo])];};
 const [e0,e1,a]=bounds(table.evaporatingC,te),[c0,c1,b]=bounds(table.condensingC,tc);
 const p=(e:number,c:number)=>{const p=table.points.find(p=>p.te===e&&p.tc===c);if(!p)throw Error('냉매 물성표 누락');return p;};
 const corners=[p(e0,c0),p(e1,c0),p(e0,c1),p(e1,c1)];const out={} as CyclePoint;
 for(const k of ['te','tc','pLowPa','pHighPa','h1','h2','h3','h4','qEvapJkg','workElectricJkg','cop'] as const)out[k]=(1-b)*((1-a)*corners[0][k]+a*corners[1][k])+b*((1-a)*corners[2][k]+a*corners[3][k]);
 out.cop=out.qEvapJkg/out.workElectricJkg;return out;
}
export function event(s:State,text:string){s.events=[{time:s.time,text},...s.events].slice(0,40);}
export function advance(s:State,c:Settings,table:CycleTable,seconds:number){
 if(!Number.isFinite(seconds)||seconds<0||seconds>86400)throw Error('시간 범위 초과');
 let remaining=seconds;
 while(remaining>0){const dt=Math.min(1,remaining);remaining-=dt;s.time+=dt;
 const fault=c.fault==='sensor'?'온도센서 단선':c.fault==='communication'?'메인 ↔ 인버터 통신 끊김':c.fault==='fan'?'응축기 팬 정지':'';
 if(fault!==s.alarm){s.alarm=fault;event(s,fault?`보호 정지 · ${fault}`:'고장 해제 · 재시작 지연 적용');if(!fault)s.lastSwitch=s.time;}
 const demand=s.run?s.air>c.target-1:s.air>=c.target+1;
 const allowed=c.power&&!fault;const shouldRun=allowed&&demand;
 if(s.run&&(!allowed||(!shouldRun&&s.time-s.lastSwitch>=120))){s.run=false;s.lastSwitch=s.time;event(s,'메인 → 인버터: STOP');}
 if(!s.run&&shouldRun&&s.time-s.lastSwitch>=180){s.run=true;s.lastSwitch=s.time;s.cycles++;event(s,'메인 → 인버터: RUN 3000 rpm');}
 s.rpm+=clamp((s.run?3000:0)-s.rpm,-600*dt,300*dt);
 const fraction=s.run?s.rpm/3000:0;
 s.cycle=interpolate(table,-15,clamp(c.ambient+15,30,65));
 s.cooling=0.00045*s.cycle.qEvapJkg*fraction;
 s.watts=c.power?2+(s.run?5+0.00045*s.cycle.workElectricJkg*fraction:0)+(c.door?2:0):0;
 s.heatLeak=(0.7*50/c.insulation+(c.door?12:0))*(c.ambient-s.air)+(c.power?1:0)+(c.door&&c.power?2:0);
 const foodCapacity=Math.max(.1,c.loadKg)*3500;const exchange=5*(s.food-s.air);
 s.air+=(s.heatLeak+exchange-s.cooling)/20000*dt;s.food-=exchange/foodCapacity*dt;
 s.wh+=s.watts*dt/3600;s.removedWh+=s.cooling*dt/3600;s.heatInWh+=s.heatLeak*dt/3600;
 s.heartbeat=c.power&&c.fault!=='communication'?Math.floor(s.time):s.heartbeat;
 s.phase=!c.power?'전원 꺼짐':fault?'보호 정지':s.run?'냉각 중':s.time-s.lastSwitch<180?'재시작 대기':'목표 온도 유지';
 const last=s.history.at(-1)!;if(s.time-last.t>=30){s.history.push({t:s.time,air:s.air,food:s.food,power:s.watts});if(s.history.length>1440)s.history.shift();}
 }return s;
}
export function exportCsv(s:State){return 'simulation_seconds,air_C,food_C,power_W\n'+s.history.map(p=>`${p.t.toFixed(1)},${p.air.toFixed(4)},${p.food.toFixed(4)},${p.power.toFixed(3)}`).join('\n');}
