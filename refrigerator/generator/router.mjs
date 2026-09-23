// Orthogonal pipe router: A* on a rectilinear grid. Grid lines are spaced regularly and
// always include the start and end coordinates, so a route leaves and lands exactly on its
// end points. Hard obstacles are boxes the pipe centre may not enter; soft boxes (e.g. the
// food compartment) may be crossed at `softCost` times the price, so routes prefer walls
// and machine spaces.
import {V} from './geometry.mjs';

const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

class Heap {
  constructor() { this.keys = []; this.vals = []; }
  get size() { return this.keys.length; }
  push(key, val) {
    const k = this.keys, v = this.vals; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.keys, v = this.vals, top = v[0], lastK = k.pop(), lastV = v.pop(), n = k.length;
    if (n) {
      let i = 0;
      while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lastK) break; k[i] = k[c]; v[i] = v[c]; i = c; }
      k[i] = lastK; v[i] = lastV;
    }
    return top;
  }
}

// Regular lines across [lo, hi] plus the given exact values (lines closer than g/3 to them are dropped).
function axis(lo, hi, g, exact) {
  const lines = [...exact];
  for (let v = Math.ceil(lo / g) * g; v <= hi; v += g) if (exact.every(e => Math.abs(e - v) > g / 3)) lines.push(v);
  return [...new Set(lines)].filter(v => v >= lo - 1e-9 && v <= hi + 1e-9).sort((a, b) => a - b);
}

/**
 * @param start, end  Vector3 (mm)
 * @param opts.bounds {x,y,z} region the route must stay in
 * @param opts.obstacles [{x,y,z}] hard boxes, already inflated by pipe radius + clearance
 * @param opts.soft [{x,y,z}] boxes that cost `softCost` times more to cross
 * @param opts.escape grid steps around each end that are kept open even if an obstacle covers them
 * @returns {points: Vector3[]} corner points from start to end, or {error}
 */
export function routePath(start, end, opts) {
  const {bounds, obstacles = [], soft = [], bendCost = 2, softCost = 8, escape = 0, maxExpanded = 1500000} = opts;
  const keys = ['x', 'y', 'z'];
  if (keys.some((k, a) => start.getComponent(a) < bounds[k][0] || start.getComponent(a) > bounds[k][1])) return {error: '시작점이 배관 허용 영역 밖에 있습니다'};
  if (keys.some((k, a) => end.getComponent(a) < bounds[k][0] || end.getComponent(a) > bounds[k][1])) return {error: '끝점이 배관 허용 영역 밖에 있습니다'};
  // Grid pitch: requested value, coarsened so the search space stays near 400k cells.
  let g = opts.grid ?? 10;
  while (keys.reduce((m, k) => m * Math.ceil((bounds[k][1] - bounds[k][0]) / g + 3), 1) > 400000) g *= 1.25;
  const lines = keys.map((k, a) => axis(bounds[k][0], bounds[k][1], g, [start.getComponent(a), end.getComponent(a)]));
  const n = lines.map(l => l.length), cells = n[0] * n[1] * n[2];
  const idx = (i, j, k) => (i * n[1] + j) * n[2] + k;
  const unpack = c => { const k = c % n[2], j = ((c - k) / n[2]) % n[1]; return [(c - k - j * n[2]) / (n[1] * n[2]), j, k]; };

  const blocked = new Uint8Array(cells), costly = new Uint8Array(cells);
  const range = (a, lo, hi) => { let i0 = 0; while (i0 < n[a] && lines[a][i0] < lo) i0++; let i1 = n[a] - 1; while (i1 >= 0 && lines[a][i1] > hi) i1--; return [i0, i1]; };
  const mark = (arr, b) => {
    const [[i0, i1], [j0, j1], [k0, k1]] = keys.map((k, a) => range(a, b[k][0], b[k][1]));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) arr[idx(i, j, k)] = 1;
  };
  for (const b of obstacles) mark(blocked, b);
  for (const b of soft) mark(costly, b);

  const s = keys.map((_, a) => lines[a].indexOf(start.getComponent(a))), e = keys.map((_, a) => lines[a].indexOf(end.getComponent(a)));
  const open = c => {
    for (let i = Math.max(0, c[0] - escape); i <= Math.min(n[0] - 1, c[0] + escape); i++)
      for (let j = Math.max(0, c[1] - escape); j <= Math.min(n[1] - 1, c[1] + escape); j++)
        for (let k = Math.max(0, c[2] - escape); k <= Math.min(n[2] - 1, c[2] + escape); k++) blocked[idx(i, j, k)] = 0;
  };
  open(s); open(e);

  // State = cell * 7 + incoming direction (6 = none, at the start). Costs are in grid-pitch units.
  const cost = new Float32Array(cells * 7).fill(Infinity), parent = new Int32Array(cells * 7).fill(-1);
  const h = (i, j, k) => (Math.abs(lines[0][i] - end.x) + Math.abs(lines[1][j] - end.y) + Math.abs(lines[2][k] - end.z)) / g;
  const heap = new Heap(), s0 = idx(...s) * 7 + 6, goal = idx(...e);
  cost[s0] = 0; heap.push(h(...s), s0);
  let expanded = 0, found = -1;
  while (heap.size) {
    const st = heap.pop(), cell = Math.floor(st / 7), dir = st % 7;
    if (cell === goal) { found = st; break; }
    if (++expanded > maxExpanded) break;
    const c3 = unpack(cell), base = cost[st];
    for (let d = 0; d < 6; d++) {
      if (dir !== 6 && (d ^ 1) === dir) continue;          // no reversing on the spot
      const nb = [c3[0] + DIRS[d][0], c3[1] + DIRS[d][1], c3[2] + DIRS[d][2]];
      if (nb.some((v, a) => v < 0 || v >= n[a])) continue;
      const nc = idx(...nb);
      if (blocked[nc]) continue;
      const a = d >> 1, step = Math.abs(lines[a][nb[a]] - lines[a][c3[a]]) / g;
      const c = base + step * (costly[nc] ? softCost : 1) + (dir !== 6 && d !== dir ? bendCost : 0), ns = nc * 7 + d;
      if (c < cost[ns]) { cost[ns] = c; parent[ns] = st; heap.push(c + h(...nb), ns); }
    }
  }
  if (found < 0) return {error: expanded > maxExpanded ? '자동 배관 탐색이 너무 오래 걸립니다 (경유점을 추가해 범위를 좁히세요)' : '막히지 않은 배관 경로가 없습니다'};

  const path = [];
  for (let st = found; st >= 0; st = parent[st]) { const [i, j, k] = unpack(Math.floor(st / 7)); path.push(V(lines[0][i], lines[1][j], lines[2][k])); }
  path.reverse();
  // Keep only corners.
  const out = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const d1 = path[i].clone().sub(out.at(-1)).normalize(), d2 = path[i + 1].clone().sub(path[i]).normalize();
    if (d1.dot(d2) < .9999) out.push(path[i]);
  }
  out.push(path.at(-1));
  return {points: out, grid: g, expanded};
}
