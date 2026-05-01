# docs/01 — 고정 기술 스택

본 프로젝트의 기술 스택은 **고정**이다. 사용자가 명시적으로 변경을 요청하지 않는 한 절대 바꾸지 않는다.

---

## 1. 핵심 스택

### Astro 5+ (프레임워크)

- **선정 이유**:
  - 기본 출력이 정적 HTML — AI 크롤러 가시성 최상
  - Islands 아키텍처 — 인터랙션 필요한 부분만 부분 hydration → INP 최적
  - 컨텐츠 콜렉션, MDX 지원 — 블로그·문서 사이트에 강함
  - Cloudflare Pages와의 통합 우수 (`@astrojs/cloudflare` 어댑터)

- **버전**: Astro 5.0.0 이상
- **렌더링 모드**: 기본 `output: 'static'` (SSG). 사용자 대시보드 등 동적 영역만 `output: 'hybrid'`로 전환

### Cloudflare Pages (호스팅)

- **선정 이유**:
  - 글로벌 엣지 캐싱 (300+ 도시)
  - Brotli 압축, HTTP/3 기본 활성화
  - 무료 티어로 충분 (월 빌드 500회, 무제한 트래픽)
  - GitHub 연동 자동 배포
  - Deploy Hook으로 외부 트리거 빌드 가능

- **빌드 환경**: Node.js 20 LTS 이상
- **빌드 명령**: `pnpm build`
- **출력 디렉토리**: `dist/`

### GitHub Actions (자동화)

- **역할**:
  - 정기 재빌드 cron (사용자 정의 주기)
  - Lighthouse CI (PR 단위)
  - 자동 테스트 (lint, type-check, unit, e2e)
  - 보안 스캔 (pnpm audit)

- **Public 저장소면 무제한, Private 저장소도 월 2000분 무료**

---

## 2. 보조 스택

### TypeScript (strict mode)

