// HR24B reconstruction.
// Placement: Hoshizaki service manual 73229 pp7-9 (rear assembly, section, circuit order).
// Shapes and tube sizes: typical small R600a reach-in parts, not factory CAD.
// Run from refrigerator/:  node public/hr24/generate_hr24.mjs
// Units mm. X = right seen from front, Y = toward rear, Z = up.
import fs from 'node:fs';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const OUT = new URL('./', import.meta.url);
const V = (x, y, z) => new T.Vector3(x, y, z);

// ---------- geometry helpers ----------
function box(x0, x1, y0, y1, z0, z1) {
  return new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
function cyl(a, b, r, seg = 16, r2 = r) {
  const dir = b.clone().sub(a), len = dir.length();
  const g = new T.CylinderGeometry(r2, r, len, seg);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.normalize()));
  return g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());
}
// Round every corner of a polyline with a bend radius (quadratic arc approximation).
function fillet(pts, r, steps = 10) {
  const out = [pts[0].clone()];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b), l1 = d1.length(), l2 = d2.length();
    if (d1.clone().normalize().dot(d2.clone().normalize()) > .9999) { out.push(b.clone()); continue; }
    const d = Math.min(r, l1 / 2, l2 / 2);
    const p1 = b.clone().sub(d1.normalize().multiplyScalar(d)), p2 = b.clone().add(d2.normalize().multiplyScalar(d));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      out.push(p1.clone().multiplyScalar((1 - t) ** 2).add(b.clone().multiplyScalar(2 * (1 - t) * t)).add(p2.clone().multiplyScalar(t * t)));
    }
  }
  out.push(pts.at(-1).clone());
  return out.filter((p, i, all) => i === 0 || p.distanceTo(all[i - 1]) > 1e-6);
}
// Sweep a circle along exact polyline points (parallel-transport frames, no resampling).
function sweep(pts, r, radial = 12) {
  const n = pts.length, tan = pts.map((p, i) => pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
  let normal = Math.abs(tan[0].z) < .9 ? V(0, 0, 1).cross(tan[0]).normalize() : V(1, 0, 0).cross(tan[0]).normalize();
  const pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const axis = tan[i - 1].clone().cross(tan[i]);
      if (axis.length() > 1e-8) normal.applyAxisAngle(axis.normalize(), Math.acos(Math.min(1, Math.max(-1, tan[i - 1].dot(tan[i])))));
    }
    const bin = tan[i].clone().cross(normal).normalize();
    for (let k = 0; k < radial; k++) {
      const a = k / radial * Math.PI * 2;
      pos.push(...pts[i].clone().add(normal.clone().multiplyScalar(Math.cos(a) * r)).add(bin.clone().multiplyScalar(Math.sin(a) * r)).toArray());
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
    const a = i * radial + k, b = i * radial + (k + 1) % radial, c = a + radial, d = b + radial;
    idx.push(a, c, b, b, c, d);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
const length = pts => pts.reduce((s, p, i) => i ? s + p.distanceTo(pts[i - 1]) : 0, 0);

const parts = [];
function part(id, name, geometry, color, basis, notes, extra = {}) {
  const g = mergeGeometries([].concat(geometry).map(x => x.index ? x.toNonIndexed() : x), false);
  const m = mergeVertices(g);
  parts.push({id, name, color, basis, notes, ...extra, geometry: m});
}
function mergeVertices(g) {
  const p = g.getAttribute('position'), map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 100)).join(',');
    let j = map.get(key);
    if (j === undefined) { j = pos.length / 3; map.set(key, j); pos.push(...key.split(',').map(v => v / 100)); }
    idx.push(j);
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  return out;
}

// ---------- key layout (mm) ----------
const CX = 75, CY = 200;          // compressor centre; p7 rear view: left of centre, under the pan
const SHELL_BASE = 48;             // floor 30 + base plate 3 + rubber grommets 15
const COND = {x0: 235, x1: -235, y: 295, zBot: 300, zTop: 735, legs: 12};
const DRIER = {x: -240, y: 270, zBot: 160, zTop: 260};
const EVAP = {x0: -150, x1: 150, y0: 40, y1: 95, z0: 655, z1: 740, cols: [80, 55], rows: [727, 707, 687, 667]};
const OD = {discharge: 4.76, bundy: 4.76, cap: 2.0, evap: 7.94, suction: 6.35};

