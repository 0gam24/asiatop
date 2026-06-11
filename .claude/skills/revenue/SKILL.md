---
name: revenue
description: AdSense·GSC 수익/트래픽 현황을 API 로 수집해 해석한다. 사용자가 "광고 상태 확인", "수익 점검", "/revenue" 라고 하면 발동. 브라우저·대시보드 조작 없이 scripts/audit/revenue-pull.mjs 실행 결과를 읽고 의사결정 요약을 제시한다.
---

# /revenue — 수익 현황 점검

## 절차

1. `node scripts/audit/revenue-pull.mjs` 실행.
   - `.revenue-auth.json` 부재 에러가 나면: 스크립트 헤더의 1회 셋업 가이드(GCP OAuth, ~10분)를
     사용자에게 안내하고 중단. **OAuth 동의는 사용자만 할 수 있다 — 대신 진행 금지.**
2. 출력 해석 순서 (docs/23-adsense-revenue-ops.md §8-4 고정):
   1. **정책 이슈** — 1건 이상이면 다른 모든 분석 중단, 발행 정지 권고가 최우선.
   2. **광고 단위별 (오늘/어제)** — `moneylook-in-article`·`moneylook-display` 노출 확인.
      노출 0이 48시간 지속되면 슬롯 디버깅 제안 (dist grep·curl — 자동화 브라우저로
      프로덕션 광고 페이지 열기 금지).
   3. **최근 7일 추이** — 수익·PV·노출 방향성. 전주 대비 델타 한 줄.
   4. **도메인별** — asiatop vs calculatorhost 기여 분리.
   5. **GSC** — 클릭 추이 + 상위 쿼리 변화 (신규 진입 쿼리는 리프레시·시즌 글 후보).
3. 마지막에 **"델타 요약 1줄 + 다음 액션 1~3개"** 로 끝낸다. 장황한 표 재출력 금지 —
   원데이터는 docs/revenue-log/ JSON 에 이미 저장돼 있다.

## 임계 룰 (docs/23 §8-4·§10-2)

- 정책 이슈 ≥ 1 → 전 발행 중단 권고
- moneylook-* 유닛 노출 정상 + 며칠 안정 → Auto ads OFF 시점 제안 (대시보드 수동 — API 불가)
- 무효 트래픽 공제율 10% 초과 의심 → 유입 채널 점검 제안
- CTR 은 관찰만 — 개선 시도 제안 금지 (정책 가드)

## 한계

- AdSense API 는 **읽기 전용** — Auto ads ON/OFF, 카테고리 차단 등 설정 변경은
  대시보드에서만 가능 (사용자 안내 또는 Chrome MCP 단발 사용).
