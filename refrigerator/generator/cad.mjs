// CAD import: STEP/IGES via occt-import-js (OpenCascade compiled to WebAssembly, LGPL-2.1),
// STL/OBJ via three.js loaders. The same code runs in Node (generate.mjs) and the browser
// (editor); each side passes its own way of creating the OpenCascade module.
import {T} from './geometry.mjs';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';

export const CAD_EXTENSIONS = ['step', 'stp', 'iges', 'igs', 'stl', 'obj'];
const ext = name => name.toLowerCase().split('.').pop();

function fromGeometry(g) {
  const pos = g.getAttribute('position');
  const positions = Array.from(pos.array), indices = g.index ? Array.from(g.index.array) : Array.from({length: pos.count}, (_, i) => i);
  return {positions, indices};
}

/**
 * @param name file name (extension decides the reader)
 * @param bytes Uint8Array of the file
 * @param getOcct async () => OpenCascade module (only needed for STEP/IGES)
 * @returns {meshes: [{name, positions, indices}], triangles}
 */
export async function parseCad(name, bytes, getOcct) {
  const e = ext(name);
  let meshes;
  if (['step', 'stp', 'iges', 'igs'].includes(e)) {
    const occt = await getOcct();
    const params = {linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: .002, angularDeflection: .5};
    const r = e.startsWith('i') ? occt.ReadIgesFile(bytes, params) : occt.ReadStepFile(bytes, params);
    if (!r.success) throw new Error(`${name}: CAD 파일을 읽지 못했습니다`);
    meshes = r.meshes.map(m => ({name: m.name || '', positions: Array.from(m.attributes.position.array), indices: Array.from(m.index.array)}));
  } else if (e === 'stl') {
    meshes = [{name, ...fromGeometry(new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)))}];
  } else if (e === 'obj') {
    const group = new OBJLoader().parse(new TextDecoder().decode(bytes));
    meshes = [];
    group.traverse(o => { if (o.isMesh) meshes.push({name: o.name, ...fromGeometry(o.geometry)}); });
  } else throw new Error(`${name}: 지원하지 않는 형식입니다 (${CAD_EXTENSIONS.join(', ')})`);
  const triangles = meshes.reduce((s, m) => s + m.indices.length / 3, 0);
  if (!triangles) throw new Error(`${name}: 형상이 비어 있습니다`);
  return {meshes, triangles};
}

// Placement of a CAD part in the model: scale, then rotate X→Y→Z (degrees), then translate.
export function cadMatrix(c) {
  const t = c.transform ?? {}, r = (t.rotateDeg ?? [0, 0, 0]).map(v => v * Math.PI / 180), s = t.scale ?? 1;
  return new T.Matrix4().compose(new T.Vector3(...(t.translate ?? [0, 0, 0])), new T.Quaternion().setFromEuler(new T.Euler(r[0], r[1], r[2], 'XYZ')), new T.Vector3(s, s, s));
}
