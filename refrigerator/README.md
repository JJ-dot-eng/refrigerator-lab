# 냉장고 도면 재구성 · True T-19-HC / MONO 120

기본 화면은 **Hoshizaki HR24B** 실제 설치도 대조 화면이다. 이전 True T-19-HC 개념 모델은 `/reference`, 초기 120L 가상 설계는 `/lab`에서 유지한다.

## HR24B 실제 설치도 대조

제조사 서비스 매뉴얼 73229(2021-04-20 개정) 7쪽 실제 설치도, 8쪽 치수/단면도, 9쪽 냉매 회로도를 대조했다. 원본 발행처는 https://secure.hoshizakiamerica.com/docs/manuals/HR24B_serv.pdf 이다. 부품표는 https://secure.hoshizakiamerica.com/docs/manuals/HR24B_pts.pdf 을 참고했다. HR24C 사진은 HR24B의 근거로 사용하지 않았다.

HR24B는 R600a(충전량 2.80oz, 38쪽) 모델이다. 부품 위치와 냉매 회로 순서는 도면을 따른다: 압축기 → 토출관 → 응축수 팬 가열 루프 → 후면 와이어-온-튜브 응축기 → 좌측 벽 둘레 액관 → 필터 드라이어 → 모세관 코일 → 모세관·흡입관 열교환부 → 천장 핀-튜브 증발기(앞쪽 팬) → 흡입관 → 압축기.

부품 형상과 관경은 이 급 R600a 업소용 냉장고의 일반 부품 치수를 쓴다: 약 1/5HP 왕복동 밀폐형 압축기(쉘 약 200×155×177mm, 방진고무·받침판·토출/흡입/충전관·기동 릴레이), Ø4.76 강관 12열 응축기와 양면 Ø1.5 강선, Ø19×100 드라이어, Ø2.0 모세관 4회 코일, Ø7.94 동관 2열×4단 증발기(알루미늄 핀 6mm 피치), Ø6.35 흡입관. 공장 원본 CAD나 실측값이 아니다. `public/hr24/generate_hr24.mjs`(Node, three.js)가 `model.json`·`model.obj`·`routes.json`·`metadata.json`·`verification.json`을 만들며, 생성 시 회로 연결, 배관 간 간섭(최소 1mm, 모세관-흡입관 접합부 제외), 압축기 쉘 관통을 검사한다. 재생성: `node public/hr24/generate_hr24.mjs`.

화면 오른쪽의 원본 그림은 서비스 매뉴얼 7~9쪽을 렌더한 로컬 파일이며, 없으면 제조사 링크를 대신 표시한다. 좌우는 제품 전면 기준 +X=오른쪽, +Y=후면, +Z=위로 통일했다. 부품마다 근거 페이지와 "도면 형상/업계 일반 형상" 구분을 표시한다. CAD 묶음(design.zip)에는 OBJ 모델, JSON 데이터, 생성 스크립트를 포함한다. 이전 FreeCAD STEP/FCStd 버전은 부품 형상이 실제와 달라 제거했다.

### 제조사 문서 (저장소 미포함)

서비스 매뉴얼과 사양서는 제조사 저작물이라 저장소에 올리지 않는다(`.gitignore`). 원본 그림을 화면에서 보려면 직접 받아 아래 위치에 둔다.

- `public/hr24/service.pdf`: 위 HR24B 서비스 매뉴얼
- `public/hr24/construction.png`, `dimensions.png`, `refrigeration.png`: 매뉴얼 7·8·9쪽을 약 1040×1350 PNG로 렌더 (예: `pdftoppm -png -r 125 -f 7 -l 7 service.pdf construction`)
- `public/reference/manufacturer-spec.pdf`: https://www.truemfg.com/wp-content/uploads/true-media/spec-sheets/T-19-HC.pdf

## 실제 모델 재구성

