// Layout templates: a handful of catalogue dimensions -> a complete refrigerator spec.
// Placement rules come from the two reconstructed models (HR24B under-counter, T-19-HC
// reach-in) and are expressed relative to the outer envelope, so other sizes follow.
// Connecting pipes use port-anchored points and {"auto": {}} sections, so they adapt too.

import {COMPRESSORS, findCompressor, compressorParams} from './catalog.mjs';

const r2 = v => Math.round(v * 100) / 100;
const box = (x, y, z) => ({x: x.map(r2), y: y.map(r2), z: z.map(r2)});
const pt = (...a) => a.map(r2);

// Shelves spread evenly between two heights; `rearAt(z)` gives the usable rear edge at that height.
function shelves(n, zLo, zHi, x, yFront, rearAt) {
  return Array.from({length: n}, (_, i) => {
    const z = r2(n === 1 ? (zLo + zHi) / 2 : zLo + i * (zHi - zLo) / (n - 1));
    return {z, x: x.map(r2), y: [r2(yFront), r2(rearAt(z))]};
  }).reverse();
}

const COMMON_PARAMS = [
  {key: 'model', label: '모델명', type: 'text', default: '새 냉장고'},
  {key: 'refrigerant', label: '냉매', type: 'select', options: ['R600a', 'R290', 'R134a'], default: 'R600a'},
  {key: 'shelves', label: '선반 수', unit: '개', min: 1, max: 6, step: 1},
  {key: 'compressor', label: '압축기', type: 'select', options: COMPRESSORS.map(c => c.id),
    optionLabels: Object.fromEntries(COMPRESSORS.map(c => [c.id, `${c.manufacturer} ${c.model} · ${c.refrigerant}`]))},
];

