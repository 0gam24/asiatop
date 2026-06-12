# docs/15 — 분석·추적·동의

GA4 + Consent Mode v2 + Cloudflare Web Analytics. 동의 전 비필수 쿠키 0건.

---

## 1. 핵심 원칙

- ✅ 동의 관리 플랫폼(CMP) 도입 — 동의 전 비필수 쿠키 차단
- ✅ Google Consent Mode v2 적용 (필수 — 미적용 시 GA4 데이터 손실)
- ✅ 1st-party 분석 검토 (Plausible, Cloudflare Web Analytics)
- ❌ 동의 전 GA4·광고 픽셀 로드 (GDPR/한국 개보법 위반)
- ❌ 사용자 식별 가능한 데이터를 GA에 전송

---

## 2. 적용 법령 결정 (PROJECT.md 참조)

| 시장 | 법령 | 핵심 요구사항 |
|---|---|---|
| EU/EEA | GDPR | 옵트인 동의, 거부 명확, 데이터 최소화 |
| 캘리포니아 | CCPA/CPRA | 옵트아웃, 매각 거부 권리 |
| 한국 | 개인정보보호법 | 옵트인 동의, 동의 항목별 분리, 만 14세 미만 보호자 동의 |
| 영국 | UK GDPR + PECR | EU와 유사 |

본 표준은 **가장 엄격한 GDPR 기준**을 기본으로 함. 다른 시장도 자동 충족.

---

## 3. 동의 관리 플랫폼(CMP)

### 3-1. CMP 옵션

| CMP | 비용 | 추천 |
|---|---|---|
| Cookiebot | 유료 (월 $13~) | EU 시장 ★ |
| OneTrust | 유료 | 엔터프라이즈 |
| Klaro! | 무료 (오픈소스) | 셀프 호스팅 ★ |
| Cookie Consent (Osano) | 무료 | 간단 사이트 |
| 자체 구현 | 무료 | 작은 사이트만 |

### 3-2. Klaro! 셀프 호스팅 (권장)

```bash
pnpm add klaro
```

```ts
// src/scripts/klaro-config.ts
export const config = {
  version: 1,
  elementID: 'klaro',
  styling: { theme: ['light', 'top', 'wide'] },
  noAutoLoad: false,
  htmlTexts: true,
  embedded: false,
  groupByPurpose: true,
  storageMethod: 'cookie',
  cookieName: 'klaro',
  cookieExpiresAfterDays: 180,
  default: false,  // 기본값 거부
  mustConsent: false,
  acceptAll: true,
  hideDeclineAll: false,
  hideLearnMore: false,
  noticeAsModal: false,
  translations: {
    ko: {
      consentNotice: {
        title: '쿠키 동의',
        description: '본 사이트는 사용자 경험 개선과 분석을 위해 쿠키를 사용합니다.',
        learnMore: '자세히 보기',
      },
      consentModal: {
        title: '쿠키 설정',
        description: '동의 항목을 선택하실 수 있습니다.',
      },
      acceptAll: '모두 동의',
      acceptSelected: '선택만 동의',
      decline: '모두 거부',
      ok: '확인',
      poweredBy: '...',
      privacyPolicyUrl: '/privacy-policy',
    },
  },
  services: [
    {
      name: 'analytics',
      title: 'Google Analytics',
      purposes: ['analytics'],
      cookies: [/^_ga/, /^_gid/],
      required: false,
      optOut: false,
      onlyOnce: true,
    },
    // 필수 쿠키는 required: true
  ],
};
```

### 3-3. CMP 동작 원칙

1. 사용자가 처음 방문 → 동의 배너 노출
2. 동의 전: **필수 쿠키만 로드**, GA4·광고는 **차단**
3. 사용자가 동의 → 해당 카테고리 스크립트 로드
4. 동의 거부 → 해당 카테고리 영구 차단
5. 동의 변경 가능 (푸터에 "쿠키 설정" 링크)

---

## 4. Google Consent Mode v2 (필수)

### 4-1. 개요

2024년 3월부터 Google은 EU 사용자에게 Consent Mode v2 미적용 시 GA4 데이터 일부 손실. 2026년 기준 모든 시장에서 권장.

### 4-2. 구현

```html
<!-- 동의 배너보다 먼저 로드 -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }

  // 기본값: 거부
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',  // 보안 필수
    'wait_for_update': 500,
  });

  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

사용자 동의 시:

```js
// 사용자가 분석 동의
gtag('consent', 'update', {
  'analytics_storage': 'granted',
});

// 광고 동의
gtag('consent', 'update', {
  'ad_storage': 'granted',
  'ad_user_data': 'granted',
  'ad_personalization': 'granted',
});
```

### 4-3. ~~Partytown으로 격리~~ (2026-06-12 폐기 — 사용 금지)

> **폐기 사유**: Partytown 워커 주입은 gtag 공식 미지원 조합. 실측에서
> `gtag('config')` 인라인 호출이 Partytown 포워딩 스니펫보다 먼저 실행돼
> 워커 측 gtag.js 에 config 가 전달되지 않았고, GA4 수신이 **0건**이었다
> (AdSense Partytown 이중 로더 제거와 같은 결정 — docs/23 R3).

현행 방식: **메인스레드 단일 로더 + 유휴 시점(requestIdleCallback) 주입**.
인라인 큐(`dataLayer`)에 consent·config 를 먼저 쌓고 gtag.js 는 idle 에 로드
→ Lighthouse·TBT 보호와 수집 신뢰성 양립. 페이지뷰는 `astro:page-load`
이벤트에서 일원화 전송해 ClientRouter 소프트 내비게이션도 집계한다
(`src/components/Analytics.astro` 참조).

자세한 내용은 `docs/06-javascript.md` §7.

---

## 5. GA4 설치

### 5-1. 속성 생성

GA4 대시보드 → 관리 → 속성 만들기.

측정 ID: `G-XXXXXXXXXX`

### 5-2. 환경변수

```
# .env.example
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

