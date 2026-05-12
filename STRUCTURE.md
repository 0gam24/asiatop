# moneylook (asiatop.co.kr) 자매 사이트 — STRUCTURE.md

> smartdata HQ 가 본 사이트를 관리하기 위한 구조 문서.
> 본 문서는 본 repo 분석 결과 자동 생성.
>
> 마지막 갱신: 2026-05-07
> 분석 기준 commit: 8b8c52929a22cf87d4bddec29fd40624c36cece4 (2026-05-03)

## 1. 정체성
- 도메인: asiatop.co.kr
- 사이트 이름: 머니룩 (MoneyLook)
- 역할: 자매 (한국 직장인·청년 생활금융 가이드)
- 메인: smartdatashop.kr 의 자매
- repo: github.com/0gam24/moneylook
- 사업자: 스마트데이터샵 (대표 김준혁, 사업자번호 406-06-34485)
- 단일 문의 채널: smartdatashop@gmail.com

## 2. 기술 스택
- Astro 6.2.0 (output: static, trailingSlash: 'always', format: 'directory')
- @astrojs/mdx 5.0.4
- @astrojs/react 5.0.4 + React 18.3.1 (Calculator 등 인터랙티브 islands)
- @astrojs/sitemap 3.7.2 + @astrojs/rss 4.0.18 + @astrojs/partytown 2.1.7
- Tailwind CSS 4.0 (@tailwindcss/vite)
- Pretendard 1.3.9 (폰트 셀프 호스팅)
- TypeScript 5.6.3
- Vitest 4.1.5 + Playwright 1.59.1 + @axe-core/playwright (테스트)
- Pagefind 1.4.0 (정적 검색 인덱싱)
- Sentry browser 10.51.0 + web-vitals 5.2.0
- Satori 0.26.0 + @resvg/resvg-js (OG 이미지 동적 생성)
- Node ≥ 22.12.0, pnpm

## 3. 라우트 (정적)
- /
- /about/
- /contact/
- /privacy/
- /terms/
- /editorial-policy/
- /clusters/
- /search/
- /design-system/
- /404
- /corrections/
- /personas/
- /personas/social-newbie/
- /personas/newlywed/
- /personas/housing-subscription/
- /personas/self-employed/
- /calculators/
- /calculators/salary/
- /calculators/severance-pay/
- /calculators/annual-leave/
- /calculators/unemployment-benefit/
- /feeds/

## 4. 라우트 (동적)
- /[cluster]/ — 12개 카테고리 인덱스 ([src/pages/[cluster]/index.astro](src/pages/%5Bcluster%5D/index.astro))
- /[cluster]/[slug]/ — 글 상세 ([src/pages/[cluster]/[slug].astro](src/pages/%5Bcluster%5D/%5Bslug%5D.astro))
- /[cluster]/[slug].md — Raw MD 응답 ([src/pages/[cluster]/[slug].md.ts](src/pages/%5Bcluster%5D/%5Bslug%5D.md.ts))
- /author/[slug]/ — 저자 페이지 ([src/pages/author/[slug].astro](src/pages/author/%5Bslug%5D.astro))
- /og/[cluster]/[slug].svg — Satori 기반 OG 이미지 ([src/pages/og/[cluster]/[slug].svg.ts](src/pages/og/%5Bcluster%5D/%5Bslug%5D.svg.ts))
- /rss/[cluster].xml — 카테고리별 RSS

## 5. API endpoints
- /sitemap-index.xml (post-build 생성, [scripts/post-build/sitemap-index.mjs](scripts/post-build/sitemap-index.mjs))
- /sitemap-0.xml (@astrojs/sitemap)
- /sitemap-images.xml ([src/pages/sitemap-images.xml.ts](src/pages/sitemap-images.xml.ts))
- /sitemap-news.xml ([src/pages/sitemap-news.xml.ts](src/pages/sitemap-news.xml.ts))
- /rss.xml ([src/pages/rss.xml.ts](src/pages/rss.xml.ts))
- /atom.xml ([src/pages/atom.xml.ts](src/pages/atom.xml.ts))
- /feed.json ([src/pages/feed.json.ts](src/pages/feed.json.ts))
- /rss/[cluster].xml (카테고리별)
- /og/[cluster]/[slug].svg (동적 OG)

