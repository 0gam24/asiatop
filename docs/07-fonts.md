# docs/07 — 폰트 최적화

폰트는 LCP·CLS 양쪽에 영향. 한국어 사이트는 글자 수가 많아 서브셋팅 효과 큼.

---

## 1. 폰트 선정 원칙

### 1-1. 가변 폰트 1~2개로 통일

- ✅ 1개의 가변 폰트(Variable Font)로 weight 100~900 모두 처리
- ❌ Regular.woff2, Bold.woff2, Black.woff2 등 다중 파일 로드 금지

### 1-2. 본 표준 권장 폰트

**한국어 사이트 (기본)**:
- **Pretendard Variable** — 가변, 본문·헤딩 모두 우수, 영문 글리프도 좋음
- 대안: Noto Sans KR (Google) — 단 셀프 호스팅 필수

**영문 위주**:
- Inter Variable
- 시스템 폰트 스택 (`-apple-system, BlinkMacSystemFont, ...`)

### 1-3. 셀프 호스팅 필수

- ❌ Google Fonts CDN 직참조 (`https://fonts.googleapis.com/...`) 금지
  - 사유: 개인정보 (사용자 IP가 Google로 전송), GDPR 이슈, 추가 DNS 룩업
- ✅ `public/fonts/`에 woff2 파일 직접 호스팅
- ✅ Cloudflare CDN으로 자동 글로벌 배포

---

## 2. Pretendard 셀프 호스팅 셋업

### 2-1. 다운로드

GitHub: https://github.com/orioncactus/pretendard/releases

- `Pretendard-Variable.woff2` (전체 가변 — 약 2.4MB)
- 또는 서브셋: `PretendardVariable.subset.woff2` (한국어 + Latin — 약 220KB)

### 2-2. 파일 배치

```
public/
└── fonts/
    └── PretendardVariable.subset.woff2
```

### 2-3. CSS 정의

```css
/* src/styles/fonts.css */
@font-face {
  font-family: 'Pretendard Variable';
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;
  src: url('/fonts/PretendardVariable.subset.woff2') format('woff2-variations');
}
```

### 2-4. preload (LCP 영역에 사용 시)

```astro
<!-- src/layouts/Base.astro <head> -->
<link
  rel="preload"
  href="/fonts/PretendardVariable.subset.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

---

## 3. font-display 정책

| 값 | 동작 | 사용 시점 |
|---|---|---|
| `swap` | fallback 즉시 표시 → 폰트 로드 후 교체 | **기본** (FOUT 허용) |
| `optional` | 짧은 시간 내 로드되지 않으면 fallback 유지 | LCP 영역 (시프트 방지) |
| `fallback` | swap과 optional 사이 | 거의 안 씀 |
| `block` | 짧은 시간 폰트 대기 | 금지 (FOIT 발생) |
| `auto` | 브라우저 기본 (대부분 block) | 금지 |

**규칙**:
- 본문: `font-display: swap`
- LCP 텍스트 영역: `font-display: optional` 검토 (시프트 0)

---

## 4. 한국어 서브셋팅

### 4-1. 왜 필요한가

- 한국어 폰트 전체: 11,172자 (KS X 1001) → 파일 크기 큼
- 페이지에서 실제 사용하는 글자는 일부
- 서브셋팅: 사용 글자만 추출 → 파일 크기 70~90% 감소

### 4-2. Pretendard subset 사용 (가장 쉬움)

Pretendard 공식 subset 파일 사용 — 일반 한국어 사이트에 충분:

- `PretendardVariable.subset.woff2`: 한국어 KS X 1001 + Latin → 약 220KB

### 4-3. 페이지별 동적 서브셋 (고급)

`subset-font` 또는 `glyphhanger`로 빌드 시 사용 글자 추출:

```bash
pnpm dlx glyphhanger https://localhost:4321 \
  --subset='./public/fonts/PretendardVariable.woff2' \
  --formats=woff2 \
  --output='./public/fonts/'
