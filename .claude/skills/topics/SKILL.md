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
   3. **신규 후보 (빈틈 대기열 단일 입력 — 2026-09-17 운영자 지시)** → 신규 글은 **오직**
      `docs/ops/pipeline-queue.json` 에서만 나온다. 운영자: "앞으로 확인한 빈틈 포스팅만 올린다."
      제도 달력·신생 키워드·네이버 갭·GSC rising·WebSearch 로 신규 주제를 직접 고르지 않는다
      (9/8~9/15 그 방식의 신규 8편은 색인은 됐지만 대표 키워드로 전부 네이버 30위 밖이었다 — docs/ops/KEYWORD-PLAN-2026-09-15.md §1).
      그 입력원들은 대기열을 만드는 측정 도구의 재료와 **리프레시 선정**에만 쓴다.
      고르는 순서:
      ① `status: "approved"` (운영자가 목록에서 [발행 지시]를 누른 항목)
      ② `status: "proposed"` 이면서 `autoPick: true` 인 항목을 `score` 내림차순
      건너뛰는 항목: `measuredAt` 이 10일 넘게 지남 / 글 frontmatter `targetQuery` 가 그 항목의 `query`·`altQueries` 와
      같은 글이 이미 있음 / `autoPick: false` 인데 approved 가 아님 / `hold`·`rejected`·`published`.
      고른 뒤: 항목의 `condition`(1차 출처 확인 과제)을 먼저 푼다. 못 풀면 그 항목은 버리고 다음 항목.
      `node scripts/audit/naver-ledger.mjs --check "<query>" <family>` 가 VETO 면 버린다(세부 키워드가 다르면 PASS — 2026-09-15 결정).
      브리프 맨 앞에 항목의 `reasons`·`serp.top10`(누구를 밀어내야 하는가)·`ledger.relatedSlugs`(내부 링크 후보)를 둔다.
      새 글 frontmatter 에 `targetQuery: "<항목 query>"` 를 넣는다(발행 표시·순위 추적). 제목 선두에 그 검색어를 둔다.
      **통과 항목이 없으면 그날 신규는 0편**이고 다른 입력원으로 채우지 않는다. 보고에 "대기열 보충 필요"를 남긴다.
      대기열은 로컬·GitHub Actions 의 `pnpm audit:pipeline --write`(scout·ledger·volume 을 이어 돌림)만 쓴다. 클라우드 루틴은 읽기만.
      `hold` 중 `holdBy: "pipeline"` 은 재측정에서 한 번 닫힌 항목이다(다음 측정에서 열리면 proposed 로 돌아온다). 루틴은 건너뛴다.
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
