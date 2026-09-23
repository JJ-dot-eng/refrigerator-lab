// Component builders. Each takes one spec entry and returns
// {parts:[...], ports:{name: Vector3}, path?: [Vector3], inside?: (p) => boolean}.
// Sub-elements (base, stubs, relay, bracket, wires, tray, rotor) accept {id, name, notes, basis, color} overrides.
import {T, V, P, box, boxOf, cyl, mergeMesh, subtractBox} from './geometry.mjs';

function part(owner, sub, defaults, geometry, extra = {}) {
  const o = {...defaults, ...(sub || {})};
  return {id: o.id, name: o.name, color: o.color, basis: o.basis ?? owner.basis ?? 'typical', notes: o.notes ?? '', page: o.page ?? owner.page,
    group: o.group, geometry: mergeMesh(geometry), ...extra};
}
const main = (c, geometry, color, extra) => part(c, null, {id: c.id, name: c.name, color: c.color ?? color, notes: c.notes, basis: c.basis, page: c.page}, geometry, extra);

// ---------- cabinet: body minus voids, plus simple primitive parts ----------
export function cabinet(c) {
  let pieces = [c.body];
  for (const v of c.voids) pieces = pieces.flatMap(p => subtractBox(p, v));
  return {parts: [main(c, pieces.map(boxOf), 0xbfcbd0)], ports: {}};
}

export function primitives(c) {
  const geo = c.primitives.map(p => p.box ? boxOf(p.box) : cyl(P(p.cylinder.from), P(p.cylinder.to), p.cylinder.radius, p.cylinder.segments ?? 16, p.cylinder.radius2 ?? p.cylinder.radius));
  return {parts: [main(c, geo, 0xbfcbd0, {group: c.group})], ports: {}};
}

export function wireShelves(c) {
  const r = c.rod?.outer ?? 1.6, ri = c.rod?.inner ?? 1, n = c.rod?.count ?? 19, inset = c.rod?.inset ?? 11, geo = [];
  for (const s of c.items) {
    const [x0, x1] = s.x, y0 = s.y[0] + r, y1 = s.y[1] - r, z = s.z;
    geo.push(cyl(V(x0, y0, z), V(x1, y0, z), r, 6), cyl(V(x0, y1, z), V(x1, y1, z), r, 6));
    for (const x of [x0, x1]) geo.push(cyl(V(x, y0, z), V(x, y1, z), r, 6));
    for (let j = 0; j < n; j++) { const x = x0 + inset + j * (x1 - x0 - 2 * inset) / (n - 1); geo.push(cyl(V(x, y0, z), V(x, y1, z), ri, 6)); }
  }
  return {parts: [main(c, geo, 0xd6dde0)], ports: {}};
}

// ---------- hermetic reciprocating compressor ----------
// Reference profile (radius, height) of a two-piece welded shell, scaled to shell.width × shell.height.
const PROFILE = [[0, 0], [55, 0], [75, 3], [88, 12], [94, 28], [96, 50], [96, 68], [99, 70], [99, 76], [96, 78], [95, 100], [91, 125], [82, 148], [66, 165], [42, 174], [0, 177]];
export function hermeticCompressor(c) {
  const [cx, cy] = c.center, sx = c.shell.width / 2 / 99, sz = c.shell.height / 177, ell = c.shell.depth / c.shell.width;
  const profile = PROFILE.map(([r, h]) => [r * sx, h * sz]);
  const b = c.base, shellBase = c.floorZ + b.plateThickness + b.grommetHeight;
  const radiusAt = h => { for (let i = 1; i < profile.length; i++) if (profile[i][1] >= h) { const [r0, h0] = profile[i - 1], [r1, h1] = profile[i]; return r0 + (r1 - r0) * (h - h0) / (h1 - h0); } return 0; };
  const top = profile.at(-1)[1];
  const shell = new T.LatheGeometry(profile.map(([r, h]) => new T.Vector2(r, h)), 48).rotateX(Math.PI / 2).scale(1, ell, 1).translate(cx, cy, shellBase);
  const base = [box(cx + b.plate.x[0], cx + b.plate.x[1], cy + b.plate.y[0], cy + b.plate.y[1], c.floorZ, c.floorZ + b.plateThickness)];
  for (const sxn of [-1, 1]) for (const syn of [-1, 1]) {
    const gx = cx + sxn * b.grommet.dx, gy = cy + syn * b.grommet.dy;
    base.push(cyl(V(gx, gy, c.floorZ + b.plateThickness), V(gx, gy, shellBase), b.grommet.radius, 16, b.grommet.radius2));
    base.push(box(gx - 15, gx + 15, gy - 10, gy + 10, shellBase - 2, shellBase + 2));
  }
  const ports = {}, stubGeo = [];
  for (const s of c.stubs) {
    const h = s.height, rr = radiusAt(h), half = rr * Math.sqrt(Math.max(0, 1 - (s.dy / (rr * ell)) ** 2));
    const surface = cx - half, z = shellBase + h, r = s.od / 2;
    const inner = V(surface + 10, cy + s.dy, z), tip = V(Math.round(surface - (s.length ?? 25)), cy + s.dy, z);
    ports[s.port] = tip;
    stubGeo.push(cyl(inner, tip, r));
    if (s.crimp) stubGeo.push(box(tip.x - 6, tip.x, tip.y - 4.5, tip.y + 4.5, tip.z - 1, tip.z + 1));
  }
  const parts = [
    main(c, shell, 0x1e2326),
    part(c, c.base.part, {id: `${c.id}_base`, name: '압축기 받침판·방진고무', color: 0x2d3336, group: c.id, notes: '받침판과 방진고무 4개.'}, base),
    part(c, c.stubPart, {id: `${c.id}_stubs`, name: '압축기 연결관', color: 0xc27c4e, group: c.id}, stubGeo),
  ];
  if (c.relay) parts.push(part(c, c.relay, {id: `${c.id}_relay`, name: '기동 릴레이', color: 0x3a4146},
    box(cx + c.relay.x[0], cx + c.relay.x[1], cy + c.relay.y[0], cy + c.relay.y[1], c.floorZ + c.relay.z[0], c.floorZ + c.relay.z[1])));
  const inside = p => { const h = p.z - shellBase; if (h < 0 || h > top) return false; const r = radiusAt(h); return ((p.x - cx) / r) ** 2 + ((p.y - cy) / (r * ell)) ** 2 < 1; };
  return {parts, ports, inside, shellTop: shellBase + top};
}

