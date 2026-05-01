# AGENTS.md — 바이브 코딩 웹사이트 제작 표준 지시서

**스택 고정 / PageSpeed 100점 목표 / 2026 SEO·GEO 표준 준수**

---

## 0. 본 문서의 위상

이 파일은 AI 코딩 에이전트(Claude Code, Cursor, Windsurf, Cline, Aider 등)가 신규 웹사이트를 제작하고 운영할 때 따라야 하는 **단일 표준 작업 지시서**다. 본 문서는 진입점이자 지도 역할만 하고, 실제 표준 내용은 `docs/` 폴더의 주제별 문서에 분산되어 있다. 에이전트는 작업 종류에 따라 필요한 문서만 정확히 읽어 컨텍스트 부담을 최소화한다.

본 문서는 2026년 3월 구글 코어/스팸 업데이트, 통합 Core Web Vitals 점수, 생성형 엔진 최적화(GEO), AI 답변 엔진 인용 표준을 모두 반영한다.

**고정 결정사항 — 변경 금지:**

| 항목 | 결정 |
|---|---|
| 프레임워크 | Astro 5+ (SSG 우선, 필요 시 ISR) |
| 호스팅 | Cloudflare Pages |
| 자동화 | GitHub Actions (정기 재빌드 cron) |
| 언어 시스템 | TypeScript strict mode |
| 패키지 매니저 | pnpm |
| CSS | Tailwind CSS 4 |
| PageSpeed Insights 목표 | **모바일·데스크톱 모두 100점** |
| 통합 CWV | LCP ≤ 2.5s / INP ≤ 150ms / CLS ≤ 0.1 |

위 항목은 사용자가 명시적으로 변경을 요청하지 않는 한 절대 바꾸지 않는다.

---

## 1. 작업 개시 절차 (3단계)

```
[1단계] 0-인터뷰 (사용자에게 질문)
   ↓
[2단계] PROJECT.md 생성 + 사용자 승인
   ↓
[3단계] .claude/agents/* 자동 생성 → 본격 작업 시작
```

### 1-1. 1단계 — 0-인터뷰

에이전트는 **코드를 한 줄도 작성하기 전에** 사용자에게 카테고리별 인터뷰를 진행한다. 한 번에 모든 질문을 던지지 말고, **카테고리별로 나누어 대화식으로** 진행한다. 누락된 답변을 추측해서는 안 된다.

#### 카테고리 A — 비즈니스 컨텍스트

1. 사이트의 1차 목표는 무엇입니까?
   - (a) 정보 제공 / (b) 리드 생성 / (c) 전자상거래 / (d) SaaS / (e) 미디어·블로그 / (f) 포트폴리오·랜딩 / (g) 문서·위키
2. 핵심 KPI는? (트래픽, 전환율, AI 인용 점유율, 가입수, 매출 등)
3. 타겟 시장은? (국가, 언어, 모바일/데스크톱 비율 추정)
4. 1차/2차 사용자 페르소나는?
5. 경쟁사/벤치마크 URL 3~5개를 알려주세요.
6. 브랜드 톤앤매너, 컬러 시스템, 로고 자산 보유 여부?

#### 카테고리 B — 콘텐츠·SEO·GEO 전략

1. 핵심 키워드 클러스터 5~15개와 각 클러스터의 시드 키워드는?
2. 토픽 권한(Topical Authority) 맵 — 메인 토픽 → 서브 토픽 → 롱테일 의도 트리?
3. AI 답변 엔진 우선순위 — ChatGPT / Google AI Overviews / Perplexity / Gemini 중 어디?
4. AI 인용 시나리오 — 어떤 질문을 받았을 때 본 사이트가 인용되어야 하는가? 최소 20개를 함께 정리.
5. 검색 의도 비중 — Informational / Navigational / Commercial / Transactional?

#### 카테고리 C — 데이터 소스

1. 외부 API를 사용합니까? (예: 공공데이터포털, 자체 백엔드, CMS)
   - 사용한다면: 엔드포인트, 인증 방식, Rate Limit, 데이터 갱신 주기를 명시해주세요.
2. CMS 필요 여부? (Sanity / Contentful / Strapi / Payload / MDX 파일 기반 중 선호)
3. 동적 콘텐츠가 사용자별로 달라야 합니까? (로그인, 대시보드 등)