기본 `냉매 · 배관` 탭은 토출관 완화 루프, 2열 응축기 사행관, 액관, 필터드라이어, 모세관 코일과 후면 상승관, 증발기 사행관, 단열 흡입관, 압축기 내부 개략 경로를 연결한다. 배관 좌표·길이·관경은 `piping-layout.json`, 중심선 STEP와 관경 속성을 가진 FreeCAD 문서는 `public/reference/proposed-piping*`에서 제공한다. 제조사 배관 원도가 아닌 제안 경로이며 후면 서비스 공간이 추가된다. 관통부·고정구·실링 상세와 배관 간섭 전수 검사는 미완료다.

냉매 물성은 40개 정상 운전점에서 CoolProp PH 계산으로 구한다. 응축 과정의 탈과열/2상 응축/과냉, 단열 모세관 플래시, 증발/과열, 흡입관 가열을 분리했다. 건도는 증기 질량분율이다. 상태 슬라이더와 압력–엔탈피 선도는 같은 상태표를 사용한다. 흰 점과 배관의 색상 경계는 진행 과정 설명용이며 실제 유속이나 기화 위치 해석 결과가 아니다. 냉매 탭의 운전점은 응축온도를 5°C 간격 표에 맞추며, 냉각 실험과 독립적으로 정상상태 흐름을 재생한다.