```json
// tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### pnpm (패키지 매니저)

- npm/yarn 대비 빠르고 디스크 효율적
- workspace 지원으로 모노레포 확장 용이
- `.npmrc` 설정:
  ```
  shamefully-hoist=false
  strict-peer-dependencies=true
  ```

### Tailwind CSS 4

- **선정 이유**: 유틸리티 우선, 런타임 비용 0, 미사용 클래스 자동 제거
- **금지**: 런타임 CSS-in-JS (styled-components, emotion 등) — INP 악화 원인
- **대안 허용**: vanilla-extract, CSS Modules, plain CSS

### Biome 또는 (ESLint flat config + Prettier)

- 권장: **Biome 단일화** — 빠르고 설정 간단
- 대안: `eslint.config.js` (flat config) + Prettier
- 커밋 전 자동 실행: lint-staged + husky

### Vitest (단위 테스트)

- Astro 환경과 호환 우수
- 커버리지 도구 내장 (`@vitest/coverage-v8`)

### Playwright (E2E)

- 핵심 사용자 플로우 검증
- Chromium / WebKit / Firefox 모두 지원
- 시각 회귀 테스트 가능 (`page.screenshot` + 비교)

### axe-core (접근성)

- `@axe-core/playwright`로 E2E와 통합
- CI에서 위반 0건 강제

### Lighthouse CI

- PR마다 자동 실행, 임계값 미달 시 머지 차단
- 설정 파일: `lighthouserc.json`

---

## 3. 절대 사용 금지

| 패턴 | 사유 | 대안 |
|---|---|---|
| Next.js / Nuxt / SvelteKit 단독 | 본 프로젝트는 Astro 고정 | Astro에 React/Vue/Svelte 컴포넌트 사용 |
| CSR 단독 SPA | AI 크롤러가 콘텐츠 추출 못 함 | Astro SSG/SSR |
| 런타임 CSS-in-JS | INP 악화 | Tailwind CSS 4 |
| jQuery 신규 도입 | 번들 부담, 현대 패턴 충돌 | 바닐라 JS 또는 Alpine.js |
| Google Fonts CDN 직참조 | 개인정보 이슈, FOUT/FOIT | 셀프 호스팅 (`docs/07` 참조) |
| `localStorage`에 민감 정보 | XSS 시 노출 | HttpOnly 쿠키 |
| API 키 클라이언트 노출 | 키 탈취 | 빌드 타임 호출 또는 Cloudflare Functions |
| `dangerouslySetInnerHTML` 무검증 | XSS | DOMPurify 거치기 |

---

## 4. 의존성 관리

### 추가 시 사용자 승인 필수

새 라이브러리를 도입할 때는 다음을 검토하고 사용자에게 보고한 뒤 승인을 받는다:

- 번들 크기 영향 (`bundlephobia.com` 확인)
- 메인테너 활성도 (최근 6개월 내 커밋 여부)
- 라이선스 호환성 (MIT, Apache-2.0, BSD 권장)
- 보안 이력 (snyk.io / GitHub Advisories)

### 자동 업데이트

- Renovate 또는 Dependabot 설정
- `auto-merge`는 patch 버전만 허용
- minor/major는 사람이 검토

### 미사용 검출

```bash
pnpm dlx knip          # 미사용 파일/익스포트
pnpm dlx depcheck      # 미사용 의존성
```

분기별 1회 실행, 미사용은 제거.

---

## 5. 디렉토리 구조 표준

```
project-root/
├── AGENTS.md
├── PROJECT.md                  # 0-인터뷰 결과
├── docs/                       # 본 문서들
├── templates/                  # 에이전트·CI·CF 템플릿
├── .claude/agents/             # PROJECT.md 승인 후 생성
├── .github/workflows/          # GHA 워크플로
│   ├── deploy-hook-cron.yml
│   ├── lighthouse-ci.yml
│   └── ci.yml
├── public/                     # 정적 자산 (favicon, robots.txt 등)
│   ├── robots.txt
│   ├── llms.txt
│   ├── _headers                # Cloudflare Pages 헤더
│   └── _redirects              # Cloudflare Pages 리다이렉트
├── src/
│   ├── pages/                  # Astro 라우팅
│   ├── components/             # UI 컴포넌트 (Atom~Organism)
│   ├── layouts/                # 페이지 레이아웃
│   ├── content/                # Astro Content Collections
│   ├── styles/                 # 글로벌 스타일, 토큰
│   ├── lib/                    # 유틸리티, API 래퍼
│   └── assets/                 # 빌드 시 처리되는 이미지/폰트
├── tests/
│   ├── unit/
│   └── e2e/
├── astro.config.mjs
├── tsconfig.json
├── biome.json (또는 .eslintrc + .prettierrc)
├── lighthouserc.json
├── package.json
└── pnpm-lock.yaml
```

---

## 6. 초기 설정 명령어

```bash
# 1) Astro 프로젝트 생성
pnpm create astro@latest .

# 2) Cloudflare 어댑터 설치
pnpm astro add cloudflare

# 3) Tailwind CSS 4 추가
pnpm astro add tailwind

# 4) TypeScript strict 적용 (대화식 선택)
pnpm astro add typescript

# 5) MDX (콘텐츠 사이트인 경우)
pnpm astro add mdx

# 6) Sitemap 자동 생성
pnpm astro add sitemap

# 7) 보조 도구
pnpm add -D @biomejs/biome vitest @playwright/test @axe-core/playwright @lhci/cli
pnpm dlx playwright install --with-deps
```

---

## 7. 검증 체크리스트

- [ ] `astro.config.mjs`에 `output: 'static'` 또는 `'hybrid'` 명시
- [ ] `@astrojs/cloudflare` 어댑터 설치 (hybrid·SSR인 경우)
- [ ] `tsconfig.json`이 `astro/tsconfigs/strict` 확장
- [ ] `package.json` engines 필드에 Node.js 20+ 명시
- [ ] `pnpm build` 성공
- [ ] `pnpm dev` 정상 동작
- [ ] `.gitignore`에 `dist/`, `.env*`, `node_modules` 포함
- [ ] `.env.example` 파일에 필요한 환경변수 키 목록 (값 없음)

---

**다음 작업**: `docs/02-information-architecture.md` 참조하여 URL·사이트맵 설계.