#### 카테고리 D — 기술·운영

1. 도메인은 확보되었습니까? (도메인명, Cloudflare 계정 권한)
2. 기존 사이트가 있어 마이그레이션이 필요합니까? (있다면 기존 URL 인벤토리·백링크 보존 정책)
3. 다국어 지원이 필요합니까? (필요하다면 언어 코드와 URL 전략 — /en/ 권장)
4. 정기 재빌드 주기 — 4시간 / 6시간 / 12시간 / 24시간 중?
5. 운영 인력 기술 수준 — 비개발자도 콘텐츠를 추가할 수 있어야 하는가?

#### 카테고리 E — 법적 요건

1. 적용 법령 범위 — GDPR / CCPA / 한국 개인정보보호법?
2. 쿠키 동의 배너 필요 여부 (GA4 등 비필수 쿠키 사용 시 필수)
3. 사업자 정보(상호, 대표자, 주소, 사업자번호, 연락처) 노출 가능 여부?

> **중요**: 어느 한 카테고리라도 답변이 누락되면 다음 단계로 진행하지 않는다. "추후 결정"으로 넘기지 말고 즉시 질문한다.

### 1-2. 2단계 — PROJECT.md 생성 + 사용자 승인

인터뷰가 끝나면 `templates/PROJECT.md.template`를 기반으로 프로젝트 루트에 `PROJECT.md`를 생성한다. 이 파일은 **이 프로젝트의 단일 진실 공급원(SSoT)**이다. 모든 후속 작업은 이 문서를 기준으로 한다.

생성 후 사용자에게 다음 형식으로 보고:

```
✅ PROJECT.md 생성 완료
📋 박제된 결정사항 N개:
  - 사이트 유형: ...
  - 핵심 키워드 클러스터: ...
  - 외부 API: ...
  - 정기 재빌드 주기: ...
  - 다국어: ...
🔍 사용자 확인 필요: 위 내용이 모두 정확합니까? (예/아니오)
```

사용자가 "예" 또는 명시적 승인을 줄 때까지 3단계로 진행하지 않는다.

### 1-3. 3단계 — 프로젝트 에이전트 자동 생성

PROJECT.md 승인 후, 사이트 유형에 맞는 보조 에이전트를 `.claude/agents/` 폴더에 생성한다. 템플릿은 `templates/claude-agents/`에 있다.

#### 사이트 유형별 에이전트 매트릭스

| 사이트 유형 | 공통 (필수) | 추가 에이전트 |
|---|---|---|
| 정보 제공 (API 기반) | content, seo, perf, deploy | api, rebuild |
| 미디어·블로그 | content, seo, perf, deploy | author, rss |
| 랜딩·포트폴리오 | content, seo, perf, deploy | (없음) |
| 전자상거래 | content, seo, perf, deploy | product, payment |
| SaaS·대시보드 | content, seo, perf, deploy | auth, dashboard |
| 문서·위키 | content, seo, perf, deploy | docs, search |
| 리드 생성 | content, seo, perf, deploy | form, conversion |

공통 4개(content, seo, perf, deploy)는 모든 프로젝트에 반드시 생성한다. 사이트 유형에 맞는 추가 에이전트를 위 매트릭스에 따라 추가 생성한다.

각 에이전트 파일은 PROJECT.md의 결정사항을 frontmatter나 본문 상단에 주입하여, 해당 프로젝트에 특화된 형태로 만든다. 예:

```markdown
---
name: api-agent
description: 외부 API 통합 시 호출되는 에이전트
project_context:
  api_endpoint: <PROJECT.md에서 박제된 값>
  auth_method: <PROJECT.md에서 박제된 값>
  rebuild_frequency: <PROJECT.md에서 박제된 값>
---
```

생성 완료 후 사용자에게 보고:

```
✅ .claude/agents/ 생성 완료
   - content-agent.md
   - seo-agent.md
   - perf-agent.md
   - deploy-agent.md
   - api-agent.md (사이트 유형: 정보 제공)
   - rebuild-agent.md
🚀 본격 작업을 시작합니다.
```

---

## 2. 기획 변경 정책 — 재인터뷰 방식

PROJECT.md의 핵심 결정사항(사이트 유형, 키워드 클러스터, API, 다국어 등)을 변경하려면 **0-인터뷰를 처음부터 다시 진행**한다. 부분 수정은 지원하지 않는다. 사용자가 "재인터뷰" 또는 "기획 다시" 등의 의도를 표현하면:

