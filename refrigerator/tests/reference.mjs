import assert from 'node:assert/strict';
import fs from 'node:fs';
import {referenceDefaults,referenceInitial,stepReference} from '../lib/reference-simulation.ts';
const table=JSON.parse(fs.readFileSync(new URL('../public/reference/cycle-table.json',import.meta.url)));
assert.equal(table.refrigerant,'R290');
for(const p of table.points){assert.ok(p.pHighPa>p.pLowPa);assert.ok(p.cop>0);assert.equal(p.h4,p.h3);assert.ok(Math.abs((p.h2-p.h3)-(p.h1-p.h4)-(p.h2-p.h1))<1e-7);}
const c={...referenceDefaults},s=referenceInitial();stepReference(s,c,table,86400);
assert.ok(s.air>0&&s.air<4,`24h air ${s.air}`);assert.ok(s.cycles>2);
assert.ok(Math.abs(35000*(s.air-25)+c.loadKg*3500*(s.food-25)-(s.heatJ-s.removedJ))<1e-5,'energy conservation');
const closed=s.air;stepReference(s,{...c,door:true},table,1800);assert.ok(s.air>closed+2,'door opening warms cabinet');
stepReference(s,{...c,power:false},table,1);assert.equal(s.watts,0);assert.equal(s.q,0);
const a=referenceInitial(),b=referenceInitial();stepReference(a,c,table,3600);for(let i=0;i<60;i++)stepReference(b,c,table,60);assert.ok(Math.abs(a.air-b.air)<1e-10,'batch equivalence');
const g=JSON.parse(fs.readFileSync(new URL('../public/reference/cad-verification.json',import.meta.url)));
assert.equal(g.valid,true);assert.ok(Math.abs(g.measuredBoundsMm.width-27*25.4)<1e-6);assert.ok(Math.abs(g.measuredBoundsMm.height-(78+15/16)*25.4)<1e-6);
const meshes=JSON.parse(fs.readFileSync(new URL('../public/reference/cad-meshes.json',import.meta.url))).parts;
assert.equal(meshes.length,g.partCount);for(const p of meshes){assert.ok(p.positions.every(Number.isFinite));assert.ok(p.indices.every(i=>i>=0&&i<p.positions.length/3));}
assert.equal(meshes.filter(p=>p.group==='shelves').length,3);
console.log('Reference checks passed: R290 cycle energy balance, 24h cooling, door disturbance, power off, timestep equivalence, CAD dimensions and meshes.');
