# MOCK_AUTHORITY=0 활성 runbook

> 자동 발행 파이프라인의 권위 어댑터를 mock 에서 real fetch 로 전환하는 절차.
> 본 문서는 R53 어댑터 V2 작업 (PR #28~#30) 완료 후 갱신.

---

## 0. 현재 상태 (2026-05-12)

| 어댑터 | 상태 | endpoint | 영향 cluster |
|---|---|---|---|
| `law-go-kr` | ✅ V2 (PR #28) | `law.go.kr/DRF/lawSearch.do` | tax · insurance-labor · office-tips · unemployment (36편) |
| `bok-ecos` | ✅ V2 (PR #29) | `ecos.bok.or.kr/api/KeyStatisticList` | savings · credit-loan (18편) |
| `fss-finlife` | ✅ V2 (PR #30) | `finlife.fss.or.kr/finlifeapi/depositProductsSearch.json` | savings · credit-loan · insurance-personal · auto (36편) |
| `data-go-kr` (=youthcenter) | ✅ V2 (PR #30) | `youthcenter.go.kr/go/ythip/getPlcy` | gov-support · public-services · realestate (27편) |
| `nps` | ⏳ V1 (mock only) | (data.go.kr endpoint 확정 필요) | pension (9편) |
| `welfare-go-kr` | ⏳ V1 | (확정 필요) | gov-support 보조 |
| `work24` | ⏳ V1 (정책상 미사용) | (옵션) | unemployment 보조 |

V2 완성 어댑터 4개 → cluster 9/12 (75%) 가 real fetch 가능 상태.

---

## 1. 환경변수 준비 상태 점검

활성 전 다음 4개 키가 모두 채워져 있어야 함 (각 어댑터 미설정 시 mock fallback 으로 안전 동작, 다만 confidence 0.5 라 G3 source-probe 약함):

```bash
# GitHub Secrets · CF Pages env 양쪽 등록 확인
gh secret list | grep -E "LAW_GO_KR_OC|BOK_API_KEY|FSS_KEY|YOUTH_CENTER_API_KEY|NAVER_CLIENT_ID|NAVER_CLIENT_SECRET|DEEPSEEK_API_KEY|ANTHROPIC_API_KEY"
```

기대 출력 (값 미노출): 8개 키 이름.

---

## 2. dry-run (안전 첫 호출)

### 2-1. GitHub Actions 수동 dispatch

```
Actions → Auto Publish → Run workflow → mock_authority: '0'
```

이 워크플로는 default `MOCK_AUTHORITY=1` 강제. dispatch input 으로만 0 전환.
첫 dry-run 은 다음 안전망이 작동:
- G3 source-probe 가 confidence < 0.3 시 글 자동 폐기 → `briefs/_pool/_rejected/`
- 발행 안 되더라도 cron 일 5편 한도 안에서 시도

### 2-2. 로컬 단위 호출 (운영자 환경)

```bash
# law-go-kr 단독 테스트
MOCK_AUTHORITY=0 LAW_GO_KR_OC=smartdatashop node -e '
import("./scripts/lib/authority-sources/law-go-kr.mjs").then(m =>
  m.fetchFacts({ keywords: ["소득세법"], expected_facts: [] }, { mock: false })
).then(r => console.log(JSON.stringify(r, null, 2)));
'
```

기대 응답:
```json
{
  "source_id": "law-go-kr",
  "source_url": "https://www.law.go.kr",
  "raw": { "keyword": "소득세법", "count": 5 },
  "facts": [ { "key": "소득세법", "value": "...시행일...", "type": "law-metadata", ... } ],
  "confidence": 1.0
}
```

각 어댑터 동일 패턴으로 호출 가능. 응답 confidence ≥ 0.5 면 OK.

---

## 3. real fetch 결과 검증 체크리스트

dry-run 1편 통과 후 다음 5개 확인:

- [ ] G3 source-probe: 모든 어댑터 confidence ≥ 0.3
- [ ] G4 fact-verifier: 본문 토큰 ↔ raw 매칭률 100% (미달 시 자동 폐기)
- [ ] G5 adsense-policy: 추천성·강요성 표현 0건
- [ ] G6 disclosure-attach: 본문 끝 면책 자동 부착 확인
- [ ] G8 ai-likeness: score < `AI_LIKENESS_THRESHOLD` (default 7.0)

5개 모두 PASS 시 PR 자동 생성 → CI green → auto-merge → CF Pages 자동 배포.

---

## 4. 실패 시 롤백

```
Actions → Auto Publish → Run workflow → mock_authority: '1'  (원복)
```

코드 변경 없이 dispatch 한 번으로 즉시 mock 복귀. 이미 생성된 PR 은 `auto-pr-cleanup.yml` 이 30분 내 미통과 시 자동 close.

---

## 5. NPS / welfare / work24 V2 추가 작업

- **NPS**: 운영자가 data.go.kr 에서 활용신청한 데이터셋 (예: 국민연금공단_수급현황) endpoint URL 확정 후 `scripts/lib/authority-sources/nps.mjs` 의 real fetch 추가. 패턴은 `data-go-kr.mjs` 또는 `bok-ecos.mjs` 참조.
- **welfare-go-kr**: 복지로 API 활용신청 후 동일 패턴 적용 (gov-support cluster 보조).
- **work24**: V2 옵션. unemployment cluster 의 실업급여·구직급여 핵심 데이터는 이미 `law-go-kr` 으로 80% 커버 → 우선순위 낮음.

---

## 6. cron 활성 후 일상 모니터링

위 §4 의 [`docs/AUTO-PUBLISH-GUIDE.md`](AUTO-PUBLISH-GUIDE.md) §4 일상 모니터링 절차 그대로 적용.

추가 추적 (R53 신규):
- `pnpm audit:frontmatter` — 자동검증 메타 도입률 추이 (sources_verified·fact_verification_at)
- `pnpm audit:bundle` — 광고 SDK · React island 추가 시 회귀 차단