1. 기존 PROJECT.md를 `PROJECT.md.backup-YYYYMMDD-HHMM`로 백업
2. 기존 `.claude/agents/`를 `.claude/agents.backup-YYYYMMDD-HHMM/`로 백업
3. 1단계 인터뷰 처음부터 재진행
4. 새 PROJECT.md 생성 → 승인 → 새 .claude/agents/ 생성
5. 변경된 결정사항 요약 보고

---

## 3. 작업별 docs/ 라우팅 표

에이전트는 작업 종류에 따라 **필요한 docs/ 문서만** 정확히 읽는다. 전체를 한꺼번에 읽지 않는다.

| 작업 종류 | 필독 문서 |
|---|---|
| 프로젝트 초기 설정·프레임워크 결정 | `docs/01-stack.md` |
| URL 구조·사이트맵·내비게이션 설계 | `docs/02-information-architecture.md` |
| 디자인 토큰·반응형·컴포넌트 라이브러리 | `docs/03-design-system.md` |
| PageSpeed 100점 달성·CWV 최적화 | `docs/04-pagespeed-100.md` |
| 페이지별 렌더링 전략 결정 (SSG/ISR/SSR) | `docs/05-rendering.md` |
| 자바스크립트 번들·Islands 아키텍처 | `docs/06-javascript.md` |
| 폰트 선정·로딩·서브셋팅 | `docs/07-fonts.md` |
| 이미지 최적화·hero 처리 | `docs/08-images.md` |
| 캐싱·CDN·HTTP 헤더 | `docs/09-caching.md` |
| 구조화된 데이터 (Schema.org / JSON-LD) | `docs/10-structured-data.md` |
| 메타데이터·robots.txt·sitemap.xml·llms.txt | `docs/11-metadata-seo.md` |
| GEO 청킹·인용성·E-E-A-T | `docs/12-geo-ai-citation.md` |
| 접근성 (WCAG 2.2 AA) | `docs/13-accessibility.md` |
| 보안 (HTTPS·CSP·보안헤더·인증) | `docs/14-security.md` |
| 분석·동의 관리·RUM | `docs/15-analytics-consent.md` |
| 다국어 (i18n) | `docs/16-i18n.md` |
| 성능 예산 PR 검증 | `docs/17-performance-budget.md` |
| 자동화 테스트·Lighthouse CI | `docs/18-testing.md` |
| 배포 (CF Pages + GitHub Actions) | `docs/19-deployment.md` + `templates/github-actions/`, `templates/cloudflare/` |
| 외부 API 통합 패턴 | `docs/20-external-api.md` + `templates/claude-agents/api-agent.md` |
| 콘텐츠 운영·발행 플로우 | `docs/21-content-ops.md` |
| 출시 전 최종 점검 | `docs/22-go-live-checklist.md` |

**페이지 1개 만들 때의 일반적 경로:**
`docs/03` (디자인) → `docs/05` (렌더링) → `docs/06` (JS) → `docs/08` (이미지) → `docs/10`+`docs/11`+`docs/12` (SEO·GEO) → `docs/13` (접근성) → `docs/04` (PageSpeed 검증)

---

## 4. 에이전트 작업 진행 규칙 (메타)

### 4-1. 진행 절차

1. 본 문서의 1단계부터 순서대로 진행한다. 0-인터뷰가 끝나기 전에는 어떠한 코드 작업도 시작하지 않는다.
2. 각 단계 종료 시 해당 docs의 체크리스트를 자체 점검하고, 미충족 항목을 사용자에게 보고한다.
3. 단계 간 의존성이 있는 경우 — 예: PageSpeed 100점은 렌더링·JS·폰트·이미지·캐싱 결과의 종합 — 마지막에 통합 검증한다.
4. 코드 변경마다 lint, type-check, 테스트, 빌드를 순서대로 실행하여 모두 통과한 뒤에만 다음 작업으로 이동한다.
5. 외부 라이브러리 추가는 사용자 승인을 거친다 (번들 크기와 보안 영향 고려).

### 4-2. 표준 보고 형식

모든 작업 단위 완료 후 다음 형식으로 보고:

