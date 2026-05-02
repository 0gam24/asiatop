# 자동 발행 파이프라인 운영 가이드

> 머니룩(asiatop.co.kr) 자동 Q&A 검증 사이트 운영 절차.
> 키 발급·테스트·라이브 토글·모니터링·롤백 순서.

---

## 0. 한눈에

```
[KST 06:00 cron]                          ← .github/workflows/auto-publish.yml
  ↓
[질문 수집] naver-kin-collector.mjs       ← MOCK_NAVER_KIN=1 일 때 fixture
  ↓
[Pre-LLM 게이트] G0~G3                    ← 토큰 비용 0
  ↓
[brief 골격] auto-brief-generator.mjs     ← _pool/_pending/<hash>.yaml
  ↓
[LLM 4-pass] article-pipeline.mjs         ← V2 통합 작업 진행 중
  ↓
[Post-LLM 게이트] G4~G8                   ← 100% 매칭만 통과
  ↓
[PR 자동 생성·머지] auto-publish.yml      ← 라벨 auto-publish
  ↓
[CF Pages 자동 빌드 + IndexNow 푸시]      ← 기존 indexnow.yml
```

폐기는 `briefs/_pool/_rejected/<date>/<hash>.yaml` 에 기록.
24h 동안 같은 질문 재진입 차단.

---

## 1. 키 발급 체크리스트 (사용자 작업)

| 키 | 발급처 | 비용 | 한도 | 보관 |
|---|---|:---:|:---:|---|
| `NAVER_CLIENT_ID` + `NAVER_CLIENT_SECRET` | developers.naver.com | 무료 | 일 25,000건 | GitHub Secrets |
| `DATA_GO_KR_KEY` | data.go.kr | 무료 | 일 1,000~10,000 | GitHub Secrets + CF Pages Env (Encrypted) |
| `BOK_API_KEY` (ECOS) | ecos.bok.or.kr/api | 무료 | 일 10,000 | 동상 |
| `LAW_GO_KR_OC` | law.go.kr/DRF | 무료 | 30 req/s | 동상 |
| `WORK24_KEY` | work24.go.kr 개발자센터 | 무료 | 일 1,000 | 동상 |
| `NPS_KEY` | nps.or.kr OpenAPI | 무료 | 일 1,000 | 동상 |
| `FSS_KEY` (finlife) | finlife.fss.or.kr | 무료 | 일 1,000 | 동상 |
| `INDEXNOW_KEY` | (자체 생성 32자 hex) | — | — | GitHub Secrets only |

**LLM API 키** (별도):
- `DEEPSEEK_API_KEY` (Pass 1·2 — 초안·정규화)
- `ANTHROPIC_API_KEY` (Pass 3 — 자연화 Haiku)

---

## 2. 키 발급 즉시 등록 절차

### 2-1. CF Pages Environment Variables (브라우저)

```
dash.cloudflare.com → Pages → moneylook → Settings → Variables and Secrets
  Production 탭 → 각 키 추가
  Type: Encrypted (모든 비밀 키)
```

### 2-2. GitHub Secrets

```
github.com/0gam24/moneylook → Settings → Secrets and variables → Actions
  New repository secret
```

### 2-3. 로컬 개발 (선택)

```bash
cp .env.example .env.local
# .env.local 편집 — 로컬 dev 서버에서 실 API 호출 시
pnpm dev
```

---

## 3. mock → real 전환 토글

### 3-1. CI/PR 단계

**유지**: `MOCK_AUTHORITY=1`, `MOCK_NAVER_KIN=1`
이유: PR마다 외부 API 호출하면 쿼터 소진 + 결정론성 깨짐

### 3-2. Production cron (auto-publish.yml)

`vars.MOCK_AUTHORITY=0` 으로 토글:

```
github.com/0gam24/moneylook → Settings → Secrets and variables → Actions
  Variables 탭 → MOCK_AUTHORITY = 0
  (이미 등록돼있으면 Update)
```

또는 workflow_dispatch input으로 1회 테스트:
```
Actions → Auto Publish → Run workflow
  mock_authority: 0
  dry_run: true   ← 첫 실행은 dry-run으로 안전 검증
```

### 3-3. 로컬에서 실 API 테스트

```bash
MOCK_AUTHORITY=0 NAVER_CLIENT_ID=... NAVER_CLIENT_SECRET=... \
  node scripts/auto-publish.mjs --question "테스트 질문" --dry-run
```

---

## 4. 일상 모니터링

### 4-1. 폐기율 (매일)

```bash
ls briefs/_pool/_rejected/$(date +%F)/ | wc -l
```

기대: 60~80% 폐기 (정상). 폐기율 < 30% = 게이트가 너무 관대 또는 questions 풀이 양질.

### 4-2. 발행 누적

```bash
git log --since=1.day --grep '^auto: ' --oneline | wc -l
# auto-publish.yml의 하루 5편 상한 확인
```

### 4-3. CI 통과율 (PR 단위)

```
github.com/0gam24/moneylook/pulls?q=label:auto-publish
```

`auto-rejected` 라벨 PR 비율 < 10% 권장.

### 4-4. AI-likeness 추이

자동 발행 글의 frontmatter `ai_likeness` 평균:

```bash
grep -h "^ai_likeness:" src/content/articles/*.mdx \
  | awk '{ s += $2; c++ } END { print s/c }'
```

목표: 3.0 이하 유지. 5.0 근접 시 G8 임계 단계 (7 → 6 → 5) 빠른 적용 검토.

---

## 5. 사고 대응

### 5-1. AdSense 위반 의심 글이 발행됨

