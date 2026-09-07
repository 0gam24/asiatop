---
name: topics
description: GSC 실측 데이터로 오늘의 발행·리프레시 주제를 선정한다. 사용자가 "오늘 주제", "뭐 쓸까", "트래픽 기획", "주제 추천", "/topics" 라고 하면 발동. scripts/audit/gsc-opportunities.mjs 실행 결과를 docs/23 발행 규칙에 맞춰 해석해 오늘의 액션 1~3개를 낸다.
---

# /topics, 오늘의 트래픽 주제 선정

## 절차

1. `node scripts/audit/gsc-opportunities.mjs` 실행 (인증은 revenue-pull 과 공유하며,
   부재 시 그쪽 셋업 가이드 안내).
   1-b. **네이버 측정 3종 (2026-09-07 신설, 구글 억제기 신규 주제 1차 입력원)**:
   `pnpm audit:discover` (최근 14일 뉴스에서 신생어 원석, 30줄만 훑어 쓸 것 선별) →
   `node scripts/audit/naver-demand.mjs --calendar docs/editorial/policy-calendar-2026-Q4.json` (`pnpm audit:naver`) →
   `pnpm audit:serp` (상위 문서 역설계). 인증은 `.env.local` 의 `X_NCP_APIGW_API_KEY_ID`/`X_NCP_APIGW_API_KEY`
   (NAVER API HUB. 구 개발자센터 키 `NAVER_CLIENT_ID`/`SECRET` 는 2027-06-30 까지 폴백, 트렌드 미지원).
   출력 `docs/revenue-log/naver-{discover,demand,serp}-YYYY-MM-DD.json` 을 GSC 파일과 같이 커밋한다.
   클라우드 루틴은 이 파일들을 못 만들므로(자격증명 없음) 로컬에서 주 2회 이상 갱신·커밋.
2. 해석 우선순위 (빠른 레버 순):
   1. **스트라이킹 디스턴스** (11~30위·노출多) → 해당 글 **리프레시**가 최우선.
      본문 보강(쿼리 의도 커버)+1차 출처 재검증(deep-research)+updatedAt.
      cpcTier 상·최상 클러스터 우선. 1~2편 선정.
   2. **CTR 갭** → title(50~70자)·description(80~170자) 개선 후보. 본문 무변경 시
      updatedAt 갱신 금지 (허위 신선도 차단).
   3. **신규 후보 (3원 입력)** → 시즌·신규 후보. **신규는 보수적**: 기존 슬러그 grep 대조 +
      기존 글 갱신으로 흡수 불가함을 증명한 경우에만 (docs/23 §4-2 신규 정당화 체크).
      입력원 우선순위 (2026-09-07 개정, GSC rising 이 억제기에 0 으로 고착된 문제 해결):
      ① **제도 달력** `docs/editorial/policy-calendar-2026-Q4.json` 의 `bestPublishWindow` 안에 든
         항목 (verified=확인 만, 미확인 항목은 1차 출처 재확인 후에만)
      ② **신생 키워드** (`naver-demand` 의 `newborn=1`: 기존 글 없음 + go.kr 출처 ≥2 + 경쟁 블로그 누적 3,000 미만
         + 뉴스 진행 중 또는 무에서 생긴 검색어) 중 `openness` 상위. 경쟁 문서가 없어 색인만 되면 바로 상위에 오르므로
         **발행 창을 기다리지 않고 1차 출처 확인 즉시 발행**한다 (docs/26 §4-b). 단 수치가 예산안·개편안 단계면
         본문 첫 문단에 "정부안, 확정 아님" 명시, go.kr 원문 확인 실패 시 발행하지 않는다
      ③ **네이버 갭 ★** (`gap=1`: 기존 글 없음 + go.kr 출처 ≥3) 중 `trendRatio`(최근 4주÷직전 4주
         검색 관심도, API HUB 키일 때만 존재) ≥ 1.3 인 것을 먼저, 그다음 `demand` 상위. `blogPerDay ≥ 20` 이면
         과열·경쟁 과다로 후순위. `trendRatio` 가 없으면(개발자센터 키) `demand` 순만
      ④ GSC `rising` (있을 때만)
      네이버 `existing` 에 슬러그가 잡히면 신규가 아니라 그 글의 **리프레시 후보**로 돌린다.
   4. **카니발리제이션** → 통합(대표 1편 + 301) 후보, 즉시 실행이 아니라 주간
      리프레시 묶음에 편입.
3. 출력: **오늘의 액션 1~3개** (리프레시 우선, 신규는 최대 1). 각 액션에 대상 파일
   경로·근거 수치(순위·노출)·예상 작업(보강 섹션/제목안) 명시.
4. 실행으로 이어지면: content-agent 산출물 실존 검증 → publishedAt/updatedAt KST
   실시각 검증 → docs/21 게이트 → 일 묶음 PR.

## 가드 (docs/23 §4-2, 위반 제안 금지)

- 발행 일 1~2편 상한 (상향은 D+45 실측 RPM 정당화 후)
- 단일 클러스터 주간 발행 점유 ≤30%
- credit-loan·insurance-personal 은 주 1편 상한 + explainer 프레임 강제
- 색인률 <70% 또는 90일 무노출 >30% → 신규 반감, 통합·리프레시 우선
- faq 백필은 리프레시 대상 글과 같은 PR 로 묶음
- 법정·공시 수치는 1차 출처 확인 후 단정 (YMYL)
