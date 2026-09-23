// CLI: node generator/generate.mjs [spec-id ...]
// Reads specs/<id>.json, writes public/models/<id>/{spec,model,routes,metadata,verification}.json + model.obj
// and public/models/index.json. Exits 1 if a spec is invalid or fails its checks.
import fs from 'node:fs';
import {build, toObj} from './build.mjs';

const root = new URL('../', import.meta.url), specsDir = new URL('specs/', root), outDir = new URL('public/models/', root);
const all = fs.readdirSync(specsDir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all;
let failed = false;
for (const id of ids) {
  const spec = JSON.parse(fs.readFileSync(new URL(`${id}.json`, specsDir), 'utf8'));
  const out = build(spec);
  const problems = out.errors.length ? out.errors : out.verification.failures;
  if (problems.length) { console.error(`✗ ${id}\n  ${problems.join('\n  ')}`); failed = true; continue; }
  const dir = new URL(`${id}/`, outDir);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(new URL('spec.json', dir), JSON.stringify(spec, null, 2));
  fs.writeFileSync(new URL('model.json', dir), JSON.stringify(out.model));
  fs.writeFileSync(new URL('routes.json', dir), JSON.stringify(out.routes));
  fs.writeFileSync(new URL('metadata.json', dir), JSON.stringify(out.metadata, null, 2));
  fs.writeFileSync(new URL('verification.json', dir), JSON.stringify(out.verification, null, 2));
  fs.writeFileSync(new URL('model.obj', dir), toObj(out.model, spec.meta.model));
  const v = out.verification;
  console.log(`✓ ${id}: ${v.partCount} parts, ${v.overallWithHandleMm.width}×${v.overallWithHandleMm.depth}×${v.overallWithHandleMm.height} mm, ${Object.keys(v.pipeLengthsMm).length} pipe runs`);
}
const index = all.filter(id => fs.existsSync(new URL(`${id}/spec.json`, outDir))).map(id => {
  const s = JSON.parse(fs.readFileSync(new URL(`${id}/spec.json`, outDir), 'utf8'));
  return {id, model: s.meta.model, refrigerant: s.meta.refrigerant, summary: s.meta.summary ?? ''};
});
fs.writeFileSync(new URL('index.json', outDir), JSON.stringify({models: index}, null, 2));
process.exit(failed ? 1 : 0);