// ---------- cabinet (visual envelope, p8 dimensions) ----------
const cab = [];
for (const s of [-1, 1]) {
  const X = (a, b) => s < 0 ? [a, b] : [-b, -a];
  cab.push(box(...X(-297.5, -257.5), -258, 312, 20, 805));       // outer side wall
  cab.push(box(...X(-257.5, -230), -258, 265, 275, 805));        // side insulation beside interior
  cab.push(box(...X(-257.5, -230), 265, 312, 745, 805));
  cab.push(box(...X(-257.5, -230), -258, 110, 20, 275));
}
cab.push(box(-230, 230, -258, 72, 20, 95));        // floor under lower interior
cab.push(box(-230, 230, 72, 110, 95, 275));        // machine compartment front wall
cab.push(box(-257.5, 257.5, 110, 312, 20, 30));    // machine compartment floor
cab.push(box(-230, 230, 72, 265, 275, 295));       // step above compartment
cab.push(box(-257.5, 257.5, 265, 312, 275, 280));
cab.push(box(-230, 230, 192, 265, 295, 745));      // rear insulated wall behind interior
cab.push(box(-230, 230, -258, 312, 745, 805));     // top with control fascia
part('cabinet', '외함·내함', cab, 0xbfcbd0, 'drawing', '595 W × 624 D(도어 포함) × 805 H, 내부 폭 460·높이 475·깊이 450/330 (8쪽). 벽 두께 분할은 추정.');
part('door', '단열 도어', box(-294.5, 294.5, -312, -262, 25, 749), 0xbfcbd0, 'drawing', '오른쪽 힌지 (7쪽). 두께 50은 추정.');
part('handle', '전장 손잡이', [box(-291.5, -272.5, -336, -312, 49.5, 724.5), box(-291.5, -257.5, -336, -333, 49.5, 724.5)], 0x9aa7ad, 'drawing', '돌출 24mm (8쪽).', {group: 'door'});
part('display', '온도 표시창', box(-230, -120, -261, -258, 767, 787), 0x1c2a30, 'drawing', '제어부 위치 (7쪽).', {group: 'cabinet'});
const shelves = [];
for (const [z, depth] of [[570, 432], [390, 313], [190, 313]]) {
  const yc = -258 + depth / 2 + 5, r = 1.6, sy = depth / 2 - r;
  shelves.push(cyl(V(-222, yc - sy, z), V(222, yc - sy, z), r, 6), cyl(V(-222, yc + sy, z), V(222, yc + sy, z), r, 6));
  for (const x of [-222, 222]) shelves.push(cyl(V(x, yc - sy, z), V(x, yc + sy, z), r, 6));
  for (let j = 0; j < 19; j++) { const x = -211 + j * 422 / 18; shelves.push(cyl(V(x, yc - sy, z), V(x, yc + sy, z), 1, 6)); }
}
part('shelves', '선반 3개', shelves, 0xd6dde0, 'drawing', '큰 선반 1 + 작은 선반 2, 내부 단차에 맞춤 (7·8쪽).');
const feet = [];
for (const x of [-263, 263]) { feet.push(cyl(V(x, -272, 0), V(x, -272, 20), 13)); feet.push(cyl(V(x - 10, 276, 10), V(x + 10, 276, 10), 10)); }
part('feet', '앞 조절발·뒤 롤러', feet, 0x3a4449, 'drawing', '높이 20 (8쪽).', {group: 'cabinet'});

