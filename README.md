# Agents Kit — 바이브 코딩 웹사이트 제작 표준

**Astro 5+ / Cloudflare Pages / GitHub Actions / PageSpeed 100점 / 2026 SEO·GEO 표준**

---

## 이게 뭐예요?

AI 코딩 에이전트(Claude Code, Cursor, Windsurf 등)에게 "사이트 만들어줘" 한 마디로 **PageSpeed 100점 + 최신 SEO·GEO 표준**을 만족하는 웹사이트를 만들게 하는 표준 지시서 모음입니다.

- 사용자는 이 폴더를 통째로 복사
- 에이전트가 0단계 인터뷰부터 시작해서 알아서 진행
- 사이트 종류에 맞는 보조 에이전트도 자동 생성

---

## 사용법

### 1단계: 폴더 통째로 복사

```bash
# 새 프로젝트 폴더에 agents-kit 내용물 복사
cp -r agents-kit/* my-new-project/
cd my-new-project
```

복사 후 구조:
```
my-new-project/
├── AGENTS.md          ← 메인 진입점 (에이전트가 이걸 읽음)
├── docs/              ← 주제별 표준 문서 22개
├── templates/         ← 에이전트·CI·CF 템플릿
└── README.md          ← 이 파일
```

### 2단계: AI 코딩 도구 열기

Claude Code, Cursor, Windsurf 등 무엇이든 OK. 단, **AGENTS.md를 읽도록 지시**하세요.

### 3단계: 한 마디 던지기

> "사이트 만들어줘" 또는 "AGENTS.md 따라서 시작"

에이전트가 자동으로:
1. **0단계 인터뷰** — 사이트 종류, 키워드, API, 도메인 등 카테고리별 질문
2. **PROJECT.md 자동 생성** — 답변 박제 → 사용자 승인
3. **`.claude/agents/*` 자동 생성** — 사이트 종류에 맞는 보조 에이전트 4~6개
4. **본격 작업 시작** — 단계별로 진행하며 보고

---

## 어떤 사이트를 만들 수 있나요?

7가지 사이트 유형 모두 지원:

| 유형 | 추가 자동 생성 에이전트 |
|---|---|
| 정보 제공 (API 기반) | api-agent, rebuild-agent |
| 미디어·블로그 | author-agent, rss-agent |
| 랜딩·포트폴리오 | (공통 4개만) |
| 전자상거래 | product-agent, payment-agent |
| SaaS·대시보드 | auth-agent, dashboard-agent |
| 문서·위키 | docs-agent, search-agent |
| 리드 생성 | form-agent, conversion-agent |

공통으로 4개 에이전트는 항상 생성: **content / seo / perf / deploy**.

---

## 무엇이 보장되나요?

- ✅ **PageSpeed Insights 모바일·데스크톱 100점** (또는 합의된 95점)
- ✅ **통합 Core Web Vitals 2026 임계값** — LCP ≤ 2.5s / **INP ≤ 150ms** / CLS ≤ 0.1
- ✅ **2026 SEO 표준** — 구조화된 데이터 9종, llms.txt, AI 크롤러 robots
- ✅ **GEO 청킹 표준** — AI 답변 엔진 인용 가능성 ↑
- ✅ **E-E-A-T** — 저자 페이지, 편집 정책, sameAs
- ✅ **WCAG 2.2 AA 접근성** — axe 위반 0건
- ✅ **보안 헤더 A+** — securityheaders.com / Mozilla Observatory
- ✅ **무료 운영** — 도메인 비용 외 0원 (CF Pages + GHA 무료 티어)

---

## 폴더 구조 상세

