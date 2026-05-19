# 머니룩 지식인 자동 포스팅 — 전체 기획 (구체)

> 한국 금융 YMYL 정적 사이트. 네이버 지식인 검색 → AI 글쓰기 4-pass → 8단계 게이트 → PR 자동 머지 → CF Pages 배포.
> 매일 KST 06:00 cron 으로 1~2편 자동 발행.

---

## 1. 큰 그림 (하루 흐름)

```
┌─────────────────────────────────────────────────────────────┐
│  매일 KST 05:30 — collector                                  │
│  네이버 지식인에서 "괜찮은 질문" 2건 골라옴                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  매일 KST 05:45 — cluster-questions (앞으로 cron 추가)       │
│  유사 질문 3~5건 묶어 pillar 토픽 1개                       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  매일 KST 05:50 — topic-to-brief (앞으로 cron 추가)          │
│  토픽 → 확장 brief.yaml (질문 3~5건 통합)                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  매일 KST 06:00 — auto-publish                              │
│  brief → AI 글쓰기 4단계 → 8단계 검증 → PR 자동 생성        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  KST 06:30~07:30 — auto-merge                               │
│  CI 통과 → 자동 머지 → CF Pages 배포 → 사이트 노출           │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  KST 06:05 — IndexNow                                       │
│  Bing·Yandex·Naver 에 새 URL 즉시 푸시                       │
└─────────────────────────────────────────────────────────────┘
```

**결과**: 매일 1~2편 새 글 자동 등장.

---

## 2. 단계별 상세 (어떻게 작동하나)

### 1단계: 질문 수집 (collector)

**파일**: `scripts/collect-questions.mjs` + `.github/workflows/collector.yml`
**작동 시간**: 매일 KST 05:30 (UTC 20:30 전날)

**무엇을 하나**:
1. 12개 cluster (gov-support, tax, realestate, unemployment, savings, insurance-labor, auto, public-services, office-tips, credit-loan, insurance-personal, pension) 각각에서 키워드 2개씩 랜덤 sample
2. 네이버 지식인 검색 API 호출 (`NAVER_CLIENT_ID/SECRET` 인증)
3. 각 키워드당 최신 10건 가져옴 (총 약 240건 raw 후보)

**필터링 단계 (사전 G1+G2 simulation)**:

| 필터 | 거부 사유 | 효과 (예시) |
|------|---------|----------|
| `tooShort` | 질문 < 15자 | "주휴수당 책정???" 제거 |
| `similar` | 기존 360편과 title 3+ 공통 단어 | 중복 글 방지 |
| `commercial` | "운용사 추천", "어디 사", "할인 코드" | 광고성 차단 |
| `offTopic` | "돌잔치", "게임", "맛집", "여행" | 도메인 외 제거 |
| `g1Fail` | PII·욕설·정치·성인 | 안전 |
| `g2Fail` | cluster 모호 (ambiguous) | "퇴직금 DC" 같은 unemployment vs pension 거부 |
| `dupCandidate` | 다른 cluster 에서 동일 title | 중복 적재 방지 |

**raw 240건 → PASS 약 53건** 비율로 통과.

**선정 기준**: G2 score 높은 순 → unmet_market 높은 순 → 최신순

**산출물**: `briefs/_pool/_pending/<hash>.txt` (해시.txt 파일, 첫 줄 = 질문)

---

### 2단계: 토픽 묶음 (cluster-questions) — R95-10

**파일**: `scripts/cluster-questions.mjs`
**작동 시간**: 곧 cron 추가 예정 (현재 수동)

**무엇을 하나**:
1. pending 큐의 모든 질문 로드
2. 각 질문의 G2 cluster 매핑
3. 같은 cluster 안에서 키워드 overlap ≥ 2 인 질문끼리 그룹핑
4. 3~5건 묶음만 pillar 토픽 채택 (단편 1편 양산 방지)

**예시**:
- 질문 A: "이직확인서 실업급여 가능한가요?"
- 질문 B: "올리브영 메이트 퇴사자 이직확인서 질문"
- 질문 C: "퇴사 후 실업급여 신청 시 이직확인서 필요한가요"

→ cluster=unemployment, 공통 키워드=[이직확인서, 실업급여, 퇴사], pillar 채택

**산출물**: `data/topics/<topic_id>.json`

```json
{
  "topic_id": "abc123",
  "cluster": "unemployment",
  "primary_keywords": ["이직확인서", "실업급여", "퇴사"],
  "size": 3,
  "questions": [...]
}
```

---

### 3단계: 브리프 확장 (topic-to-brief) — R95-11

**파일**: `scripts/topic-to-brief.mjs`
**작동 시간**: 곧 cron 추가 예정

**무엇을 하나**:
1. `topic.json` 읽기
2. 가장 긴 (구체적인) 질문 = primary
3. 나머지 질문들 → sub_questions
4. 기존 `auto-brief-generator` 호출해 기본 brief 생성
5. brief 확장:
   - `reader_intent.sub_questions` = 나머지 질문들
   - `structure.faq.must_include_questions` = sub_questions
   - `meta.pillar` = topic 메타 정보 (audit 용)

