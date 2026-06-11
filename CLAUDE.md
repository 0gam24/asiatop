# 머니룩 (asiatop.co.kr) 운영 하네스

한국 금융 YMYL 정적 사이트. Astro 6.2 SSG + Cloudflare Pages auto-deploy.
360+편 article + LLM 4-pass 자동 발행 cron (KST 05:30 collector → 06:00 publish).

> 자동 발행 파이프라인 전체 기획·상세 흐름: [docs/23-auto-publish-pipeline.md](docs/23-auto-publish-pipeline.md)

## 수동 발행 publishedAt 가드 (필수)

수동으로 article 작성 시 `publishedAt` 박기 **전** 반드시 KST 오늘 날짜를 검증.

system reminder 의 `currentDate` 는 세션이 길어지면 갱신 안 되고 묵힐 수 있음 (5/21 → 5/22 사례 — 5편 다 5/21 로 박혔지만 머지 시각은 정확). 시즌 후크 글("D-N", "5월 마감", "6/1 기준일" 등)은 publishedAt 1일 어긋나면 신뢰도 직격탄.

검증 순서:
1. `Get-Date -Format "yyyy-MM-dd"` (PowerShell) 또는 `date -u +"%Y-%m-%d %H:%M UTC"` (bash) 로 시스템 실시각 확인
2. UTC → KST(+9) 변환해 오늘 날짜 결정
3. system reminder currentDate 와 어긋나면 **system reminder 무시, 시스템 실시각 신뢰**
4. 사용자가 "오늘 날짜" 를 명시했으면 그게 최우선

publishedAt 박은 직후 글 본문의 "D-N", "오늘은 N월 N일" 같은 상대 표현도 같이 정합성 점검.

## 변경 전 가드 (필수)

**워크플로/파이프라인 변경 시 `/plan` 우선**

다음 경로 수정 시 무조건 `/plan` 으로 시작 (실수 1건이 cron 전체 정지·환각 통과 사고로 이어짐):

- `.github/workflows/auto-publish.yml`
- `.github/workflows/collector.yml`
- `.github/workflows/ci.yml`
- `scripts/article-pipeline.mjs`
- `scripts/lib/brief-prompt-builder.mjs`
- `scripts/lib/auto-brief-generator.mjs`
- `scripts/lib/fact-verifier.mjs`
- `scripts/gates/g[0-9]*-*.mjs`

**안전 게이트 임계 변경 시 `/security-review` 필수**

다음 환경변수·상수 수정 시 PR 머지 전 `/security-review`:

- `FACT_VERIFY_MIN_MATCH_RATE` (R95-11 이후 default `0.7` 복원 — sanitizer 가 보장)
- `AI_LIKENESS_THRESHOLD` (현재 7.0)
- `MOCK_AUTHORITY` (현재 0 = real fetch)
- `SCORE_THRESHOLD` / `AMBIGUITY_RATIO` (G2)
- 하루 발행 상한 `5`, PR 동시 상한 `3` (guardrails)

## 대규모 일괄 변경 (30+ files)

다음 작업 시 반드시 dry-run 스크립트 + audit 로그:

- article frontmatter 일괄 수정 (publishedAt/updatedAt 등)
- _drafts → 정식 폴더 이동
- cluster reassignment

패턴:
1. `scripts/audit/<change-name>.mjs` 신설 — `DRY_RUN=1` 기본
2. `node scripts/audit/<change-name>.mjs` 로 변경 대상 검증
3. `DRY_RUN=0 node ...` 로 실 적용
4. 같은 PR 에 스크립트 + 변경된 파일 함께 commit (재현 가능성)

## 자동 발행 PR 머지 정책

- `label: auto-publish` PR 은 CI green + Lighthouse 통과 시 `auto-merge.yml` 이 squash merge
- 사람 검토 우회되므로 LLM 환각 amount 가 production 흘러갈 위험 존재
- 의심스러우면 `/review` 또는 `/rewind` 로 즉시 차단

## content-agent 사용 후 검증

content-agent 의 `create_file` 결과는 host filesystem 에 반영 안되는 경우 있음 (5/15~5/17 사례).

agent 호출 후 반드시:
```
ls -la <expected-path>  # 또는 Read tool
```

agent 가 "완료" 보고해도 파일 미존재 가능 → 본문을 agent 출력에서 받았으면 Write tool 로 직접 작성.

## Windows 환경 주의

- LF→CRLF 경고는 git autocrlf 정상 동작. 무시.
- 로컬 `pnpm` 미설치 가능성 → CI 에 검증 위임.
- 경로는 forward slash 또는 quoting.

## 절대 하지 말 것

- `--no-verify` git commit
- `git push --force` to main
- secrets 또는 `.env.local` commit (`.gitignore` 잘 설정됨, 점검 R94-* 완료)
- workflow `dry_run=false` + `create_pr=true` 콤보 트리거 (실 발행 체인 — 사용자 명시 승인 필요)

## 자주 쓰는 슬래시 명령어

- `/plan` — 워크플로/파이프라인 변경 전
- `/diff` — 머지 전 변경 검토
- `/review` — PR 로컬 리뷰
- `/security-review` — 안전 게이트 임계 변경 시
- `/rewind` — 자동 발행 사고 시 즉시 되돌리기
- `/ultrareview` — 10+ file 변경 머지 전 (클라우드 멀티에이전트)
- `/batch` — 30+ article 동시 변경 시 (워크트리 병렬)
- `/loop` — cron 결과 1주일 모니터링 패턴

## 진행 중 트랙

- **R95 chain (자동 발행 정착)**: R95-1~R95-11 완료.
  - R95-9 amount-sanitizer (post-LLM) — unmatched 토큰 자동 "약 X" wrap.
  - R95-10 cluster-questions — pillar 묶음 (3~5 질문 → 1편).
  - R95-11 G4 임계 default(0.7) 복원 + topic-to-brief MVP.
- 차기: R95-12 cron 통합 (collector → cluster-questions → topic-to-brief → auto-publish).
- R95-12 후보: (1) brief-prompt-builder.mjs L244 의 `/articles/${slug}` 내부링크 형식이 실 라우트 `/{cluster}/{slug}/` 와 불일치 (잠복 404) — `/plan` 으로 교정. (2) 표 컨텍스트·BLUF·보일러플레이트 변주 룰의 article-pipeline.mjs SYSTEM_PROMPT 포팅 — `/plan`.
- 수동 발행 글 구조 규칙: docs/21-content-ops.md (변주 풀·내부링크·faq 규격) + docs/12-geo-ai-citation.md §2-6-b (표 산문 컨텍스트)
- AdSense 심사 중 → 변경은 보수적으로. 환각은 sanitizer 가 차단 (단정 수치 → 근사 표현).
