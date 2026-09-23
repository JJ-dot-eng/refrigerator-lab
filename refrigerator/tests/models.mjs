// Spec-driven generator: every spec builds cleanly, committed outputs are up to date,
// model-specific placement holds, and broken specs are rejected with readable errors.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build, validate} from '../generator/build.mjs';

const specsDir = new URL('../specs/', import.meta.url), outDir = new URL('../public/models/', import.meta.url);
const ids = fs.readdirSync(specsDir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
const load = id => JSON.parse(fs.readFileSync(new URL(`${id}.json`, specsDir), 'utf8'));
const built = {};
for (const id of ids) {
  const spec = load(id), out = build(spec);
  assert.deepEqual(out.errors, [], `${id} errors`);
  assert.deepEqual(out.verification.failures, [], `${id} checks`);
  // Committed files must match a fresh build (run `node generator/generate.mjs` after editing a spec).
  const committed = JSON.parse(fs.readFileSync(new URL(`${id}/routes.json`, outDir), 'utf8'));
  assert.deepEqual(committed, JSON.parse(JSON.stringify(out.routes)), `${id}: public/models is stale`);
  assert.deepEqual(JSON.parse(fs.readFileSync(new URL(`${id}/spec.json`, outDir), 'utf8')), spec, `${id}: spec copy is stale`);
  built[id] = out;
}
const index = JSON.parse(fs.readFileSync(new URL('index.json', outDir), 'utf8'));
assert.deepEqual(index.models.map(m => m.id).sort(), [...ids].sort(), 'index lists every spec');

// T-19-HC: bottom-mount layout, so the same generator must place parts very differently from HR24B.
const t19 = built['t-19-hc'];
const b = id => { const p = t19.model.parts.find(p => p.id === id); return {min: p.boundsMm.min, max: p.boundsMm.max}; };
assert.ok(b('compressor').max[2] < 330 && b('condenser').max[2] < 330, 'condensing unit in bottom compartment');
assert.ok(b('evaporator').min[2] > 1700, 'evaporator under the ceiling');
assert.ok(b('condenser').min[1] < b('condenser_fan').min[1] && b('condenser_fan').max[1] < b('compressor').min[1], 'grille → condenser → fan → compressor front to back');
assert.deepEqual(t19.verification.overallWithHandleMm, {width: 685.8, depth: 634.21, height: 2005.01});
assert.deepEqual(t19.routes.circuitOrder, ['discharge', 'condenser', 'liquid_line', 'capillary', 'capillary_hx', 'evaporator', 'suction']);
const hr = built.hr24b;
assert.ok(hr.model.parts.find(p => p.id === 'condenser_wires').boundsMm.min[1] > 250, 'HR24B keeps its rear wire condenser');

// Broken specs are rejected with messages that point at the problem.
const base = load('hr24b');
const clone = () => JSON.parse(JSON.stringify(base));
let bad = clone(); bad.components[0].type = 'teleporter';
assert.match(validate(bad).join('\n'), /알 수 없는 부품 종류 "teleporter"/);
bad = clone(); bad.circuit[0].path[0] = 'nowhere.discharge';
assert.match(validate(bad).join('\n'), /포트 "nowhere.discharge"/);
bad = clone(); bad.circuit[0].path[0] = 'compressor.exhaust';
assert.match(build(bad).errors.join('\n'), /포트 "exhaust"가 없습니다/);
bad = clone(); bad.circuit.find(r => r.id === 'suction').path.splice(2, 0, [-240, 270, 727], [-240, 270, 200], [-200, 230, 200]);
assert.match(build(bad).verification.failures.join('\n'), /suction가 drier를 관통/);
bad = clone(); bad.circuit.find(r => r.id === 'pan_loop').path.splice(1, 1);
bad.circuit.find(r => r.id === 'condenser_feed').path[0] = [210, 145, 271];
assert.match(build(bad).verification.failures.join('\n'), /pan_loop → condenser_feed 끊김/);
bad = clone(); bad.expect.overallMm.width = 600;
assert.match(build(bad).verification.failures.join('\n'), /전체 치수/);

console.log(`Models: ${ids.length} specs build with closed circuits and no interference, outputs up to date, T-19-HC bottom-mount placement, 6 broken-spec cases rejected.`);
