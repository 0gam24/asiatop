# 머니룩 미션 피벗 — 자동 Q&A 검증 사이트

> 결정일: 2026-05-01
> 상태: 합의 완료. PROJECT.md 본문은 SSoT라 변경하지 않고, 본 문서가 운영 모드 변경 사항을 명시.

---

## 0. 한 줄

머니룩(asiatop.co.kr)의 **유일한 미션**은 "지식인의 진짜 질문 → 공신력 있는 데이터로 검증된 답변 자동 발행"이다.

기존 콘텐츠(108편 + 12 cluster)는 보존하되, 신규 발행은 **모두** 본 파이프라인으로 생성한다.

---

## 1. 차별화 (사이트의 유일한 힘)

```
지식인 질문    → "사용자가 무엇을 묻는지" 만 추출 (페인 신호)
권위 데이터    → "사실은 무엇인지" 의 유일한 출처
LLM            → "사실을 어떻게 표현하는지" 만 담당
편집팀 1인칭   → AI 티 제거 + E-E-A-T
자동 머지      → 사람 게이트 X, 다단계 자동 게이트로 안전 확보
```

LLM이 권위 소스에 없는 수치를 본문에 넣으면 발행 차단. 부분 답변이라도 정확한 게 낫고,
"이 부분은 출처 부재로 답변 불가"라고 명시.

---

## 2. 8단계 자동 게이트

| Gate | 위치 | 목적 |
|---|---|---|
| G0 | `scripts/lib/dedup-index.mjs` | 24h 동일 질문 재진입 차단 |
| G1 | `scripts/gates/g1-question-sanitize.mjs` | PII·욕설·정치·약물 검출 |
| G2 | `scripts/gates/g2-cluster-map.mjs` | 12 cluster 매핑 (모호 시 폐기) |
| G3 | `scripts/gates/g3-source-probe.mjs` | 권위 소스 가용성 (MOCK_AUTHORITY=1 분기) |
| G4 | `scripts/lib/fact-verifier.mjs` | 본문 사실 토큰 ↔ 권위 1:1 매칭 (100% 미만 폐기) |
| G5 | `scripts/gates/g5-adsense-policy.mjs` | AdSense 정책 자동 검사 |
| G6 | `scripts/gates/g6-disclosure-attach.mjs` | YMYL 면책·AI 보조 공시 자동 부착 |
| G7 | `scripts/gates/g7-plagiarism.mjs` | 지식인 원문 인용 검출 (저작권/ToS) |
| G8 | `scripts/gates/g8-ai-likeness.mjs` | AI-likeness score (단계: 7 → 6 → 5) |

폐기 정책: 재시도 X, 다음 cron이 새 질문 픽업. 폐기 사유는 `briefs/_pool/_rejected/<date>/<hash>.yaml` 에 audit.

---

## 3. 자동 머지 흐름

```
[KST 06:00 cron]
  ↓
auto-publish.yml: G0~G3 → brief 자동 생성 → article-pipeline (LLM 4-pass) → G4~G8
  ↓
모두 통과만 PR 자동 생성 (label: auto-publish)
  ↓
CI green (build + test + lighthouse-ci) → gh pr merge --auto --squash
  ↓
main push → CF Pages 자동 빌드 → IndexNow 즉시 푸시 (indexnow.yml)
```

안전 제어:
- PR 동시 상한 N=3 (auto-publish.yml/guardrails)
- 하루 발행 상한 5편 (cron skip)
- CI 실패 PR 30분 timeout → auto-pr-cleanup.yml 이 자동 close + label `auto-rejected`

---

## 4. 사용자 작업

| 항목 | 시점 | 비고 |
|---|---|---|
| 외부 API 키 발급 | 내일 (2026-05-02 예정) | data.go.kr·ECOS·법제처·고용24·NPS·FSS finlife·welfare 등 7~9개 |
| GitHub Secrets 등록 | 키 발급 직후 | DATA_GO_KR_KEY·BOK_API_KEY·LAW_GO_KR_OC·WORK24_KEY·NPS_KEY·FSS_KEY 등 |
| `MOCK_AUTHORITY=0` 토글 | 키 등록 후 | CF Pages Env + auto-publish.yml input |

키 발급 전까지 모든 게이트는 **mock 모드**로 결정론적 검증 가능.

---

## 5. 기존 자산 처리

- **108편 기존 글**: 보존. `sources_verified` 등 신규 frontmatter 필드는 optional이라 무영향.
- **12 cluster**: 그대로 유지. 자동 발행이 같은 cluster 안에서 글 추가.
- **brief 시스템 (Gap 1)**: niche 8차원 확장 후 그대로 사용.
- **article-pipeline (Gap 2)**: brief 입력 통합 + Post-LLM G4~G8 호출 추가 (V2 작업).

---

## 6. 차이 — PROJECT.md vs 본 문서

| 항목 | PROJECT.md | 본 문서 |
|---|---|---|
| 사이트명·도메인 | 변경 X | 동일 |
| 12 cluster 분류 | 변경 X | 동일 |
| 타겟 페르소나 | 직장인·청년 | 직장인·청년 (지식인 검색자 확장) |
| 콘텐츠 작성 방식 | 인터뷰 기반 brief → 4-pass | 동일 + 자동 picking + G0~G8 |
| 발행 결정권 | 사람 머지 | **자동 머지** ← 변경 |
| KPI | 트래픽·AdSense RPM·AI 인용 | 동일 |