// ---------- under-counter, rear wire condenser, bottom machine compartment (HR24B type) ----------
function underCounter(p) {
  const W = p.width, D = p.depth, H = p.height, F = p.feet, X = W / 2;
  const comp = compressorParams(findCompressor(p.compressor));
  const yFront = -D / 2, yRear = D / 2, bodyFront = yFront + 54;
  // Machine compartment: at least 255 high, taller if the compressor + pan + pipe over the rim need it.
  const cmpTop = Math.max(F + 255, F + 10 + 18 + comp.shell.height + 50), upperFloor = cmpTop + 20, inTop = H - 60, inBottom = F + 75;
  const upperRear = yRear - 120, lowerRear = yRear - 240, sideIn = X - 67.5;
  const cond = {x0: X - 62.5, y: yRear - 17, zBot: cmpTop + 25, zTop: H - 70};
  const legs = 2 * Math.max(3, Math.round(((2 * cond.x0) / 42.7 + 1) / 2));
  const CX = r2(X * .252), CY = yRear - 112, floorZ = F + 10;
  const shellTop = floorZ + 18 + comp.shell.height;
  // The suction riser must end at or above the suction stub, else the auto section would climb back past the capillary.
  const suctionStubZ = floorZ + 18 + comp.stubs.find(s => s.port === 'suction').height;
  const pan = {x: [CX - 110, CX + 110], y: [CY - 72, CY + 72], z: [shellTop + 2, shellTop + 42]};
  const drier = {x: -(X - 57.5), y: yRear - 42, zBot: floorZ + 130};
  const fh = Math.min(150, X - 147.5), evTop = inTop, ev = {y: [yRear - 272, yRear - 217], z: [evTop - 90, evTop - 5]};
  const cols = [yRear - 232, yRear - 257], rows = [evTop - 18, evTop - 38, evTop - 58, evTop - 78];
  const sx = drier.x + 40, hx = sx + 4.5, hy = yRear - 82;
  const xw = -(X - 14.5);
  const panIn = [pan.x[0] + 35, pan.y[1] - 17, pan.z[0] + 5], panRim = pan.z[1] + 4;
  return {
    components: [
      {id: 'cabinet', type: 'cabinet', name: '외함·내함', basis: 'typical', notes: '외형은 입력 치수, 벽 두께와 내부 단차는 HR24B 비율을 따른 추정.',
        body: box([-X, X], [bodyFront, yRear], [F, H]),
        voids: [
          {name: 'interior-upper', keepOut: true, ...box([-sideIn, sideIn], [bodyFront - 1, upperRear], [upperFloor, inTop])},
          {name: 'interior-lower', keepOut: true, ...box([-sideIn, sideIn], [bodyFront - 1, lowerRear], [inBottom, upperFloor])},
          {name: 'machine-compartment', ...box([-(X - 40), X - 40], [yRear - 202, yRear + 1], [F + 10, cmpTop])},
          {name: 'condenser-recess', ...box([-(X - 40), X - 40], [yRear - 47, yRear + 1], [cmpTop + 5, inTop])},
        ]},
      {id: 'door', type: 'primitives', name: '단열 도어', basis: 'typical', notes: '오른쪽 힌지, 두께 50.', hinge: pt(X, yFront, 0),
        primitives: [{box: box([-(X - 3), X - 3], [yFront, yFront + 50], [F + 5, H - 56])}]},
      {id: 'handle', type: 'primitives', name: '전장 손잡이', group: 'door', color: '#9aa7ad', basis: 'typical', notes: '돌출 24mm.',
        primitives: [{box: box([-(X - 6), -(X - 25)], [yFront - 24, yFront], [F + 29.5, H - 80.5])}, {box: box([-(X - 6), -(X - 40)], [yFront - 24, yFront - 21], [F + 29.5, H - 80.5])}]},
      {id: 'display', type: 'primitives', name: '온도 표시창', group: 'cabinet', color: '#1c2a30', basis: 'typical', notes: '상단 전면 제어부.',
        primitives: [{box: box([-(X - 67.5), -(X - 177.5)], [bodyFront - 3, bodyFront], [H - 38, H - 18])}]},
      {id: 'shelves', type: 'wire-shelves', name: `선반 ${p.shelves}개`, basis: 'typical', notes: '높이는 고르게 배치.', rod: {outer: 1.6, inner: 1, count: Math.max(8, Math.round((W - 151) / 23.4)), inset: 11},
        items: shelves(p.shelves, inBottom + 95, inTop - 175, [-(X - 75.5), X - 75.5], bodyFront + 5, z => z > upperFloor + 20 ? upperRear - 13 : lowerRear - 12)},
      {id: 'feet', type: 'primitives', name: '앞 조절발·뒤 롤러', group: 'cabinet', color: '#3a4449', basis: 'typical', notes: `높이 ${F}.`,
        primitives: [-1, 1].flatMap(s => [
          {cylinder: {from: pt(s * (X - 34.5), yFront + 40, 0), to: pt(s * (X - 34.5), yFront + 40, F), radius: 13}},
          {cylinder: {from: pt(s * (X - 34.5) - 10, yRear - 36, F / 2), to: pt(s * (X - 34.5) + 10, yRear - 36, F / 2), radius: Math.min(10, F / 2)}}])},
      {id: 'compressor', type: 'hermetic-compressor', name: '밀폐형 압축기', basis: 'typical', notes: '소형 왕복동 밀폐형 일반 형상.',
        model: p.compressor, center: [CX, CY], floorZ,
        relay: {id: 'start_relay', name: '기동 릴레이', notes: '커버 크기는 일반값.', x: [-10, 60], y: [62, 100], z: [40, 100]}},
      {id: 'pan', type: 'condensate-pan', name: '응축수 증발 팬', basis: 'typical', notes: '압축기 위 받침.', box: box(pan.x, pan.y, pan.z), wall: 2,
        bracket: {id: 'pan_bracket', name: '팬 받침 브래킷', basis: 'typical', ...box([CX - 70, CX + 70], [CY - 5, CY + 5], [shellTop - 4, pan.z[0]])}},
      {id: 'condenser', type: 'wire-on-tube-condenser', name: '후면 응축기', basis: 'typical', notes: `Ø4.76 강관 ${legs}열 수직 사행, 양면 강선.`,
        x0: r2(cond.x0), x1: r2(-cond.x0), y: r2(cond.y), zBot: r2(cond.zBot), zTop: r2(cond.zTop), legs, tubeOd: 4.76,
        wire: {od: 1.5, pitch: 7, z: [r2(cond.zBot + 10), r2(cond.zTop - 10)], x: [r2(-(X - 47.5)), r2(X - 47.5)]},
        brackets: {x: [r2(-(X - 43.5)), r2(X - 43.5)], width: 6, y: [r2(yRear - 25), r2(yRear - 9)], z: [r2(cond.zBot - 5), r2(cond.zTop + 5)], tabs: {y: [r2(yRear - 47), r2(yRear - 22)], z: [r2(cond.zBot), r2(cond.zTop)]}}},
      {id: 'drier', type: 'filter-drier', name: '필터 드라이어', basis: 'typical', notes: 'Ø19×100mm 수직.', x: r2(drier.x), y: r2(drier.y), zBot: r2(drier.zBot), zTop: r2(drier.zBot + 100), diameter: 19, inletOd: 6.4, outletOd: 3},
      {id: 'evaporator', type: 'fin-tube-coil', name: '증발기 핀', basis: 'typical', notes: '천장 핀-튜브 코일.',
        fins: {x: [-fh, fh], y: ev.y.map(r2), z: ev.z.map(r2), pitch: 6},
        tubes: {od: 7.94, cols: cols.map(r2), rows: rows.map(r2), bendX: [-(fh + 20), fh + 20], inletX: -(fh + 22), outletX: -(fh + 30), bendRadius: 10},
        dripTray: {id: 'drip_tray', name: '증발기 물받이', ...box([-(fh + 25), fh + 25], [ev.y[0] - 5, ev.y[1] + 5], [ev.z[0] - 10, ev.z[0] - 8]), lip: 7}},
      {id: 'evaporator_fan', type: 'axial-fan', name: '증발기 팬·슈라우드', basis: 'typical', notes: 'Ø100 축류팬.', center: pt(0, ev.y[0] - 36, ev.z[0] + 37), rpm: 1300,
        shroud: {x: [-(fh + 25), fh + 25], y: [8, 10], z: [-52, 53], opening: 48, ring: {radius: 50, length: 10, y: 9}},
        motor: {radius: 22, y: [12, 34]}, brackets: {y: [23, 10], reach: 50}, hub: {radius: 12, y: [-7, 7]},
        blades: {count: 5, width: 18, thickness: 1.6, length: 34, radius: 28, pitch: .35}, rotor: {id: 'evaporator_fan_rotor', name: '증발기 팬 날개'}},
      {id: 'drain', type: 'hose', name: '응축수 배수호스', basis: 'typical', notes: '물받이 → 팬.', od: 10, bendRadius: 20,
        path: [pt(CX + 25, ev.y[1], ev.z[0] - 10), pt(CX + 25, ev.y[1], ev.z[0] - 27), pt(CX + 25, CY + 15, ev.z[0] - 45), pt(CX + 25, CY + 15, pan.z[1] - 5)]},
    ],
    circuit: [
      {id: 'discharge', name: '토출관', od: 4.76, color: '#b5794a', bendRadius: 15, notes: '압축기 → 응축수 팬.',
        path: ['compressor.discharge', {port: 'compressor.discharge', offset: [-23, 0, 0]}, {auto: {}}, pt(panIn[0], pan.y[1] + 13, panRim), pt(panIn[0], panIn[1], panRim), pt(...panIn)]},
      {id: 'pan_loop', name: '팬 가열 루프', od: 4.76, color: '#b5794a', bendRadius: 12, notes: '팬 바닥을 왕복하며 응축수를 증발.',
        path: [pt(...panIn), pt(pan.x[1] - 25, panIn[1], panIn[2]), pt(pan.x[1] - 25, pan.y[1] - 57, panIn[2]), pt(pan.x[0] + 45, pan.y[1] - 57, panIn[2]), pt(pan.x[0] + 45, pan.y[1] - 97, panIn[2]),
          pt(pan.x[1] - 25, pan.y[1] - 97, panIn[2]), pt(pan.x[1] - 25, pan.y[0] + 17, panIn[2]), pt(pan.x[1] - 13, pan.y[0] + 17, panIn[2]), pt(pan.x[1] - 13, pan.y[0] + 17, panRim), pt(pan.x[1] + 15, pan.y[0] + 17, panRim)]},
      {id: 'condenser_feed', name: '응축기 입구관', od: 4.76, color: '#b5794a', bendRadius: 15, notes: '팬 루프 → 응축기.',
        path: [pt(pan.x[1] + 15, pan.y[0] + 17, panRim), {auto: {}}, {port: 'condenser.in', offset: [0, 0, -29]}, 'condenser.in']},
      {id: 'condenser', name: '후면 응축관', od: 4.76, color: '#1d2124', notes: '수직 사행.', path: [{component: 'condenser'}]},
      {id: 'perimeter', name: '좌측 벽 둘레 액관', od: 4.76, color: '#b5794a', bendRadius: 20, notes: '벽 속 문틀 둘레(결로 방지) → 드라이어.',
        path: ['condenser.out', pt(-cond.x0, cond.y, cmpTop + 13), pt(xw, cond.y, cmpTop + 13), pt(xw, yFront + 72, cmpTop + 13), pt(xw, yFront + 72, H - 35), pt(xw, yRear - 62, H - 35),
          pt(xw, yRear - 62, cmpTop + 45), pt(drier.x, yRear - 62, cmpTop + 45), pt(drier.x, drier.y, cmpTop + 45), 'drier.in']},
      {id: 'capillary', name: '모세관', od: 2, color: '#d08a5a', bendRadius: 6, notes: '4회 코일 후 흡입관에 합류.',
        path: ['drier.out', pt(drier.x, drier.y, drier.zBot - 32), pt(drier.x + 12, drier.y + 8, drier.zBot - 48),
          {helix: {center: pt(drier.x + 55, drier.y + 12, drier.zBot - 60), radius: 30, turns: 4, pitch: 3, startDeg: 180, extraDeg: 270, stepsPerTurn: 36}},
          pt(drier.x + 40, drier.y + 26, drier.zBot - 28), pt(hx, drier.y + 26, drier.zBot - 10), pt(hx, drier.y + 26, drier.zBot + 25), pt(hx, hy, drier.zBot + 25)]},
      {id: 'capillary_hx', name: '모세관·흡입관 열교환부', od: 2, color: '#d08a5a', bendRadius: 6, notes: '흡입관에 붙어 후면 단열재 속을 올라감.',
        path: [pt(hx, hy, drier.zBot + 25), pt(hx, hy, evTop - 12), pt(hx, cols[0], evTop - 12), pt(-(fh + 30), cols[0], evTop - 12), pt(-(fh + 30), cols[0], rows[0]), 'evaporator.in']},
      {id: 'evaporator', name: '증발관', od: 7.94, color: '#d08a5a', notes: '2열×4단 사행.', path: [{component: 'evaporator'}]},
      {id: 'suction', name: '흡입관', od: 6.35, color: '#d08a5a', bendRadius: 25, notes: '후면 단열재 속 수직 하강 → 압축기.',
        path: ['evaporator.out', pt(sx, cols[1], rows[0]), pt(sx, hy, rows[0]), pt(sx, hy, Math.max(drier.zBot - 22, suctionStubZ + 8)), {auto: {}}, {port: 'compressor.suction', offset: [-25, 0, 0]}, 'compressor.suction']},
    ],
    checks: {minClearanceMm: 1, joinExclusionMm: 30, touching: [['capillary', 'suction'], ['capillary_hx', 'suction']]},
    overall: {width: W, depth: D + 24, height: H},
  };
}

