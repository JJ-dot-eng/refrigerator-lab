// Build a refrigerator model from a spec (see specs/README.md).
// build(spec) -> {parts, routes, verification, metadata, errors}
import {T, V, P, fillet, sweep, length, segDist} from './geometry.mjs';
import {BUILDERS} from './builders.mjs';
import {routePath} from './router.mjs';
import {findCompressor} from './catalog.mjs';

const isPoint = a => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);

// Structural validation with readable messages (Korean) so an uploaded spec can be fixed by hand.
export function validate(spec) {
  const errors = [], err = (where, msg) => errors.push(`${where}: ${msg}`);
  if (spec?.schema !== 'refrigerator-spec/1') err('schema', `"refrigerator-spec/1"이어야 합니다 (현재 ${JSON.stringify(spec?.schema)})`);
  if (!/^[a-z0-9-]+$/.test(spec?.id ?? '')) err('id', '영문 소문자·숫자·하이픈만 사용합니다');
  if (!spec?.meta?.model) err('meta.model', '모델명이 필요합니다');
  if (!Array.isArray(spec?.components) || !spec.components.length) { err('components', '부품 목록이 비어 있습니다'); return errors; }
  const ids = new Set();
  for (const [i, c] of spec.components.entries()) {
    const at = `components[${i}]${c?.id ? ` (${c.id})` : ''}`;
    if (!c?.id) err(at, 'id가 필요합니다');
    else if (ids.has(c.id)) err(at, 'id가 중복됩니다'); else ids.add(c.id);
    if (!BUILDERS[c?.type]) err(at, `알 수 없는 부품 종류 "${c?.type}" (가능: ${Object.keys(BUILDERS).join(', ')})`);
    if (!c?.name) err(at, 'name이 필요합니다');
    if (c?.type === 'cad-part' && !c.file) err(at, 'CAD 부품에는 file(파일 이름)이 필요합니다');
    if (c?.type === 'hermetic-compressor' && c.model && !findCompressor(c.model)) err(at, `카탈로그에 없는 압축기 모델 "${c.model}"`);
    if (c?.type === 'hermetic-compressor' && !c.model && !(c.shell && c.base && c.stubs)) err(at, '압축기는 카탈로그 model 또는 shell·base·stubs가 필요합니다');
  }
  if (!Array.isArray(spec.circuit)) { err('circuit', 'circuit 목록이 필요합니다 (배관이 없으면 빈 목록 [])'); return errors; }
  if (spec.circuit.length === 1) { err('circuit', '냉매 회로는 비워 두거나 2개 이상의 구간이어야 합니다'); return errors; }
  const portOwners = new Set(spec.components.map(c => c.id));
  for (const [i, r] of spec.circuit.entries()) {
    const at = `circuit[${i}]${r?.id ? ` (${r.id})` : ''}`;
    if (!r?.id) err(at, 'id가 필요합니다');
    if (!(r?.od > 0)) err(at, '관 외경 od(mm)가 필요합니다');
    if (!Array.isArray(r?.path) || !r.path.length) { err(at, 'path가 비어 있습니다'); continue; }
    for (const [j, item] of r.path.entries()) {
      const w = `${at}.path[${j}]`;
      if (typeof item === 'string') { const [owner, port] = item.split('.'); if (!portOwners.has(owner) || !port) err(w, `포트 "${item}"의 부품을 찾을 수 없습니다`); }
      else if (Array.isArray(item)) { if (!isPoint(item)) err(w, '좌표는 [x, y, z] 숫자 3개여야 합니다'); }
      else if (item?.component) { if (!portOwners.has(item.component)) err(w, `부품 "${item.component}"를 찾을 수 없습니다`); }
      else if (item?.port !== undefined) {
        const [owner, port] = String(item.port).split('.');
        if (!portOwners.has(owner) || !port) err(w, `포트 "${item.port}"의 부품을 찾을 수 없습니다`);
        if (!isPoint(item.offset ?? [0, 0, 0])) err(w, 'offset은 [dx, dy, dz] 숫자 3개여야 합니다');
      }
      else if (item?.auto) {
        if (j === 0 || j === r.path.length - 1) err(w, '자동 구간은 경로의 처음이나 끝에 올 수 없습니다 (앞뒤에 점이 필요합니다)');
        if (r.path[j - 1]?.auto || r.path[j + 1]?.auto) err(w, '자동 구간 두 개가 연달아 올 수 없습니다');
      }
      else if (!item?.helix) err(w, '포트 문자열, [x,y,z], {port, offset}, {component}, {helix}, {auto} 중 하나여야 합니다');
    }
  }
  return errors;
}

