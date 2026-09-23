// Node side of CAD import: reads the files a spec's cad-part components name from a folder.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {parseCad} from './cad.mjs';

const require = createRequire(import.meta.url);
let occt;
const getOcct = async () => (occt ??= await require('occt-import-js')());

export async function loadCadFiles(spec, dirUrl) {
  const out = {};
  for (const c of spec.components) if (c.type === 'cad-part' && c.file && !out[c.file]) {
    const url = new URL(c.file, dirUrl);
    if (!fs.existsSync(url)) continue;              // build() reports the missing file
    out[c.file] = await parseCad(c.file, new Uint8Array(fs.readFileSync(url)), getOcct);
  }
  return out;
}
