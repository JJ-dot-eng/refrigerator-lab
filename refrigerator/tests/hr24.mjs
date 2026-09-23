import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/models/hr24b/'+n,import.meta.url)));
const model=read('model.json'),meta=read('metadata.json'),verified=read('verification.json'),circuit=read('routes.json');
assert.equal(meta.model,'Hoshizaki HR24B');assert.equal(meta.refrigerant,'R600a');assert.ok(verified.valid&&verified.circuitClosed);
assert.deepEqual(verified.overallWithHandleMm,{width:595,depth:648,height:805});
// Bounds of a component's own solid (not its pipes or sub-parts).
function bounds(id){const p=model.parts.find(p=>p.id===id);assert.ok(p,id);return [0,1,2].map(axis=>[p.boundsMm.min[axis],p.boundsMm.max[axis]]);}
const size=b=>b.map(([a,c])=>c-a);
const condenser=bounds('condenser_pipe'),comp=bounds('compressor'),pan=bounds('pan'),drier=bounds('drier'),evap=bounds('evaporator'),fan=bounds('evaporator_fan');
// Placement from service p7 rear assembly and p8 section.
assert.ok(condenser[2][0]>pan[2][1],'condenser above compressor and pan');
assert.ok(condenser[2][1]-condenser[2][0]>condenser[1][1]-condenser[1][0],'vertical rear condenser');
assert.ok(pan[2][0]>=comp[2][1],'pan on compressor');
assert.ok(drier[0][1]<comp[0][0],'rear-view right drier = front-view negative X');
assert.ok(drier[2][1]-drier[2][0]>drier[0][1]-drier[0][0],'vertical drier');
assert.ok(evap[2][0]>600&&fan[1][1]<evap[1][0],'ceiling evaporator with fan in front');
// Typical small R600a hermetic compressor envelope (mm).
const [cw,cd,ch]=size(comp);assert.ok(cw>180&&cw<230&&cd>140&&cd<170&&ch>160&&ch<200,`compressor ${cw}×${cd}×${ch}`);
// Circuit order from service p9 and physical continuity.
const ids=circuit.routes.map(r=>r.id);
assert.deepEqual(ids,['discharge','pan_loop','condenser_feed','condenser','perimeter','capillary','capillary_hx','evaporator','suction']);
const eq=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-6);
assert.ok(eq(circuit.routes[0].points[0],circuit.compressorPorts.discharge),'discharge leaves compressor');
assert.ok(eq(circuit.routes.at(-1).points.at(-1),circuit.compressorPorts.suction),'suction returns to compressor');
for(let i=0;i<ids.length-1;i++)if(ids[i]!=='perimeter')assert.ok(eq(circuit.routes[i].points.at(-1),circuit.routes[i+1].points[0]),`${ids[i]} → ${ids[i+1]}`);
const [perimeterEnd,capStart]=[circuit.routes[4].points.at(-1),circuit.routes[5].points[0]];
assert.ok(perimeterEnd[2]>drier[2][1]-1&&capStart[2]<drier[2][0]+1,'drier sits between liquid line and capillary');
// Tube sizes and clearances.
const od=Object.fromEntries(circuit.routes.map(r=>[r.id,r.outerDiameterMm]));
assert.ok(od.capillary<od.condenser&&od.condenser<od.suction&&od.suction<od.evaporator,'tube sizes ordered');
for(const [pair,gap] of Object.entries(verified.pipeClearanceMm))assert.ok(gap>=(pair.endsWith('|suction')&&pair.startsWith('capillary')?-.05:1),`${pair} clearance ${gap}`);
assert.ok(verified.pipeClearanceMm['capillary_hx|suction']<1,'capillary soldered to suction line');
for(const p of model.parts){assert.ok(p.positions.every(Number.isFinite));assert.ok(p.indices.every(i=>i>=0&&i<p.positions.length/3));}
console.log('HR24B: drawing placement, typical compressor size, closed circuit in p9 order, drier between liquid line and capillary, tube sizes, pipe clearances and mesh validity passed.');