## 6. 레이아웃
- [Base.astro](src/layouts/Base.astro) — 공통 head/meta/JSON-LD/Header/Footer/Consent 래퍼
- [Calculator.astro](src/layouts/Calculator.astro) — 계산기 페이지 전용 (TrustBar 류 포함)

## 7. 컴포넌트
- [AdSlot.astro](src/components/AdSlot.astro) — Google AdSense 슬롯 (lazy + 정책 분기)
- [Analytics.astro](src/components/Analytics.astro) — GA4 + Consent Mode v2 + AdSense loader
- [AnnualLeaveCalculator.tsx](src/components/AnnualLeaveCalculator.tsx) — 연차 계산기 (React island)
- [AnswerStructure.astro](src/components/AnswerStructure.astro) — GEO 청킹용 Q-A 청크 래퍼
- [ArticleCard.astro](src/components/ArticleCard.astro) — 글 카드
- [ClusterCard.astro](src/components/ClusterCard.astro) — 클러스터 카드
- [ClusterIcon.astro](src/components/ClusterIcon.astro) — 클러스터별 emoji/아이콘
- [ConsentBanner.astro](src/components/ConsentBanner.astro) — 쿠키·동의 배너
- [Experiment.astro](src/components/Experiment.astro) — A/B 실험 슬롯
- [Footer.astro](src/components/Footer.astro) — 푸터 (사업자·정책 링크)
- [Header.astro](src/components/Header.astro) — 헤더·네비
- [HeroIllustration.astro](src/components/HeroIllustration.astro) — 홈 hero
- [JsonLd.astro](src/components/JsonLd.astro) — Schema.org JSON-LD 직렬화
- [MainBackrefBox.astro](src/components/MainBackrefBox.astro) — smartdatashop network 메인 backref (12 cluster → 메인 카테고리 자동 매핑, variant: inline/sidebar/footer, accent #8b1538)
- [MissionCallout.astro](src/components/MissionCallout.astro) — 사이트 미션 박스
- [ResponsivePicture.astro](src/components/ResponsivePicture.astro) — AVIF/WebP picture
- [SalaryCalculator.tsx](src/components/SalaryCalculator.tsx) — 연봉 실수령액 계산기
- [SeverancePayCalculator.tsx](src/components/SeverancePayCalculator.tsx) — 퇴직금 계산기
- [SourceVerificationBadge.astro](src/components/SourceVerificationBadge.astro) — 권위 출처 검증 배지
- [UnemploymentBenefitCalculator.tsx](src/components/UnemploymentBenefitCalculator.tsx) — 실업급여 계산기
- [VerificationDetails.astro](src/components/VerificationDetails.astro) — 검증 세부 정보 펼침

## 8. MDX 콘텐츠 list (카테고리별)

> 머니룩의 분류는 12개 cluster 체계 ([src/data/clusters.ts](src/data/clusters.ts)).
> 사용자가 요청한 4분류(첫 직장 / 연말정산 / 청약 / 신혼) 와 매핑은 §16 참조.

### 8.1 tax — 연말정산·세금환급 (9편)
- /tax/business-trip-allowance-tax-exempt/ — 출장비 비과세
- /tax/comprehensive-income-tax-freelancer/ — 종합소득세(프리랜서)
- /tax/credit-card-deduction-calculation/ — 신용카드 공제 계산
- /tax/dependent-deduction-guide/ — 인적공제
- /tax/earned-income-tax-credit-guide/ — 근로장려금
- /tax/income-tax-vs-yearend-tax/ — 소득세 vs 연말정산
- /tax/medical-expense-tax-credit-missed/ — 의료비 공제 누락
- /tax/vat-filing-guide/ — 부가세 신고
- /tax/yearend-tax-2026-checklist/ — 2026 연말정산 누락 8가지

### 8.2 realestate — 부동산·전월세 (9편)
- /realestate/beotimmok-jeonse-loan/ — 버팀목 전세대출
- /realestate/didimdol-vs-bogeumjari-comparison/ — 디딤돌 vs 보금자리
- /realestate/housing-lease-protection-act-essentials/ — 주택임대차보호법
- /realestate/housing-subscription-account-strategy/ — 청약통장 전략
- /realestate/housing-subscription-priority-system/ — 청약 1순위
- /realestate/jeonse-deposit-protection/ — 전세보증금 보호
- /realestate/monthly-rent-mandatory-report-2026/ — 2026 월세 의무신고
- /realestate/monthly-rent-tax-credit-application/ — 월세 세액공제
- /realestate/real-estate-mortgage-refinancing/ — 주담대 갈아타기

### 8.3 unemployment — 실업·퇴직 (9편)
- /unemployment/early-reemployment-allowance-application/
- /unemployment/job-search-activity-recognition/
- /unemployment/post-resignation-insurance/
- /unemployment/recommended-resignation-vs-voluntary/
- /unemployment/self-employed-unemployment-benefit/
- /unemployment/severance-irp-lump-sum-vs-pension/
- /unemployment/unemployment-benefit-application/
- /unemployment/unemployment-benefit-duration-calculation/
- /unemployment/unemployment-fraud-cases/

### 8.4 gov-support — 정부지원금·청년정책 (9편)
- /gov-support/4th-gen-silson-renewal-strategy/
- /gov-support/birth-support-package/ — 출산 지원 패키지
- /gov-support/bokjiro-mobile-application/
- /gov-support/child-allowance-comparison/
- /gov-support/k-digital-training-eligibility/
- /gov-support/national-tomorrow-learning-card-2026/
- /gov-support/newlywed-support-package/ — 신혼부부 지원 패키지
- /gov-support/online-youth-center-guide/
- /gov-support/single-parent-family-childcare-support/

### 8.5 savings — 재테크·예적금 (9편)
- /savings/cma-rp-vs-mmf-comparison/
- /savings/etf-vs-fund-comparison/
- /savings/isa-account-comparison/
- /savings/monthly-installment-etf-guide/
- /savings/parking-account-vs-cma/
- /savings/term-deposit-vs-installment-savings/
- /savings/youth-hope-savings-maturity-strategy/
- /savings/youth-leap-account-simulation/ — 청년도약계좌 시뮬
- /savings/youth-tomorrow-fund-savings/

### 8.6 insurance-labor — 4대보험·노동법 (9편)
- /insurance-labor/four-insurance-mandatory-rules/
- /insurance-labor/health-insurance-dependent-qualification/
- /insurance-labor/health-insurance-reduction/
- /insurance-labor/holiday-work-pay-calculation/
- /insurance-labor/industrial-accident-insurance-coverage/
- /insurance-labor/national-pension-voluntary-payment/
- /insurance-labor/weekly-holiday-allowance/
- /insurance-labor/workers-compensation-claim/
- /insurance-labor/workplace-vs-regional-insured/

### 8.7 auto — 자동차·교통 (9편)
- /auto/car-accident-claim-process/
- /auto/car-accident-fault-ratio-standard/
- /auto/car-insurance-direct-vs-agent/
- /auto/car-insurance-premium-discount-system/
- /auto/car-tax-refund-application-guide/
- /auto/car-tax-refund-cases/
- /auto/car-tax-yeonnap-discount/
- /auto/drivers-license-renewal-mobile/
- /auto/eco-friendly-vehicle-tax-benefits-2026/

### 8.8 public-services — 공공서비스·민원 (9편)
- /public-services/business-registration-guide/
- /public-services/family-relation-certificate-issuance/
- /public-services/government-application-forms/
- /public-services/government24-mobile-guide/
- /public-services/hometax-mobile-guide/
- /public-services/online-resident-transfer-procedure/
- /public-services/resident-registration-5min-mobile/
- /public-services/seal-certificate-vs-signature-confirmation/
- /public-services/youth-housing-support-2026/

### 8.9 office-tips — 직장인 꿀팁 (9편)
- /office-tips/annual-leave-cash-claim/
- /office-tips/mandatory-annual-leave-employer-duty/
- /office-tips/meal-allowance-tax-exempt/
- /office-tips/night-work-pay-criteria/
- /office-tips/noran-umbrella-eligibility/
- /office-tips/ordinary-wage-calculation/
- /office-tips/overtime-pay-calculation/
- /office-tips/salary-negotiation-data-prep/
- /office-tips/worker-side-job-reporting-duty/

### 8.10 credit-loan — 신용·대출 (9편)
- /credit-loan/credit-card-rejection-response/
- /credit-loan/credit-score-improvement/
- /credit-loan/kcb-vs-nice-credit-score-difference/
- /credit-loan/loan-refinancing-guide/
- /credit-loan/mid-range-loan-comparison-2026/
- /credit-loan/negative-checking-vs-credit-loan/
- /credit-loan/second-tier-credit-loans/
- /credit-loan/sunshine-loan-17-vs-card-comparison/
- /credit-loan/sunshine-loan-comparison/

### 8.11 insurance-personal — 보험·실비 (9편)
- /insurance-personal/cancer-insurance-essentials/
- /insurance-personal/children-insurance-essentials/
- /insurance-personal/dental-insurance-coverage-truth/
- /insurance-personal/driver-insurance-essentials/
- /insurance-personal/insurance-cancellation-refund-calculation/
- /insurance-personal/life-insurance-types-comparison/
- /insurance-personal/real-estate-capital-gains-tax-exemption/
- /insurance-personal/silson-insurance-claim/
- /insurance-personal/variable-insurance-purchase-warning/

### 8.12 pension — 노후·연금 (9편)
- /pension/db-vs-dc-retirement-pension/
- /pension/housing-pension-guide/
- /pension/irp-portfolio-recommendation/
- /pension/national-pension-voluntary-continued-payment/
- /pension/national-pension-when-receive/
- /pension/pension-savings-vs-irp/
- /pension/personal-pension-vs-pension-savings/
- /pension/retirement-fund-needed/
- /pension/retirement-pension-etf-management/

총 글 수: **108편** (12 클러스터 × 9편, 정확히 균등)
가장 늦은 publishedAt: 2026-04-29
가장 늦은 updatedAt: 2026-04-30

## 9. lib 모듈
- [src/lib/error-tracking.ts](src/lib/error-tracking.ts) — Sentry init·에러 캡처
- [src/lib/experiments.ts](src/lib/experiments.ts) — A/B 실험 분기
- [src/lib/related-articles.ts](src/lib/related-articles.ts) — 관련 글 추천 (cluster·keyword 기반)
- [src/lib/vitals.ts](src/lib/vitals.ts) — Core Web Vitals 보고

## 10. GitHub Actions
- [auto-create-pr.yml](.github/workflows/auto-create-pr.yml) — push(fix/feat/chore/docs/refactor/perf/**) → PR 자동 생성
- [auto-merge.yml](.github/workflows/auto-merge.yml) — PR 생성 → CI green 시 native auto-merge(squash)
- [auto-pr-cleanup.yml](.github/workflows/auto-pr-cleanup.yml) — */30분 cron — auto-publish PR 30분 내 미통과 자동 close
- [auto-publish.yml](.github/workflows/auto-publish.yml) — 매일 KST 06:00 cron — 지식인 큐 → G0~G8 게이트 → PR (PR 동시 ≤3, 일 발행 ≤5)
- [ci.yml](.github/workflows/ci.yml) — push(main)/PR — actionlint + check + test
- [go-live-check.yml](.github/workflows/go-live-check.yml) — push(main)/release 라벨/수동 — sitemap·a11y·linkinator·audit
- [indexnow.yml](.github/workflows/indexnow.yml) — push(main, content/pages 변경) — IndexNow + Sitemap + RSS PubSubHubbub
- [lighthouse-ci.yml](.github/workflows/lighthouse-ci.yml) — PR(main) — Lighthouse desktop
- [scheduled-rebuild.yml](.github/workflows/scheduled-rebuild.yml) — cron 6시간(KST 03/09/15/21시) — CF Pages Deploy Hook
- [secrets-scan.yml](.github/workflows/secrets-scan.yml) — push/PR(main) — gitleaks + 한국 공공·금융 키 패턴
- [security-audit.yml](.github/workflows/security-audit.yml) — 매주 월 KST 09:00 cron — 의존성 취약점 → Issue
- [stale-content-check.yml](.github/workflows/stale-content-check.yml) — 매주 월 KST 09:00 cron — 노후 콘텐츠 Issue 알림

## 11. scripts
- [generate-network-mirror.mjs](scripts/generate-network-mirror.mjs) — smartdata HQ Network Index 용 `public/network-mirror.json` 자동 생성 (108편 + 12 cluster × 9편 균등 + cluster→메인카테고리/페르소나 매핑). build chain 의 첫 단계 + `prebuild` hook 동시 등록. 산출물은 `.gitignore` 처리.
- [article-pipeline.mjs](scripts/article-pipeline.mjs) — 자동 발행 파이프라인 진입점
- [auto-publish.mjs](scripts/auto-publish.mjs) — cron 발행 큐 처리
- [generate-llms.mjs](scripts/generate-llms.mjs) / [generate-llms-full.mjs](scripts/generate-llms-full.mjs) — llms.txt / llms-full.txt 생성
- [svg-to-png.mjs](scripts/svg-to-png.mjs) — OG 이미지 PNG 변환
- [go-live-check.mjs](scripts/go-live-check.mjs) — 출시 게이트 검증
- [validate-schema.mjs](scripts/validate-schema.mjs) — JSON-LD 스키마 검증
- [validate-brief.mjs](scripts/validate-brief.mjs) / [new-brief.mjs](scripts/new-brief.mjs) — brief 작성·검증
- [refine-existing.mjs](scripts/refine-existing.mjs) — 기존 글 보정
- [geo-audit.mjs](scripts/geo-audit.mjs) — GEO 청킹 감사
- [secrets-scan.mjs](scripts/secrets-scan.mjs) — 자체 시크릿 스캔
- [setup-env.mjs](scripts/setup-env.mjs) / [install-hooks.mjs](scripts/install-hooks.mjs) / [spread-dates.mjs](scripts/spread-dates.mjs)
- scripts/audit/ — auto-registration·passage-chunking·rejection-stats·title-length·frontmatter-coverage·bundle-size 감사 (frontmatter-coverage: 108편의 자동검증 메타 도입률·stale·갱신 우선순위 큐 / bundle-size: dist/_astro JS·CSS 크기 + 350/120/80KB 임계 게이트)
- scripts/post-build/ — sitemap-index·sitemap-lastmod 후처리
- scripts/gates/ — G1 question-sanitize, G2 cluster-map, G3 source-probe, G5 adsense-policy, G6 disclosure-attach, G7 plagiarism, G8 ai-likeness, G9 naver-spam (G0/G4 는 lib/)
- scripts/lib/ — fact-extract·fact-match·fact-verifier·dedup-index·ai-likeness-scorer·brief-loader·brief-prompt-builder·naver-kin-collector·naturalization-patterns·trusted-domains + authority-sources/

## 12. 빌드·배포 명령
- `pnpm dev` — astro dev
- `pnpm generate:mirror` — `public/network-mirror.json` 즉시 갱신 (수동)
- `pnpm build` — generate-network-mirror && astro build && svg-to-png && generate-llms && pagefind && sitemap-lastmod && sitemap-index && audit:auto-reg (`prebuild` hook 동시 wired)
- `pnpm preview` — astro preview
- `pnpm check` — astro check && tsc --noEmit
- `pnpm test` / `test:watch` / `test:cov` — Vitest
- `pnpm test:e2e` — Playwright (axe-core 포함)
- `pnpm pagefind` — 정적 검색 인덱스
- `pnpm go-live` — 출시 게이트
- `pnpm validate:schema` / `audit:geo` / `audit:auto-reg` / `audit:title`
- `pnpm article` / `pnpm refine` — 자동 발행 파이프라인
- `pnpm brief:new` / `pnpm brief:validate` — brief 운영
- `pnpm secrets:scan` / `pnpm setup:env` / `pnpm prepare`

## 13. 환경변수 의존
공개 (PUBLIC_*, 빌드 시 클라이언트 노출):
- PUBLIC_GA4_ID — GA4 측정 ID
- PUBLIC_ADSENSE_CLIENT — AdSense client (ca-pub-…)
- PUBLIC_GOOGLE_SITE_VERIFICATION
- PUBLIC_NAVER_SITE_VERIFICATION
- PUBLIC_BING_SITE_VERIFICATION
- PUBLIC_SENTRY_DSN
- PUBLIC_SENTRY_ENV (default: production)
- PUBLIC_SENTRY_SAMPLE_RATE (optional, 0.01~1.0, default 0.1 — 무료 5K/월 보호)

서버·빌드 전용:
- ANTHROPIC_API_KEY — Claude (자동 발행 파이프라인 LLM)
- DEEPSEEK_API_KEY — DeepSeek (자동 발행 파이프라인 LLM)
- NAVER_CLIENT_ID / NAVER_CLIENT_SECRET — 지식인 검색 API
- DEDUP_INDEX_PATH — 중복 차단 인덱스 경로
- AI_LIKENESS_THRESHOLD — G8 게이트 임계값
- MOCK_AUTHORITY / MOCK_AUTHORITY_VERBOSE — 권위 API 목 모드
- MOCK_NAVER_KIN_VERBOSE — 지식인 수집 목 모드
- GIT_USER — 자동 commit user
- CF_PAGES_COMMIT_SHA — Cloudflare Pages 빌드 시 자동 주입
- NODE_ENV
GitHub Actions secrets: CF_DEPLOY_HOOK, NAVER_SEARCH_ADVISOR_TOKEN (옵션)

## 14. 의존성 (핵심)
- astro@^6.2.0
- @astrojs/mdx@^5.0.4
- @astrojs/react@^5.0.4
- @astrojs/sitemap@^3.7.2
- @astrojs/rss@^4.0.18
- @astrojs/partytown@^2.1.7
- @tailwindcss/vite@^4.0.0 + tailwindcss@^4.0.0
- react@^18.3.1 / react-dom@^18.3.1
- pretendard@^1.3.9
- @sentry/browser@^10.51.0
- web-vitals@^5.2.0
- pagefind@^1.4.0
- satori@^0.26.0 + @resvg/resvg-js@^2.6.2
- @playwright/test@^1.59.1 + @axe-core/playwright@^4.11.3
- vitest@^4.1.5

## 15. 배포
- 호스팅: Cloudflare Pages (정적 SSG, CF_DEPLOY_HOOK 으로 6시간 주기 재빌드)
- 프로젝트 이름: (미확인 — repo 내 명시적 표기 없음, CF 대시보드 확인 필요)
- 도메인: asiatop.co.kr
- production branch: main
- 빌드 산출물: `dist/`
- 검색엔진 보강: IndexNow (Bing/Yandex/Naver) + WebSub/PubSubHubbub + Naver Search Advisor sitemap ping

## 16. 페르소나·톤 (분석된 내용)
- 주 타겟: **사회초년생 · 청년 · 직장인** (about 페이지 명시)
- 보조 타겟: 신혼부부 (gov-support/newlywed-support-package, birth-support-package), 프리랜서/사업자 (tax/comprehensive-income-tax-freelancer, vat-filing-guide), 노후 준비층 (pension cluster 9편)
- 톤: **1차 정부 자료 인용 + 사실 1:1 매칭 검증 + YMYL 면책** — 케이스/스토리보다 가이드·체크리스트·금액·자격 중심. "발품 안 팔고 끝", "13월의 월급" 같은 직장인 화법.
- 콘텐츠 유형 (12 cluster):
  - 사용자 요청 4분류 매핑:
    - **첫 직장** ↔ office-tips + insurance-labor (연차·야근수당·4대보험)
    - **연말정산** ↔ tax (9편)
    - **청약** ↔ realestate (housing-subscription-* 2편 + 전월세 7편)
    - **신혼** ↔ gov-support/newlywed-support-package + birth-support-package + youth-housing-support-2026 (전용 cluster 없음, 횡단)
  - 추가 8 cluster: unemployment / gov-support / savings / auto / public-services / credit-loan / insurance-personal / pension

## 17. JSON-LD / SEO
- Schema.org 사용: ✓
- 사용 type: Article, NewsArticle, Audience, Organization, FAQPage, BreadcrumbList, ListItem, Question, Answer, ClaimReview, Claim, Rating, CollectionPage, AboutPage, QAPage, HowTo, HowToStep, Dataset, DataDownload, ImageObject, CreativeWork, SoftwareApplication, Country
- canonical: ✓ (Base.astro 에서 trailingSlash 'always' 일치)
- sitemap: ✓ (sitemap-index + sitemap-0 + sitemap-images + sitemap-news)
- RSS: ✓ (전체 /rss.xml + /atom.xml + /feed.json + 카테고리별 /rss/[cluster].xml)
- llms.txt / llms-full.txt: ✓ (build 단계 generate-llms 자동 생성)
- robots.txt + AI 크롤러 명시 허용: ✓ ([public/](public/))
- 보안 헤더 + AI 크롤러: Cloudflare _headers·_redirects·robots.txt (templates/cloudflare 참조)
- OG 이미지: 동적 SVG (Satori) → PNG 변환

## 18. 광고
- AdSense: ✓ ([src/components/AdSlot.astro](src/components/AdSlot.astro), [Analytics.astro](src/components/Analytics.astro))
- AdSense client ID: 미설정 (`.env.example` 의 `PUBLIC_ADSENSE_CLIENT=` 빈값 — 운영 환경변수에 주입 필요)
- 정책 게이트: G5 adsense-policy.mjs + cluster.adRiskTier(low/medium/high) + recommendedAdPolicy()로 financial-advice cluster 자동 면책 부착
- Consent Mode v2: ✓ (default deny → localStorage opt-in 시 update)
- 기타 광고: 없음 (제휴·비교는 본문에 [제휴]/[광고] 명시 정책)

## 19. 현재 콘텐츠 통계 (분석 시점)
- gov-support (정부지원금·청년정책): 9편
- tax (연말정산·세금환급): 9편
- realestate (부동산·전월세·청약): 9편
- unemployment (실업·퇴직): 9편
- savings (재테크·예적금): 9편
- insurance-labor (4대보험·노동법): 9편
- auto (자동차·교통): 9편
- public-services (공공민원): 9편
- office-tips (직장인 꿀팁): 9편
- credit-loan (신용·대출): 9편
- insurance-personal (보험·실비): 9편
- pension (노후·연금): 9편
- 총: **108편**
- 가장 늦은 publishedAt: 2026-04-29
- 가장 늦은 updatedAt: 2026-04-30
- 마지막 commit: 2026-05-03 (8b8c529, "fix(ci): axe-core CLI 제거 + auto-create-pr 워크플로")
- 활성 상태: **운영 중** (자동 발행 파이프라인 가동, CF Pages 6시간 주기 재빌드)

## 20. NETWORK.md 헌법 적용 가능성
- 디자인 토큰 (color/font) 메인과 일치: (미확인) — 본 repo 는 자체 토큰 (clusters.ts accent, Pretendard) 사용. smartdatashop.kr 메인 토큰과의 대조 필요.
- 4 절대 규칙 (신뢰성·실시간·정확성·출처표기) 준수:
  - 신뢰성·정확성: ✓ — G4 fact-verifier 1:1 매칭, 미달 시 자동 폐기 (about 페이지 명시)
  - 출처표기: ✓ — schema 에 sources(min 1) 강제, 본문 끝 면책 자동 부착(G6)
  - 실시간: △ — cron 기반 (KST 06:00 발행 + 6시간 재빌드 + IndexNow 즉시 푸시). 진성 실시간은 아니나 발행 직후 색인 푸시 지연 ≤ 5분.
- 의무 컴포넌트 (TrustBar / SourceList / 메인 backref):
  - TrustBar 정확 명칭: ✗ — 동등 기능은 [SourceVerificationBadge.astro](src/components/SourceVerificationBadge.astro) + [VerificationDetails.astro](src/components/VerificationDetails.astro) + [MissionCallout.astro](src/components/MissionCallout.astro)
  - SourceList: ✗ — frontmatter `sources` 배열 + 본문 인라인 인용으로 대체. 별도 컴포넌트 부재.
  - 메인(smartdatashop.kr) backref: ✓ (2026-05-07 추가) — [MainBackrefBox.astro](src/components/MainBackrefBox.astro) 신설, 글 상세 108편 본문 끝 + cluster 인덱스 12개 + Footer 네트워크 섹션 sitewide 적용. Article schema 에 `parentOrganization`(스마트데이터샵) + `isBasedOn=https://smartdatashop.kr/` JSON-LD 부착.
- 안전 게이트 (smoke / verifier / fact-checker):
  - ✓ — G0 dedup, G1 sanitize, G2 cluster-map, G3 source-probe, G4 fact-match, G5 adsense-policy, G6 disclosure-attach, G7 plagiarism, G8 ai-likeness, G9 naver-spam (10단계). go-live-check.yml 출시 게이트 + ci.yml + secrets-scan + lighthouse-ci 다층 방어.

## 21. 변경 이력
- 2026-05-07 — 초기 자동 생성 (commit 8b8c529 기준)
- 2026-05-07 — MainBackrefBox 컴포넌트 신설 + 글 상세/클러스터 인덱스/Footer sitewide 적용 + Article schema parentOrganization·isBasedOn 추가 (smartdatashop network 자매 박힘)
- 2026-05-07 — generate-network-mirror.mjs 신설 + build chain·prebuild 등록 + `.gitignore` 산출물 제외 (smartdata HQ Network Index sync)
- 2026-05-12 — Base.astro NewsMediaOrganization schema 강화 (legalName/taxID/PostalAddress/contactPoint/parentOrganization 추가), frontmatter-coverage 감사 스크립트 신설, cron 시각 분산 4종 (R53 #1)
- 2026-05-12 — 페르소나 인덱스 페이지 3종 신설 (/personas/, /personas/newlywed/, /personas/housing-subscription/) + 정정 이력 페이지 /corrections/ 신설 + Footer 운영정보 섹션 갱신 (R53 #2)
- 2026-05-12 — Lighthouse mobile job 복구 (R53 #3, preset='perf' 제거 정공 fix) + bundle-size CI 게이트 (JS raw 350KB / gz 120KB / CSS 80KB 임계) + MainBackrefBox 클릭 GA4 이벤트 (data-track="main_backref_click")
- 2026-05-12 — robots.txt 정공 fix (User-agent: * 단일 그룹 통합, 명시 봇 26그룹 제거 — Disallow 모호성 0) + llms.txt 클러스터 카운트 분리 표기 (실제 발행 글 수 vs 본문 포함 글 수) (R53 #4)
- 2026-05-12 — robots.txt 명시 봇 그룹 26종 복원 hotfix (e2e "User-agent: GPTBot 명시 검증" 회귀 안전망 + `*` 그룹 Disallow 유지로 모호성 해소 양립)
- 2026-05-12 — law-go-kr 어댑터 V2 real fetch 구현 (R53 #5) — lawSearch.do (키워드 검색·법령 메타) + lawService.do (본문, 향후 토큰 매칭용 export 만). LAW_GO_KR_OC 미설정 시 mock fallback, confidence 0.5. tax·insurance-labor·office-tips·unemployment cluster 36편 영향. MOCK_AUTHORITY=0 첫 단계 어댑터.
- 2026-05-12 — bok-ecos 어댑터 V2 real fetch (R53 #6, KeyStatisticList 100선 + 키워드 부분매칭) + author JSON sameAs 보강 (corrections/contact/smartdatashop.kr 추가) + Sentry sampleRate 환경변수화 (PUBLIC_SENTRY_SAMPLE_RATE, 0.01~1.0 클램프, parseSampleRate 단위테스트 6건)
- 2026-05-12 — fss-finlife V2 real fetch (R53 #7, depositProductsSearch 은행 정기예금 + 키워드 매칭, savings·credit-loan·insurance-personal·auto 36편 영향) + data-go-kr V2 real fetch (youthcenter.go.kr getPlcy 청년정책 list + srchKywd, gov-support·public-services·realestate 27편 영향)
- 2026-05-12 — stale-content-check.yml 워크플로 강화 (R53 #8) — 인라인 스크립트 → scripts/audit/frontmatter-coverage.mjs 통합. 자동검증 메타 도입률 + 갱신 우선순위 큐 30건 issue 본문 자동 게시. docs/17-performance-budget.md §12 AdSense INP/CLS 사전 budget 추가 (R53 #9). docs/MOCK-AUTHORITY-RUNBOOK.md 신설 (어댑터 V2 4개 활성 절차·dry-run·롤백).
- 2026-05-12 — 페르소나 인덱스 페이지 2종 추가 (R53 #10) — /personas/social-newbie/ (12편, 청년·첫직장·자산형성), /personas/self-employed/ (10편, 종소세·부가세·정책대출·노란우산). 페르소나 4종 (사회초년생·신혼·청약·자영업자) 완성. CollectionPage + Audience schema 박힘.
- 2026-05-12 — auto-publish.mjs preLLMOnly 가 G3 통과 후 generateBriefSkeleton 자동 호출 (R54-1, V2 통합 1단계). G3 의 MOCK_AUTHORITY 환경변수 반영 (`process.env.MOCK_AUTHORITY !== '0'` → real fetch 활성). 워크플로에 `--brief-out` 인자·아티팩트 업로드 추가, 정부 API 키 5종 secrets 주입.
