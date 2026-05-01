# docs/22 — 출시 전 최종 체크리스트 (Go-Live)

본 체크리스트의 **모든 항목이 ✅이 되기 전에는 프로덕션에 배포하지 않는다.** 사용자에게 명시적 승인 요청 후에만 출시.

---

## 1. 기술 (Performance·인프라)

### 1-1. 렌더링 검증

- [ ] 모든 페이지가 `dist/`에 정적 HTML로 생성됨 (또는 SSR 정상 동작)
- [ ] curl로 `GPTBot/1.0` User-Agent 시뮬레이션 시 핵심 콘텐츠가 HTML에 포함
- [ ] curl로 `ClaudeBot/1.0` User-Agent도 동일 검증
- [ ] JavaScript 비활성 시에도 핵심 콘텐츠 접근 가능

```bash
curl -A "GPTBot/1.0" https://example.com/blog/article | grep "<h1"
curl -A "ClaudeBot/1.0" https://example.com/ | grep "<main"
```

### 1-2. PageSpeed 100점

- [ ] **PageSpeed Insights 모바일 100점 또는 합의된 최저 95점**
- [ ] **PageSpeed Insights 데스크톱 100점 또는 합의된 최저 95점**
- [ ] LCP ≤ 2.5s (모바일·데스크톱)
- [ ] **INP ≤ 150ms** (2026 강화 임계값)
- [ ] CLS ≤ 0.1
- [ ] TTFB ≤ 600ms (CF 엣지로 보통 200ms 이하)
- [ ] FCP ≤ 1.8s

검증:
- https://pagespeed.web.dev/ 직접 측정
- 핵심 페이지 5개 이상 (홈, 카테고리, 글, About, Contact)

### 1-3. Lighthouse 카테고리

- [ ] Performance 95+ (목표 100)
- [ ] Accessibility 95+ (목표 100)
- [ ] Best Practices 95+ (목표 100)
- [ ] SEO **100** (필수)

### 1-4. 성능 예산

- [ ] 초기 JS 번들 ≤ 100KB (gzip)
- [ ] 초기 CSS ≤ 30KB
- [ ] 초기 HTML ≤ 50KB
- [ ] LCP 이미지 ≤ 200KB
- [ ] 페이지 above-the-fold 전체 ≤ 1MB

### 1-5. 보안

- [ ] HTTPS 전체 강제 (HTTP → 308)
- [ ] HSTS 헤더 + preload (검토)
- [ ] 모든 보안 헤더 적용 (CSP, X-Content-Type-Options 등)
- [ ] **securityheaders.com A+ 등급**
- [ ] **Mozilla Observatory A+ 등급**
- [ ] 비밀(secrets) 클라이언트 노출 0건
- [ ] `pnpm audit --audit-level=moderate` 통과

### 1-6. 자동 테스트

- [ ] CI 워크플로 (lint, type-check, unit, e2e) 전체 통과
- [ ] axe-core 위반 0건
- [ ] SEO 회귀 테스트 통과
- [ ] AI 크롤러 시뮬레이션 통과
- [ ] 깨진 링크 0건 (`linkinator`)

---

## 2. SEO·GEO

### 2-1. 사이트 전체 파일

- [ ] `/robots.txt` 게시
  - AI 크롤러 정책 명시 (GPTBot, ClaudeBot, PerplexityBot 등)
  - Sitemap URL 명시
- [ ] `/sitemap.xml` 또는 `/sitemap-index.xml` 자동 생성, 모든 인덱싱 대상 포함
- [ ] noindex 페이지는 sitemap에 미포함
- [ ] **`/llms.txt`** 게시 (AI 크롤러용 사이트 요약)
- [ ] `/llms-full.txt` 게시 (선택)
- [ ] `/.well-known/security.txt` 게시 (선택)

### 2-2. 페이지별 메타

- [ ] 모든 페이지 고유 `<title>` (50~60자)
- [ ] 모든 페이지 고유 `<meta name="description">` (140~160자)
- [ ] 모든 페이지 `<link rel="canonical">`
- [ ] 모든 페이지 OG 태그 (title, description, image, url, type)
- [ ] 모든 페이지 Twitter Card
- [ ] 모든 OG 이미지 1200×630, 절대 URL
- [ ] `<html lang="ko">` (또는 적절한 언어)
- [ ] viewport 메타
- [ ] favicon 세트 (ico, svg, apple-touch-icon)
- [ ] 페이지당 `<h1>` 정확히 1개
- [ ] 헤딩 계층 건너뛰지 않음

