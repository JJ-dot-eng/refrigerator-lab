// Move a whole spec component by d = [dx, dy, dz] mm, whatever its type.
// Used by the editor's drawing view (drag a part onto the drawing) and by tests.
const r2 = v => Math.round(v * 100) / 100;
const range = (r, dv) => r.map(v => r2(v + dv));
const box = (b, d) => b && ({...b, x: range(b.x, d[0]), y: range(b.y, d[1]), z: range(b.z, d[2])});
const point = (p, d) => p.map((v, i) => r2(v + d[i]));

const MOVERS = {
  'cabinet': (c, d) => ({...c, body: box(c.body, d), voids: c.voids.map(v => box(v, d))}),
  'primitives': (c, d) => ({...c, primitives: c.primitives.map(p => p.box ? {...p, box: box(p.box, d)} : {...p, cylinder: {...p.cylinder, from: point(p.cylinder.from, d), to: point(p.cylinder.to, d)}})}),
  'wire-shelves': (c, d) => ({...c, items: c.items.map(s => ({...s, x: range(s.x, d[0]), y: range(s.y, d[1]), z: r2(s.z + d[2])}))}),
  'hermetic-compressor': (c, d) => ({...c, center: point(c.center, d.slice(0, 2)), floorZ: r2(c.floorZ + d[2])}),
  'condensate-pan': (c, d) => ({...c, box: box(c.box, d), bracket: box(c.bracket, d)}),
  'wire-on-tube-condenser': (c, d) => ({...c, x0: r2(c.x0 + d[0]), x1: r2(c.x1 + d[0]), y: r2(c.y + d[1]), zBot: r2(c.zBot + d[2]), zTop: r2(c.zTop + d[2]),
    wire: {...c.wire, x: range(c.wire.x, d[0]), z: range(c.wire.z, d[2])},
    brackets: c.brackets && {...c.brackets, x: range(c.brackets.x, d[0]), y: range(c.brackets.y, d[1]), z: range(c.brackets.z, d[2]), tabs: {...c.brackets.tabs, y: range(c.brackets.tabs.y, d[1]), z: range(c.brackets.tabs.z, d[2])}}}),
  'fin-tube-coil': (c, d) => ({...c, fins: {...c.fins, x: range(c.fins.x, d[0]), y: range(c.fins.y, d[1]), z: range(c.fins.z, d[2])},
    tubes: {...c.tubes, cols: range(c.tubes.cols, d[1]), rows: range(c.tubes.rows, d[2]), bendX: range(c.tubes.bendX, d[0]), inletX: r2(c.tubes.inletX + d[0]), outletX: r2(c.tubes.outletX + d[0])},
    dripTray: box(c.dripTray, d)}),
  'filter-drier': (c, d) => ({...c, x: r2(c.x + d[0]), y: r2(c.y + d[1]), zBot: r2(c.zBot + d[2]), zTop: r2(c.zTop + d[2])}),
  'axial-fan': (c, d) => ({...c, center: point(c.center, d)}),
  'hose': (c, d) => ({...c, path: c.path.map(p => point(p, d))}),
  'cad-part': (c, d) => ({...c, transform: {...c.transform, translate: point(c.transform?.translate ?? [0, 0, 0], d)}}),
};

export function translateComponent(c, d) {
  const move = MOVERS[c.type];
  if (!move) throw new Error(`"${c.type}" 부품은 이동을 지원하지 않습니다`);
  const out = move(c, d);
  for (const k of ['bracket', 'brackets', 'dripTray']) if (out[k] === undefined) delete out[k];
  if (c.hinge) out.hinge = point(c.hinge, d);
  return out;
}
export const MOVABLE_TYPES = Object.keys(MOVERS);