// ---------- reach-in, bottom-mounted condensing unit (T-19-HC type) ----------
function reachIn(p) {
  const W = p.width, D = p.depth, H = p.height, F = p.feet, X = W / 2;
  const comp = compressorParams(findCompressor(p.compressor));
  const yFront = -D / 2, yRear = D / 2, bodyFront = yFront + 50;
  const cmpTop = Math.max(F + 242.7, F + 9.7 + 18 + comp.shell.height + 27), inBottom = cmpTop + 65, inTop = H - 65, sideIn = X - 45, inRear = yRear - 55;
  const fins = {x: [-X + 92.9, X - 192.9], y: [yFront + 76, yFront + 116], z: [F + 32.7, cmpTop - 20]};
  const rows = Array.from({length: 8}, (_, i) => cmpTop - 35 - i * 23);
  const ccols = [yFront + 106, yFront + 86];
  const CX = X - 222.9, CY = yRear - 141, floorZ = F + 9.7;
  const suctionStubZ = floorZ + 18 + comp.stubs.find(s => s.port === 'suction').height;
  const dr = {x: -X + 42.9, y: yFront + 161, zBot: F + 42.7};
  const eh = Math.min(200, X - 135)  // leaves room for the suction riser at x = -X + 87.9
 , ev = {y: [yRear - 201, yRear - 131], z: [H - 195, H - 80]};
  const ecols = [yRear - 146, yRear - 186], erows = [H - 95, H - 125, H - 155, H - 185];
  const sx = -X + 87.9, hx = sx + 5, hy = yRear - 28;
  const bump = 11.906;
  const slats = [];
  for (let z = F + 22.7; z + 8 <= cmpTop; z += 30) slats.push({box: box([-(X - 10), X - 10], [bodyFront - 2, bodyFront], [z, z + 8])});
  return {
    components: [
      {id: 'cabinet', type: 'cabinet', name: '외함·내함', basis: 'typical', notes: '외형은 입력 치수, 벽 두께와 기계실 높이는 T-19-HC 비율을 따른 추정.',
        body: box([-X, X], [bodyFront, yRear], [F, H]),
        voids: [
          {name: 'interior', keepOut: true, ...box([-sideIn, sideIn], [bodyFront - 1, inRear], [inBottom, inTop])},
          {name: 'machine-compartment', ...box([-(X - 10), X - 10], [bodyFront - 1, yRear + 1], [F + 9.7, cmpTop])},
        ]},
      {id: 'door', type: 'cabinet', name: '단열 도어', basis: 'typical', notes: '우측 힌지, 매립 손잡이.', hinge: pt(X, yFront, 0),
        body: box([-(X - 2), X - 2], [yFront, bodyFront], [cmpTop + 15, H - 55]),
        voids: [{name: 'recessed-handle', ...box([-(X - 12.9), -(X - 42.9)], [yFront - 1, yFront + 15], [(H + F) / 2 - 50, (H + F) / 2 + 255])}]},
      {id: 'display', type: 'primitives', name: '외부 온도 표시창', group: 'cabinet', color: '#1c2a30', basis: 'typical', notes: '상단 전면.',
        primitives: [{box: box([-100, 100], [bodyFront - 2, bodyFront], [H - 40, H - 15])}]},
      {id: 'grille', type: 'primitives', name: '기계실 전면 그릴', group: 'cabinet', color: '#3a4449', basis: 'typical', notes: '흡기 그릴.', primitives: slats},
      {id: 'shelves', type: 'wire-shelves', name: `선반 ${p.shelves}개`, basis: 'typical', notes: '높이는 고르게 배치.', rod: {outer: 2, inner: 1.2, count: Math.max(8, Math.round((W - 105) / 23.2)), inset: 11},
        items: shelves(p.shelves, inBottom + 380, inTop - 340, [-(X - 52.4), X - 52.4], yFront + 56, () => inRear - 47.6)},
      {id: 'castors', type: 'primitives', name: '캐스터·후면 범퍼', group: 'cabinet', color: '#3a4449', basis: 'typical', notes: `캐스터 높이 ${F}.`,
        primitives: [
          ...[-1, 1].flatMap(s => [yFront + 91, yRear - 51].flatMap(y => [
            {cylinder: {from: pt(s * (X - 42.9) - 12, y, Math.min(32, F / 2)), to: pt(s * (X - 42.9) + 12, y, Math.min(32, F / 2)), radius: Math.min(32, F / 2)}},
            {box: box([s * (X - 42.9) - 15, s * (X - 42.9) + 15], [y - 20, y + 20], [Math.min(50, F - 5), F])}])),
          {box: box([-(X - 42.9), X - 42.9], [yRear, yRear + bump], [150, 180])}, {box: box([-(X - 42.9), X - 42.9], [yRear, yRear + bump], [H - 155, H - 125])}]},
      {id: 'compressor', type: 'hermetic-compressor', name: '밀폐형 압축기', basis: 'typical', notes: '왕복동 밀폐형 일반 형상.',
        model: p.compressor, center: pt(CX, CY), floorZ: r2(floorZ),
        relay: {id: 'start_relay', name: '기동 릴레이', notes: '커버 크기는 일반값.', x: [-10, 60], y: [70, 105], z: [50, 110]}},
      {id: 'condenser', type: 'fin-tube-coil', name: '응축기 (핀-튜브)', basis: 'typical', notes: '전면 그릴 뒤 핀-튜브 응축기, 2열×8단.', color: '#aab4b8',
        fins: {x: fins.x.map(r2), y: fins.y.map(r2), z: fins.z.map(r2), pitch: 3},
        tubes: {od: 9.52, cols: ccols.map(r2), rows: rows.map(r2), bendX: [r2(fins.x[0] - 15), r2(fins.x[1] + 15)], inletX: r2(fins.x[0] - 17), outletX: r2(fins.x[0] - 25), bendRadius: 10}},
      {id: 'condenser_fan', type: 'axial-fan', name: '응축기 팬', basis: 'typical', notes: 'Ø200 축류팬.', center: pt((fins.x[0] + fins.x[1]) / 2, fins.y[1] + 45, (fins.z[0] + fins.z[1]) / 2), rpm: 1500,
        shroud: {x: [r2(-(fins.x[1] - fins.x[0]) / 2 - 15), r2((fins.x[1] - fins.x[0]) / 2 + 15)], y: [-22, -20], z: [-95, 95], opening: 102, ring: {radius: 104, length: 20, y: -12}},
        motor: {radius: 40, y: [15, 65]}, brackets: {y: [40, -12], reach: 104}, hub: {radius: 20, y: [-10, 10]},
        blades: {count: 4, width: 40, thickness: 2, length: 78, radius: 58, pitch: .4}, rotor: {name: '응축기 팬 날개'}},
      {id: 'drier', type: 'filter-drier', name: '필터 드라이어', basis: 'typical', notes: 'Ø19×100mm 수직.', x: r2(dr.x), y: r2(dr.y), zBot: r2(dr.zBot), zTop: r2(dr.zBot + 100), diameter: 19, inletOd: 6.4, outletOd: 3},
      {id: 'evaporator', type: 'fin-tube-coil', name: '증발기', basis: 'typical', notes: '천장 핀-튜브 증발기, 2열×4단.',
        fins: {x: [-eh, eh], y: ev.y.map(r2), z: ev.z.map(r2), pitch: 6},
        tubes: {od: 9.52, cols: ecols.map(r2), rows: erows.map(r2), bendX: [-(eh + 20), eh + 20], inletX: -(eh + 22), outletX: -(eh + 30), bendRadius: 12},
        dripTray: {name: '증발기 물받이', ...box([-(eh + 25), eh + 25], [ev.y[0] - 10, ev.y[1] + 10], [ev.z[0] - 15, ev.z[0] - 13]), lip: 7}},
      {id: 'evaporator_fan', type: 'axial-fan', name: '증발기 팬', basis: 'typical', notes: 'Ø110 축류팬.', center: pt(0, yRear - 241, H - 137), rpm: 1300,
        shroud: {x: [-(eh + 30), eh + 30], y: [8, 10], z: [-73, 72], opening: 58, ring: {radius: 60, length: 10, y: 9}},
        motor: {radius: 25, y: [12, 36]}, brackets: {y: [25, 10], reach: 58}, hub: {radius: 12, y: [-7, 7]},
        blades: {count: 5, width: 20, thickness: 1.6, length: 44, radius: 33, pitch: .35}, rotor: {name: '증발기 팬 날개'}},
    ],
    circuit: [
      {id: 'discharge', name: '토출관', od: 6.35, color: '#c27c4e', bendRadius: 20, notes: '압축기 → 응축기 윗단.',
        path: ['compressor.discharge', {port: 'compressor.discharge', offset: [-20, 0, 0]}, {auto: {}}, {port: 'condenser.in', offset: [-20, 0, 0]}, 'condenser.in']},
      {id: 'condenser', name: '응축관', od: 9.52, color: '#c27c4e', notes: '2열×8단 사행.', path: [{component: 'condenser'}]},
      {id: 'liquid_line', name: '액관', od: 6.35, color: '#c27c4e', bendRadius: 15, notes: '응축기 → 드라이어.',
        path: ['condenser.out', {port: 'condenser.out', offset: [-25, 0, 0]}, {auto: {}}, {port: 'drier.in', offset: [0, 0, 49]}, 'drier.in']},
      {id: 'capillary', name: '모세관', od: 2, color: '#d08a5a', bendRadius: 6, notes: '4회 코일 후 뒤로 가서 흡입관에 합류.',
        path: ['drier.out', pt(dr.x, dr.y, dr.zBot - 26), pt(dr.x, dr.y + 55, dr.zBot - 26), pt(dr.x, dr.y + 70, dr.zBot - 5),
          {helix: {center: pt(dr.x + 25, dr.y + 70, dr.zBot + 20), radius: 25, turns: 4, pitch: 3, startDeg: 270, extraDeg: 180, stepsPerTurn: 36}},
          pt(dr.x + 5, dr.y + 84, dr.zBot + 45), pt(dr.x + 5, dr.y + 84, cmpTop - 75), pt(hx, dr.y + 84, cmpTop - 75), pt(hx, hy, cmpTop - 75)]},
      {id: 'capillary_hx', name: '모세관·흡입관 열교환부', od: 2, color: '#d08a5a', bendRadius: 6, notes: '흡입관에 붙어 후면 단열재 속을 올라감.',
        path: [pt(hx, hy, cmpTop - 75), pt(hx, hy, H - 87), pt(hx, ecols[0], H - 87), pt(-(eh + 35), ecols[0], H - 87), pt(-(eh + 35), ecols[0], erows[0]), 'evaporator.in']},
      {id: 'evaporator', name: '증발관', od: 9.52, color: '#d08a5a', notes: '2열×4단 사행.', path: [{component: 'evaporator'}]},
      {id: 'suction', name: '흡입관', od: 7.94, color: '#d08a5a', bendRadius: 25, notes: '후면 단열재 속 수직 하강 → 압축기.',
        path: ['evaporator.out', pt(sx, ecols[1], erows[0]), pt(sx, hy, erows[0]), pt(sx, hy, Math.max(cmpTop - 100, suctionStubZ + 8)), {auto: {}}, {port: 'compressor.suction', offset: [-25, 0, 0]}, 'compressor.suction']},
    ],
    checks: {minClearanceMm: 1, joinExclusionMm: 30, touching: [['capillary', 'suction'], ['capillary_hx', 'suction']]},
    overall: {width: W, depth: D + bump, height: H},
  };
}