// ---------- compressor: small hermetic reciprocating, R600a ~1/5 HP class ----------
// Profile (radius, height) of the two-piece welded shell; section is elliptical 99 × 77.
const profile = [[0, 0], [55, 0], [75, 3], [88, 12], [94, 28], [96, 50], [96, 68], [99, 70], [99, 76], [96, 78], [95, 100], [91, 125], [82, 148], [66, 165], [42, 174], [0, 177]];
const ELL = .78;
const shell = new T.LatheGeometry(profile.map(([r, h]) => new T.Vector2(r, h)), 48).rotateX(Math.PI / 2).scale(1, ELL, 1).translate(CX, CY, SHELL_BASE);
const radiusAt = h => { for (let i = 1; i < profile.length; i++) if (profile[i][1] >= h) { const [r0, h0] = profile[i - 1], [r1, h1] = profile[i]; return r0 + (r1 - r0) * (h - h0) / (h1 - h0); } return 0; };
const base = [box(CX - 115, CX + 115, CY - 85, CY + 85, 30, 33)];
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  base.push(cyl(V(CX + sx * 95, CY + sy * 65, 33), V(CX + sx * 95, CY + sy * 65, 48), 11, 16, 9));   // rubber grommet
  base.push(box(CX + sx * 95 - 15, CX + sx * 95 + 15, CY + sy * 65 - 10, CY + sy * 65 + 10, 46, 50)); // welded foot
}
part('compressor', '밀폐형 압축기', shell, 0x1e2326, 'typical', '소형 R600a 왕복동 밀폐형(약 1/5HP급) 일반 형상. 쉘 약 200×155×177mm, 상·하 용접쉘 이음부 포함. 위치는 7·8쪽 후면 하부 기계실.');
part('compressor_base', '압축기 받침판·방진고무', base, 0x2d3336, 'typical', '받침판과 방진고무 4개.', {group: 'compressor'});
// Stubs on the -X side (toward drier / capillary), typical three-tube layout.
const stub = (dy, h, r, name) => {
  const rr = radiusAt(h), half = rr * Math.sqrt(Math.max(0, 1 - (dy / (rr * ELL)) ** 2));
  const surface = CX - half, z = SHELL_BASE + h;
  return {name, inner: V(surface + 10, CY + dy, z), tip: V(Math.round(surface - 25), CY + dy, z), r};
};
const stubs = {discharge: stub(-38, 100, OD.discharge / 2, '토출'), suction: stub(0, 90, OD.suction / 2, '흡입'), process: stub(38, 100, 3.2, '충전')};
part('compressor_stubs', '압축기 연결관', Object.values(stubs).map(s => cyl(s.inner, s.tip, s.r)).concat([box(stubs.process.tip.x - 6, stubs.process.tip.x, stubs.process.tip.y - 4.5, stubs.process.tip.y + 4.5, stubs.process.tip.z - 1, stubs.process.tip.z + 1)]), 0xc27c4e, 'typical', '토출 Ø4.76 · 흡입 Ø6.35 · 충전관(끝 압착).', {group: 'compressor'});
part('start_relay', '기동 릴레이·과부하 보호기', box(CX - 10, CX + 60, CY + 62, CY + 100, 70, 130), 0x3a4146, 'drawing', '7쪽 Start Relay 표기 위치. 커버 크기는 일반값.');

// ---------- condensate pan on top of compressor (p7) ----------
const PAN = {x0: CX - 110, x1: CX + 110, y0: CY - 72, y1: CY + 72, z0: 227, z1: 267, t: 2};
part('pan', '응축수 증발 팬', [
  box(PAN.x0, PAN.x1, PAN.y0, PAN.y1, PAN.z0, PAN.z0 + PAN.t),
  box(PAN.x0, PAN.x0 + PAN.t, PAN.y0, PAN.y1, PAN.z0, PAN.z1), box(PAN.x1 - PAN.t, PAN.x1, PAN.y0, PAN.y1, PAN.z0, PAN.z1),
  box(PAN.x0, PAN.x1, PAN.y0, PAN.y0 + PAN.t, PAN.z0, PAN.z1), box(PAN.x0, PAN.x1, PAN.y1 - PAN.t, PAN.y1, PAN.z0, PAN.z1),
], 0x8a9396, 'drawing', '7쪽: 압축기 위 응축수 받침. 220×144×40mm는 일반값.');
part('pan_bracket', '팬 받침 브래킷', box(CX - 70, CX + 70, CY - 5, CY + 5, 221, PAN.z0), 0x5c6468, 'typical', '압축기 상부 쉘에 걸친 받침.', {group: 'pan'});

// ---------- condenser: rear wire-on-tube (p7) ----------
const pitch = (COND.x0 - COND.x1) / (COND.legs - 1), wires = [];
for (let z = 310; z <= 725; z += 7) for (const y of [COND.y - OD.bundy / 2 - .75, COND.y + OD.bundy / 2 + .75]) wires.push(cyl(V(-250, y, z), V(250, y, z), .75, 6));
for (const x of [-254, 254]) {
  wires.push(box(x - 3, x + 3, 287, 303, 295, 740));
  for (const z of [300, 735]) wires.push(box(x - 10, x + 10, 265, 290, z - 3, z + 3));
}
part('condenser_wires', '응축기 와이어·브래킷', wires, 0x1d2124, 'typical', '양면 Ø1.5 강선 7mm 피치, 좌우 브래킷.', {group: 'condenser'});

