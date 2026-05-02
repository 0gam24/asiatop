# 자동화 누적 진행 — 2026-05-02 새벽

> 사용자가 잠든 사이 자동 진행된 라운드 누적 보고.
> branch: `feature/brief-system` (PR #1).
> 마지막 commit: `da211c1` 시점 (Round 36 — Gap 2 사실상 완성 + SEO 보강).

---

## 0. 한눈에

| 지표 | 값 |
|---|---|
| 누적 commit (Round 2 이후) | **35** |
| 단위 테스트 | **284 / 284 통과** |
| 빌드 시간 | 21.00s (안정) |
| 페이지 | 136 (108 article + 28 정적) |
| 회귀 | **0건** |
| 신규 npm 의존성 | **0** (transitive만 사용) |
| 외부 API 호출 (CI) | 0건 (MOCK 모드 유지) |

---

## 1. 라운드별 commit 매트릭스

| # | SHA | 영역 | 핵심 산출 |
|:---:|---|---|---|
| 2 | `f4dc211` | 인프라 | Phase A~I 8단계 게이트 (G0~G8) + frontend |
| 3 | `cb83dd9` | mock | G3 stub data 강화 (dev 모드 G3 항상 통과) |
| 4 | `629c8c2` | gate | G2 cluster-keywords 확장 + 12 cluster 매트릭스 + ISA 등 영문 lowercase 버그 수정 |
| 5 | `87d4605` | brief | `lib/brief-loader.mjs` export — Zod·비즈니스 룰 import 가능 |
| 6 | `e0b570f` | brief | `lib/auto-brief-generator.mjs` — 질문 → brief.yaml 골격 |
| 7 | `cf1d844` | collect | `lib/naver-kin-collector.mjs` — 지식인 검색 어댑터 + fixture |
| 8 | `ce2a928` | test | orchestration end-to-end 통합 테스트 |
| 9 | `41000a1` | refactor | trusted-domains 단일 공급원 (3곳 중 2곳 통합 — article-pipeline 잔여) |
| 10 | `f94eea5` | frontend | 홈페이지 MissionCallout (3단계 시각화) |
| 11 | `ed44ad0` | data | clusters.ts authorityCoverage·adRiskTier 메타 + recommendedAdPolicy |
| 12 | `56ad51f` | docs | AUTO-PUBLISH-GUIDE.md 운영 가이드 |
| 13 | `a539655` | brief | auto-brief가 cluster coverage에 따라 ad_policy 자동 적용 |
| 14 | `dd2469d` | fixture | 권위 소스 mock 6 cluster 확장 |
| 15 | `5a696ae` | test | G7 표절 검사 경계 케이스 |
| 16 | `b449692` | frontend | VerificationDetails 컴포넌트 (글 하단 검증 상세) |
| 17 | `4eb07ef` | test | sample-filled brief fixture (e2e demo 기반) |
| 18 | `61f92c9` | test | G6 면책 부착 위치·frontmatter 보존 |
| 19 | `2577855` | audit | scripts/audit/rejection-stats.mjs |
| 20 | `4adb6a8` | docs | AUTOMATION-PROGRESS.md (본 문서 초판) |
| 21 | `4a121a0` | fixture | naver-kin 5 cluster 추가 sample |
| 22 | `1ab6f1f` | test | searchKinBulk 6 cluster 동시 검색 |
| 23 | `f9908ee` | refactor | article-pipeline trusted-domains 통합 (3곳 → 1) |
| 24 | `eb1a431` | docs | AUTOMATION-PROGRESS Round 23 갱신 |
| 25 | `0efcec3` | seo | QAPage Schema.org 자동 생성 (자동 발행 글) |
| 26 | `2088a69` | brief | briefToArticleFrontmatter helper |
| 27 | `1cb8e4a` | **pipeline** | **article-pipeline --brief 통합 (Gap 2 Step 2)** ⭐ |
| 28 | `94ecd96` | docs | AUTOMATION-PROGRESS Round 24~27 갱신 |
| 29 | `467ee9c` | pipeline | G4 fact-verifier를 PASS 5로 통합 |
| 30 | `5406f65` | **pipeline** | **G5·G6·G7·G8 PASS 6 통합 (Gap 2 Step 5 완성)** ⭐ |
| 31 | `b193ef0` | docs | AUTOMATION-PROGRESS Round 28~30 갱신 |
| 32 | (spec) | research | 5 agent 병렬 spec — Plan·content·seo·deploy·general-purpose |
| 33 | `5232b18` | **fix** | **TRUSTED_DOMAINS ReferenceError + SSoT cleanup (3곳)** ⭐ |
| 34 | `714bf66` | brief | brief-prompt-builder.mjs (7 SYSTEM + 14 USER 블록) |
| 35 | `19087b2` | **pipeline** | **brief-prompt-builder를 callDeepSeek/refineWithClaude 통합 (Gap 2 Step 3 완성)** ⭐ |
| 36 | `da211c1` | seo | robots.txt AI 크롤러 5종 추가 (총 15종) |
| 47 | `?` | **safety** | **R47 라이브 직전 안전망 3종 — P1-E SSoT 청소·P1-F workflow lint+CLI smoke·P1-C QAPage/ClaimReview validator** ⭐ |
| 48 | `?` | **SEO·GEO** | **R48 SEO·GEO 고급화 6 PR — frontmatter 4필드·NewsMediaOrg·ClaimReview 동적 등급·markdown mirror 강화·passage 검증기·G6 자동발행 분기** ⭐ |
| 49 | (이번) | **사이트맵·RSS** | **R49 사이트맵·피드 6 PR — 자동 등록 회귀 하네스·sitemap-index 통합·verification meta·hreflang·feed auto-discovery·robots+Footer+/feeds·lastmod 정확화·multi-push 강화** ⭐ |

> Round 37~46 상세는 git log 참조. R46까지 누적 commit 46건, 302/302 tests, 빌드 22.87s.
> R47 종료 후: **326/326 tests** (+24 신규), 빌드 4.8s, schema 검증 2169 entities/0 errors.
> R48 종료 후: **335/335 tests** (+9 passage chunking), 빌드 4.58s, schema 검증 **2185 entities** (NewsMediaOrganization 137건 신규)/0 errors.
> R49 종료 후: **340/340 tests** (+5 auto-registration), 빌드 4.5s, schema 검증 **2199 entities**/0 errors, **자동 등록 하네스 0 누락** (sitemap·rss·atom·feed.json·12 카테고리 RSS·llms-full·llms-cluster·sitemap-images 8 채널).

### Round 48 — SEO·GEO 고급화 (6 agent 합의 결정)

**배경**: LLM 키 발급 임박. 라이브 직전 마지막 사이클로 6 agent (seo·content·author·rss·perf·Plan) 병렬 호출. 5 영역 통합 ROI 매트릭스 결과 → R48 (라이브 직전), R49 (라이브 직후), V2 (D+30 이후) 3 분리. R48은 첫 발행 글 EEAT·KG·청크 가능성에 직격하는 6 PR.

**PR #48-1 — frontmatter 4 필드 단일 진입점** (`src/content.config.ts`)
- `lastReviewed` (사람·시스템 1차 재확인 시점, dataValidAsOf와 별도 신선도 신호)
- `aiAssisted` (자동 파이프라인 작성 여부, default false)
- `reviewedBy` (검증 주체 ID, "moneylook-auto" 또는 author slug)
- `next_review_date` 필드는 기존 유지
- 신규 author entry: `src/content/authors/moneylook-auto.json` — 8단계 자동 검증 시스템 표상.

**PR #48-2 — NewsMediaOrganization 업그레이드** (`src/layouts/Base.astro`)
- `Organization` → `NewsMediaOrganization`. Google News·Discover 진입 자격.
- E-E-A-T 정책 URL 6종: `publishingPrinciples`·`verificationFactCheckingPolicy`·`correctionsPolicy`·`ownershipFundingInfo`·`ethicsPolicy`·`unnamedSourcesPolicy` (모두 `/editorial-policy#anchor`).
- `foundingDate`·`knowsLanguage`·`knowsAbout` (12 클러스터)·`areaServed` (Country: South Korea, Wikidata Q884) 추가.
- `scripts/validate-schema.mjs`에 `checkNewsMediaOrganization` 검증기 신설 (4 정책 URL 권장 warn).

**PR #48-3 — Article·ClaimReview 강화** (`src/pages/[cluster]/[slug].astro`)
- `lastReviewed` 우선순위 chain: frontmatter → `fact_verification_at` → `dataValidAsOf` 파싱 fallback.
- 자동 발행 글에 `Article.reviewedBy` + `Article.creditText` 자동 부착 (사람 사칭 페널티 회피).
- `ClaimReview.reviewRating.alternateName` 동적화 — `verified_facts_count`·`approximate_facts_count`로 검증 강도 정량 시그널 노출.

**PR #48-4 — markdown mirror 강화** (`src/pages/[cluster]/[slug].md.ts`)
- 신규 노출 메타: 검증 주체·마지막 검토일·다음 재검증일·검증 강도(정부 1차 자료 N건 인용·사실 N건 1:1 매칭).
- Cache-Control 강화: `max-age=3600·s-maxage=86400·stale-while-revalidate=604800` (AI 크롤러 fetch 응답 속도 ↑).
- `Link: <canonical>; rel="canonical"` 헤더 추가 — AI 크롤러가 markdown/HTML 중복 판단 회피.

**PR #48-5 — Passage Chunking 검증기** (`scripts/audit/passage-chunking.mjs`)
- 4 룰: C1(H2 ≥ 3) · C2(H2 직후 한 줄 정의 ≥ 40%) · C3(핵심 수치 ≥ 3) · C4(`<dfn>` 1차 정의 격리, info).
- 모드: 기본(전체 글 warn) · `--auto-only`(자동 발행 글에만 critical) · `--strict`(critical 1건이라도 exit 1).
- CI `build-test` job에 `--auto-only` step 추가 — 자동 발행 글 등장 시 자동 활성. 기존 108글은 warn 수준 유지(점진 마이그레이션).
- 신규 단위 테스트 9 케이스: `isOneLineDefinition`·`extractH2Chunks` (코드블록 무시·리스트 무시·H2 직후 빈 줄·다중 H2).

**PR #48-6 — G6 disclosure-attach 자동 발행 분기** (`scripts/gates/g6-disclosure-attach.mjs`)
- `buildAIDisclosure(brief)` — `brief.source_question` 존재 시 자동 발행 메시지로 분기.
- 자동 발행 메시지: "지식iN 질문에서 출발 → AI 초안 → G0~G8 8단계 게이트 통과 → 정부 공식 API 1:1 매칭 → 24h 내 정정". 사람 검수 없이 발행되는 사실을 정확히 명시 → 사람 사칭 페널티 회피.
- manual 글은 종전 메시지 유지 (회귀 0).

**보류 합의 (R49 / V2 분리)**
- **R49 (라이브 직후 D+1 ~ D+14)**: 카테고리별 RSS 12개 분리·llms-full.txt 재구조화·Bing/Naver Search Advisor push·passage 본문 자동화·topical authority 진척도·GEO 측정 cron(외부 API 비용·첫 글 발행 후 의미).
- **V2 (D+30 이후)**: perf 트랙 전체 (Pretendard Variable subset·LCP preload·JS budget < 5KB·Edge Worker)·Wikidata Q-항목·AI 인용 SaaS 도구.

### Round 49 — 사이트맵·RSS 통합 (6 agent 합의 결정)

**배경**: 사용자 요청 "새 페이지·포스팅이 생기면 자동으로 RSS·사이트맵에 꼭 추가 — 하네스로 기록". 6 agent (seo·rss·content·author·perf·Plan) 병렬 호출. **Plan agent 핵심 발견**: 카테고리 RSS 12개·JSON Feed·Atom 모두 **이미 존재** (`dist/rss/{cluster}.xml`·`feed.json`·`atom.xml` 빌드 산출물 확인). R49는 콘텐츠 추가가 아니라 **"이미 있는 것 연결+검증+검색엔진 통보"**.

**PR #49-5 — 자동 등록 회귀 하네스 (☆최우선, 사용자 요청 핵심)** (`scripts/audit/auto-registration.mjs`)
- 모든 발행 글(`!draft`)이 8 채널에 자동 등록됐는지 매 빌드 검증:
  1. `dist/sitemap-0.xml` (모든 글) · 2. `dist/rss.xml` (50 cap) · 3. `dist/atom.xml` (50 cap) · 4. `dist/feed.json` (50 cap)
  5. `dist/rss/{cluster}.xml × 12` (자기 클러스터) · 6. `dist/llms-full.txt` (모든 글) · 7. `dist/llms-cluster-{slug}.txt × 12` · 8. `dist/sitemap-images.xml`
- 누락 1건이라도 발견 시 `pnpm build` 실패 — 회귀 차단 강제.
- **부수 발견·즉시 수정**:
  - `rss.xml.ts`·`[cluster].xml.ts` 정렬 키가 `publishedAt` 단독 → `atom.xml.ts`·`feed.json.ts`와 다름. **모두 `updatedAt ?? publishedAt` 통일**로 50 cap 일관성 확보.
  - `generate-llms.mjs` 50KB 캡 초과 시 글 완전 제외 → URL+제목 1줄 fallback 추가로 **모든 글 인덱스 등재 보장**.
- 단위 테스트 5 케이스 (`tests/lib/auto-registration.test.mjs`).
- `package.json` `build` script에 wire-up: `astro build → svg-to-png → generate-llms → pagefind → sitemap-lastmod → sitemap-index → auto-registration audit`.

**PR #49-1 — sitemap-index 통합** (`scripts/post-build/sitemap-index.mjs`)
- `@astrojs/sitemap` 자동 생성된 `sitemap-index.xml` 은 `sitemap-0` 만 포함 → news·images 누락.
- post-build 스크립트로 `sitemap-0.xml`·`sitemap-news.xml`·`sitemap-images.xml` 3종 통합 + 파일 mtime 기반 ISO `<lastmod>` 부여.
- RSS·Atom·JSON Feed는 표준상 sitemap-index 엔트리 부적합 → `robots.txt` Sitemap 라인으로 등록 (#49-3).

**PR #49-2 — verification meta + hreflang + feed auto-discovery** (`src/layouts/Base.astro`)
- `<link rel="alternate" hreflang="ko-KR" />` + `hreflang="x-default"` 자체 참조 (GSC 권장).
- `meta name="google-site-verification"`·`naver-site-verification`·`msvalidate.01` 3종 — env 미설정 시 meta 자체 생략.
- `<link rel="alternate">` RSS·Atom·JSON Feed 3종 자동 디스커버리 — 브라우저·RSS 리더·AI 크롤러 자동 발견.
- `.env.example` 에 `PUBLIC_GOOGLE_SITE_VERIFICATION`·`PUBLIC_NAVER_SITE_VERIFICATION`·`PUBLIC_BING_SITE_VERIFICATION` 추가.

**PR #49-3 — robots + Footer + /feeds/ 페이지** (`public/robots.txt`·`src/components/Footer.astro`·`src/pages/feeds/index.astro`)
- `robots.txt` 에 메인 RSS·Atom·JSON Feed + 12 카테고리 RSS 모두 `Sitemap:` 라인으로 등록 (Google·Bing·Naver 모두 RSS를 sitemap으로 인식).
- Footer 5번째 컬럼 "구독·피드" 신설 — 메인 피드 + AI llms 링크.
- `/feeds/` 페이지 신설 — 모든 채널·12 카테고리 RSS·자동 등록 보증 정책 노출.

**PR #49-6 — sitemap lastmod 정확화** (`scripts/post-build/sitemap-lastmod.mjs`)
- `@astrojs/sitemap` 은 `<lastmod>` 미부여. post-build 스크립트로 모든 article URL 에 `lastReviewed > updatedAt > publishedAt > 파일 mtime` 우선순위 ISO 8601 lastmod 삽입.
- 결과: `sitemap-0.xml` 108/135 URL (=모든 article) lastmod 부여. Search engine 재크롤 빈도·정확도 ↑.

**PR #49-4 — multi-push 강화** (`.github/workflows/indexnow.yml`)
- 기존 indexnow.yml 이미 IndexNow + WebSub + Naver SA + Bing 통합 — 분리 대신 강화.
- IndexNow URL list에 12 카테고리 RSS 추가 — Naver SmartBlock·Bing 분류 정확도 ↑.
- WebSub hub ping 대상에 12 카테고리 RSS 추가.
- `schedule: '5 21 * * *'` (KST 06:05 daily) 추가 — 자동 발행 cron 5분 후 안전망 push (push 트리거 누락 시 fallback).

**보류 합의 (R50 / V2)**
- **R50 (라이브 후 W2~W4)**: WebSub 자체 hub 호스팅·sitemap-video.xml(향후 동영상 글)·llms-cluster-index 메타 인덱스·Atom 카테고리 12개 (RSS와 중복이라 ROI 낮음).
- **V2 (M1~M3)**: Realtime sitemap (CF Worker 동적 lastmod)·Multi-language hreflang(en/ja)·sitemap shard split (5000+)·Newsletter 발행·Wikidata Q-항목.

---

### Round 47 — 라이브 직전 안전망 (5 agent 합의 결정)

**배경**: LLM 키 발급 임박 (온통청년 API 발급 대기 중). 라이브 진입 직전 마지막 안전망 사이클로 5 agent (Plan ROI·사고 시나리오·콘텐츠·SEO·코드 안정성) 병렬 호출. 8 후보 중 P1-E·P1-F·P1-C 합의 도출.

**P1-E TRUSTED_SUFFIXES_INLINE → SSoT 통합** (`src/pages/[cluster]/[slug].astro`)
- ClaimReview citation 필터의 인라인 `['.go.kr', '.or.kr']` 제거. `scripts/lib/trusted-domains.mjs#isTrustedUrl` import. R23/33 통합 SSoT 원칙 회귀 차단. ROI 70 (30분 작업).

**P1-F workflow YAML lint + CLI smoke test**
- `.github/workflows/ci.yml` 에 `workflow-lint` job 신규 — actionlint 다운로드 후 모든 워크플로 정적 분석. actor guard `if:` 표현식 1글자 오타로 권한 우회되는 시나리오 PR 단계 차단.
- `tests/lib/auto-publish-cli.test.mjs` 신규 (+8 케이스) — `scripts/auto-publish.mjs` CLI를 `child_process.spawnSync`로 호출, exit code 0/1/2/3 분기·stdout JSON shape·`MOCK_AUTHORITY` env default·`--dry-run`시 audit 미생성 검증. 라이브 cron(매일 KST 06:00) silent 오작동 차단.

**P1-C QAPage·ClaimReview validator + CI wire-up**
- `scripts/validate-schema.mjs` VALIDATORS 맵에 `QAPage`·`ClaimReview` 검증기 추가. `validateEntity()` export로 단위 테스트 격리. CLI 진입 가드 (`fileURLToPath` import 시 main() 자동 실행 방지).
- `tests/lib/validate-schema.test.mjs` 신규 (+16 케이스) — Question/Answer 구조·Claim/Rating 필수 필드·datePublished ISO·appearance URL·전역 errors 누수 차단 회귀.
- CI `build-test` job 끝에 `pnpm exec node scripts/validate-schema.mjs` step 추가. 깨진 JSON-LD가 production 흘러가는 무성 사고 fail-closed 차단.

**보류 합의 (라이브 후 별도 사이클)**
- V2-A G4 claim_list 비수치 환각 (콘텐츠 1순위·6 PR 큰 변경): `fact-verifier.test.mjs` 415줄과 강결합 → 라이브 무사고 1주 통과 후 착수.
- V2-B KPI 측정 시스템 (사고 시나리오 1순위): 라이브 직후 첫 1~2주 데이터 누적과 동시 진행.

---

## Gap 2 진행 매트릭스 (Plan agent #1 spec 기반)

| Step | 내용 | 상태 | 라운드 |
|---|---|:---:|---|
| 1 | validate-brief를 lib/brief-loader.mjs로 export | ✅ | Round 5 |
| 2 | article-pipeline.mjs --brief 인자 통합 | ✅ | Round 27 |
| 3 | brief 9개 섹션을 LLM 프롬프트에 주입 | ✅ | **Round 34~35** |
| 4 | 출력 frontmatter brief 메타 inject | ✅ | Round 26~29 |
| 5 | G4~G8을 article-pipeline에 통합 | ✅ | Round 29~30 |
| 6 | brief vs legacy 회귀 테스트 강화 | ✅ | Round 35 (legacy byte-identical 검증) |

**Gap 2 사실상 완성** — LLM 키 발급 후 brief 모드 즉시 활성 가능.

---

## 2. 8단계 게이트 매트릭스 (현재 상태)

| Gate | 모듈 | 상태 | 단위 테스트 | 비고 |
|:---:|---|:---:|:---:|---|
| G0 | `lib/dedup-index.mjs` | ✅ | 11 | 24h 차단, NODE_ENV=test 격리 |
| G1 | `gates/g1-question-sanitize.mjs` | ✅ | 14 + 3 | PII·욕설·정치·약물·비한국어·길이 |
| G2 | `gates/g2-cluster-map.mjs` | ✅ | 9 + 12 | 12 cluster + lowercase + ambiguity 25% |
| G3 | `gates/g3-source-probe.mjs` | ✅ | 3 | dev=stub pass, prod=권위 fetch |
| G4 | `lib/fact-verifier.mjs` | ✅ | 9 | extract + match + fetch 통합 |
| G5 | `gates/g5-adsense-policy.mjs` | ✅ | 7 | ad_policy 4종 + body keyword + affiliate |
| G6 | `gates/g6-disclosure-attach.mjs` | ✅ | 8 | YMYL·AI 공시 idempotent |
| G7 | `gates/g7-plagiarism.mjs` | ✅ | 6 | 8단어 hard + 5단어 multi-overlap |
| G8 | `gates/g8-ai-likeness.mjs` | ✅ | 3 + 16 | 10 시그널 score, threshold 단계화 |

---

## 3. 권위 소스 어댑터

| 어댑터 | cluster | 인증 키 | fixture |
|---|---|---|:---:|
| data-go-kr | gov-support, public-services, realestate | DATA_GO_KR_KEY | ✅ 2종 |
| bok-ecos | savings, credit-loan | BOK_API_KEY | ✅ 2종 |
| law-go-kr | tax, insurance-labor, office-tips, unemployment | LAW_GO_KR_OC | ✅ 2종 |
| fss-finlife | savings, credit-loan, insurance-personal, auto | FSS_KEY | ✅ 2종 |
| work24 | unemployment | WORK24_KEY | ✅ 2종 |
| nps | pension | NPS_KEY | ✅ 2종 |
| welfare-go-kr | gov-support 보조 | DATA_GO_KR_KEY | ✅ 2종 |

`__missing__.json` 폴백 7종 + 핵심 query 6종 sample.

---

## 4. brief 시스템 (Gap 1 + 자동 발행 통합)

- `_template.yaml` niche 8차원 + source_question 추가
- `lib/brief-loader.mjs` — Zod 스키마 + 비즈니스 룰 export
- `lib/auto-brief-generator.mjs` — 질문 → brief 골격
  - cluster authorityCoverage 기반 ad_policy 자동 채움
  - PII redact 후 surface_pain 저장
  - source_question.allow_quote=false 강제
  - search_timing·source_signal 자동 채움
- `tests/fixtures/briefs/sample-filled.yaml` — 완전 채워진 e2e demo brief

---

## 5. frontend 변경

| 컴포넌트 | 위치 | 동작 |
|---|---|---|
| `SourceVerificationBadge.astro` | article header | sources_verified=true 시 "공신력 검증" 배지 |
| `VerificationDetails.astro` | article 하단 (sources 직전) | 검증 사실 수·근사·AI-likeness·기준일 |
| `MissionCallout.astro` | 홈페이지 hero 직후 | 3단계 미션 시각화 + 누적 통계 |
| `[cluster]/[slug].astro` | 통합 | sources 섹션에 id="sources" 추가 |
| `index.astro` | 통합 | verifiedArticles·totalFactsVerified props 전달 |
| `content.config.ts` | schema | 9개 frontmatter 필드 추가 (모두 optional) |

---

## 6. CI/CD 통합

| 워크플로 | 동작 | 트리거 |
|---|---|---|
| `auto-publish.yml` | G0~G8 cron 러너 + PR 생성 | KST 06:00 daily + workflow_dispatch |
| `auto-pr-cleanup.yml` | CI 실패 30분 timeout PR close | */30 cron |
| `secrets-scan.yml` (기존) | gitleaks + custom scan | push/PR |
| `indexnow.yml` (기존) | IndexNow + sitemap + WebSub 즉시 푸시 | article 변경 |

---

## 7. 사용자 작업 대기 (내일 아침)

### 외부 API 키 발급 7~9종
- NAVER_CLIENT_ID + NAVER_CLIENT_SECRET (지식iN)
- DATA_GO_KR_KEY (정부 데이터)
- BOK_API_KEY (한국은행 ECOS)
- LAW_GO_KR_OC (법제처)
- WORK24_KEY (고용24)
- NPS_KEY (국민연금)
- FSS_KEY (금감원 finlife)
- (옵션) NAVER_SEARCH_ADVISOR_TOKEN, BING_API_KEY
- (별도) DEEPSEEK_API_KEY, ANTHROPIC_API_KEY (LLM)

### 등록
- GitHub Secrets (모든 키)
- CF Pages Env (PUBLIC_*는 Plaintext, 비밀 키는 Encrypted)

### 활성화
1. workflow_dispatch + dry_run=true 1회 (실 API 호출 검증)
2. `vars.MOCK_AUTHORITY=0` 토글 (CF Pages·GitHub Variables)
3. cron 자동 활성 — 첫 7일 모니터링

자세한 절차: [AUTO-PUBLISH-GUIDE.md](AUTO-PUBLISH-GUIDE.md)

---

## 8. 알려진 한계 (다음 라운드 작업)

- **Gap 2 Step 3+ 잔여**: Step 1·2 완료. Step 3 (brief 9개 섹션을 LLM 프롬프트에 주입), Step 5 (G4~G8 article-pipeline 통합), Step 6 (회귀 테스트) 남음.
- ~~**article-pipeline.mjs Gap 2 통합**~~: ✅ Round 27에서 `--brief` CLI + frontmatter inject 완료. brief 모드 작동 검증.
- ~~**trusted-domains 3곳 중 1곳 잔여**~~: ✅ Round 23에서 article-pipeline.mjs까지 완료.
- **AI-likeness 임계 5.0 단계화**: 현재 default 5.0 / auto-publish.yml은 7.0. 운영 1주 후 단계 강화.
- **fact-verifier 통화·환율**: 현재 KRW만 정규화. 외환 등 다국어 통화 V2.
- **PR 자동 생성**: 현재 auto-publish.yml은 게이트 트레이스만 출력. PR 생성·머지는 LLM 4-pass 통합 후 활성.

---

## 9. 안정화 지표

- 빌드 시간 회귀 0 (20.05~20.94s 안정)
- 테스트 회귀 0 (모든 라운드 후 248/248 유지)
- 시크릿 노출 0 (pre-commit·gitleaks·custom scan 3중 통과)
- LF/CRLF 경고만 (Windows 환경 자연 — 배포 영향 0)

PR #1 리뷰 시 본 문서를 먼저 보면 19개 커밋의 흐름을 한눈에 파악 가능.
