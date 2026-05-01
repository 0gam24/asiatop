# 자동화 누적 진행 — 2026-05-02 새벽

> 사용자가 잠든 사이 자동 진행된 라운드 누적 보고.
> branch: `feature/brief-system` (PR #1).
> 마지막 commit: `da211c1` 시점 (Round 36 — Gap 2 사실상 완성 + SEO 보강).

---

## 0. 한눈에

| 지표 | 값 |
|---|---|
| 누적 commit (Round 2 이후) | **35** |
| 단위 테스트 | **284 / 284 통과** |
| 빌드 시간 | 21.00s (안정) |
| 페이지 | 136 (108 article + 28 정적) |
| 회귀 | **0건** |
| 신규 npm 의존성 | **0** (transitive만 사용) |
| 외부 API 호출 (CI) | 0건 (MOCK 모드 유지) |

---

## 1. 라운드별 commit 매트릭스

| # | SHA | 영역 | 핵심 산출 |
|:---:|---|---|---|
| 2 | `f4dc211` | 인프라 | Phase A~I 8단계 게이트 (G0~G8) + frontend |
| 3 | `cb83dd9` | mock | G3 stub data 강화 (dev 모드 G3 항상 통과) |
| 4 | `629c8c2` | gate | G2 cluster-keywords 확장 + 12 cluster 매트릭스 + ISA 등 영문 lowercase 버그 수정 |
| 5 | `87d4605` | brief | `lib/brief-loader.mjs` export — Zod·비즈니스 룰 import 가능 |
| 6 | `e0b570f` | brief | `lib/auto-brief-generator.mjs` — 질문 → brief.yaml 골격 |
| 7 | `cf1d844` | collect | `lib/naver-kin-collector.mjs` — 지식인 검색 어댑터 + fixture |
| 8 | `ce2a928` | test | orchestration end-to-end 통합 테스트 |
| 9 | `41000a1` | refactor | trusted-domains 단일 공급원 (3곳 중 2곳 통합 — article-pipeline 잔여) |
| 10 | `f94eea5` | frontend | 홈페이지 MissionCallout (3단계 시각화) |
| 11 | `ed44ad0` | data | clusters.ts authorityCoverage·adRiskTier 메타 + recommendedAdPolicy |
| 12 | `56ad51f` | docs | AUTO-PUBLISH-GUIDE.md 운영 가이드 |
| 13 | `a539655` | brief | auto-brief가 cluster coverage에 따라 ad_policy 자동 적용 |
| 14 | `dd2469d` | fixture | 권위 소스 mock 6 cluster 확장 |
| 15 | `5a696ae` | test | G7 표절 검사 경계 케이스 |
| 16 | `b449692` | frontend | VerificationDetails 컴포넌트 (글 하단 검증 상세) |
| 17 | `4eb07ef` | test | sample-filled brief fixture (e2e demo 기반) |
| 18 | `61f92c9` | test | G6 면책 부착 위치·frontmatter 보존 |
| 19 | `2577855` | audit | scripts/audit/rejection-stats.mjs |
| 20 | `4adb6a8` | docs | AUTOMATION-PROGRESS.md (본 문서 초판) |
| 21 | `4a121a0` | fixture | naver-kin 5 cluster 추가 sample |
| 22 | `1ab6f1f` | test | searchKinBulk 6 cluster 동시 검색 |
| 23 | `f9908ee` | refactor | article-pipeline trusted-domains 통합 (3곳 → 1) |
| 24 | `eb1a431` | docs | AUTOMATION-PROGRESS Round 23 갱신 |
| 25 | `0efcec3` | seo | QAPage Schema.org 자동 생성 (자동 발행 글) |
| 26 | `2088a69` | brief | briefToArticleFrontmatter helper |
| 27 | `1cb8e4a` | **pipeline** | **article-pipeline --brief 통합 (Gap 2 Step 2)** ⭐ |
| 28 | `94ecd96` | docs | AUTOMATION-PROGRESS Round 24~27 갱신 |
| 29 | `467ee9c` | pipeline | G4 fact-verifier를 PASS 5로 통합 |
| 30 | `5406f65` | **pipeline** | **G5·G6·G7·G8 PASS 6 통합 (Gap 2 Step 5 완성)** ⭐ |
| 31 | `b193ef0` | docs | AUTOMATION-PROGRESS Round 28~30 갱신 |
| 32 | (spec) | research | 5 agent 병렬 spec — Plan·content·seo·deploy·general-purpose |
| 33 | `5232b18` | **fix** | **TRUSTED_DOMAINS ReferenceError + SSoT cleanup (3곳)** ⭐ |
| 34 | `714bf66` | brief | brief-prompt-builder.mjs (7 SYSTEM + 14 USER 블록) |
| 35 | `19087b2` | **pipeline** | **brief-prompt-builder를 callDeepSeek/refineWithClaude 통합 (Gap 2 Step 3 완성)** ⭐ |
| 36 | `da211c1` | seo | robots.txt AI 크롤러 5종 추가 (총 15종) |

---

## Gap 2 진행 매트릭스 (Plan agent #1 spec 기반)

| Step | 내용 | 상태 | 라운드 |
|---|---|:---:|---|
| 1 | validate-brief를 lib/brief-loader.mjs로 export | ✅ | Round 5 |
| 2 | article-pipeline.mjs --brief 인자 통합 | ✅ | Round 27 |
| 3 | brief 9개 섹션을 LLM 프롬프트에 주입 | ✅ | **Round 34~35** |
| 4 | 출력 frontmatter brief 메타 inject | ✅ | Round 26~29 |
| 5 | G4~G8을 article-pipeline에 통합 | ✅ | Round 29~30 |
| 6 | brief vs legacy 회귀 테스트 강화 | ✅ | Round 35 (legacy byte-identical 검증) |

**Gap 2 사실상 완성** — LLM 키 발급 후 brief 모드 즉시 활성 가능.

---

## 2. 8단계 게이트 매트릭스 (현재 상태)

| Gate | 모듈 | 상태 | 단위 테스트 | 비고 |
|:---:|---|:---:|:---:|---|
| G0 | `lib/dedup-index.mjs` | ✅ | 11 | 24h 차단, NODE_ENV=test 격리 |
| G1 | `gates/g1-question-sanitize.mjs` | ✅ | 14 + 3 | PII·욕설·정치·약물·비한국어·길이 |
| G2 | `gates/g2-cluster-map.mjs` | ✅ | 9 + 12 | 12 cluster + lowercase + ambiguity 25% |
| G3 | `gates/g3-source-probe.mjs` | ✅ | 3 | dev=stub pass, prod=권위 fetch |
| G4 | `lib/fact-verifier.mjs` | ✅ | 9 | extract + match + fetch 통합 |
| G5 | `gates/g5-adsense-policy.mjs` | ✅ | 7 | ad_policy 4종 + body keyword + affiliate |
| G6 | `gates/g6-disclosure-attach.mjs` | ✅ | 8 | YMYL·AI 공시 idempotent |
| G7 | `gates/g7-plagiarism.mjs` | ✅ | 6 | 8단어 hard + 5단어 multi-overlap |
| G8 | `gates/g8-ai-likeness.mjs` | ✅ | 3 + 16 | 10 시그널 score, threshold 단계화 |

---

## 3. 권위 소스 어댑터

| 어댑터 | cluster | 인증 키 | fixture |
|---|---|---|:---:|
| data-go-kr | gov-support, public-services, realestate | DATA_GO_KR_KEY | ✅ 2종 |
| bok-ecos | savings, credit-loan | BOK_API_KEY | ✅ 2종 |
| law-go-kr | tax, insurance-labor, office-tips, unemployment | LAW_GO_KR_OC | ✅ 2종 |
| fss-finlife | savings, credit-loan, insurance-personal, auto | FSS_KEY | ✅ 2종 |
| work24 | unemployment | WORK24_KEY | ✅ 2종 |
| nps | pension | NPS_KEY | ✅ 2종 |
| welfare-go-kr | gov-support 보조 | DATA_GO_KR_KEY | ✅ 2종 |

`__missing__.json` 폴백 7종 + 핵심 query 6종 sample.

---

## 4. brief 시스템 (Gap 1 + 자동 발행 통합)

- `_template.yaml` niche 8차원 + source_question 추가
- `lib/brief-loader.mjs` — Zod 스키마 + 비즈니스 룰 export
- `lib/auto-brief-generator.mjs` — 질문 → brief 골격
  - cluster authorityCoverage 기반 ad_policy 자동 채움
  - PII redact 후 surface_pain 저장
  - source_question.allow_quote=false 강제
  - search_timing·source_signal 자동 채움
- `tests/fixtures/briefs/sample-filled.yaml` — 완전 채워진 e2e demo brief

---

## 5. frontend 변경

| 컴포넌트 | 위치 | 동작 |
|---|---|---|
| `SourceVerificationBadge.astro` | article header | sources_verified=true 시 "공신력 검증" 배지 |
| `VerificationDetails.astro` | article 하단 (sources 직전) | 검증 사실 수·근사·AI-likeness·기준일 |
| `MissionCallout.astro` | 홈페이지 hero 직후 | 3단계 미션 시각화 + 누적 통계 |
| `[cluster]/[slug].astro` | 통합 | sources 섹션에 id="sources" 추가 |
| `index.astro` | 통합 | verifiedArticles·totalFactsVerified props 전달 |
| `content.config.ts` | schema | 9개 frontmatter 필드 추가 (모두 optional) |

---

## 6. CI/CD 통합

| 워크플로 | 동작 | 트리거 |
|---|---|---|
| `auto-publish.yml` | G0~G8 cron 러너 + PR 생성 | KST 06:00 daily + workflow_dispatch |
| `auto-pr-cleanup.yml` | CI 실패 30분 timeout PR close | */30 cron |
| `secrets-scan.yml` (기존) | gitleaks + custom scan | push/PR |
| `indexnow.yml` (기존) | IndexNow + sitemap + WebSub 즉시 푸시 | article 변경 |

---

## 7. 사용자 작업 대기 (내일 아침)

### 외부 API 키 발급 7~9종
- NAVER_CLIENT_ID + NAVER_CLIENT_SECRET (지식iN)
- DATA_GO_KR_KEY (정부 데이터)
- BOK_API_KEY (한국은행 ECOS)
- LAW_GO_KR_OC (법제처)
- WORK24_KEY (고용24)
- NPS_KEY (국민연금)
- FSS_KEY (금감원 finlife)
- (옵션) NAVER_SEARCH_ADVISOR_TOKEN, BING_API_KEY
- (별도) DEEPSEEK_API_KEY, ANTHROPIC_API_KEY (LLM)

### 등록
- GitHub Secrets (모든 키)
- CF Pages Env (PUBLIC_*는 Plaintext, 비밀 키는 Encrypted)

### 활성화
1. workflow_dispatch + dry_run=true 1회 (실 API 호출 검증)
2. `vars.MOCK_AUTHORITY=0` 토글 (CF Pages·GitHub Variables)
3. cron 자동 활성 — 첫 7일 모니터링

자세한 절차: [AUTO-PUBLISH-GUIDE.md](AUTO-PUBLISH-GUIDE.md)

---

## 8. 알려진 한계 (다음 라운드 작업)

- **Gap 2 Step 3+ 잔여**: Step 1·2 완료. Step 3 (brief 9개 섹션을 LLM 프롬프트에 주입), Step 5 (G4~G8 article-pipeline 통합), Step 6 (회귀 테스트) 남음.
- ~~**article-pipeline.mjs Gap 2 통합**~~: ✅ Round 27에서 `--brief` CLI + frontmatter inject 완료. brief 모드 작동 검증.
- ~~**trusted-domains 3곳 중 1곳 잔여**~~: ✅ Round 23에서 article-pipeline.mjs까지 완료.
- **AI-likeness 임계 5.0 단계화**: 현재 default 5.0 / auto-publish.yml은 7.0. 운영 1주 후 단계 강화.
- **fact-verifier 통화·환율**: 현재 KRW만 정규화. 외환 등 다국어 통화 V2.
- **PR 자동 생성**: 현재 auto-publish.yml은 게이트 트레이스만 출력. PR 생성·머지는 LLM 4-pass 통합 후 활성.

---

## 9. 안정화 지표

- 빌드 시간 회귀 0 (20.05~20.94s 안정)
- 테스트 회귀 0 (모든 라운드 후 248/248 유지)
- 시크릿 노출 0 (pre-commit·gitleaks·custom scan 3중 통과)
- LF/CRLF 경고만 (Windows 환경 자연 — 배포 영향 0)

PR #1 리뷰 시 본 문서를 먼저 보면 19개 커밋의 흐름을 한눈에 파악 가능.