// ---------- drier (p7: vertical, rear-view right) ----------
const D = DRIER;
part('drier', '필터 드라이어', [
  cyl(V(D.x, D.y, D.zBot), V(D.x, D.y, D.zTop), 9.5, 20),
  cyl(V(D.x, D.y, D.zTop), V(D.x, D.y, D.zTop + 8), 9.5, 20, 3.2), cyl(V(D.x, D.y, D.zTop + 8), V(D.x, D.y, D.zTop + 16), 3.2),
  cyl(V(D.x, D.y, D.zBot), V(D.x, D.y, D.zBot - 8), 9.5, 20, 1.5), cyl(V(D.x, D.y, D.zBot - 8), V(D.x, D.y, D.zBot - 16), 1.5),
], 0xc9a15a, 'drawing', '7쪽 후면 오른쪽 수직. Ø19×100mm 동 쉘, 위 입구 Ø6.35 · 아래 모세관 출구 (일반값).');

// ---------- evaporator: fin-and-tube coil under the ceiling (p7/p8) ----------
const E = EVAP, fins = [];
for (let x = E.x0; x <= E.x1 + .01; x += 6) fins.push(box(x - .15, x + .15, E.y0, E.y1, E.z0, E.z1));
for (const x of [E.x0 - 3, E.x1 + 3]) fins.push(box(x - 1, x + 1, E.y0, E.y1, E.z0, E.z1));   // end plates
part('evaporator', '증발기 핀', fins, 0xcfd6da, 'typical', '알루미늄 핀 6mm 피치, 300×55×85mm. 위치는 8쪽 단면의 천장 냉각부.');
part('drip_tray', '증발기 물받이', [box(-175, 175, 35, 100, 645, 647), box(-175, 175, 35, 37, 645, 652), box(-175, 175, 98, 100, 645, 652)], 0x9aa4a8, 'typical', '제상수 받침.', {group: 'evaporator'});
const fan = [
  box(-175, -48, 12, 14, 640, 745), box(48, 175, 12, 14, 640, 745),       // shroud panels
  new T.CylinderGeometry(50, 50, 10, 32, 1, true).translate(0, 13, 692),   // venturi ring (axis Y)
  cyl(V(0, 16, 692), V(0, 38, 692), 22),                                    // motor
];
for (const a of [0, 2.1, 4.2]) fan.push(cyl(V(Math.cos(a) * 22, 27, 692 + Math.sin(a) * 22), V(Math.cos(a) * 50, 14, 692 + Math.sin(a) * 50), 1.5, 6));
part('evaporator_fan', '증발기 팬·슈라우드', fan, 0x2b3338, 'typical', 'Ø100 축류팬, 셰이디드폴 모터, 슈라우드. 8쪽 단면에서 증발기 앞.');
const rotor = [cyl(V(0, -3, 692), V(0, 11, 692), 12)];                      // hub
for (let k = 0; k < 5; k++) {
  const blade = new T.BoxGeometry(18, 1.6, 34).rotateZ(.35).translate(0, 4, 28);  // pitched blade, radius 11..45
  rotor.push(blade.applyMatrix4(new T.Matrix4().makeRotationY(k / 5 * Math.PI * 2)).translate(0, 0, 692));
}
// spin: the viewer rotates this part about axis through centerMm while the circuit runs.
part('evaporator_fan_rotor', '증발기 팬 날개', rotor, 0x3b464c, 'typical', '5날 축류팬 날개.', {group: 'evaporator_fan', spin: {centerMm: [0, 0, 692], axisMm: [0, 1, 0], rpm: 1300}});

// ---------- refrigerant routes (circuit order from p9) ----------
const P = a => a.map(p => V(...p));
const cs = stubs;
const routes = [];
function route(id, name, pts, od, color, r, notes) { routes.push({id, name, od, color, points: fillet(P(pts), r), notes}); }