```

빌드 시 한 번 실행, 결과 파일 사용. 정말 글자 수가 적은 랜딩 페이지에서 효과적.

---

## 5. CLS 0 달성 — fallback 메트릭 매칭

### 5-1. 문제

폰트 로드 전: fallback 폰트 (예: 굴림)로 렌더 → 폰트 로드 후 교체. 두 폰트의 metrics(높이, 너비)가 다르면 텍스트 위치 시프트 → CLS 발생.

### 5-2. 해결: size-adjust + ascent-override + descent-override

`@font-face` 디스크립터로 fallback 폰트 메트릭을 실제 폰트와 일치시킴.

```css
/* fallback 폰트 정의 */
@font-face {
  font-family: 'Pretendard Fallback';
  src: local('Apple SD Gothic Neo'), local('Malgun Gothic'), local('sans-serif');
  size-adjust: 96.5%;
  ascent-override: 87%;
  descent-override: 22%;
  line-gap-override: 0%;
}

/* 본문 적용 */
body {
  font-family: 'Pretendard Variable', 'Pretendard Fallback', sans-serif;
}
```

**메트릭 값 산출**:
- Tools: https://www.industrialempathy.com/perfect-ish-font-fallback/ 또는 `fontkit`로 직접 계산
- 본 표준은 Pretendard 기준 검증된 값을 위에 명시

### 5-3. Astro 통합

`@astrojs/font` (실험적) 또는 fontaine 플러그인 사용 시 자동 메트릭 매칭 가능.

```bash
pnpm add -D fontaine
```

---

## 6. 영문 폰트 (필요 시)

코드 블록·고유명사용으로 monospace나 별도 영문 폰트 사용 시:

```css
@font-face {
  font-family: 'JetBrains Mono';
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2');
}

code, pre {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Consolas, monospace;
}
```

monospace는 시스템 폰트 스택만으로도 충분 — 추가 로드 자제.

---

## 7. 다국어 사이트

언어별 다른 폰트 사용 시:

```css
:lang(ko) {
  font-family: 'Pretendard Variable', sans-serif;
}

:lang(ja) {
  font-family: 'Noto Sans JP Variable', sans-serif;
}

:lang(en) {
  font-family: 'Inter Variable', sans-serif;
}
```

각 언어 폰트는 해당 페이지에서만 preload. 모든 언어 폰트를 모든 페이지에 preload하지 말 것.

---

## 8. 아이콘 폰트 사용 금지

- ❌ Font Awesome, Material Icons 폰트 버전 등
  - 사유: 큰 파일 크기, 모든 아이콘을 다운로드해야 함, 접근성 문제
- ✅ SVG 아이콘 (인라인 또는 sprite)
  - lucide-react, heroicons, phosphor-icons 등

```astro
---
import { Search } from 'lucide-react';
---
<Search size={20} aria-hidden="true" />
```

---

## 9. 검증 체크리스트

- [ ] 폰트 1개 (Pretendard Variable) 또는 최대 2개
- [ ] 셀프 호스팅 (`public/fonts/`)
- [ ] Google Fonts CDN 직참조 0건
- [ ] LCP 영역 폰트 `<link rel="preload">` 적용
- [ ] `font-display: swap` (기본) 또는 `optional` (LCP)
- [ ] fallback 폰트 size-adjust로 CLS 0 달성
- [ ] 한국어 서브셋 적용 (220KB 이하)
- [ ] 폰트 파일 Cache-Control: public, max-age=31536000, immutable
- [ ] 아이콘 폰트 0개 (SVG로 대체)
- [ ] WebPageTest waterfall에서 폰트 로드 시점 확인

---

**다음 작업**: `docs/08-images.md` — 이미지 최적화 (LCP의 핵심).

---

**1턴 종료**

다음 턴에서 docs/08~15까지 만들 예정.
