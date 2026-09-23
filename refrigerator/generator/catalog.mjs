// Parts catalogue. Compressor entries carry datasheet numbers with their source; the
// generator turns them into hermetic-compressor parameters. Values written directly in a
// spec component (shell, base, stubs) always win over the catalogue.
//
// dims: overall height from the mounting surface, length (largest horizontal, X in the
// model) and width (Y). mounting.holeSpacing: [along length, along width]. tubes: outer
// diameter and height above the mounting surface. null = not stated in the datasheet.
/**
 * @typedef {{od?: number|null, idMm?: number|null, height: number|null}} Tube
 * @typedef {{id: string, manufacturer: string, model: string, refrigerant: string, hp?: string|null, typical?: boolean,
 *   supply?: string|null, displacementCc?: number|null, capacity?: {watts: number|null, condition: string|null}|null, weightKg?: number|null,
 *   dims: {height: number, length: number, width: number, shellLength?: number}, mounting?: {holeSpacing: number[]|null, holeDiameter: number|null}|null,
 *   tubes?: {suction?: Tube, discharge?: Tube, process?: Tube}|null, source: {url: string, page?: number|string|null}|null, notes?: string}} CompressorEntry
 */
/** @type {CompressorEntry[]} */
export const COMPRESSORS = [
  {id: 'typical-r600a-small', manufacturer: '일반형', model: '소형 R600a 왕복동 (일반값)', refrigerant: 'R600a', hp: '약 1/5', typical: true,
    dims: {height: 195, length: 198, width: 154.44}, mounting: {holeSpacing: [190, 130], holeDiameter: null},
    tubes: {suction: {od: 6.35, height: 108}, discharge: {od: 4.76, height: 118}, process: {od: 6.4, height: 118}}, source: null,
    notes: 'HR24B 재구성에 쓴 일반 형상.'},
  {id: 'typical-r290-medium', manufacturer: '일반형', model: '중형 R290 왕복동 (일반값)', refrigerant: 'R290', hp: '약 1/4~1/3', typical: true,
    dims: {height: 203, length: 210, width: 164}, mounting: {holeSpacing: [200, 136], holeDiameter: null},
    tubes: {suction: {od: 7.94, height: 113}, discharge: {od: 6.35, height: 123}, process: {od: 6.4, height: 123}}, source: null,
    notes: 'T-19-HC 재구성에 쓴 일반 형상.'},
  // ---- Datasheet entries (numbers as printed; see source). Tube "idMm" is the connector's printed
  // inside diameter (mid of range); the modelled stub outer diameter is idMm + 1.2.
  // Secop tube heights are the datasheet "h" values; Embraco sheets give none (generic heights used).
  {id: 'secop-nle15kk4', manufacturer: 'Secop', model: 'NLE15KK.4', refrigerant: 'R600a', supply: '220-240V 50Hz', hp: null, displacementCc: 14.65,
    capacity: {watts: 252.1, condition: 'ASHRAE LBP -23.3/54.4 °C'}, weightKg: 10.8,
    dims: {height: 197, length: 254, width: 166, shellLength: 205}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 8.2, height: 76}, discharge: {idMm: 6.2, height: 103}, process: {idMm: 6.2, height: 94}},
    source: {url: 'https://www.secop.com/fileadmin/user_upload/SEPS/datasheets/en/nle15kk4_105h6906_r600a_220v_50Hz_03-2020_ds.pdf', page: 2},
    notes: '길이 254는 전기 커버 포함, 쉘 205. 받침판 204×100.'},
  {id: 'secop-nlu10kk1', manufacturer: 'Secop', model: 'NLU10KK.1', refrigerant: 'R600a', supply: '220-240V 50Hz', hp: null, displacementCc: 10.09,
    capacity: {watts: 175.7, condition: 'ASHRAE LBP -23.3/54.4 °C'}, weightKg: 12.1,
    dims: {height: 203, length: 254, width: 166, shellLength: 205}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 6.2, height: 71}, discharge: {idMm: 5.17, height: 103}, process: {idMm: 6.2, height: 94}},
    source: {url: 'https://www.secop.com/fileadmin/user_upload/SEPS/datasheets/en/nlu10kk1_105h6193_r600a_220v_50hz_09-2023_ds.pdf', page: 2},
    notes: '쉘 205, 받침판 204×100.'},
  {id: 'embraco-emx70clc', manufacturer: 'Embraco', model: 'EMX70CLC', refrigerant: 'R600a', supply: '220-240V 50Hz', hp: null, displacementCc: 11.14,
    capacity: {watts: 192, condition: 'ASHRAE -23.3/54 °C'}, weightKg: 7.4,
    dims: {height: 166, length: 185, width: 155}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 6.15, height: null}, discharge: {idMm: 5.15, height: null}, process: {idMm: 6.0, height: null}},
    source: {url: 'https://www.armatec.com/4a60df/globalassets/armatec-se/inriver/documents/8030-1961/100008792/8140-43176701.pdf', page: 4},
    notes: '공식 Embraco 데이터시트(유통사 게시본). 받침판 200×100.'},
  {id: 'secop-nle10cn', manufacturer: 'Secop', model: 'NLE10CN', refrigerant: 'R290', supply: '220-240V 50Hz', hp: null, displacementCc: 10.09,
    capacity: {watts: 490.2, condition: 'ASHRAE LBP -23.3/54.4 °C, fan 3 m/s'}, weightKg: 10.9,
    dims: {height: 203, length: 254, width: 166, shellLength: 205}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 8.2, height: 69}, discharge: {idMm: 6.2, height: 102}, process: {idMm: 6.2, height: 94}},
    source: {url: 'https://www.secop.com/fileadmin/user_upload/SEPS/datasheets/en/nle10cn_105h6176_r290_220v_50hz_07-2024_ds.pdf', page: 2},
    notes: 'LBP/MBP. 쉘 205, 받침판 204×100.'},
  {id: 'secop-sc12cnx2', manufacturer: 'Secop', model: 'SC12CNX.2', refrigerant: 'R290', supply: '220-240V 50Hz', hp: null, displacementCc: 12.87,
    capacity: {watts: 489.6, condition: 'ASHRAE LBP -23.3/54.4 °C, fan 3 m/s'}, weightKg: 13.1,
    dims: {height: 209, length: 255, width: 151, shellLength: 218}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 8.2, height: 183}, discharge: {idMm: 6.2, height: 100}, process: {idMm: 6.2, height: 183}},
    source: {url: 'https://www.secop.com/fileadmin/user_upload/SEPS/datasheets/en/sc12cnx2_104h8266_r290_220v_50hz_12-2023_ds.pdf', page: 2},
    notes: '다중 구멍 받침판 204×150 (170×70, 165×101.6, 127×127). 쉘 218.'},
  {id: 'embraco-nek6152u', manufacturer: 'Embraco', model: 'NEK6152U', refrigerant: 'R290', supply: '220-240V 50Hz', hp: null, displacementCc: 5.44,
    capacity: {watts: 741, condition: 'ASHRAE MBP 7.2/54 °C, fan'}, weightKg: 10.3,
    dims: {height: 188, length: 241, width: 162, shellLength: 199}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 8.15, height: null}, discharge: {idMm: 6.15, height: null}, process: {idMm: 6.15, height: null}},
    source: {url: 'https://www.kaeltetechnikshop.com/media/e1/bc/63/1636647046/47-32NEK6152U_tech.pdf?ts=1636647046', page: 4},
    notes: '공식 Embraco 데이터시트(유통사 게시본). 중온(MBP)용. 쉘 199, 받침판 203×100.'},
  {id: 'embraco-nek6181u', manufacturer: 'Embraco', model: 'NEK6181U', refrigerant: 'R290', supply: '220-240V 50Hz', hp: null, displacementCc: 7.28,
    capacity: {watts: 965, condition: 'ASHRAE MBP 7.2/54 °C, fan'}, weightKg: 10.3,
    dims: {height: 188, length: 241, width: 162, shellLength: 199}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 8.15, height: null}, discharge: {idMm: 6.15, height: null}, process: {idMm: 6.15, height: null}},
    source: {url: 'https://arbo.it/content/product_assets/97/ce/97ceafcd86226aac4af06b59555a4699/schede_tecniche/NEK6181U_schedatecnica.pdf', page: 4},
    notes: '공식 Embraco 데이터시트(유통사 게시본). 중온(MBP)용. 쉘 199.'},
  {id: 'embraco-neu2155u', manufacturer: 'Embraco', model: 'NEU2155U', refrigerant: 'R290', supply: '220-240V 50Hz', hp: null, displacementCc: 13.54,
    capacity: {watts: 657, condition: 'ASHRAE LBP -23.3/54 °C, fan'}, weightKg: 12,
    dims: {height: 200, length: 241, width: 162, shellLength: 199}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 8.15, height: null}, discharge: {idMm: 6.15, height: null}, process: {idMm: 6.15, height: null}},
    source: {url: 'https://www.homelectrical.com/sites/default/files/EMB-NEU2155U-SPEC.pdf', page: 4},
    notes: '공식 Embraco 데이터시트(유통사 게시본). 저온(LBP)용. 쉘 199, 받침판 203×100.'},
  {id: 'secop-nl7f', manufacturer: 'Secop', model: 'NL7F', refrigerant: 'R134a', supply: '220-240V 50Hz', hp: null, displacementCc: 7.27,
    capacity: {watts: 186.1, condition: 'ASHRAE -23.3/54.4 °C'}, weightKg: 9.6,
    dims: {height: 189.5, length: 254, width: 166, shellLength: 205}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 6.2, height: 76}, discharge: {idMm: 5.17, height: 103}, process: {idMm: 6.2, height: 94}},
    source: {url: 'https://www.secop.com/fileadmin/user_upload/SEPS/datasheets/en/nl7f_105g6706_r134a_220v_50hz_01-2022_ds.pdf', page: 2},
    notes: '쉘 205, 받침판 204×100.'},
  {id: 'embraco-nek6210z', manufacturer: 'Embraco', model: 'NEK6210Z', refrigerant: 'R134a', supply: '220-240V 50Hz', hp: null, displacementCc: null,
    capacity: null, weightKg: 10.8,
    dims: {height: 200, length: 242, width: 162}, mounting: {holeSpacing: [170, 70], holeDiameter: 16},
    tubes: {suction: {idMm: 8.15, height: null}, discharge: {idMm: 6.15, height: null}, process: {idMm: 6.15, height: null}},
    source: {url: 'https://www.homelectrical.com/sites/default/files/EMB-NEK6210Z-SPEC.pdf', page: 4},
    notes: '공식 Embraco 데이터시트(유통사 게시본). 고온(HBP)용. 전체 폭 178(몸체 162).'},
];