**효과**: 단편 1편 brief → 3~5건 통합 pillar brief. H2 섹션 6개가 자연스럽게 sub_questions 에 1:1 매핑됨.

**산출물**: 확장 brief.yaml (article-pipeline 이 LLM 프롬프트로 사용)

---

### 4단계: AI 글쓰기 + 8단계 검증 (auto-publish)

**파일**: `.github/workflows/auto-publish.yml` + `scripts/auto-publish.mjs` + `scripts/article-pipeline.mjs`
**작동 시간**: 매일 KST 06:00

**Pre-LLM 게이트 (LLM 호출 전, 비용 0)**:

| 게이트 | 검증 |
|--------|------|
| G0 | dedup-index 중복 차단 (같은 질문 반복 방지) |
| G1 | 질문 sanitize (PII, 욕설, 정치, 성인) |
| G2 | cluster 매핑 (12 cluster 중 1개로 분류) |
| G3 | 정부 API source-probe (LAW/BOK/FSS/NPS/YOUTH_CENTER 응답 가져옴) |

**LLM 4-pass (시간·비용 발생)**:

| Pass | 모델 | 역할 |
|------|------|------|
| Pass 1 | DeepSeek | 초안 작성 ($0.014/1M input) |
| Pass 2 | 코드 | 정규화 (제목 길이, frontmatter 자동 채움) |
| Pass 3 | Claude | refine (citable_sentences 보존, 정확도) |
| Pass 4 | 코드 | 게이트 사전 검증 (frontmatter Zod schema) |
| Pass 5 | G4 fact-verifier + R95-9 sanitizer | 환각 amount 자동 wrap |

**R95-9 sanitizer 핵심 동작**:

```
1차 verifyFacts: LLM 본문의 amount/percent/금액 토큰 80개 추출
   → expected_facts 풀과 매칭 시도
   → unmatched 78개 발견 → 1차 fail

🧹 sanitizer 작동:
   - "100,000원" → "약 100,000원"
   - "7.09%" → "약 7.09%"
   - 모든 unmatched 자동 wrap

2차 verifyFacts:
   - 78개가 approximate 분류 (분모 제외)
   - matched / matched = 1.0
   - 임계 0.7 통과 ✅
```

**Post-LLM 게이트 (G5~G8)**:

| 게이트 | 검증 |
|--------|------|
| G5 | AdSense 정책 (대출/금융 추천 차단, 의료 자문 차단) |
| G6 | disclosure 자동 첨부 ("법적 자문 아님", "최신 정책 확인 필요") |
| G7 | plagiarism 4-gram shingle (기존 360편 + 정부 사이트 표절률 < 25%) |
| G8 | ai-likeness (LLM 흔한 표현 점수 < 7.0) |

**모두 통과 시**: `auto-publish` 라벨 PR 자동 생성

---

### 5단계: PR + 머지 + 배포

**자동 머지 흐름**:
1. `auto-publish.yml` 가 PR 생성 + `label: auto-publish` 부착
2. CI 가동 (build + SSR + Lighthouse + Playwright + feed-sync)
3. `auto-merge.yml` 이 CI green 감지 → squash merge
4. CF Pages 자동 빌드 (약 2~3분)
5. `indexnow.yml` (KST 06:05) 가 신규 URL 푸시

**안전망**:
- PR 동시 3개 상한 (guardrails)
- 하루 발행 5편 상한
- CI 실패 PR 자동 close (`auto-pr-cleanup.yml`)
- feed-sync 가드 (RSS/sitemap 동기화 강제)

---

## 3. 8단계 게이트 (G0~G8) — 안전망

| 게이트 | 단계 | 차단 사유 |
|--------|------|----------|
| G0 dedup | Pre-LLM | 24h 내 중복 질문 |
| G1 sanitize | Pre-LLM | PII·욕설·정치·성인 |
| G2 cluster-map | Pre-LLM | 12 cluster 매핑 모호 |
| G3 source-probe | Pre-LLM | 권위 출처 0건 |
| **G4 fact-verify** | LLM Pass 5 | 환각 amount (R95-9 sanitizer 적용 후 자동 통과) |
| G5 adsense-policy | Post-LLM | 특정 상품 추천, 의료 자문 |
| G6 disclosure-attach | Post-LLM | 면책 문구 누락 |
| G7 plagiarism | Post-LLM | 표절률 ≥ 25% |
| G8 ai-likeness | Post-LLM | LLM 흔한 표현 점수 ≥ 7.0 |

**Fail 시 정책**: 자동 폐기 (재시도 X). 다음 cron 이 새 질문 픽업.

---

## 4. 현재 진행 상황 (2026-05-19 기준)