```
agents-kit/
├── AGENTS.md                          ← 진입점, 인터뷰 절차, 라우팅
├── docs/
│   ├── 01-stack.md                    Astro/CF Pages/GHA 고정 스택
│   ├── 02-information-architecture.md URL·사이트맵·내비
│   ├── 03-design-system.md            토큰·반응형·Atomic Design
│   ├── 04-pagespeed-100.md            ★ PageSpeed 100점 핵심 ★
│   ├── 05-rendering.md                SSG/ISR/SSR
│   ├── 06-javascript.md               번들 100KB·Islands·Partytown
│   ├── 07-fonts.md                    Pretendard·서브셋·CLS 0
│   ├── 08-images.md                   astro:assets·AVIF·LCP
│   ├── 09-caching.md                  CF 엣지·Brotli·Early Hints
│   ├── 10-structured-data.md          Schema.org JSON-LD 9종
│   ├── 11-metadata-seo.md             robots/sitemap/llms.txt
│   ├── 12-geo-ai-citation.md          ★ GEO 청킹·E-E-A-T ★
│   ├── 13-accessibility.md            WCAG 2.2 AA
│   ├── 14-security.md                 HSTS·CSP·OWASP
│   ├── 15-analytics-consent.md        GA4·Consent Mode v2
│   ├── 16-i18n.md                     다국어 (해당 시)
│   ├── 17-performance-budget.md       PR 자동 검증 임계값
│   ├── 18-testing.md                  Vitest·Playwright·axe·SEO 회귀
│   ├── 19-deployment.md               ★ CF Pages + GHA 워크플로 ★
│   ├── 20-external-api.md             빌드 타임 호출·Zod·공공데이터포털
│   ├── 21-content-ops.md              콘텐츠 12단계 절차
│   └── 22-go-live-checklist.md        ★ 출시 전 최종 게이트 ★
└── templates/
    ├── PROJECT.md.template            인터뷰 답변 박제용
    ├── lighthouserc.json              Lighthouse CI 임계값
    ├── claude-agents/                 사이트 유형별 자동 생성 (Claude Code 표준)
    │   ├── content-agent.md
    │   ├── seo-agent.md
    │   ├── perf-agent.md
    │   ├── deploy-agent.md
    │   ├── api-agent.md
    │   ├── author-agent.md
    │   └── product-agent.md
    ├── github-actions/
    │   ├── ci.yml                     lint·test·e2e·security
    │   ├── lighthouse-ci.yml          PR마다 PSI 검증
    │   └── scheduled-rebuild.yml      cron으로 CF Deploy Hook
    └── cloudflare/
        ├── _headers                   보안 헤더 + 캐싱
        ├── _redirects                 URL 리다이렉트
        └── robots.txt                 AI 크롤러 명시적 허용
```

---

## 기획을 바꾸고 싶으면?

PROJECT.md의 핵심 결정사항(사이트 유형, 키워드, API 등)을 변경하려면 **0단계 인터뷰부터 다시** 진행합니다. 부분 수정은 지원하지 않습니다.

에이전트에게 "재인터뷰" 또는 "기획 다시"라고 말하면:
1. 기존 PROJECT.md, .claude/agents/ 자동 백업
2. 인터뷰 처음부터 재진행
3. 새 PROJECT.md → 승인 → 새 에이전트 일괄 생성

---

## 비용

**도메인 비용($10~15/년)만 듭니다.** 나머지 인프라는 모두 무료 티어.

| 항목 | 비용 |
|---|---|
| Cloudflare Pages | 무료 (월 빌드 500회, 트래픽 무제한) |
| GitHub Actions | 무료 (Public 저장소 무제한, Private 월 2000분) |
| Cloudflare Web Analytics | 무료 |
| GA4 | 무료 |
| 도메인 | $10~15/년 |
| Sentry | 무료 (월 5K 에러까지) |

---

## 자주 묻는 질문

### Q. Next.js나 Nuxt 안 써도 돼요?
A. 본 표준은 **Astro 5+ 고정**입니다. SSG 우선 + Islands 아키텍처 + AI 크롤러 친화 + JS 번들 최소화에 가장 적합합니다. 동적 앱(SaaS 대시보드 등)도 Astro hybrid 모드로 충분합니다.

### Q. PageSpeed 100점은 정말 가능해요?
A. 본 표준을 **순서대로 모두 지키면** 가능합니다. 다음이 핵심입니다:
- Astro SSG + CF 엣지 → TTFB 200ms 이하
- Islands 아키텍처 → 초기 JS 100KB 이하
- 폰트 셀프 호스팅 + size-adjust → CLS 0
- AVIF + fetchpriority + preload → LCP 2초 이하
- Partytown으로 GA4 격리 → INP 100ms 이하

### Q. 한국어 사이트만 가능해요?
A. 다국어도 지원합니다. PROJECT.md에서 "다국어 = 예"로 답하시면 `docs/16-i18n.md`가 적용됩니다. 한국어가 기본 폰트(Pretendard) 권장입니다.

### Q. AGENTS.md 한 파일만 복사하면 안 돼요?
A. 그러면 에이전트가 docs/ 내용을 모르게 됩니다. **폴더 통째로 복사**가 필수입니다. 대신 에이전트는 작업 종류에 따라 docs/ 중 필요한 것만 읽으므로 컨텍스트 부담은 적습니다.

---

## 라이선스

자유 사용. 본인 프로젝트에 맞게 수정·재배포 가능.

---

**버전**: 2026.04
**다음 검토**: 다음 구글 코어 업데이트 발표 후 7일 이내