route('discharge', '토출관', [cs.discharge.tip.toArray(), [-55, CY - 38, cs.discharge.tip.z], [-55, CY - 38, 200], [-55, 285, 200], [0, 285, 200], [0, 285, 271], [0, 255, 271], [0, 255, 232]], OD.discharge, 0xb5794a, 15,
  '압축기 토출 → 응축수 팬. Ø4.76 동도금 강관.');
route('pan_loop', '팬 가열 루프', [[0, 255, 232], [160, 255, 232], [160, 215, 232], [10, 215, 232], [10, 175, 232], [160, 175, 232], [160, 145, 232], [172, 145, 232], [172, 145, 271], [200, 145, 271]], OD.discharge, 0xb5794a, 12,
  '토출 가스가 팬 바닥을 왕복하며 응축수를 증발시킴 (9쪽 Condensate Pan).');
route('condenser_feed', '응축기 입구관', [[200, 145, 271], [COND.x0, 145, 271], [COND.x0, COND.y, 271], [COND.x0, COND.y, COND.zBot]], OD.discharge, 0xb5794a, 15,
  '팬 루프 출구 → 후면 응축기 첫 열.');
const coil = [];
for (let i = 0; i < COND.legs; i++) {
  const x = COND.x0 - i * pitch, up = i % 2 === 0;
  coil.push(up ? [x, COND.y, COND.zBot] : [x, COND.y, COND.zTop], up ? [x, COND.y, COND.zTop] : [x, COND.y, COND.zBot]);
}
route('condenser', '후면 응축관', coil, OD.bundy, 0x1d2124, pitch / 2, '12열 수직 사행 Ø4.76 강관 (7쪽 후면 설치도 형상).');
route('perimeter', '좌측 벽 둘레 액관', [[COND.x1, COND.y, COND.zBot], [COND.x1, COND.y, 288], [-283, COND.y, 288], [-283, -240, 288], [-283, -240, 770], [-283, 250, 770], [-283, 250, 320], [D.x, 250, 320], [D.x, D.y, 320], [D.x, D.y, D.zTop + 16]], OD.bundy, 0xb5794a, 20,
  '응축기 출구 → 왼쪽 벽 속 문틀 둘레(결로 방지) → 드라이어 입구. 벽 발포 단열재 속 매립 (9쪽 Left Side Perimeter).');
const capStart = [[D.x, D.y, D.zBot - 16], [D.x, D.y, 128], [-228, 278, 112]];
const C = {x: -185, y: 282, z: 100, r: 30, turns: 4, pitch: 3};
const helix = [];
for (let i = 0; i <= C.turns * 36 + 27; i++) {
  const a = Math.PI + i / 36 * Math.PI * 2;
  helix.push([C.x + C.r * Math.cos(a), C.y + Math.min(i / 36, C.turns) * C.pitch, C.z + C.r * Math.sin(a)]);
}
const HX = {x: -195.5, y: 230};   // capillary soldered beside the suction line
route('capillary', '모세관', [...capStart, ...helix, [-200, 296, 132], [HX.x, 296, 150], [HX.x, 296, 185], [HX.x, HX.y, 185]], OD.cap, 0xd08a5a, 6,
  'Ø2.0(내경 약 0.7) 동관. 드라이어 출구 → 4회 감은 코일 → 흡입관에 합류 (7쪽 Capillary Tube).');
route('capillary_hx', '모세관·흡입관 열교환부', [[HX.x, HX.y, 185], [HX.x, HX.y, 733], [HX.x, E.cols[0], 733], [-180, E.cols[0], 733], [-180, E.cols[0], E.rows[0]], [-172, E.cols[0], E.rows[0]]], OD.cap, 0xd08a5a, 6,
  '모세관을 흡입관에 붙여 후면 단열재 속을 올라가 증발기 입구로. 액 과냉과 흡입가스 가열 (9쪽 점선 구간).');
