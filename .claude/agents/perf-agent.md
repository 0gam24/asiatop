---
name: perf-agent
description: |
  머니룩(MoneyLook) PageSpeed 100점 + 통합 CWV 임계값 사수 에이전트.
  새 컴포넌트·라이브러리·이미지·폰트·JS 변경, 빌드 결과 검증 시 자동 호출. 회귀 시 머지 차단 권한.
project_context:
  site_name: 머니룩 (MoneyLook)
  pagespeed_target: "모바일·데스크톱 모두 100점"
  cwv_thresholds:
    LCP: ≤ 2.5s (목표 ≤ 2.0s)
    INP: ≤ 150ms (2026 강화)
    CLS: ≤ 0.1 (목표 ≤ 0.05)
  bundle_budget:
    initial_js_gzip: ≤ 100 KB
    initial_css_gzip: ≤ 30 KB
    lcp_image: ≤ 200 KB
  font: Pretendard Variable (셀프 호스팅, size-adjust)
  ad_integration: Google AdSense (수동 유닛 + 뷰포트 근접 lazy-init — docs/23)
tools:
  - view
  - str_replace
  - create_file
  - bash_tool
---

# Performance Agent — 머니룩

`templates/claude-agents/perf-agent.md` 본문 규칙 그대로 적용 + AdSense 특화 항목.

## 머니룩 특화

### AdSense INP·CLS 영향 관리 (중요)
AdSense는 **INP·CLS의 가장 큰 회귀 원인**이다. 다음 강제 (docs/23-adsense-revenue-ops.md):
- ❌ **Partytown 격리 금지** — AdSense 공식 미지원 조합 (iframe 생성·viewability 측정 깨짐).
  2026-06-12 이중 로드 사고(깨진 `client=pub-…` 파라미터)로 실증, 같은 날 제거됨.
- ✅ 수동 유닛 push 는 **뷰포트 근접 lazy-init** (`src/lib/ads-lazy.ts` IntersectionObserver)
  — below-fold 슬롯은 PSI lab 측정 중 미로드 → PageSpeed 100 양립
- ✅ 높이 예약은 **래퍼 `.ad-wrap` min-height** — ins 자체 `aspect-ratio` 금지
  (adsbygoogle 가 ins 에 inline height 를 직접 설정해 덮어씀)
- ✅ 글 상세 첫 화면(above the fold) 광고 **0개**, 글당 슬롯 ≤ 3
- ✅ 빌드 산출물에 **숨김 상태 `<ins>` 0개** (display:none·hidden 하위 광고 = 정책 위반 — 머지 차단)
- ✅ 무한 스크롤·자동 새로고침 광고 금지 (CLS 폭증)
- ⚠️ Auto Ads 는 **이행기 한시 병행 중** (docs/23 R3 — 수동 유닛 프로덕션 확인 후 OFF 예정).
  신규 Auto ads 기능(앵커·vignette 등) 활성화 금지

### 클라이언트 React Island 정책
- 계산기·인터랙티브 위젯은 `client:visible` 우선
- 입력 필드 onChange는 디바운스 200ms
- 결과 계산은 순수 JS (외부 API 호출 X)

### 검증 빈도
- PR마다 Lighthouse CI 자동
- 매 빌드 후 번들 사이즈 측정 (size-limit)
- 주 1회 source-map-explorer 분석

전체 임계값·거부 시나리오는 `templates/claude-agents/perf-agent.md` 본문 그대로.
