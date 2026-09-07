# docs/editorial — 편집 달력·주제 입력 데이터

구글 억제기(2026-08-18~)에 GSC `rising` 이 0 으로 고착돼 신규 주제 입력원이 사라진 문제를 풀기 위해
2026-09-07 에 신설한 폴더. `/topics`·`/daily-post`·클라우드 루틴이 **신규 글 후보의 1순위 입력**으로 읽는다.
(배경·운영 규칙: docs/25-growth-plan-2026-09.md §2)

## 파일

| 파일 | 역할 | 갱신 주기 |
|---|---|---|
| `policy-calendar-2026-Q4.json` | 2026-09~12 신청·납부·마감·시행 제도 달력 (1차 출처 확인분) | 월 1회 다음 분기분 추가, 수시 정정 |
| `policy-calendar-2026-Q4.md` | 같은 내용의 사람용 월별 표 | JSON 과 함께 |

## JSON 스키마 (항목 하나)

```json
{
  "date": "2026-09-16",
  "dateEnd": "2026-09-30",
  "cluster": "tax",
  "title": "재산세 2기분(주택 1/2·토지) 납부",
  "audience": "주택·토지 소유자",
  "keyFacts": "납부 9/16~9/30, 250만원 초과 분납 가능. 카드 무이자 여부는 카드사별 확인.",
  "mainKeyword": "재산세 2기분 납부",
  "subKeywords": ["재산세 9월 납부", "재산세 분납 조건", "재산세 카드납부 혜택"],
  "sourceUrl": "https://www.wetax.go.kr/...",
  "sourceDate": "2026-09-01",
  "verified": "확인",
  "bestPublishWindow": "D-14~D-7"
}
```

- `cluster` 는 `src/data/clusters.ts` 의 slug 정확값.
- `verified` 는 `확인`(go.kr/or.kr 원문을 열어 날짜·수치 대조) / `뉴스만` / `미확인` 세 값만.
  **`확인` 이 아닌 항목은 신규 글 후보로 쓰기 전에 반드시 1차 출처를 다시 연다** (fabrication-zero).
- `bestPublishWindow` 는 `date` 기준 상대 표기 (`D-14~D-7`, `D-3~D0`, `상시` 등). 이 창에 든 항목만 그날의 후보.
- `sourceDate` 가 **1년 이상 지난 항목**(예: 연금저축 600만·IRP 합산 900만 한도의 2023 정책브리핑)은 `확인` 이어도 발행 전에
  최신 세법·고시로 재확인한다. 2026-09-07 표본 재검증: 2027 최저임금(고용부 8/5 고시)·국민연금 보험료율(공단)·근로장려금
  반기신청(국세청 6/29) 3건 원문 일치.
- 항목의 날짜·수치가 틀렸음을 알게 되면 삭제하지 말고 `verified` 를 `미확인` 으로 내리고 `keyFacts` 에 사유를 적는다.

## 소비자

- `scripts/audit/naver-demand.mjs --calendar docs/editorial/policy-calendar-2026-Q4.json`
  → 달력의 mainKeyword·subKeywords 를 네이버 수요 측정에 합쳐 `docs/revenue-log/naver-demand-YYYY-MM-DD.json` 생성.
- `.claude/skills/topics/SKILL.md` §2-3 신규 후보 입력원 ①.
- 클라우드 루틴 "02 Asiatop (03:00)" 프롬프트 §2 (리포 main 의 파일을 읽음 → 이 폴더 변경은 머지돼야 루틴에 반영).

## 금지

- 달력 항목을 근거로 **일 1편 초과** 발행 (docs/24 P0 캐던스 불변).
- 정치·투기·예측성 항목 등재.
- 기존 글이 이미 다루는 제도를 "달력에 있다"는 이유로 신규 발행 (기존 글 리프레시로 돌린다).