const ev = [[-172, E.cols[0], E.rows[0]]];
let side = 1;
for (const [ci, y] of E.cols.entries()) {
  const rows = ci === 0 ? E.rows : [...E.rows].reverse();
  rows.forEach((z, ri) => {
    if (ci === 0 && ri === 0) { ev.push([170, y, z]); side = 1; return; }
    ev.push([side * 170, y, z]); side = -side; ev.push([side * 170, y, z]);
  });
}
ev.push([-180, E.cols[1], E.rows[0]]);
route('evaporator', '증발관', ev, OD.evap, 0xd08a5a, 10, 'Ø7.94 동관 2열×4단 사행, 입·출구 모두 왼쪽 끝.');
route('suction', '흡입관', [[-180, E.cols[1], E.rows[0]], [-200, E.cols[1], E.rows[0]], [-200, HX.y, E.rows[0]], [-200, HX.y, cs.suction.tip.z], [-200, CY, cs.suction.tip.z], cs.suction.tip.toArray()], OD.suction, 0xd08a5a, 25,
  'Ø6.35 동관. 증발기 출구 → 후면 단열재 속 수직 하강 → 압축기 흡입구.');

// Non-refrigerant: defrost water hose from drip tray to pan.
const drain = fillet(P([[100, 95, 645], [100, 95, 628], [100, 215, 610], [100, 215, 262]]), 20);
part('drain', '응축수 배수호스', sweep(drain, 5, 12), 0xe4e8e6, 'drawing', '7쪽 Condensate Drain Line: 물받이 → 팬.');

for (const r of routes) part(r.id, r.name, sweep(r.points, Math.max(r.od / 2, .9), r.od > 3 ? 12 : 8), r.color, 'typical', r.notes, {kind: 'pipe', group: r.id === 'condenser' ? 'condenser' : undefined});

// ---------- checks ----------
const fail = [];
const same = (a, b) => a.distanceTo(b) < 1e-6;
const drierIn = V(D.x, D.y, D.zTop + 16), drierOut = V(D.x, D.y, D.zBot - 16);
for (let i = 0; i < routes.length - 1; i++) {
  const [a, b] = [routes[i], routes[i + 1]];
  if (a.id === 'perimeter') { if (!same(a.points.at(-1), drierIn) || !same(b.points[0], drierOut)) fail.push('드라이어 입·출구 연결 불일치'); }
  else if (!same(a.points.at(-1), b.points[0])) fail.push(`${a.id} → ${b.id} 끊김`);
}
if (!same(routes[0].points[0], stubs.discharge.tip)) fail.push('토출관 시작 ≠ 압축기 토출구');
if (!same(routes.at(-1).points.at(-1), stubs.suction.tip)) fail.push('흡입관 끝 ≠ 압축기 흡입구');

function segDist(p1, q1, p2, q2) {
  const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s, t;
  if (a < 1e-12 && e < 1e-12) return p1.distanceTo(p2);
  if (a < 1e-12) { s = 0; t = Math.min(1, Math.max(0, f / e)); }
  else {
    const c = d1.dot(r);
    if (e < 1e-12) { t = 0; s = Math.min(1, Math.max(0, -c / a)); }
    else {
      const b = d1.dot(d2), den = a * e - b * b;
      s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
    }
  }
  return p1.clone().add(d1.multiplyScalar(s)).distanceTo(p2.clone().add(d2.multiplyScalar(t)));
}
const touching = new Set(['capillary|suction', 'capillary_hx|suction']);
const clearances = {};
for (let i = 0; i < routes.length; i++) for (let j = i + 1; j < routes.length; j++) {
  const A = routes[i], B = routes[j], key = `${A.id}|${B.id}`;
  const join = j === i + 1 ? A.points.at(-1) : null;
  let min = Infinity;
  for (let a = 1; a < A.points.length; a++) for (let b = 1; b < B.points.length; b++) {
    const near = (p, q) => Math.min(p.distanceTo(join), q.distanceTo(join)) < 30;
    if (join && near(A.points[a - 1], A.points[a]) && near(B.points[b - 1], B.points[b])) continue;
    min = Math.min(min, segDist(A.points[a - 1], A.points[a], B.points[b - 1], B.points[b]));
  }
  const gap = min - A.od / 2 - B.od / 2;
  clearances[key] = Math.round(gap * 10) / 10;
  if (gap < (touching.has(key) ? -.05 : 1)) fail.push(`${key} 간섭 ${gap.toFixed(2)}mm`);
}
// Pipes must stay outside the compressor shell (except the stub stretch).
const insideShell = p => { const h = p.z - SHELL_BASE; if (h < 0 || h > 177) return false; const r = radiusAt(h); return ((p.x - CX) / r) ** 2 + ((p.y - CY) / (r * ELL)) ** 2 < 1; };
for (const r of routes) for (const p of r.points) if (insideShell(p)) fail.push(`${r.id} 압축기 쉘 관통`);
if (fail.length) { console.error(fail.join('\n')); process.exit(1); }