### 2-3. 구조화된 데이터

- [ ] 홈에 `Organization` + `WebSite` 스키마
- [ ] 모든 하위 페이지에 `BreadcrumbList`
- [ ] 페이지 유형별 스키마 (Article/Product/FAQ/HowTo/Event 등)
- [ ] 저자 페이지에 `Person` 스키마
- [ ] **Schema Markup Validator** 모든 페이지 통과
- [ ] **Google Rich Results Test** 모든 페이지 통과

### 2-4. GEO

- [ ] 핵심 페이지 ≥ 20개에 청킹 표준 적용 (`docs/12` §2)
- [ ] 모든 글에 저자 정보 + Person 스키마
- [ ] 저자 페이지 게시
- [ ] 편집 정책 페이지 게시
- [ ] 연락처 페이지 게시 (NAP)
- [ ] 외부 권위 사이트 인용 링크 포함
- [ ] sameAs 외부 프로필 5개 이상
- [ ] 위키데이터 항목 검토
- [ ] AI 답변 엔진 인용 모니터링 시작 (20개 쿼리)

### 2-5. 다국어 (해당 시)

- [ ] 모든 페이지 상호 hreflang + x-default
- [ ] sitemap에 hreflang 표기
- [ ] 자기참조 hreflang 정상
- [ ] 양방향 hreflang 정상

### 2-6. 인덱싱 준비

- [ ] Search Console 등록 + 사이트맵 제출
- [ ] Bing Webmaster Tools 등록
- [ ] noindex 페이지 의도된 것만
- [ ] 중복 콘텐츠 0건 (canonical 또는 301)

---

## 3. 접근성

- [ ] 모든 인터랙티브 `<button>` / `<a>` 사용
- [ ] 모든 폼 컨트롤 `<label>` 연결
- [ ] 모든 이미지 `alt` (장식은 빈 alt)
- [ ] Skip link 존재
- [ ] `:focus-visible` 명확
- [ ] 컬러 대비 본문 4.5:1, UI 3:1
- [ ] 색상 단독 정보 전달 0건
- [ ] axe 위반 0건
- [ ] **NVDA 또는 VoiceOver 수동 테스트** 통과
- [ ] 키보드만 사용 전체 플로우 통과
- [ ] 200% 확대 시 정상
- [ ] WCAG 2.2 신규 항목 (focus not obscured, target size 등)

---

## 4. 운영

### 4-1. 배포

- [ ] GitHub 저장소 main 브랜치 보호 활성화
- [ ] CF Pages 자동 빌드 정상 동작
- [ ] 환경변수 등록 완료 (Production)
- [ ] 커스텀 도메인 연결, 인증서 발급
- [ ] PR 미리보기 noindex 처리
- [ ] CF Deploy Hook 정기 재빌드 cron 동작

### 4-2. 모니터링

- [ ] GA4 + Search Console 데이터 흐름 확인
- [ ] Cloudflare Web Analytics 데이터 수집
- [ ] web-vitals RUM 데이터 수집
- [ ] Sentry 또는 동급 에러 추적 동작
- [ ] Uptime 모니터링 (UptimeRobot 등) 설정
- [ ] 알림 임계값 설정 + 슬랙·이메일 도착 확인

### 4-3. 동의·법적

- [ ] CMP 동작 확인 (지역별)
- [ ] 동의 전 비필수 쿠키 0건 (DevTools 검증)
- [ ] Google Consent Mode v2 동작
- [ ] 개인정보처리방침 페이지 게시
- [ ] 이용약관 페이지 게시
- [ ] 쿠키 정책 페이지 게시
- [ ] 사업자 정보 푸터 명시

### 4-4. 백업·롤백

- [ ] 백업 절차 문서화
- [ ] 롤백 절차 검증 (실제 이전 배포로 복귀 테스트)
- [ ] DB 백업 (해당 시) 일일 실행
- [ ] 환경변수 별도 안전한 곳에 백업

### 4-5. 운영 문서

- [ ] README.md 작성 (개발 환경 셋업)
- [ ] 콘텐츠 작성 가이드 (`docs/21` 기반)
- [ ] 응급 대응 매뉴얼 (장애 시 연락 체인, 롤백 절차)
- [ ] 운영자 권한 분리 (Cloudflare, GitHub 등)