// ---------- condensate pan (optionally heated by a discharge loop routed in the circuit) ----------
export function condensatePan(c) {
  const {x: [x0, x1], y: [y0, y1], z: [z0, z1]} = c.box, t = c.wall ?? 2;
  const parts = [main(c, [box(x0, x1, y0, y1, z0, z0 + t), box(x0, x0 + t, y0, y1, z0, z1), box(x1 - t, x1, y0, y1, z0, z1), box(x0, x1, y0, y0 + t, z0, z1), box(x0, x1, y1 - t, y1, z0, z1)], 0x8a9396)];
  if (c.bracket) parts.push(part(c, c.bracket, {id: `${c.id}_bracket`, name: '팬 받침 브래킷', color: 0x5c6468, group: c.id}, boxOf(c.bracket)));
  return {parts, ports: {}};
}

// ---------- rear wire-on-tube condenser: vertical serpentine in the plane y = const ----------
export function wireOnTubeCondenser(c) {
  const pitch = (c.x0 - c.x1) / (c.legs - 1), path = [];
  for (let i = 0; i < c.legs; i++) {
    const x = c.x0 - i * pitch, up = i % 2 === 0;
    path.push(up ? V(x, c.y, c.zBot) : V(x, c.y, c.zTop), up ? V(x, c.y, c.zTop) : V(x, c.y, c.zBot));
  }
  const w = c.wire, geo = [];
  for (let z = w.z[0]; z <= w.z[1]; z += w.pitch) for (const y of [c.y - c.tubeOd / 2 - w.od / 2, c.y + c.tubeOd / 2 + w.od / 2]) geo.push(cyl(V(w.x[0], y, z), V(w.x[1], y, z), w.od / 2, 6));
  const br = c.brackets;
  if (br) for (const x of br.x) {
    geo.push(box(x - br.width / 2, x + br.width / 2, ...br.y, ...br.z));
    for (const z of br.tabs.z) geo.push(box(x - 10, x + 10, ...br.tabs.y, z - 3, z + 3));
  }
  const wireSpan = c.tubeOd / 2 + w.od;
  return {parts: [part(c, c.wires, {id: `${c.id}_wires`, name: '응축기 와이어·브래킷', color: 0x1d2124, group: c.id}, geo)], ports: {in: path[0], out: path.at(-1)}, path, bendRadius: pitch / 2,
    solids: [{x: w.x, y: [c.y - wireSpan, c.y + wireSpan], z: w.z}]};
}

// ---------- fin-and-tube coil (evaporator or forced-air condenser): tubes along X ----------
export function finTubeCoil(c) {
  const f = c.fins, geo = [];
  for (let x = f.x[0]; x <= f.x[1] + .01; x += f.pitch) geo.push(box(x - .15, x + .15, ...f.y, ...f.z));
  if (f.endPlates !== false) for (const x of [f.x[0] - 3, f.x[1] + 3]) geo.push(box(x - 1, x + 1, ...f.y, ...f.z));
  const t = c.tubes, X = side => side > 0 ? t.bendX[1] : t.bendX[0];
  const path = [V(t.inletX, t.cols[0], t.rows[0])];
  let side = 1;
  t.cols.forEach((y, ci) => {
    const rows = ci % 2 === 0 ? t.rows : [...t.rows].reverse();
    rows.forEach((z, ri) => {
      if (ci === 0 && ri === 0) { path.push(V(X(1), y, z)); side = 1; return; }
      path.push(V(X(side), y, z)); side = -side; path.push(V(X(side), y, z));
    });
  });
  const last = path.at(-1);
  path.push(V(t.outletX, last.y, last.z));
  const parts = [main(c, geo, 0xcfd6da)];
  const d = c.dripTray;
  if (d) parts.push(part(c, d, {id: `${c.id}_tray`, name: '물받이', color: 0x9aa4a8, group: c.id}, [
    box(...d.x, ...d.y, ...d.z), box(...d.x, d.y[0], d.y[0] + 2, d.z[0], d.z[0] + d.lip), box(...d.x, d.y[1] - 2, d.y[1], d.z[0], d.z[0] + d.lip)]));
  return {parts, ports: {in: path[0], out: path.at(-1)}, path, bendRadius: t.bendRadius, solids: [{x: f.x, y: f.y, z: f.z}]};
}

