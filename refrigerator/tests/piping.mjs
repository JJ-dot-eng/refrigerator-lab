import assert from 'node:assert/strict';
import fs from 'node:fs';
const layout=JSON.parse(fs.readFileSync(new URL('../public/reference/piping-layout.json',import.meta.url)));
const table=JSON.parse(fs.readFileSync(new URL('../public/reference/cycle-table.json',import.meta.url)));
assert.equal(layout.routes.length,8);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
for(let i=0;i<layout.routes.length;i++){
 const r=layout.routes[i],next=layout.routes[(i+1)%layout.routes.length];
 assert.equal(r.toPort,next.fromPort,'directed continuous cycle');
 assert.ok(distance(r.pointsMm.at(-1),next.pointsMm[0])<1e-8,'shared endpoint');
 const length=r.pointsMm.slice(1).reduce((s,p,j)=>s+distance(p,r.pointsMm[j]),0);
 assert.ok(Math.abs(length-r.lengthMm)<1e-6);assert.ok(r.innerDiameterMm<r.outerDiameterMm);
 assert.ok(r.pointsMm.flat().every(Number.isFinite));
 for(const stage of r.stages)assert.ok(table.points.every(p=>p.circuit.some(s=>s.id===stage)),stage);
}
assert.ok(layout.routes.find(r=>r.id==='capillary').lengthMm>2000);
assert.ok(layout.routes.find(r=>r.id==='condenser').pointsMm.length>100);
assert.ok(layout.routes.find(r=>r.id==='evaporator').pointsMm.length>100);
console.log('Piping: directed closed circuit, 8 connected routes, shared port coordinates, lengths, bores and thermal-stage references pass.');
