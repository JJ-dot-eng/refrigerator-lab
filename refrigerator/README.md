# Refrigerator Lab · 기술 문서

모델별 근거, 가정, 한계와 데이터 재생성 방법을 정리한다. 전체 소개와 실행 방법은 [저장소 README](../README.md)를 본다.

- [HR24B (`/`)](#hoshizaki-hr24b-)
- [True T-19-HC (`/reference`)](#true-t-19-hc-reference)
- [MONO 120 (`/lab`)](#mono-120-lab)
- [제조사 문서](#제조사-문서-저장소-미포함)
- [배포](#github-pages)
- [검증](#검증)

## Hoshizaki HR24B (`/`)

### 근거

- 서비스 매뉴얼 73229 (2021-04-20 개정): https://secure.hoshizakiamerica.com/docs/manuals/HR24B_serv.pdf
  - 7쪽 실제 설치도, 8쪽 치수·단면, 9쪽 냉매 회로, 38쪽 전기·냉매 사양
- 부품표: https://secure.hoshizakiamerica.com/docs/manuals/HR24B_pts.pdf
- HR24C 사진은 HR24B의 근거로 쓰지 않았다.

사양: R600a 2.80oz, 115V/60Hz/1ph 4A, 설계압력 고압 360 / 저압 120 psig. 외형 595 W × 624 D × 805 H mm, 손잡이 돌출 24mm.

### 모델

부품 위치와 냉매 회로 순서는 도면을 따른다.

압축기 → 토출관 → 응축수 팬 가열 루프 → 후면 와이어-온-튜브 응축기 → 좌측 벽 둘레 액관 → 필터 드라이어 → 모세관 코일 → 모세관·흡입관 열교환부 → 천장 핀-튜브 증발기 → 흡입관 → 압축기

부품 형상과 관경은 이 급 R600a 업소용 냉장고의 일반 부품 치수를 쓴다. 공장 원본 CAD나 실측값이 아니다.

| 부품 | 형상 |
|---|---|
| 압축기 | 약 1/5HP 왕복동 밀폐형, 쉘 약 200×155×177mm, 방진고무·받침판, 토출/흡입/충전관, 기동 릴레이 |
| 응축기 | Ø4.76 강관 12열 수직 사행, 양면 Ø1.5 강선 7mm 피치 |
| 드라이어 | Ø19×100mm 수직 |
| 모세관 | Ø2.0mm, 4회 코일 후 흡입관에 접합 |
| 증발기 | Ø7.94 동관 2열×4단, 알루미늄 핀 6mm 피치, 앞쪽 Ø100 축류팬 |
| 흡입관 | Ø6.35mm |

화면에서 부품마다 근거 페이지와 "도면 형상 / 업계 일반 형상" 구분을 표시한다. 운전 표시를 켜면 냉매 흐름 점과 증발기 팬이 움직이고, 문을 열면 팬이 멈춘다(매뉴얼: 문 열림 시 팬 모터 정지). 흐름 점은 방향 설명용이며 실제 유속이 아니다.

### 데이터

`public/hr24/generate_hr24.mjs`(Node, three.js)가 `model.json`, `model.obj`, `routes.json`, `metadata.json`, `verification.json`을 만든다. 생성할 때 회로 연결, 배관 간 간섭(최소 1mm, 모세관-흡입관 접합부 제외), 압축기 쉘 관통을 검사한다. `design.zip`은 이 파일들과 생성 스크립트를 묶은 것이다.

```bash
node public/hr24/generate_hr24.mjs
```

좌표계는 mm, 제품 전면 기준 +X 오른쪽, +Y 후면, +Z 위.

## True T-19-HC (`/reference`)

### 근거

- 제조사 사양서(1/24 발행): https://www.truemfg.com/wp-content/uploads/true-media/spec-sheets/T-19-HC.pdf
- 2페이지 상세 도면의 인치 치수를 mm로 변환했다. 1페이지의 높이·캐스터 치수는 2페이지와 달라 섞지 않았다.
- 폭 685.8, 본체 깊이 622.3, 본체 높이 1917.7, 캐스터 포함 높이 2005.0125, 후면 범퍼 포함 깊이 634.20625 mm.

### 모델

- 외형 치수와 명시된 선반 치수를 반영했다. 도어 분할, 단열 두께, 선반 높이, 내부 기기 형상은 추정이며 제조사 조립 CAD가 아니다.
- `냉매 · 배관` 탭은 토출관 완화 루프, 2열 응축기, 액관, 필터 드라이어, 모세관 코일과 후면 상승관, 증발기, 단열 흡입관, 압축기 내부 개략 경로를 연결한다. 제조사 배관 원도가 아닌 제안 경로이며, 후면 서비스 공간이 추가된다. 관통부·고정구·실링 상세와 배관 간섭 전수 검사는 하지 않았다.
- 배관 좌표·길이·관경은 `piping-layout.json`에, 중심선 STEP와 FreeCAD 문서는 `public/reference/proposed-piping*`에 있다.
- PCB·하네스·MCU·펌웨어는 공개 자료에서 확인하지 못해 모델에 넣지 않았다.

### 냉동 사이클과 냉각 실험

- 냉매 물성은 40개 정상 운전점에서 CoolProp PH 계산으로 구한다. 탈과열/2상 응축/과냉, 단열 모세관 플래시, 증발/과열, 흡입관 가열을 분리했다. 건도는 증기 질량분율이다.
- 상태 슬라이더와 P-h 선도는 같은 상태표를 쓴다. 냉매 탭의 운전점은 응축온도를 5°C 간격 표에 맞추며, 냉각 실험과 독립적으로 정상상태 흐름을 재생한다.
- 냉각 실험은 R290 물성과 2노드 에너지 수지 계산이다. 유량·열손실·제어값은 화면에 표시한 가정이며 제조사 성능으로 검증되지 않았다.
- 포함하지 않은 것: 모세관 유량·압력·길이 연립 해석, 냉매 충전량, 과도 2상 유동, 모세관-흡입관 열교환, 성에·제상, 배관 압력강하.
- 참고: [Secop 밀폐 냉동시스템](https://www.secop.com/fileadmin/user_upload/technical-literature/danfoss-lectures/operational_defects_in_hermetic_compressors_and_refrigerating_systems.pdf)

### 데이터

`public/reference/`: 재구성 STEP/FCStd, 메쉬, 치수·간섭 검증, 출처와 추정 목록, R290 물성표. `generate_true_cad.py`는 FreeCAD Python, `generate_cycle.py`는 CoolProp이 설치된 Python에서 실행한다.

## MONO 120 (`/lab`)

120L 1도어 냉장고 가상 설계다. 실제 제품이 아니다.

### 모델

- STEP 외함+도어 550×580×1000mm, 뒤 응축기 포함 깊이 597.5mm. 명목 120L는 기계실 제외 119.88L, 선반 제외 117.71L.
- 3D 화면은 STEP에서 추출한 메쉬를 표시한다. 센서·하네스는 위치 설명용 추가 도형이다.
- PCB는 MCU·전력부가 없는 연결용 참조 기판이다(DRC 0위반/0미연결, 전체 전장 설계 검증은 아님). ADC_CABINET, DOOR_GPIO, UART_TX/RX, SCL/SDA는 논리 신호이며 특정 MCU 핀을 확정하지 않는다. J3 증발기 센서는 설계에 있지만 제어에 쓰지 않는다.

### 시뮬레이션

- 사이클: R600a, 증발 −15°C, 응축 외기+15K, 과열 5K, 과냉 3K, 등엔트로피 효율 0.6, 모터 효율 0.85, 정격 질량유량 0.45g/s. 물성표는 CoolProp 8.0.0.
- 열 모델: 고내/내장재 등가 열용량 20kJ/K, 식품 5kg×3500J/kg/K, 도어 폐쇄 열관류 0.7W/K, 열림 추가 12W/K, 식품-고내 열전달 5W/K. 적분 간격 최대 1초.
- 가상 제어기: 목표 ±1°C 히스테리시스, 최소 운전 120초, 최소 정지 180초, 3000rpm 속도 램프. 센서·통신·팬 고장 시 냉각 정지. MCU 에뮬레이션이나 실제 모터 전류제어는 아니다.
- EEPROM은 버전이 있는 목표온도 데이터를 브라우저 localStorage에 저장하며, 가상 전원 OFF/ON으로 복원할 수 있다. 초기화 버튼은 열 상태와 실험 조건만 초기화한다.
- 3D 입자는 설명용이며 CFD 결과가 아니다. 0.38kWh/24h 등은 가정 모델 결과이며 실측이나 에너지 등급이 아니다.
- 포함하지 않은 것: 냉매 충전량, 성에·제상, 습도·결로, 실제 압축기 성능맵, 고전압 인버터 회로.
- WebMCP를 지원하는 환경에는 읽기/실험 실행 도구를 등록한다(등록·호출은 검증하지 않았다).

### 데이터

`public/design/`: STEP, CAD 메쉬, 하네스(WireViz), I/O 참조 기판(KiCad), 냉매 물성표와 생성 코드. 시뮬레이션 코드는 `lib/simulation.ts`.

## 제조사 문서 (저장소 미포함)

서비스 매뉴얼과 사양서는 제조사 저작물이라 저장소에 올리지 않는다(`.gitignore`). 파일이 없으면 화면에 제조사 링크를 대신 표시한다. 원본 그림을 화면에서 보려면 직접 받아 아래 위치에 둔다.

- `public/hr24/service.pdf`: HR24B 서비스 매뉴얼
- `public/hr24/construction.png`, `dimensions.png`, `refrigeration.png`: 매뉴얼 7·8·9쪽을 약 1040×1350 PNG로 렌더 (예: `pdftoppm -png -r 125 -f 7 -l 7 service.pdf construction`)
- `public/reference/manufacturer-spec.pdf`: T-19-HC 사양서

## GitHub Pages

`main`에 push하면 `.github/workflows/pages.yml`이 테스트 후 정적 사이트를 빌드해 배포한다(Settings → Pages → Source: GitHub Actions). 로컬에서 같은 결과를 보려면 `PAGES_BASE_PATH=/refrigerator-lab npm run build` 후 `dist/client`를 정적 서버로 열고 `/refrigerator-lab/`로 접속한다. `public/` 파일 경로는 `lib/asset.ts`의 `asset()`으로 감싸야 Pages 하위 경로에서도 열린다.

## 검증

```bash
npm test          # 5개 검증 스크립트
npm run lint
npx tsc --noEmit
npm run build
```

| 테스트 | 내용 |
|---|---|
| `tests/simulation.mjs` | MONO 120: 에너지 보존, 온도 제어, 도어, 고장 3종, 재시작 지연, 정전, 고온 외기 |
| `tests/reference.mjs` | T-19-HC: 에너지 수지, 24시간 냉각, 도어, 정전, 시간 분할 동일성, CAD 치수·메쉬 |
| `tests/circuit-properties.mjs` | T-19-HC: 40개 운전점 PH 물성, 상변화, 구간 연속성 |
| `tests/piping.mjs` | T-19-HC: 닫힌 회로, 포트 좌표, 길이·관경 |
| `tests/hr24.mjs` | HR24B: 도면 배치, 압축기 크기, 회로 순서·연결, 관경, 배관 간격, 메쉬 |

## 출처

- https://coolprop.org/coolprop/python-cycles.html
- https://www.freecad.org/
- https://github.com/wireviz/WireViz
- https://www.kicad.org/
- https://threejs.org/