| Stage | 상태 | PR |
|-------|------|-----|
| Stage 1 collector | ✅ 작동 중 (수동 G2 사전 필터) | R95-1·R95-4 |
| Stage 2 큐 적재 + rotation | ✅ 작동 중 | R95-3 |
| Stage 3 cluster-questions | ✅ 코드 완성, cron 미통합 | R95-10 |
| Stage 4 topic-to-brief | ✅ 코드 완성, cron 미통합 | R95-11 |
| LLM 4-pass + amount sanitizer | ✅ 작동 중 | R95-9 |
| G4 임계 default(0.7) 복원 | ✅ | R95-11 |
| auto-publish PR 자동 생성 | ✅ | R95-1·R95-3 |
| Stage 5 SERP feedback | ⏳ 미구현 | R95-14 예정 |

---

## 5. 차기 작업 (R95-12 ~ R95-14)

### R95-12: cron 통합 — collector → cluster → topic → publish 자동 체인

**할 일**:
1. `auto-publish.yml` 의 pick step 수정:
   ```bash
   if [ -d data/topics ] && [ "$(ls data/topics/*.json 2>/dev/null | wc -l)" -gt 0 ]; then
     # topic 우선 픽업 → topic-to-brief 호출
   else
     # 기존 큐 fallback
   fi
   ```
2. `cluster-questions.yml` 신규 cron (KST 05:45) 추가
3. `topic-to-brief` 는 auto-publish 안에서 호출 (별도 cron 불요)

### R95-13: cluster-questions 임계 튜닝

**할 일**: `MIN_GROUP` 3→2, `KEYWORD_OVERLAP_MIN` 2→1 완화. 현재 5건 큐 → 0개 pillar 발생하는 문제 해소.

### R95-14: SERP feedback (Stage 5)

**할 일**:
1. GSC API + Naver SA Bulk API 인증 통합
2. 주간 cron: 노출/클릭/평균순위 → seed pool 점수 보정
3. 포화 키워드 (검색량 높지만 우리 노출 낮음) 거름

---

## 6. 운영 관점 (모니터링·안전망)

### 일일 모니터링 (운영자가 보는 것)

```
1. https://github.com/0gam24/moneylook/pulls
   → label: auto-publish PR 매일 1~2건 생성됐는지

2. https://asiatop.co.kr/
   → 어제·오늘 새 글 노출되는지

3. briefs/_pool/_rejected/<date>/*.yaml
   → 어느 게이트에서 떨어졌는지 (G2/G4/G7 등)
```

### 주간 모니터링

- pending 큐 깊이 (5건 상한, 너무 자주 비면 collector 강화 필요)
- G4 sanitizer wrap 횟수 평균 (너무 높으면 expected_facts 풀 강화 우선)
- PR 머지 후 사이트 검색 노출 추이 (Google Search Console)

### 안전망 7중

1. PR 동시 3개 상한
2. 하루 발행 5편 상한
3. G0~G8 8단계 게이트
4. R95-9 amount sanitizer (환각 amount 자동 변환)
5. feed-sync 하네스 게이트 (RSS/sitemap 동기화 강제)
6. CI build/Lighthouse/Playwright 통과 필수
7. CLAUDE.md 하네스 (워크플로 변경 시 /security-review)

---

## 7. 비용 추정 (월간)

| 항목 | 비용 |
|------|------|
| 네이버 검색 API | 무료 (일 25,000건 한도, 우리는 일 240건) |
| DeepSeek API | ~$3/월 (글당 $0.10) |
| Anthropic Claude API | ~$3/월 (글당 $0.10) |
| Cloudflare Pages | 무료 (Free tier) |
| GitHub Actions | $0 (public repo 무제한) |
| **합계** | **~$6/월** |

수익: AdSense 통과 후 광고 + 어필리에이트 (계획 중).

---

## 8. 비유로 쉽게

```
🤖 Naver 지식인 = 사람들이 진짜 궁금해하는 질문의 보고
                  ↓
🤖 collector = 사서. 매일 좋은 질문만 추려 도서관(큐)에 갖다놓음
                  ↓
🤖 cluster-questions = 사회자. 비슷한 질문 3~5개를 한 묶음으로
                  ↓
🤖 topic-to-brief = 기획자. 묶음을 보고 글의 뼈대 만듦
                  ↓
🤖 LLM 4-pass + 게이트 = 글쓰기 + 8중 검열
                  ↓
🤖 amount sanitizer = 검열관. "거짓 수치" 발견하면 "약 X" 로 변환
                  ↓
🤖 auto-publish + auto-merge = 발행. 사이트 자동 게시
```

매일 새벽에 사람 손 안 대고 1~2편 자동 발행. 운영자는 검색 노출·AdSense 수익만 모니터링.

---

## 관련 문서

- [CLAUDE.md](/CLAUDE.md) — 운영 하네스 (변경 가드)
- [21-content-ops.md](21-content-ops.md) — 콘텐츠 운영 패턴
- [10-structured-data.md](10-structured-data.md) — JSON-LD schema
- [11-metadata-seo.md](11-metadata-seo.md) — SEO 메타데이터

## 변경 이력

- 2026-05-19: 신규 작성. R95-1~R95-11 정리.