export const TEMPLATES = {
  'undercounter-rear': {
    name: '언더카운터 · 후면 응축기',
    summary: '작업대 아래형 1도어. 후면 와이어 응축기, 하부 기계실, 압축기 위 응축수 팬, 천장 증발기 (HR24B 형태).',
    build: underCounter,
    params: [
      {key: 'width', label: '폭', unit: 'mm', min: 500, max: 900, default: 595},
      {key: 'depth', label: '깊이 (도어 포함, 손잡이 제외)', unit: 'mm', min: 550, max: 750, default: 624},
      {key: 'height', label: '높이 (발 포함)', unit: 'mm', min: 700, max: 950, default: 805},
      {key: 'feet', label: '발 높이', unit: 'mm', min: 15, max: 150, default: 20},
      ...COMMON_PARAMS.map(q => q.key === 'shelves' ? {...q, default: 3} : q.key === 'compressor' ? {...q, default: 'typical-r600a-small'} : q),
    ],
  },
  'reachin-bottom': {
    name: '리치인 · 하부 응축 유닛',
    summary: '서서 쓰는 1도어 리치인. 하부 기계실의 핀-튜브 응축기와 팬, 천장 증발기 (T-19-HC 형태).',
    build: reachIn,
    params: [
      {key: 'width', label: '폭', unit: 'mm', min: 600, max: 800, default: 685.8},
      {key: 'depth', label: '깊이 (도어 포함, 범퍼 제외)', unit: 'mm', min: 560, max: 820, default: 622.3},
      {key: 'height', label: '높이 (캐스터 포함)', unit: 'mm', min: 1700, max: 2200, default: 2005},
      {key: 'feet', label: '캐스터 높이', unit: 'mm', min: 60, max: 160, default: 87.3},
      ...COMMON_PARAMS.map(q => q.key === 'refrigerant' ? {...q, default: 'R290'} : q.key === 'shelves' ? {...q, default: 3} : q.key === 'compressor' ? {...q, default: 'typical-r290-medium'} : q),
    ],
  },
};

