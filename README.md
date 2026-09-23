# Refrigerator Lab

업소용 1도어 냉장고를 브라우저에서 3D로 살펴보고 냉동 사이클을 시뮬레이션하는 웹앱입니다.

**사이트:** https://jj-dot-eng.github.io/refrigerator-lab/

## 화면

| 경로 | 모델 | 내용 |
|---|---|---|
| `/` | **Hoshizaki HR24B** | 제조사 서비스 매뉴얼의 부품 배치와 냉매 회로 순서를 따른 3D 재구성. 밀폐형 압축기, 와이어-온-튜브 응축기, 드라이어, 모세관 코일, 핀-튜브 증발기, 둘레 액관까지 모든 배관을 연결했고, 운전 표시를 켜면 냉매 흐름과 증발기 팬이 움직입니다. |
| `/reference` | **True T-19-HC** | 제조사 사양서 치수로 만든 외형 모델과, 40개 운전점의 R290 냉동 사이클(P-h 선도), 24시간 냉각 실험. |
| `/lab` | **MONO 120** | 120L 가상 설계. 가상 제어기, 문 개방·고장·정전 시험, 배선 하네스와 I/O 참조 기판. |

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
cd refrigerator
npm install
npm run dev
```

http://localhost:3000 을 엽니다. Windows에서는 `Start-MONO120.cmd`를 실행해도 됩니다.

검사: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`

## 구성

```
refrigerator/
├─ app/            화면 (hr24, reference, lab)
├─ components/     3D 장면, 냉매 회로도
├─ lib/            시뮬레이션 계산
├─ public/         3D 모델·배관·물성표 데이터와 생성 스크립트
└─ tests/          계산·모델 검증
.github/workflows/ GitHub Pages 자동 배포
```

모델별 근거, 가정, 한계, 데이터 재생성 방법은 [refrigerator/README.md](refrigerator/README.md)에 있습니다.

## 주의

- 3D 모델은 공개 도면과 일반 부품 치수를 바탕으로 한 **재구성**이며, 제조사 원본 CAD나 실측값이 아닙니다.
- 시뮬레이션 결과는 가정 모델에서 나온 값이며, 제품 성능이나 에너지 등급이 아닙니다.
- 제조사 매뉴얼과 사양서는 저작권 때문에 저장소에 포함하지 않았습니다. 화면에서는 제조사 원본 링크를 안내합니다.
- Hoshizaki, True는 각 회사의 상표이며, 이 프로젝트는 해당 회사와 관련이 없습니다.

## 라이선스

[MIT](LICENSE). 제조사 문서와 상표에는 적용되지 않습니다.
