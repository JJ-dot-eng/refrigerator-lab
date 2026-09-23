# 냉장고 사양서 (refrigerator-spec/1)

사양서 JSON 하나가 냉장고 한 대입니다. `generator/`가 사양서를 읽어 3D 모델과 냉매 배관을 만들고 자동 검사합니다.

```bash
npm run generate            # specs/*.json 전체
npm run generate -- hr24b   # 하나만
```

결과는 `public/models/<id>/`에 생기고, 웹의 `/models` 화면에 나타납니다. 검사에 실패하면 파일을 쓰지 않고 이유를 출력합니다.

예시: [hr24b.json](hr24b.json)(후면 와이어 응축기, 언더카운터), [t-19-hc.json](t-19-hc.json)(하부 응축 유닛, 리치인).

## 좌표

- 단위 mm
- 제품 정면에서 봤을 때 **X = 오른쪽, Y = 뒤쪽, Z = 위**
- 상자는 `{"x": [최소, 최대], "y": [..], "z": [..]}`로 적습니다.

## 최상위 항목

| 항목 | 내용 |
|---|---|
| `schema` | 항상 `"refrigerator-spec/1"` |
| `id` | 영문 소문자·숫자·하이픈. 폴더 이름이 됩니다 |
| `meta` | `model`(필수), `summary`, `refrigerant`, `source`(근거 자료 URL), `sourcePages`, `method` 등. 화면과 metadata.json에 그대로 표시됩니다 |
| `expect.overallMm` | 기대하는 전체 치수 `{width, depth, height}`. 다르면 검사 실패 |
| `components` | 부품 목록 (아래) |
| `circuit` | 냉매 회로 구간 목록, **흐름 순서대로** (아래) |
| `checks` | `minClearanceMm`(배관 간 최소 간격, 기본 1), `joinExclusionMm`(이어지는 구간의 접합부 제외 거리, 기본 30), `touching`(맞닿아도 되는 구간 쌍, 예: 모세관-흡입관 열교환) |

## 부품 공통 항목

모든 부품: `id`(고유), `type`, `name`, 선택 항목 `basis`(`"drawing"` 제조사 자료 / `"typical"` 업계 일반값), `page`(근거 쪽), `notes`, `color`(`"#rrggbb"`), `group`(선택 시 함께 묶을 부품 id).

`id`가 `cabinet`, `door`, `shelves`인 부품은 "외함 투명" 대상이고, `door`에 `hinge: [x, y, z]`가 있으면 문 열기가 됩니다.

## 부품 종류 (`type`)

| type | 용도 | 주요 항목 | 포트 |
|---|---|---|---|
| `cabinet` | 외함·도어처럼 속이 빈 상자 | `body` 상자에서 `voids` 상자들을 뺌 | – |
| `primitives` | 손잡이·표시창·발·그릴 | `primitives: [{box}, {cylinder: {from, to, radius}}]` | – |
| `wire-shelves` | 철선 선반 | `items: [{z, x, y}]`, `rod: {outer, inner, count, inset}` | – |
| `hermetic-compressor` | 밀폐형 왕복동 압축기 | `center: [x, y]`, `floorZ`, `shell: {width, depth, height}`, `base`, `stubs: [{port, dy, height, od, crimp?}]`, `relay` | 각 stub의 `port` 이름 (예: `discharge`, `suction`) |
| `condensate-pan` | 응축수 증발 팬 | `box`, `wall`, `bracket` | – |
| `wire-on-tube-condenser` | 후면 와이어 응축기 | `x0, x1, y, zBot, zTop, legs, tubeOd, wire, brackets` | `in`, `out`, 내부 유로 |
| `fin-tube-coil` | 핀-튜브 증발기·응축기 (관은 X 방향) | `fins: {x, y, z, pitch}`, `tubes: {od, cols, rows, bendX, inletX, outletX, bendRadius}`, `dripTray` | `in`, `out`, 내부 유로 |
| `filter-drier` | 수직 드라이어 (위 입구) | `x, y, zBot, zTop, diameter, inletOd, outletOd` | `in`, `out` |
| `axial-fan` | 축류팬 (축은 Y 방향) | `center`, `shroud`, `motor`, `hub`, `blades`, `rpm` | – |
| `hose` | 배수호스 등 냉매가 아닌 관 | `path`, `od`, `bendRadius` | – |

새 부품 종류는 `generator/builders.mjs`에 함수를 추가하고 `BUILDERS`에 등록합니다.

## 냉매 회로 (`circuit`)

각 구간: `id`, `name`, `od`(관 외경 mm), `color`, `bendRadius`(굽힘 반경), `notes`, `path`.

`path`에는 여섯 가지를 섞어 씁니다.

| 형식 | 뜻 |
|---|---|
| `"compressor.discharge"` | 부품 포트 좌표 |
| `[x, y, z]` | 경유점. 모서리는 `bendRadius`로 둥글게 굽힘 |
| `{"component": "condenser"}` | 그 부품의 내부 유로 (사행관) 전체 |
| `{"helix": {center, radius, turns, pitch, startDeg, extraDeg}}` | 코일 (축은 Y 방향) |
| `{"port": "compressor.suction", "offset": [dx, dy, dz]}` | 포트 기준 점. 부품을 옮기면 함께 움직입니다 |
| `{"auto": {}}` | 앞뒤 점 사이를 자동으로 잇는 구간 (아래) |

### 자동 경로 (`{"auto": {}}`)

앞뒤 점 사이를 축 방향(ㄱ자) 배관으로 자동 연결합니다. 굽힘이 적고 짧은 경로를 찾으며, 다음을 피합니다.

- 이 구간과 연결되지 않은 부품의 부피 (압축기, 팬 받침, 코일, 드라이어, 팬, 와이어 응축기)
- 다른 배관 (단, `checks.touching`에 함께 적힌 배관은 붙어도 됨)
- `cabinet` 외곽 상자 밖
- `cabinet.voids` 중 `"keepOut": true`인 공간(예: 식품 칸)은 꼭 필요할 때만 지납니다

선택 항목: `grid`(탐색 간격 mm, 기본 10; 큰 모델은 자동으로 넓어짐), `bendCost`(굽힘 벌점, 기본 2), `softCost`(회피 공간 벌점, 기본 8), `ignore`(무시할 부품 id 목록). 자동 구간은 경로의 처음·끝에 올 수 없고 두 개가 연달아 올 수 없습니다. 포트 바로 앞에 `{"port", "offset"}` 점을 두면 배관이 포트에 곧게 들어갑니다.

규칙:

- 첫 구간은 압축기 토출 포트에서 시작하고, 마지막 구간은 같은 압축기의 흡입 포트에서 끝나야 합니다.
- 이웃한 구간은 끝점과 시작점이 같아야 합니다. 예외는 부품을 통과하는 경우로, 앞 구간이 `"drier.in"`으로 끝나고 다음 구간이 `"drier.out"`으로 시작하면 됩니다.

## 자동 검사

| 검사 | 실패 예 |
|---|---|
| 양식 | 없는 부품 종류, 없는 포트, 좌표 형식 오류 |
| 회로 연결 | `pan_loop → condenser_feed 끊김` |
| 배관 간격 | `discharge\|suction 간섭 -0.47mm` |
| 부품 관통 | `suction가 drier를 관통` (압축기 쉘, 코일 핀, 드라이어, 팬, 와이어 응축기) |
| 전체 치수 | `전체 치수 595×648×805 ≠ 기대값 600×648×805` |