function helixPoints(h) {
  const spt = h.stepsPerTurn ?? 36, steps = h.turns * spt + Math.round((h.extraDeg ?? 0) / 360 * spt), out = [];
  const [cx, cy, cz] = h.center, a0 = (h.startDeg ?? 180) * Math.PI / 180;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + i / spt * Math.PI * 2;
    out.push(V(cx + h.radius * Math.cos(a), cy + Math.min(i / spt, h.turns) * h.pitch, cz + h.radius * Math.sin(a)));
  }
  return out;
}

// ctx.cad: {fileName: {meshes: [{positions, indices}]}} for cad-part components.
export function build(spec, ctx = {}) {
  const errors = validate(spec);
  if (errors.length) return {errors};
  const comps = {}, parts = [];
  try {
    for (const c of spec.components) {
      const out = BUILDERS[c.type](c, {fillet, sweep, cad: ctx.cad});
      comps[c.id] = out;
      parts.push(...out.parts);
    }
  } catch (e) { return {errors: [e.message]}; }
  const resolve = (item, where) => {
    if (typeof item === 'string') {
      const [owner, port] = item.split('.'), p = comps[owner].ports[port];
      if (!p) throw new Error(`${where}: 부품 "${owner}"에 포트 "${port}"가 없습니다 (가능: ${Object.keys(comps[owner].ports).join(', ') || '없음'})`);
      return [p.clone()];
    }
    if (Array.isArray(item)) return [P(item)];
    if (item.port !== undefined) return resolve(item.port, where).map(p => p.add(P(item.offset ?? [0, 0, 0])));
    if (item.component) { const path = comps[item.component].path; if (!path) throw new Error(`${where}: 부품 "${item.component}"에는 내부 유로가 없습니다`); return path.map(p => p.clone()); }
    return helixPoints(item.helix);
  };
  const checks = spec.checks ?? {};
  const touches = (r, id) => r.path.some(i => (typeof i === 'string' && i.split('.')[0] === id) || i?.component === id || (i?.port !== undefined && String(i.port).split('.')[0] === id));
  // Pass 1: resolve everything except automatic sections.
  let pending;
  try { pending = spec.circuit.map(r => ({r, pieces: r.path.map((item, j) => item?.auto ? null : resolve(item, `circuit(${r.id}).path[${j}]`))})); }
  catch (e) { return {errors: [e.message]}; }
  // Pass 2: route automatic sections in circuit order around parts and every other pipe known so far.
  const cabinet = comps.cabinet ?? Object.values(comps).find(c => c.bounds);
  const grow = (b, m) => ({x: [b.x[0] - m, b.x[1] + m], y: [b.y[0] - m, b.y[1] + m], z: [b.z[0] - m, b.z[1] + m]});
  const segmentBoxes = (pts, od) => pts.slice(1).map((p, i) => grow({x: [Math.min(pts[i].x, p.x), Math.max(pts[i].x, p.x)], y: [Math.min(pts[i].y, p.y), Math.max(pts[i].y, p.y)], z: [Math.min(pts[i].z, p.z), Math.max(pts[i].z, p.z)]}, od / 2));
  const autoErrors = [];
  for (const [ri, {r, pieces}] of pending.entries()) for (const [j, item] of r.path.entries()) {
    if (!item?.auto) continue;
    if (!cabinet?.bounds) { autoErrors.push(`circuit(${r.id}): 자동 구간에는 cabinet 부품(배관 허용 영역)이 필요합니다`); continue; }
    const ignore = new Set(item.auto.ignore ?? []);
    const margin = r.od / 2 + (checks.minClearanceMm ?? 1) + 1;
    const obstacles = [];
    // Connected parts are obstacles too: their ports stick out past their volume, and the end cells stay open.
    for (const [id, c] of Object.entries(comps)) if (!ignore.has(id)) for (const b of c.obstacles ?? c.solids ?? []) obstacles.push(grow(b, margin));
    const mayTouch = new Set((checks.touching ?? []).filter(p => p.includes(r.id)).flat());
    // Other pipes as known so far: consecutive resolved pieces form continuous polylines (gaps = unrouted auto sections).
    // Pipes allowed to touch this one (e.g. capillary on suction line) may be reached but not crossed.
    for (const [oi, o] of pending.entries()) if (oi !== ri) {
      const m = mayTouch.has(o.r.id) ? r.od / 2 - .05 : margin;
      let run = [];
      for (const piece of [...o.pieces, null]) {
        if (piece) { run.push(...piece); continue; }
        for (const b of [...segmentBoxes(run, o.r.od), ...run.map(q => grow({x: [q.x, q.x], y: [q.y, q.y], z: [q.z, q.z]}, o.r.od / 2))]) obstacles.push(grow(b, m));
        run = [];
      }
    }
    const from = pieces[j - 1].at(-1), to = pieces[j + 1][0];
    const opts = {bounds: cabinet.bounds, soft: cabinet.soft ?? [], obstacles, grid: item.auto.grid, bendCost: item.auto.bendCost, softCost: item.auto.softCost};
    // Open only the end cells first; widen the escape zone only if a port is boxed in.
    let out = routePath(from, to, {...opts, escape: 0});
    for (const escape of [1, 3]) if (out.error) out = routePath(from, to, {...opts, escape});
    if (out.error) autoErrors.push(`circuit(${r.id}).path[${j}] 자동 구간: ${out.error}`);
    else pieces[j] = out.points.slice(1, -1);
  }
  if (autoErrors.length) return {errors: autoErrors};
  const routes = pending.map(({r, pieces}) => {
    const radius = r.bendRadius ?? r.path.map(i => i.component && comps[i.component].bendRadius).find(Boolean) ?? 15;
    return {...r, points: fillet(pieces.flat(), radius)};
  });
  for (const r of routes) parts.push({id: `${r.id}_pipe`, group: r.group ?? r.id, name: r.name, color: r.color ?? 0xb5794a, basis: r.basis ?? 'typical', notes: r.notes ?? '', page: r.page,
    kind: 'pipe', geometry: sweep(r.points, Math.max(r.od / 2, .9), r.od > 3 ? 12 : 8)});

  // ---------- checks ----------
  const fail = [];
  const same = (a, b) => a.distanceTo(b) < 1e-6;
  const owner = i => typeof i === 'string' ? i.split('.')[0] : i?.port !== undefined ? String(i.port).split('.')[0] : null;
  const hasCircuit = spec.circuit.length > 0;
  const first = spec.circuit[0]?.path[0], last = spec.circuit.at(-1)?.path.at(-1);
  if (hasCircuit && (!owner(first) || owner(first) !== owner(last))) fail.push('회로는 같은 부품(압축기)의 포트에서 시작하고 끝나야 합니다');
  for (let i = 0; i < routes.length - 1; i++) {
    const a = routes[i], b = routes[i + 1];
    if (same(a.points.at(-1), b.points[0])) continue;
    const endRef = a.path.at(-1), startRef = b.path[0];
    const viaComponent = owner(endRef) !== null && owner(endRef) === owner(startRef);
    if (!viaComponent) fail.push(`${a.id} → ${b.id} 끊김`);
  }
  const touching = new Set((checks.touching ?? []).map(p => p.join('|')));
  const minGap = checks.minClearanceMm ?? 1, joinZone = checks.joinExclusionMm ?? 30, clearances = {};
  for (let i = 0; i < routes.length; i++) for (let j = i + 1; j < routes.length; j++) {
    const A = routes[i], B = routes[j], key = `${A.id}|${B.id}`;
    const join = j === i + 1 && same(A.points.at(-1), B.points[0]) ? A.points.at(-1) : null;
    const near = (p, q) => Math.min(p.distanceTo(join), q.distanceTo(join)) < joinZone;
    let min = Infinity;
    for (let a = 1; a < A.points.length; a++) for (let b = 1; b < B.points.length; b++) {
      if (join && near(A.points[a - 1], A.points[a]) && near(B.points[b - 1], B.points[b])) continue;
      min = Math.min(min, segDist(A.points[a - 1], A.points[a], B.points[b - 1], B.points[b]));
    }
    const gap = min - A.od / 2 - B.od / 2;
    clearances[key] = Math.round(gap * 10) / 10;
    if (gap < (touching.has(key) ? -.05 : minGap)) fail.push(`${key} 간섭 ${gap.toFixed(2)}mm`);
  }
  for (const [id, c] of Object.entries(comps)) if (c.inside) for (const r of routes) if (r.points.some(c.inside)) fail.push(`${r.id}가 ${id}를 관통`);
  // Pipes must not cross solid volumes of components they are not connected to.
  const inBox = (p, b) => ['x', 'y', 'z'].every((k, i) => p.getComponent(i) > b[k][0] + .5 && p.getComponent(i) < b[k][1] - .5);
  const samples = r => r.points.flatMap((p, i) => {
    if (!i) return [p];
    const a = r.points[i - 1], n = Math.ceil(a.distanceTo(p) / 5);
    return Array.from({length: n}, (_, k) => a.clone().lerp(p, (k + 1) / n));
  });
  for (const [id, c] of Object.entries(comps)) for (const b of c.solids ?? []) for (const r of routes)
    if (!touches(r, id) && samples(r).some(p => inBox(p, b))) fail.push(`${r.id}가 ${id}를 관통`);

  // ---------- outputs ----------
  const round = v => Math.round(v * 100) / 100;
  const color = c => typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c;
  const meshes = parts.map(p => {
    p.geometry.computeBoundingBox();
    const b = p.geometry.boundingBox;
    return {id: p.id, name: p.name, group: p.group, kind: p.kind, spin: p.spin, color: color(p.color), basis: p.basis, page: p.page, notes: p.notes,
      positions: Array.from(p.geometry.getAttribute('position').array, round), indices: Array.from(p.geometry.index.array),
      boundsMm: {min: b.min.toArray().map(round), max: b.max.toArray().map(round)}};
  });
  const all = new T.Box3();
  for (const m of meshes) all.union(new T.Box3(V(...m.boundsMm.min), V(...m.boundsMm.max)));
  const size = all.getSize(V()).toArray().map(round);
  const expect = spec.expect?.overallMm;
  if (expect && ['width', 'depth', 'height'].some((k, i) => Math.abs(size[i] - expect[k]) > .01)) fail.push(`전체 치수 ${size.join('×')} ≠ 기대값 ${expect.width}×${expect.depth}×${expect.height}`);
  // Doors: every component with a hinge swings about a vertical axis; swing +1 opens like a right-hinged door.
  const doors = spec.components.filter(c => Array.isArray(c.hinge)).map(c => ({id: c.id, pivotMm: c.hinge, swing: c.swing ?? (c.hinge[0] >= 0 ? 1 : -1)}));
  const model = {units: 'mm', coordinateSystem: 'X right viewed from front; Y rear; Z up. THREE x=X/1000,y=Z/1000,z=-Y/1000.',
    doorPivotMm: doors.find(d => d.id === 'door')?.pivotMm ?? null, doors, parts: meshes};
  const routesOut = {model: spec.meta.model, refrigerant: spec.meta.refrigerant, coordinateBasis: 'mm; front-view right +X, rear +Y, up +Z',
    circuitOrder: routes.map(r => r.id), compressorPorts: hasCircuit ? Object.fromEntries(Object.entries(comps[owner(first)].ports).map(([k, p]) => [k, p.toArray()])) : {},
    routes: routes.map(r => ({id: r.id, name: r.name, outerDiameterMm: r.od, lengthMm: Math.round(length(r.points)), notes: r.notes, points: r.points.map(p => p.toArray().map(round))}))};
  const verification = {valid: fail.length === 0, specId: spec.id, partCount: meshes.length, triangles: meshes.reduce((s, m) => s + m.indices.length / 3, 0),
    overallWithHandleMm: {width: size[0], depth: size[1], height: size[2]}, circuitClosed: hasCircuit && !fail.some(f => f.includes('끊김') || f.includes('시작하고')), hasCircuit,
    pipeClearanceMm: clearances, pipeLengthsMm: Object.fromEntries(routes.map(r => [r.id, Math.round(length(r.points))])), failures: fail, notManufacturerNativeCAD: !spec.components.some(c => c.type === 'cad-part')};
  const metadata = {...spec.meta, specId: spec.id, parts: meshes.map(({positions, indices, ...rest}) => rest)};
  return {errors: [], model, routes: routesOut, verification, metadata};
}

export function toObj(model, title) {
  let obj = `# ${title} (mm). Generated from spec; not factory CAD.\n`, base = 1;
  for (const m of model.parts) {
    obj += `o ${m.id}\n`;
    for (let i = 0; i < m.positions.length; i += 3) obj += `v ${m.positions[i]} ${m.positions[i + 1]} ${m.positions[i + 2]}\n`;
    for (let i = 0; i < m.indices.length; i += 3) obj += `f ${m.indices[i] + base} ${m.indices[i + 1] + base} ${m.indices[i + 2] + base}\n`;
    base += m.positions.length / 3;
  }
  return obj;
}