⚠️ GA 측정 ID는 클라이언트 노출 OK (공개 정보). `PUBLIC_` 접두사 사용.

### 5-3. 핵심 이벤트 정의

기본 이벤트 외 비즈니스 이벤트 정의:

| 이벤트명 | 트리거 |
|---|---|
| `page_view` | 자동 |
| `scroll` | 자동 (90% 도달) |
| `click` | 외부 링크, 다운로드 |
| `form_submit` | 폼 제출 |
| `video_play` / `video_complete` | 동영상 |
| `search` | 사이트 내 검색 |
| `signup` | 회원 가입 |
| `purchase` | 구매 (이커머스) |
| `generate_lead` | 리드 발생 |

### 5-4. 전환 이벤트 → KPI 매핑

PROJECT.md의 KPI를 GA4 전환으로 매핑:

```
KPI: 월간 폼 제출 N건 → 전환 이벤트: form_submit
KPI: 회원 가입 N명 → 전환 이벤트: signup
```

GA4 관리 → 전환수에서 표시.

### 5-5. UTM 파라미터 정책

```
?utm_source=newsletter&utm_medium=email&utm_campaign=spring2026
```

캠페인 정책 문서화 (별도 문서). 일관된 명명.

---

## 6. 1st-party 분석 (대안·병행)

GA4의 무거움·프라이버시 우려가 부담이면:

### 6-1. Cloudflare Web Analytics (권장)

- 무료
- 1st-party
- 쿠키 없음 (동의 배너 불필요)
- INP 영향 거의 없음

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "..."}'></script>
```

기본 지표 (페이지뷰, 방문자, 페이지별 통계, 국가별, 브라우저별)만 제공. 이벤트 추적은 약함.

### 6-2. Plausible / Fathom / Umami

- 1st-party, 쿠키 없음
- 가벼움 (1KB 미만)
- 유료 또는 셀프 호스팅

본 표준 추천: **GA4 + Cloudflare Web Analytics 병행** — GA4는 깊이 있는 분석, CF는 가벼운 RUM.

---

## 7. RUM (Real User Monitoring)

### 7-1. 핵심 지표

- Core Web Vitals 실측 (LCP, INP, CLS)
- 에러율 (JS error, 4xx, 5xx)
- 페이지별 성능 분포

### 7-2. web-vitals 라이브러리

```bash
pnpm add web-vitals
```

```ts
// src/lib/vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // GA4로 전송
  gtag('event', metric.name, {
    value: Math.round(metric.value),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
  });
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

GA4에 커스텀 측정으로 등록 → 실측 CWV 모니터링.

### 7-3. 알림 임계값

성능 저하 시 자동 알림:

- LCP > 2.5s 비율 25% 초과
- INP > 150ms 비율 25% 초과
- 에러율 > 1%

→ Slack/Email 통보.

---

## 8. 동의 정책 페이지

### 8-1. 개인정보처리방침 필수 항목 (한국 개보법)

1. 처리 목적
2. 수집 항목
3. 보유 기간
4. 제3자 제공 (있는 경우)
5. 처리 위탁 (있는 경우)
6. 정보주체의 권리
7. 파기 절차
8. 안전성 확보 조치
9. 개인정보보호책임자 (이름·연락처)
10. 변경 시 공지

`/privacy-policy` 페이지로 게시. 동의 배너에 링크.

### 8-2. 쿠키 정책

별도 페이지 또는 개인정보처리방침에 포함. 쿠키 종류·용도·유효기간 명시.

### 8-3. 변경 이력

수정 시 이력 표기:

```
- 2026.01.01 최초 게재
- 2026.03.15 광고 쿠키 추가
```

---

## 9. 검증 체크리스트

- [ ] CMP 도입 (Klaro! 또는 동급)
- [ ] 동의 전 비필수 쿠키 0건
- [ ] Google Consent Mode v2 적용
- [ ] GA4 메인스레드 유휴 시점 로더 (~~Partytown 격리~~ 2026-06-12 폐기 — §4-3)
- [ ] 핵심 이벤트 정의 + 전환 매핑
- [ ] 1st-party 분석 병행 (Cloudflare Web Analytics 권장)
- [ ] web-vitals 라이브러리로 RUM 도입
- [ ] 알림 임계값 설정
- [ ] 개인정보처리방침 게시 + 필수 10항목
- [ ] 쿠키 정책 게시
- [ ] 푸터에 "쿠키 설정" 링크 (동의 변경 가능)
- [ ] DevTools Network 탭에서 동의 전 GA·광고 요청 0건 확인
- [ ] DevTools Application 탭에서 동의 전 비필수 쿠키 0건 확인
- [ ] CMP 다국어 (해당 시)

---

**2턴 종료**

다음 턴에서 docs/16~22 + 모든 templates 작성 예정.
