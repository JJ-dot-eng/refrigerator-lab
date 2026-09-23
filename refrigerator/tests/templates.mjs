// Layout templates: defaults and the corners of each size range build cleanly, keep the
// requested envelope, and out-of-range input is refused.
import assert from 'node:assert/strict';
import {build} from '../generator/build.mjs';
import {TEMPLATES, fromTemplate} from '../generator/templates.mjs';

let count = 0;
for (const [id, t] of Object.entries(TEMPLATES)) {
  const dims = ['width', 'depth', 'height', 'feet'].map(k => t.params.find(p => p.key === k));
  const corners = [{}];
  for (const d of dims) corners.splice(0, corners.length, ...corners.flatMap(c => [{...c, [d.key]: d.min}, {...c, [d.key]: d.max}]));
  for (const input of [{}, ...corners, {shelves: 1}, {shelves: 6}]) {
    const spec = fromTemplate(id, input), out = build(spec);
    const tag = `${id} ${JSON.stringify(input)}`;
    assert.deepEqual(out.errors, [], tag);
    assert.deepEqual(out.verification.failures, [], tag);
    const p = {...Object.fromEntries(t.params.map(q => [q.key, q.default])), ...input};
    assert.equal(out.verification.overallWithHandleMm.width, p.width, `${tag} width`);
    assert.equal(out.verification.overallWithHandleMm.height, p.height, `${tag} height`);
    count++;
  }
  assert.throws(() => fromTemplate(id, {width: 10}), /폭은\(는\)/);
}
assert.throws(() => fromTemplate('igloo', {}), /알 수 없는 형태/);
console.log(`Templates: ${count} size variants of ${Object.keys(TEMPLATES).length} layouts build with closed circuits and no interference; out-of-range input refused.`);