// ---------- filter drier: vertical copper shell, inlet on top ----------
export function filterDrier(c) {
  const r = c.diameter / 2, ri = c.inletOd / 2, ro = c.outletOd / 2, {x, y, zBot, zTop} = c;
  const geo = [cyl(V(x, y, zBot), V(x, y, zTop), r, 20),
    cyl(V(x, y, zTop), V(x, y, zTop + 8), r, 20, ri), cyl(V(x, y, zTop + 8), V(x, y, zTop + 16), ri),
    cyl(V(x, y, zBot), V(x, y, zBot - 8), r, 20, ro), cyl(V(x, y, zBot - 8), V(x, y, zBot - 16), ro)];
  return {parts: [main(c, geo, 0xc9a15a)], ports: {in: V(x, y, zTop + 16), out: V(x, y, zBot - 16)}, solids: [{x: [x - r, x + r], y: [y - r, y + r], z: [zBot, zTop]}]};
}

// ---------- axial fan with shroud; axis along Y, all offsets relative to centre (blade plane) ----------
export function axialFan(c) {
  const [cx, cy, cz] = c.center, s = c.shroud, geo = [];
  if (s) {
    geo.push(box(cx + s.x[0], cx - s.opening, cy + s.y[0], cy + s.y[1], cz + s.z[0], cz + s.z[1]), box(cx + s.opening, cx + s.x[1], cy + s.y[0], cy + s.y[1], cz + s.z[0], cz + s.z[1]));
    geo.push(new T.CylinderGeometry(s.ring.radius, s.ring.radius, s.ring.length, 32, 1, true).translate(cx, cy + s.ring.y, cz));
  }
  geo.push(cyl(V(cx, cy + c.motor.y[0], cz), V(cx, cy + c.motor.y[1], cz), c.motor.radius));
  for (const a of [0, 2.1, 4.2]) geo.push(cyl(V(cx + Math.cos(a) * c.motor.radius, cy + c.brackets.y[0], cz + Math.sin(a) * c.motor.radius), V(cx + Math.cos(a) * c.brackets.reach, cy + c.brackets.y[1], cz + Math.sin(a) * c.brackets.reach), 1.5, 6));
  const bl = c.blades, rotor = [cyl(V(cx, cy + c.hub.y[0], cz), V(cx, cy + c.hub.y[1], cz), c.hub.radius)];
  for (let k = 0; k < bl.count; k++) {
    const blade = new T.BoxGeometry(bl.width, bl.thickness, bl.length).rotateZ(bl.pitch).translate(0, 0, bl.radius);
    rotor.push(blade.applyMatrix4(new T.Matrix4().makeRotationY(k / bl.count * Math.PI * 2)).translate(cx, cy, cz));
  }
  return {parts: [main(c, geo, 0x2b3338),
    part(c, c.rotor, {id: `${c.id}_rotor`, name: '팬 날개', color: 0x3b464c, group: c.id}, rotor, {spin: {centerMm: [cx, 0, cz], axisMm: [0, 1, 0], rpm: c.rpm ?? 1300}})], ports: {},
    // blade disc and motor volumes that pipes must not cross
    solids: [{x: [cx - bl.radius - bl.length / 2, cx + bl.radius + bl.length / 2], y: [cy - bl.width / 2, cy + bl.width / 2], z: [cz - bl.radius - bl.length / 2, cz + bl.radius + bl.length / 2]},
      {x: [cx - c.motor.radius, cx + c.motor.radius], y: [cy + c.motor.y[0], cy + c.motor.y[1]], z: [cz - c.motor.radius, cz + c.motor.radius]}]};
}

// ---------- flexible hose (non-refrigerant), swept along a filleted path ----------
export function hose(c, {fillet, sweep}) {
  const pts = fillet(c.path.map(P), c.bendRadius ?? 20);
  return {parts: [main(c, sweep(pts, c.od / 2, 12), 0xe4e8e6)], ports: {}};
}

export const BUILDERS = {
  'cabinet': cabinet, 'primitives': primitives, 'wire-shelves': wireShelves,
  'hermetic-compressor': hermeticCompressor, 'condensate-pan': condensatePan,
  'wire-on-tube-condenser': wireOnTubeCondenser, 'fin-tube-coil': finTubeCoil,
  'filter-drier': filterDrier, 'axial-fan': axialFan, 'hose': hose,
};