```bash
# 1. 즉시 noindex + 라이브에서 제거
git revert <commit-sha>
git push origin main

# 2. CF Pages 즉시 재빌드 (또는 6h cron 대기)
curl -X POST $CF_DEPLOY_HOOK   # GitHub Secrets

# 3. 폐기 사유 분석
cat briefs/_pool/_rejected/<date>/<hash>.yaml
# G5 게이트 보강 필요한 키워드 발견 시 scripts/gates/g5-adsense-policy.mjs 업데이트
```

### 5-2. 환각 수치 발행됨 (G4 통과 후 발견)

```bash
# 1. fact-verifier 룰 검토 — 어떤 패턴이 통과시켰나
# 2. brief.primary_sources[*].expected_facts 가 너무 추상적이면 정형 토큰 추가
# 3. 동일 cluster 다른 글 재검증
node scripts/auto-publish.mjs --brief briefs/...yaml --mdx src/content/articles/...mdx --dry-run
```

### 5-3. cron 폭주 (예산 초과)

```yaml
# .github/workflows/auto-publish.yml
on:
  schedule:
    # 임시 비활성화: 줄을 주석 처리
    # - cron: '0 21 * * *'
  workflow_dispatch: {}   # 수동 실행만 허용
```

---

## 6. 단계별 활성화 권장 순서

### 6-1. Day 1 (키 발급 직후)

1. 모든 키 GitHub Secrets·CF Pages Env 등록
2. `vars.MOCK_AUTHORITY=1` 유지 (real API 미호출)
3. workflow_dispatch로 dry-run 1회 실행 → 게이트 trace 정상 출력 확인
4. 폐기율·G2 cluster 정확도 모니터링

### 6-2. Day 2~3 (real API 첫 진입)

1. `vars.MOCK_AUTHORITY=0` 토글
2. workflow_dispatch + `dry_run: true` 1회 (실 API 호출, PR 생성 X)
3. G3·G4 통과 여부 + 응답 latency 확인
4. 문제 없으면 dry_run=false 전환

### 6-3. Day 4~7 (자동 머지 진입)

1. 자동 cron 활성 (KST 06:00)
2. 하루 발행 상한 5편으로 시작
3. 7일간 모니터링 — 폐기율·AI-likeness·AdSense 위반 0건 확인
4. 안정화되면 G8 임계 7.0 → 6.0 → 5.0 단계 강화

### 6-4. Week 2+

1. cluster-keywords·fixture 확장 (운영 데이터 기반)
2. authorityCoverage 메타 갱신 (실제 답변 가능률 측정)
3. AGENTS.md 갱신 (실 운영 사례 추가)

---

## 7. 핵심 파일 매트릭스

| 영역 | 파일 |
|---|---|
| 게이트 G0~G8 | `scripts/gates/g{0..8}-*.mjs` |
| fact-verifier 핵심 | `scripts/lib/fact-{extract,match,verifier}.mjs` |
| 권위 소스 어댑터 | `scripts/lib/authority-sources/{data-go-kr,bok-ecos,law-go-kr,fss-finlife,work24,nps,welfare-go-kr}.mjs` |
| 자동 brief 생성 | `scripts/lib/auto-brief-generator.mjs` |
| 네이버 수집 | `scripts/lib/naver-kin-collector.mjs` |
| 24h dedup | `scripts/lib/dedup-index.mjs` |
| AI-likeness | `scripts/lib/ai-likeness-scorer.mjs` |
| 통합 러너 | `scripts/auto-publish.mjs` |
| brief 로더 | `scripts/lib/brief-loader.mjs` |
| 워크플로 | `.github/workflows/auto-publish.yml`, `auto-pr-cleanup.yml` |
| frontend | `src/components/{SourceVerificationBadge,AnswerStructure,MissionCallout}.astro` |
| 데이터 | `data/cluster-keywords.json`, `data/political-deny.json`, `briefs/_pool/_dedup-index.json` |
| 미션 | `docs/MISSION-PIVOT.md` (본 문서와 함께) |

---

## 8. 자주 묻는 질문

### Q. fixture가 누락된 query는 어떻게 처리되나?
A. `tests/fixtures/authority-mock/<adapter>/__missing__.json` 의 stub 데이터 반환 → G3 통과는 됨, G4 fact-verifier가 실제 검증 책임. real API 활성 후 자동 해결.

### Q. AdSense 정책 검사가 너무 빡빡하다.
A. `scripts/gates/g5-adsense-policy.mjs` `BANNED_BODY_KEYWORDS` 조정. 단, 임계 완화 시 사고 위험 ↑.

### Q. AI-likeness 임계 조정 시점?
A. 1주일 운영 후 `ai_likeness` 평균이 임계의 60% 이하면 한 단계 강화 (7 → 6 → 5).

### Q. brief 자동 골격이 LLM 호출 전에 검증되는가?
A. validate-brief은 schema 검증. LLM 출력 후 G4가 사실 검증. brief는 LLM에 입력되는 spec.

### Q. dependency 추가 정책?
A. 신규 npm 의존성 0이 default. js-yaml(transitive)·zod(transitive)만 사용. 대부분 node 내장(crypto·fs·path·url·readline) 으로 처리.

---

## 9. 추가 리소스

- [docs/MISSION-PIVOT.md](MISSION-PIVOT.md) — 사이트 미션 정의
- [docs/KEY-WALKTHROUGH.md](KEY-WALKTHROUGH.md) — 키 발급 상세 절차
- [docs/KEY-ISSUANCE-GUIDE.md](KEY-ISSUANCE-GUIDE.md) — 외부 발급처 매트릭스
- [SECURITY.md](../SECURITY.md) — 시크릿 4-layer 하네스
- [PROJECT.md](../PROJECT.md) — 사이트 SSoT