모세관의 유량·압력·길이를 연립해 푸는 설계 해석, 냉매 충전량 및 과도 2상 유동은 아직 포함하지 않는다. 모세관–흡입관 열교환도 실제 배치가 미확인되어 이번 단열 모세관 모델에 포함하지 않았다. 참고: [Secop 밀폐 냉동시스템](https://www.secop.com/fileadmin/user_upload/technical-literature/danfoss-lectures/operational_defects_in_hermetic_compressors_and_refrigerating_systems.pdf).

- 출처: [제조사 사양서](https://www.truemfg.com/wp-content/uploads/true-media/spec-sheets/T-19-HC.pdf), 1/24 발행, 2페이지 상세 도면의 인치 치수.
- 폭 685.8mm, 본체 깊이 622.3mm, 본체 높이 1917.7mm, 캐스터 포함 높이 2005.0125mm. 후면 범퍼 포함 깊이 634.20625mm.
- 같은 PDF 1페이지 높이·캐스터 치수는 2페이지와 다르다. 서로 섞지 않고 2페이지를 따른다.
- `public/reference/`: 재구성 STEP/FCStd, 메쉬, 생성 스크립트, 치수·간섭 검증, 출처와 추정 목록, R290 물성표.
- 외형 치수와 명시된 선반 치수를 반영했다. 도어 분할, 단열 두께, 선반 높이, 내부 기기의 상세 형상은 추정이다. 제조사의 원본 조립 CAD가 아니다.
- PCB·하네스·MCU·EEPROM·펌웨어는 공개 자료에서 확인하지 못했다. 기존 가상 설계의 전자부품을 실제 모델이라고 사용하지 않는다.
- 냉각 실험은 CoolProp R290 물성과 2노드 에너지 수지 계산이다. 유량·열손실·제어값은 화면에 명시한 가정이며 제조사 성능 예측으로 검증되지 않았다. 성에·제상·배관 압력강하·냉매 충전량은 미포함이다.
- 검증: `node --experimental-strip-types tests/reference.mjs`. 24시간 냉각, 문 개방, 전원 OFF, 에너지 보존, 시간 분할 동일성, CAD 치수와 메쉬를 검사한다.
- `generate_true_cad.py`는 FreeCAD Python에서, `generate_cycle.py`는 CoolProp이 설치된 Python에서 실행한다.

## 실행

상위 폴더의 `Start-MONO120.cmd`를 실행하고 http://localhost:3000 을 연다.
또는 이 폴더에서 `npm install`, `npm run dev -- --host 127.0.0.1`을 실행한다.

## GitHub Pages

`main`에 push하면 `.github/workflows/pages.yml`이 테스트 후 정적 사이트를 빌드해 배포한다. 저장소 Settings → Pages → Source를 "GitHub Actions"로 둔다. 로컬에서 같은 결과를 만들려면 `PAGES_BASE_PATH=/refrigerator-lab npm run build` 후 `dist/client`를 정적 서버로 열고 `/refrigerator-lab/`로 접속한다. 공개 파일 경로는 `lib/asset.ts`의 `asset()`으로 감싸야 Pages 하위 경로에서도 열린다.

## 구성

- `app/page.tsx`: 실험 화면, 가상 입력, EEPROM 브라우저 저장, 기록 출력
- `components/fridge-scene.tsx`: 실제 STEP에서 추출한 삼각형 메쉬 표시, 문 개방, 분해 보기. 센서·하네스는 위치 설명용 추가 도형.
- `lib/simulation.ts`: 가상 제어기 및 두 온도 열수지 모델
- `public/design/`: STEP, CAD 메쉬, 하네스, I/O 참조 기판, 냉매 물성표와 생성 코드
- `tests/simulation.mjs`: 에너지 보존, 온도 제어, 도어, 고장, 재시작, 전원 시험

## 기준 모델

R600a, 증발 −15°C, 응축 외기+15K, 과열5K, 과냉3K, 등엔트로피 효율0.6, 모터효율0.85, 정격 질량유량0.45g/s.
물성표는 CoolProp 8.0.0으로 생성했다. 열 모델은 고내/내장재 등가 열용량20kJ/K와 식품5kg×3500J/kg/K를 사용한다. 도어 폐쇄 열관류0.7W/K, 열림 추가12W/K, 식품-고내 열전달5W/K를 가정한다. 수치 적분은 최대1초 간격이다.

가상 제어기는 목표±1°C 히스테리시스, 최소운전120초, 최소정지180초, 3000rpm 속도 램프를 사용한다. 센서·통신·팬 고장 시 냉각을 정지한다. MCU 명령어 에뮬레이션이나 실제 모터 전류제어는 아니다. EEPROM은 버전이 있는 목표온도 데이터를 브라우저 localStorage에 저장한다. 설정 저장 후 가상 전원 OFF/ON으로 복원할 수 있다. 초기화 버튼은 열 상태와 실험 조건을 초기화하며 저장 메모리는 유지한다.

STEP 외함+도어는550×580×1000mm이며 뒤 응축기를 포함하면 깊이597.5mm다. 명목120L는 기계실 제외119.88L, 선반 제외117.71L의 개념설계다. PCB는 MCU·전력부가 없는 연결용 참조 기판이다. UI에서 ADC_CABINET, DOOR_GPIO, UART_TX/RX, SCL/SDA는 논리 신호이며 특정 MCU 패키지 핀을 확정하지 않는다. J3 증발기 센서는 설계에 포함되지만 현재 제어에서 사용하지 않는다.

3D 입자는 설명용이며 CFD 결과가 아니다. 냉매 충전량, 성에·제상, 습도·결로, 실제 압축기 성능맵, 고전압 인버터 회로는 범위에 포함되지 않는다. 시뮬레이터의0.38kWh/24h 등은 가정 모델 결과이며 실측 또는 제품 에너지등급이 아니다.

## 검증

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
냉매 에너지수지는 생성 단계에서 검증했다. STEP는 FreeCAD 독립 재읽기로 유효 솔리드를 확인했다. I/O 기판 DRC는0위반/0미연결이며 전체 전장 설계 검증을 뜻하지 않는다.
WebMCP를 지원하는 환경에는 읽기/실험 실행 도구를 등록한다. 현재 호스트에서 등록·호출 검증은 수행하지 않았다.

GUI 클릭/시각 검사는 수행하지 않았고, HTTP 응답·정적 검사·계산 시험을 수행했다.

## 출처

- https://coolprop.org/coolprop/python-cycles.html
- https://www.freecad.org/
- https://github.com/wireviz/WireViz
- https://www.kicad.org/
