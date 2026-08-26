---
name: daily-post
description: 일일 운영 사이클 원스톱 — 사용자가 "오늘 포스팅", "/daily-post", "데일리 포스팅", "오늘 사이클 돌려" 라고 하면 발동. 수익 점검(/revenue) → 주제 선정(/topics) → 발행 실행(리프레시+신규, PR→머지→URL 200)까지 한 번에 수행하고 링크로 보고한다.
---

# /daily-post — 일일 운영 사이클 (수익 점검 → 주제 선정 → 발행)

사용자가 "오늘 포스팅" 한마디로 전체 사이클을 위임한 것이다. 단계별로 멈춰서 묻지 말고
끝까지 실행한 뒤 결과를 보고한다 (2026-06-12 사용자 지시).

## 0. 사전 가드

- `Get-Date` 로 시스템 실시각 → KST 오늘 날짜 확정 (CLAUDE.md publishedAt 가드 — system reminder 날짜 신뢰 금지)
- **구글 회복 체제 (2026-08-26, docs/24)**: 신규 글 **일 1편 이하 고정** (publish-cadence 가드가 빌드 차단). 머지는 운영자 `merge-approved` 라벨 승인제 — Claude 가 라벨 부착·직접 머지 금지.
- 케이던스 규칙 확인: docs/23 §4-1·§4-2 는 리프레시 페이스에만 참조 (신규 쿼터는 docs/24 가 우선)

## 1. 수익 점검 (/revenue 절차)

- `node scripts/audit/revenue-pull.mjs` 실행, §8-4 순서로 해석
- **정책 이슈 ≥1 → 전 사이클 중단, 사용자에게 즉시 보고** (발행보다 계정 생존)
- moneylook-* 수동 유닛 노출 추이 확인 — Auto ads OFF 판단 데이터 누적 보고
- 델타 1줄 요약 (장황한 표 금지 — 원데이터는 docs/revenue-log/ 에 자동 저장됨)

## 2. 주제 선정 (/topics 절차)

- `node scripts/audit/gsc-opportunities.mjs` 실행
- 오늘 패키지 구성 (구글 회복 캐던스 — docs/24 P0):
  - **신규 최대 1편** (급상승/갭 쿼리 — 카니발리제이션 grep+GSC 대조 통과 필수).
    2편째 자동승인 슬롯은 **폐지** (2026-08-26). 신규 0편인 날도 정상 — 리프레시만 진행 가능.
  - **리프레시 2~3편** (주 10 목표 페이스): 우선순위 ①고위험 클러스터 ②스트라이킹 디스턴스 ③시즌
- 클러스터 주간 점유 ≤30%·고위험 주 1편 상한 점검
- 주제 선정은 위 기존 방식(gsc-opportunities + docs/23 규칙) 그대로. **선정된 주제의 본문 제작**만
  에이전트 팀 경유 (2026-08-26 운영자 지시): content-strategist(의도·갭 분석) → content-agent(작성, 마스터 프롬프트 v4) → content-auditor(감사)

## 3. 발행 실행 (편당)

1. 법정·공시 수치 **1차 출처 웹검증** (법제처·국세청·금융위 등 — WebSearch/WebFetch). 검증 실패 수치는 "약 N" 근사 또는 제외
2. 작성/수정 — docs/21 게이트 (H2 질문형 30~50%·BLUF·내부링크 3~5·표 전후 산문·faq 규격)
3. 신규: publishedAt = KST 오늘 / 리프레시: updatedAt·lastReviewed (본문 실질 변경 시에만 — date stamping 금지)
4. `node scripts/audit/claims-guard.mjs` + `pnpm audit:cadence` + `pnpm audit:template` + `corepack pnpm exec astro build` 통과 확인
5. **일 묶음 PR 1건** (콘텐츠 전용 브랜치 content/daily-YYYY-MM-DD) → CI green 확인 → **여기서 정지, 운영자에게 PR 링크 보고** (머지는 운영자가 `merge-approved` 라벨로 승인 — Claude 라벨 부착·직접 머지 금지)
6. 운영자 승인·머지 후 CF 배포 감시 → **전 편 URL 200 + 신규 내용 마커 확인까지가 발행 완료**

## 4. 보고 형식 (최종 메시지)

1. 수익 델타 1줄 (+정책 이슈 상태)
2. 발행 결과 — 편별 **링크 + 선정 근거 1줄** (쉽게, 전문용어 최소)
3. 다음 액션 1~2개 (예: Auto ads OFF 판단, 트리아지 진행률)

## 금지

- 자동화 브라우저로 프로덕션 광고 페이지 열기 (무효 트래픽 — CLAUDE.md 가드)
- 검증 없는 법정 수치 단정 / 무기명 신규 / 일 신규 1편 초과
- `merge-approved` 라벨 부착·콘텐츠 PR 직접 머지 (운영자 전용 — docs/24 P0)
- 구글 색인 재요청(Indexing API 등) 자동화
- 정책 이슈 발견 시 발행 강행
