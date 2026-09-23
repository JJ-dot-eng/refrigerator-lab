// Geometry helpers shared by all builders. Units mm, X right (front view), Y rear, Z up.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export {T};
export const V = (x, y, z) => new T.Vector3(x, y, z);
export const P = a => V(...a);

export function box(x0, x1, y0, y1, z0, z1) {
  return new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
export const boxOf = b => box(...b.x, ...b.y, ...b.z);

export function cyl(a, b, r, seg = 16, r2 = r) {
  const dir = b.clone().sub(a), len = dir.length();
  const g = new T.CylinderGeometry(r2, r, len, seg);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.normalize()));
  return g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());
}

// Round every corner of a polyline with a bend radius (quadratic arc approximation).
export function fillet(pts, r, steps = 10) {
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
export function sweep(pts, r, radial = 12) {
  const n = pts.length, tan = pts.map((p, i) => pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
  const normal = Math.abs(tan[0].z) < .9 ? V(0, 0, 1).cross(tan[0]).normalize() : V(1, 0, 0).cross(tan[0]).normalize();
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

export const length = pts => pts.reduce((s, p, i) => i ? s + p.distanceTo(pts[i - 1]) : 0, 0);

// Merge several geometries into one indexed mesh with 0.01 mm welded vertices.
export function mergeMesh(list) {
  const g = mergeGeometries([].concat(list).map(x => x.index ? x.toNonIndexed() : x), false);
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

// Axis-aligned box subtraction: a minus b as up to 6 boxes ({x:[..],y:[..],z:[..]}).
export function subtractBox(a, b) {
  const overlap = ['x', 'y', 'z'].every(k => b[k][0] < a[k][1] && b[k][1] > a[k][0]);
  if (!overlap) return [a];
  const out = [], rest = {x: [...a.x], y: [...a.y], z: [...a.z]};
  for (const k of ['x', 'y', 'z']) {
    if (b[k][0] > rest[k][0]) out.push({...rest, [k]: [rest[k][0], b[k][0]]});
    if (b[k][1] < rest[k][1]) out.push({...rest, [k]: [b[k][1], rest[k][1]]});
    rest[k] = [Math.max(rest[k][0], b[k][0]), Math.min(rest[k][1], b[k][1])];
  }
  return out;
}

// Closest distance between segments p1-q1 and p2-q2.
export function segDist(p1, q1, p2, q2) {
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