// ---------- outputs ----------
const round = v => Math.round(v * 100) / 100;
const meshes = parts.map(p => {
  p.geometry.computeBoundingBox();
  const b = p.geometry.boundingBox;
  return {id: p.id, name: p.name, group: p.group, kind: p.kind, spin: p.spin, color: p.color, basis: p.basis, notes: p.notes,
    positions: Array.from(p.geometry.getAttribute('position').array, round), indices: Array.from(p.geometry.index.array),
    boundsMm: {min: b.min.toArray().map(round), max: b.max.toArray().map(round)}};
});
const all = new T.Box3();
for (const m of meshes) all.union(new T.Box3(V(...m.boundsMm.min), V(...m.boundsMm.max)));
const size = all.getSize(V()).toArray().map(round);
fs.writeFileSync(new URL('model.json', OUT), JSON.stringify({units: 'mm', coordinateSystem: 'X right viewed from front; Y rear; Z up. THREE x=X/1000,y=Z/1000,z=-Y/1000.', doorPivotMm: [297.5, -312, 0], parts: meshes}));
fs.writeFileSync(new URL('routes.json', OUT), JSON.stringify({model: 'Hoshizaki HR24B', refrigerant: 'R600a', coordinateBasis: 'mm; front-view right +X, rear +Y, up +Z',
  circuitOrder: routes.map(r => r.id), compressorPorts: Object.fromEntries(Object.entries(stubs).map(([k, s]) => [k, s.tip.toArray()])),
  routes: routes.map(r => ({id: r.id, name: r.name, outerDiameterMm: r.od, lengthMm: Math.round(length(r.points)), notes: r.notes, points: r.points.map(p => p.toArray().map(round))}))}));
let obj = '# Hoshizaki HR24B reconstruction (mm). Placement from service manual 73229; shapes typical, not factory CAD.\n', base0 = 1;
for (const m of meshes) {
  obj += `o ${m.id}\n`;
  for (let i = 0; i < m.positions.length; i += 3) obj += `v ${m.positions[i]} ${m.positions[i + 1]} ${m.positions[i + 2]}\n`;
  for (let i = 0; i < m.indices.length; i += 3) obj += `f ${m.indices[i] + base0} ${m.indices[i + 1] + base0} ${m.indices[i + 2] + base0}\n`;
  base0 += m.positions.length / 3;
}
fs.writeFileSync(new URL('model.obj', OUT), obj);
const verification = {valid: true, partCount: meshes.length, triangles: meshes.reduce((s, m) => s + m.indices.length / 3, 0),
  overallWithHandleMm: {width: size[0], depth: size[1], height: size[2]}, sourceDimensionsMm: {width: 595, depthWithoutHandle: 624, height: 805, handleProjection: 24},
  circuitClosed: true, pipeClearanceMm: clearances, pipeLengthsMm: Object.fromEntries(routes.map(r => [r.id, Math.round(length(r.points))])),
  notManufacturerNativeCAD: true};
fs.writeFileSync(new URL('verification.json', OUT), JSON.stringify(verification, null, 2));
fs.writeFileSync(new URL('metadata.json', OUT), JSON.stringify({model: 'Hoshizaki HR24B', refrigerant: 'R600a', chargeOz: 2.8, supply: '115V/60Hz/1ph, 4A', designPressurePsig: {high: 360, low: 120},
  source: 'https://secure.hoshizakiamerica.com/docs/manuals/HR24B_serv.pdf', sourceRevision: '73229, 2021-04-20', sourcePages: [7, 8, 9, 38],
  method: 'Placement and circuit order follow the service drawings. Component shapes and tube sizes are typical values for small R600a reach-in refrigerators, not factory CAD or measurements.',
  basisLegend: {drawing: 'position/shape visible in the service drawings', typical: 'industry-typical shape and size at the drawing position'},
  parts: meshes.map(({positions, indices, ...rest}) => rest)}, null, 2));
console.log(JSON.stringify({parts: meshes.length, size, pipes: verification.pipeLengthsMm}, null, 1));
