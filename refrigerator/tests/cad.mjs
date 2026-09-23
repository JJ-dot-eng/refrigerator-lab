// CAD import: a STEP file is read with OpenCascade, placed by its transform, becomes a routing
// obstacle, and its ports can be piped like any other component.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {build} from '../generator/build.mjs';
import {parseCad} from '../generator/cad.mjs';
import {translateComponent} from '../generator/transform.mjs';

const require = createRequire(import.meta.url);
const getOcct = () => require('occt-import-js')();
const step = await parseCad('t19.step', new Uint8Array(fs.readFileSync(new URL('../public/reference/t-19-hc-reconstructed.step', import.meta.url))), getOcct);
assert.ok(step.meshes.length > 10 && step.triangles > 1000, 'STEP tessellated');

// Pure CAD model, no circuit: placed 1000 mm to the right and rotated 90° about Z.
const cadOnly = {schema: 'refrigerator-spec/1', id: 'cad-only', meta: {model: 'CAD only'}, circuit: [],
  components: [{id: 'body', type: 'cad-part', name: '가져온 외함', file: 't19.step', transform: {translate: [1000, 0, 0], rotateDeg: [0, 0, 90]}}]};
let out = build(cadOnly, {cad: {'t19.step': step}});
assert.deepEqual([out.errors, out.verification.failures], [[], []]);
const s = out.verification.overallWithHandleMm;
assert.ok(Math.abs(s.width - 634.21) < 1 && Math.abs(s.depth - 685.8) < 1 && Math.abs(s.height - 2005.01) < 1, `rotated envelope ${JSON.stringify(s)}`);
assert.equal(out.verification.hasCircuit, false);
assert.match(build(cadOnly).errors.join('\n'), /CAD 파일 "t19.step"이 없습니다/);

// Two CAD blocks (ASCII STL cube) with ports, connected by auto-routed pipes inside a cabinet.
const f = (n, a, b, c) => `facet normal ${n}\nouter loop\nvertex ${a}\nvertex ${b}\nvertex ${c}\nendloop\nendfacet\n`;
const v = ([x, y, z]) => `${x * 100} ${y * 100} ${z * 100}`;
const quads = [[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],[[0,0,1],[0,1,1],[1,1,1],[1,0,1]],[[0,0,0],[0,0,1],[1,0,1],[1,0,0]],[[0,1,0],[1,1,0],[1,1,1],[0,1,1]],[[0,0,0],[0,1,0],[0,1,1],[0,0,1]],[[1,0,0],[1,0,1],[1,1,1],[1,1,0]]];
const stl = 'solid cube\n' + quads.map(q => f('0 0 0', v(q[0]), v(q[1]), v(q[2])) + f('0 0 0', v(q[0]), v(q[2]), v(q[3]))).join('') + 'endsolid cube\n';
const cube = await parseCad('cube.stl', new TextEncoder().encode(stl), getOcct);
const block = (id, x) => ({id, type: 'cad-part', name: id, file: 'cube.stl', transform: {translate: [x, 0, 0]}, ports: {out: [50, 50, 120], in: [50, -20, 50]}});
const piped = {schema: 'refrigerator-spec/1', id: 'cad-piped', meta: {model: 'CAD piped'},
  components: [{id: 'cabinet', type: 'cabinet', name: '외함', body: {x: [-400, 600], y: [-300, 300], z: [0, 600]}, voids: []}, block('a', -300), block('b', 300)],
  circuit: [
    {id: 'r1', name: 'a→b', od: 6.35, path: ['a.out', {auto: {}}, 'b.in']},
    {id: 'r2', name: 'b→a', od: 6.35, path: ['b.out', {auto: {}}, 'a.in']},
  ]};
out = build(piped, {cad: {'cube.stl': cube}});
assert.deepEqual([out.errors, out.verification.failures], [[], []], 'CAD ports piped');
assert.deepEqual(out.routes.routes[0].points[0], [-250, 50, 120], 'port follows transform');
const moved = {...piped, components: piped.components.map(c => c.id === 'b' ? translateComponent(c, [0, 50, 100]) : c)};
out = build(moved, {cad: {'cube.stl': cube}});
assert.deepEqual([out.errors, out.verification.failures], [[], []], 'moved CAD block re-routed');
console.log(`CAD: STEP (${step.meshes.length} meshes, ${step.triangles} triangles) placed and rotated, STL blocks piped by port with auto routing, missing file reported.`);