---

## 5. 콘텐츠

- [ ] 핵심 페이지 ≥ 20개 작성 완료
- [ ] 토픽 클러스터 허브 페이지 모두 작성
- [ ] 회사 소개 페이지 (E-E-A-T)
- [ ] 저자 페이지 (해당 시)
- [ ] 편집 정책 페이지
- [ ] 연락처 페이지 (NAP)
- [ ] FAQ (해당 시)
- [ ] 모든 콘텐츠 청킹 표준 준수
- [ ] 모든 콘텐츠 사실 출처 명시
- [ ] 표절 검사 통과
- [ ] AI 단독 생성 무편집 발행 0건

---

## 6. 마이그레이션 (해당 시)

- [ ] 기존 URL 인벤토리 추출 완료
- [ ] 트래픽 상위 페이지 우선 보존 확인
- [ ] 301 리다이렉트 매핑 1:1 작성
- [ ] 리다이렉트 체인·루프 0건
- [ ] 기존 메타데이터·스키마 보존 또는 개선
- [ ] Search Console 주소 변경 도구 사용 (도메인 변경 시)
- [ ] 4주간 일일 트래픽·순위 모니터링 계획

---

## 7. 출시 직후 (Day 0~7)

출시 후 다음을 즉시·일일 모니터링:

### 7-1. Day 0 (출시 당일)

- [ ] PageSpeed Insights 재측정
- [ ] 핵심 사용자 플로우 수동 테스트
- [ ] Sentry 에러 모니터링
- [ ] securityheaders.com A+ 재확인
- [ ] AI 크롤러 시뮬레이션 (curl)
- [ ] Search Console 사이트맵 제출 + 인덱싱 요청

### 7-2. Day 1~7

- [ ] 일일 트래픽 모니터링 (GA4)
- [ ] 일일 에러율 모니터링 (Sentry)
- [ ] 일일 CWV 모니터링 (Search Console + RUM)
- [ ] 인덱싱 진행 상황 (Search Console Coverage)
- [ ] 깨진 링크 0건 유지
- [ ] 사용자 피드백 수집

### 7-3. 4주 후

- [ ] 검색 노출·CTR 분석
- [ ] AI 답변 엔진 인용 첫 점검
- [ ] CWV 실측 (CrUX) 안정화 확인
- [ ] 마이그레이션인 경우 — 비정상 변동 검토

---

## 8. 자주 빠뜨리는 항목 Top 10 (재확인)

1. INP 150ms 임계값(2026 강화) 측정조차 안 함
2. AI 크롤러용 SSR 검증 안 해서 JS 실행 전 HTML에 핵심 콘텐츠 없음
3. 폰트 fallback 메트릭 매칭(size-adjust) 누락 → 미세 CLS
4. 이미지 width·height 누락
5. canonical 자기참조 누락
6. trailing slash 정책 불일치 → 동일 콘텐츠 중복
7. **llms.txt 미게시** → AI 답변 엔진 가시성 저하
8. 저자 페이지·편집 정책 페이지 없음 → E-E-A-T 약화
9. 깨진 hreflang (자기참조 또는 x-default 누락)
10. 동의 전에 GA4가 로드 → GDPR/한국 개보법 위반

---

## 9. 최종 게이트

위 모든 항목이 ✅이 된 후 다음 보고:

```
🚀 Go-Live 체크리스트 통과
  ✅ 기술: 100/100 (PageSpeed 모바일 100, 데스크톱 100)
  ✅ SEO·GEO: 모든 항목 통과
  ✅ 접근성: axe 위반 0
  ✅ 운영: 모니터링·백업 동작
  ✅ 콘텐츠: 핵심 페이지 N개 작성
  ✅ 법적: 정책 페이지 + 동의 배너 동작
🔍 사용자 명시적 승인 후 main 브랜치 머지 → CF Pages 프로덕션 배포

승인하시겠습니까?
```

---

**3턴 종료**

다음 턴(4턴, 마지막)에서 모든 templates/ 파일 작성 예정:
- `templates/claude-agents/` 7종 (content, seo, perf, deploy, api, author, product)
- `templates/github-actions/` 2종 (deploy-hook-cron, lighthouse-ci)
- `templates/cloudflare/_headers`
