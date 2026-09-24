// /reference cycle tab: the cycle-table stages are laid onto the runs of the spec-generated
// T-19-HC model in circuit order, every run is covered, and the colours follow the physics.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {t19Steps, stepSamples, stepStateAt} from '../lib/circuit.ts';

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const table = read('../public/reference/cycle-table.json'), routes = read('../public/models/t-19-hc/routes.json').routes;
const len = id => routes.find(r => r.id === id).lengthMm;
const share = len('capillary') / (len('capillary') + len('capillary_hx'));
assert.ok(share > 0 && share < 1, 'capillary split');
const steps = t19Steps(share);

// Every pipe run of the model has a step, and every route step is a run of the model.
assert.deepEqual(steps.filter(s => s.kind === 'route').map(s => s.id), routes.map(r => r.id));
for (const id of ['drier', 'compressor']) assert.ok(read('../public/models/t-19-hc/model.json').parts.some(p => p.id === id), `part ${id}`);

// Stage order along the steps (repeats collapsed) is the table's cycle order, starting after the compressor.
const unique = [...new Set(steps.flatMap(s => s.stages.map(x => x[0])))];
const cycle = table.points[0].circuit.map(s => s.id);
assert.deepEqual(unique, [...cycle.slice(1), cycle[0]], 'steps follow the refrigerant path');

for (const point of table.points) {
  const byId = id => steps.find(s => s.id === id);
  // The capillary samples are shared, not duplicated or lost, between its two runs.
  assert.equal(stepSamples(byId('capillary'), point).length + stepSamples(byId('capillary_hx'), point).length, point.circuit.find(s => s.id === 'capillary').samples.length);
  for (const s of steps) assert.ok(stepSamples(s, point).length > 0, `${s.id} has states`);
  assert.equal(stepStateAt(byId('discharge'), point, 0).phase, 'superheated');
  assert.equal(stepStateAt(byId('condenser'), point, .999).phase, 'subcooled');
  assert.equal(stepStateAt(byId('liquid_line'), point, .5).phase, 'subcooled');
  assert.equal(stepStateAt(byId('capillary_hx'), point, .999).phase, 'two-phase');
  assert.equal(stepStateAt(byId('evaporator'), point, 0).phase, 'two-phase');
  assert.equal(stepStateAt(byId('suction'), point, .5).phase, 'superheated');
  assert.ok(stepStateAt(byId('suction'), point, .5).temperatureC < stepStateAt(byId('discharge'), point, .5).temperatureC, 'suction colder than discharge');
}
console.log(`Reference circuit: ${steps.length} steps cover all ${routes.length} T-19-HC runs in cycle order, capillary split ${share.toFixed(2)}, phases at ${table.points.length} operating points.`);
