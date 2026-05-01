# briefs/_pool/ — 자동 발행 파이프라인 큐

지식인 질문이 G1~G8 게이트를 거치는 동안 머무는 작업 디렉토리.

```
_pool/
├─ _pending/          # G1~G3 통과 후보 (LLM 호출 대기)
├─ _rejected/         # 폐기된 brief (gate·reason 기록, audit)
│   └─ YYYY-MM-DD/
│       └─ <hash>.yaml
├─ _dedup-index.json  # 24h 재진입 차단 hash 맵
└─ README.md
```

## 사이클

1. **수집** — `scripts/naver-kin-collector.mjs`(추후) 또는 fixture가 질문 풀 보충
2. **G1~G3** (Pre-LLM) — 질문 정제·cluster 매핑·권위 소스 가용성. fail = `_rejected/` 이동
3. **brief 자동 골격** — `scripts/auto-brief-from-pool.mjs`가 brief.yaml 생성 (G1~G3 통과 시점)
4. **LLM 4-pass + G4~G8** — `scripts/article-pipeline.mjs` 통합 호출
5. **PR 자동 생성·머지** — CI green 시 `gh pr merge --auto --squash`

## 폐기 정책

- 재시도 X. 폐기된 hash는 24h 내 재진입 차단 (`_dedup-index.json`)
- 폐기 사유 필수 기록 (어느 게이트에서 어떤 룰로 차단됐는지)
- 30일 경과 시 prune (자동 정리)

## audit 파일 형식 (`_rejected/<date>/<hash>.yaml`)

```yaml
_rejected:
  gate: "g4"
  reason: "g4-unverified-claim"
  details:
    unmatched_claims: ["3.2%", "2026년 3월"]
  hash: "<sha256(question)[:16]>"
  rejected_at: "2026-05-01T06:12:33Z"
  cron_run_id: "<gh-run-id>"
# 원본 brief 본문 (참조용)
meta:
  ...
```