export function defaults(templateId) {
  return Object.fromEntries(TEMPLATES[templateId].params.map(p => [p.key, p.default]));
}

// Returns a refrigerator-spec/1 object, or throws with a readable message for out-of-range input.
export function fromTemplate(templateId, input) {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error(`알 수 없는 형태 "${templateId}"`);
  const p = {...defaults(templateId), ...input};
  for (const q of t.params) if (q.min !== undefined && !(p[q.key] >= q.min && p[q.key] <= q.max)) throw new Error(`${q.label}은(는) ${q.min}~${q.max}${q.unit ?? ''} 사이여야 합니다`);
  const comp = findCompressor(p.compressor);
  if (!comp) throw new Error(`카탈로그에 없는 압축기 "${p.compressor}"`);
  if (comp.refrigerant !== p.refrigerant) throw new Error(`압축기 냉매(${comp.refrigerant})가 선택한 냉매(${p.refrigerant})와 다릅니다`);
  const out = t.build(p);
  const id = String(p.id || p.model).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom';
  return {
    schema: 'refrigerator-spec/1', id,
    meta: {model: p.model, summary: t.summary, refrigerant: p.refrigerant, template: templateId, templateInput: p,
      method: `"${t.name}" 형태 템플릿에서 입력 치수로 생성. 외형 치수 외 배치·부품 크기는 업계 일반값이며 실측이 아님.`},
    expect: {overallMm: Object.fromEntries(Object.entries(out.overall).map(([k, v]) => [k, r2(v)]))},
    components: out.components, circuit: out.circuit, checks: out.checks,
  };
}