```
✅ 완료한 작업: ...
⚠️ 부분 완료: ...
❌ 차단된 항목 + 차단 사유: ...
🔍 사용자 확인 필요 사항: ...
📊 측정 지표 (LCP/INP/CLS/번들 크기/Lighthouse 점수): ...
🔗 변경 파일 경로 목록: ...
📚 참조한 docs: ...
```

### 4-3. 추측·환각 금지

- 알 수 없는 비즈니스 사실은 추측하지 않고 질문한다.
- 라이브러리 API는 최신 공식 문서를 확인 후 사용한다 (필요 시 검색·MCP 도구 활용).
- 실제로 실행·검증하지 않은 결과를 "성공"으로 보고하지 않는다.
- 임시 해결책(workaround)을 사용한 경우 명시적으로 표기하고 후속 작업 항목으로 등록한다.

### 4-4. 변경 이력

- 모든 변경은 의미 있는 커밋 메시지(Conventional Commits)로 분리한다.
- `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`, `test:` 등.
- PROJECT.md 자체의 수정은 재인터뷰를 통해서만 가능하다.
- AGENTS.md 자체의 수정도 PR 대상이다.

---

## 5. 절대 사용 금지 패턴

다음은 본 표준에서 **금지**된다. 사용자가 명시적으로 요구해도 보안·성능·SEO 문제를 설명하고 대안을 제시한다.

- ❌ 클라이언트에서만 렌더링되는 SPA (단, 인증 후 대시보드 영역은 예외)
- ❌ 런타임 CSS-in-JS 라이브러리 (styled-components, emotion 등 — INP 악화)
- ❌ jQuery 신규 도입
- ❌ 자체 폰트 호스팅 없이 외부 폰트 CDN 직참조 (FOUT/FOIT, 개인정보 이슈)
- ❌ API 키를 클라이언트 코드나 환경변수 prefix `PUBLIC_`/`VITE_`/`NEXT_PUBLIC_`로 노출
- ❌ AI 단독 생성 콘텐츠 무편집 발행 (2026 스팸 업데이트 표적)
- ❌ 동의 전에 GA4·광고 픽셀 로드 (GDPR/한국 개보법 위반)
- ❌ `<div onClick>` (버튼은 `<button>`)
- ❌ 이미지에 width/height 누락 (CLS 발생)
- ❌ 페이지당 `<h1>` 2개 이상

---

## 6. 출시 전 최종 게이트

`docs/22-go-live-checklist.md`의 모든 항목이 ✅이 되기 전에는 프로덕션에 배포하지 않는다. 게이트 통과 항목 요약:

- 모든 페이지 SSR/SSG 렌더 결과에 핵심 콘텐츠 포함 (curl 검증)
- 통합 CWV 모바일·데스크톱 모두 임계값 통과
- **PageSpeed Insights 모바일·데스크톱 모두 100점 또는 사용자 합의된 최저 기준 (95점 이상)**
- Lighthouse 4개 카테고리 모두 90+
- 보안 헤더 적용 (securityheaders.com A+)
- robots.txt / sitemap.xml / llms.txt 게시
- 구조화된 데이터 검증 통과
- AI 크롤러 User-Agent 시뮬레이션 통과
- 자동 테스트 전체 통과
- axe 접근성 위반 0건
- 깨진 링크 0건

---

## 7. 부록 — 자주 빠뜨리는 항목 Top 10

1. INP 150ms 임계값(2026 강화)을 측정조차 하지 않음
2. AI 크롤러용 SSR 검증을 안 해서 JS 실행 전 HTML에 핵심 콘텐츠 없음
3. 폰트 fallback 메트릭 매칭(size-adjust)을 안 해서 미세 CLS 발생
4. 이미지 width·height 누락
5. canonical 자기참조 누락
6. trailing slash 정책 불일치로 동일 콘텐츠 중복
7. llms.txt 미게시 → AI 답변 엔진 가시성 저하
8. 저자 페이지·편집 정책 페이지 없음 → E-E-A-T 약화
9. 깨진 hreflang (자기참조 또는 x-default 누락)
10. 동의 전에 GA4가 로드되어 GDPR/개보법 위반

---

**문서 버전**: 2026.04
**다음 검토 예정**: 다음 구글 코어 업데이트 발표 후 7일 이내
**소유**: 본 프로젝트 SEO·GEO·성능 책임자