const BASE = {plateThickness: 3, grommetHeight: 15};

export function findCompressor(id) { return COMPRESSORS.find(c => c.id === id); }

// Datasheet entry -> hermetic-compressor builder parameters (shell, base, stubs).
export function compressorParams(entry) {
  const d = entry.dims, lift = BASE.plateThickness + BASE.grommetHeight;
  const shellH = d.height - lift, [sx, sy] = entry.mounting?.holeSpacing ?? [d.length * .96, d.width * .84];
  const t = entry.tubes ?? {};
  const od = (tube, fallback) => tube?.od ?? (tube?.idMm ? Math.round((tube.idMm + 1.2) * 100) / 100 : fallback);
  // Tube heights are measured from the mounting surface; stubs are placed relative to the shell base.
  const h = (tube, fallback) => Math.min(shellH * .8, Math.max(shellH * .3, (tube?.height ?? fallback) - lift));
  const dy = Math.round(d.width * .246 * 100) / 100;
  return {
    shell: {width: d.shellLength ?? d.length, depth: d.width, height: shellH},
    base: {...BASE, plate: {x: [-(sx / 2 + 20), sx / 2 + 20], y: [-(sy / 2 + 20), sy / 2 + 20]}, grommet: {dx: sx / 2, dy: sy / 2, radius: 11, radius2: 9}},
    stubs: [
      {port: 'discharge', dy: -dy, height: h(t.discharge, shellH * .56 + lift), od: od(t.discharge, 4.76)},
      {port: 'suction', dy: 0, height: h(t.suction, shellH * .51 + lift), od: od(t.suction, 6.35)},
      {port: 'process', dy, height: h(t.process, shellH * .56 + lift), od: od(t.process, 6.4), crimp: true},
    ],
  };
}

// Spec component with a catalogue `model` -> fully specified component (explicit fields kept).
export function resolveCompressor(c) {
  if (!c.model) return c;
  const entry = findCompressor(c.model);
  if (!entry) throw new Error(`카탈로그에 없는 압축기 모델 "${c.model}"`);
  const p = compressorParams(entry);
  return {...c, shell: c.shell ?? p.shell, base: c.base ?? p.base, stubs: c.stubs ?? p.stubs};
}
