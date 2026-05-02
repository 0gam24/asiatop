# scripts/gates/ — 자동 발행 안전 게이트

지식인 질문 → 공신력 데이터 검증 답변 자동 발행을 위한 8단계 게이트.
재시도 X · 폐기 우선 · MOCK_MODE 분기 · 하루 5편 상한.

```
[질문 큐 _pool/_pending] → [G0 dedup] → [G1] → [G2] → [G3] ── Pre-LLM
                                                          ↓
                          [LLM 4-pass: 초안 → 정규화 → 자연화 → 부착]
                                                          ↓
                          [G4] → [G5] → [G6] → [G7] → [G8] ── Post-LLM
                                                          ↓
                                  [PR 자동 생성 → CI green → auto-merge]
```

## Gate 매트릭스

| Gate | 위치 | 단계 | 차단 사유 | 비용 |
|---|---|---|---|---|
| G0 | `lib/dedup-index.mjs` | Pre | 24h 내 동일 hash 진입 | 0 |
| G1 | `gates/g1-question-sanitize.mjs` | Pre | PII·욕설·정치·약물·도박·성인·비한국어·길이 위반 | 0 |
| G2 | `gates/g2-cluster-map.mjs` | Pre | 12 cluster 매핑 실패 (score < 임계 또는 모호) | 0 |
| G3 | `gates/g3-source-probe.mjs` | Pre | 권위 소스 응답 0건 (mock 또는 real) | 0 |
| G4 | `gates/g4-fact-verify.mjs` | Post | 본문 사실 토큰 매칭률 < 100% (환각·인용 누락) | $$ |
| G5 | `gates/g5-adsense-policy.mjs` | Post | ad_policy 위반·금기 키워드·affiliate 도메인 | 0 |
| G6 | `gates/g6-disclosure-attach.mjs` | Post | YMYL 면책·AI 공시 부착 후 검증 | 0 |
| G7 | `gates/g7-plagiarism.mjs` | Post | 지식인 원문이 본문에 8단어+ 연속 등장 (저작권/ToS) | 0 |
| G8 | `gates/g8-ai-likeness.mjs` | Post | AI-likeness score >= 임계값 (단계적: 7→6→5) | 0 |

## 폐기 정책

모든 게이트의 fail = 즉시 폐기.
- `_dedup-index.json` 에 `status: 'rejected'`, `reason: '<gate-id>:<rule>'` 기록
- `_rejected/<YYYY-MM-DD>/<hash>.yaml` 에 audit trail (gate·reason·details)
- 24시간 동안 재진입 차단 (다음 cron이 새 질문 픽업)
- 재시도 X (토큰·CI 예산 누수 방지)

## MOCK_MODE 분기

| 환경 | MOCK_AUTHORITY | LLM 호출 | 비고 |
|---|---|---|---|
| 로컬 dev | 1 (default) | mock | 키 없이 구동 |
| CI (PR) | 1 (강제) | mock | 결정론적 테스트 |
| Cron prod | 0 | real | 실 API + LLM |

## 안전 제어

- **PR 동시 상한 N=3**: 라벨 `auto-publish` 오픈 PR ≥ 3 → cron skip
- **하루 발행 상한 5편**: 1d 내 `auto:` 커밋 카운트 ≥ 5 → cron skip
- **CI 실패 PR 자동 close**: 30분 timeout, 라벨 `auto-rejected`로 마킹

자세한 spec은 Plan agent #1 산출물(branch `feature/auto-publish-pivot`).
