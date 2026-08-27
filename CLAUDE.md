# 머니룩 (asiatop.co.kr) 운영 하네스

한국 금융 YMYL 정적 사이트. Astro 6.2 SSG + Cloudflare Pages auto-deploy.
685편 article, **수동 발행 전용** (2026-06-11 자동 발행 파이프라인 폐기 — LLM 비용 사유, git 히스토리에서 복구 가능).

## 구글 회복 체제 (2026-08-26 발효 — docs/24-google-recovery-ops.md)

2026-08-18 구글 스팸 업데이트로 **사이트 단위 알고리즘 억제** (트래픽 -95%, 색인 371/685).
원인은 기술이 아니라 발행 풋프린트(일 3~4편 기계 발행·익명 단일 저자·균일 메타/제목 템플릿).
네이버는 건강(색인 670/685, 일 245클릭) — **네이버 영향 주는 변경 금지** (robots·canonical·RSS·네이버 인증·IndexNow 불변).

- **발행 캐던스: 신규 글 일 1편 이하** — `scripts/audit/publish-cadence.mjs` 가 빌드 차단. 리프레시는 별도.
- **발행 승인 원칙은 사람**: `merge-approved` 라벨은 운영자 전용. **유일한 예외 — 루틴 일일 포스팅** (2026-08-27 운영자 지시): daily-post 사이클의 콘텐츠 PR 에 한해, `.claude/skills/daily-post/SKILL.md` §3-5 의 **조건 목록(SSoT — 신규 일 1편 이하·auditor PASS·전 가드·CI green·정책 이슈 0·PR 구성 제한 등)** 전부 충족 시 Claude 가 라벨을 부착할 수 있다. 프루닝·대량 변경·비루틴 콘텐츠 PR 은 여전히 운영자 전용이며, `no-auto-merge` 긴급 정지는 항상 우선한다.
- 신규 글 메타/제목은 풋프린트 가드 준수 (`scripts/audit/template-footprint.mjs` — "총정리" 류 제목·"~정리했습니다" 류 종결 차단).
- 구글 색인 재요청 자동화 금지 · 본문 무변경 lastmod 갱신 금지 · 대량 삭제 후 대량 재발행 금지.
- 콘텐츠 에이전트 팀: content-strategist(의도·SERP 분석) → content-agent(작성 — `templates/claude-agents/google-content-master-prompt-v4.md` 적용) → content-auditor(발행 전 감사).

## 수동 발행 publishedAt 가드 (필수)

수동으로 article 작성 시 `publishedAt` 박기 **전** 반드시 KST 오늘 날짜를 검증.

system reminder 의 `currentDate` 는 세션이 길어지면 갱신 안 되고 묵힐 수 있음 (5/21 → 5/22 사례 — 5편 다 5/21 로 박혔지만 머지 시각은 정확). 시즌 후크 글("D-N", "5월 마감", "6/1 기준일" 등)은 publishedAt 1일 어긋나면 신뢰도 직격탄.

검증 순서:
1. `Get-Date -Format "yyyy-MM-dd"` (PowerShell) 또는 `date -u +"%Y-%m-%d %H:%M UTC"` (bash) 로 시스템 실시각 확인
2. UTC → KST(+9) 변환해 오늘 날짜 결정
3. system reminder currentDate 와 어긋나면 **system reminder 무시, 시스템 실시각 신뢰**
4. 사용자가 "오늘 날짜" 를 명시했으면 그게 최우선

publishedAt 박은 직후 글 본문의 "D-N", "오늘은 N월 N일" 같은 상대 표현도 같이 정합성 점검.

## 글 구조 규칙 (수동 발행 — 필수)

- docs/21-content-ops.md — 보일러플레이트 변주 풀·내부링크 3~5개 의무·faq 규격·카니발리제이션 대조·updatedAt/lastReviewed 운영
- docs/12-geo-ai-citation.md §2-6-b — 표 전후 산문 컨텍스트 5룰
- .claude/agents/content-agent.md — H2 질문형 30~50% + BLUF, cluster slug 는 src/data/clusters.ts enum 정확값 (schema 가드 동작 중)
- 법정·공시 수치는 1차 출처(법제처 조문·국세청 공식) 확인 후에만 단정 표기, 추정·변동 수치는 "약 N" 근사 표현

## AI 티 금지 (2026-07-10 — 애드센스 재승인 중 필수)

사람이 거의 안 쓰는데 AI가 즐겨 쓰는 말버릇은 "대충 찍어낸 AI 사이트" 인상을 주고, 애드센스 심사·구글 스팸 평가에 직격이다. 신규 글에 다음 강제:

- **제목·본문에 긴 줄표(—, em-dash) 사용 금지**. 쉼표·자연스러운 어구로 대체.
  - ❌ `교육비 세액공제 2026 — 자녀 300만`
  - ✅ `교육비 세액공제 2026, 자녀 300만 대학 900만`
- **반복 상투구 변주**: "핵심은 세 가지입니다", "정리하면~", "결론부터 말하면" 같은 고정 말버릇을 글마다 다르게. 같은 표현 복제 = AI 티.
- **기존 발행 글 제목은 건드리지 않는다** — 제목 변경 시 구글이 새 글로 오인해 순위 손실. **신규 글부터 적용**. 유일한 예외: 네이버 CTR 개선 트랙(docs/24 P4) — 운영자 지정 목록에 한해 `scripts/refresh/apply-title-meta.mjs` 경유로만 변경.
- 자동 가드: `scripts/audit/ai-tell-style.mjs` 가 빌드 체인 선두에서 신규 글(publishedAt ≥ 2026-07-10)의 —/– 를 검출해 빌드·CI 차단 (`pnpm audit:ai-style` 로 단독 실행).

## 변경 전 가드 (필수)

**워크플로 변경 시 `/plan` 우선**

다음 경로 수정 시 무조건 `/plan` 으로 시작:

- `.github/workflows/ci.yml`
- `.github/workflows/auto-merge.yml` (수동 콘텐츠 PR 머지 체인 — 오타 1건이 머지 정지 또는 권한 우회로 이어짐)

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

## 콘텐츠 PR 머지 흐름 (수동 발행 — 2026-08-26 opt-in 전환)

- `auto-merge.yml` 은 **opt-in**: 운영자가 `merge-approved` 라벨을 붙인 PR 만 CI green 시 자동 squash merge. 라벨 없으면 owner PR 도 머지되지 않는다. `no-auto-merge` 라벨은 긴급 정지로 우선.
- **콘텐츠 PR**: 기본은 Claude 가 PR 생성·CI 확인·보고까지, `merge-approved` 라벨 부착과 머지는 **운영자 전용**. **루틴 예외 (2026-08-27 운영자 지시)**: daily-post 사이클의 일 1편 이하 콘텐츠 PR 은 전 가드·CI green 확인 후 Claude 가 라벨 부착 가능 (자동 머지 체인 경유 — 직접 머지는 여전히 금지). 프루닝·대량 변경·비루틴 PR 은 운영자 전용 유지.
- **인프라 PR**: draft + `no-auto-merge` 라벨로 생성, 가드(perf+ads 듀얼 게이트 등) 통과 후 Claude 가 CI green 확인 후 직접 머지 (기존 위임 유지).
- 일일 수동 포스팅 패턴: 글 작성(일 1편 이하) → 브랜치/PR → CI green 확인 → **라벨 승인 (루틴 예외로 Claude 부착 가능, 2026-08-27)** → 자동 머지 → CF Pages 빌드 큐 (무료 플랜 동시 1건, 편당 ~3분)
- 머지 후 URL 200 확인까지가 발행 완료

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

## AdSense 운영 가드 (2026-06-11 승인 — docs/23-adsense-revenue-ops.md)

- 무효 클릭·자기 클릭·클릭 유도 문구 절대 금지. 개발·검수는 광고 차단 확장 켠 별도 프로필.
- **자동화 브라우저(Claude Preview·Chrome MCP)로 프로덕션 광고 페이지 열기 금지** —
  검증은 dist grep·curl·CF 프리뷰(`data-adtest=on`)만. `.env.local` 은 더미 client 유지.
- CTR 은 KPI 가 아니다 — 관찰만. 개선 시도 금지.
- 광고·인프라 PR: **draft 생성 + `no-auto-merge` 라벨 필수** (관행 유지 — auto-merge 는
  2026-08-26 부터 opt-in 이지만, draft+라벨이 이중 안전망).
  perf+ads 듀얼 게이트 통과 후 머지 (2026-06-12 운영자 위임 — Claude 가 CI green 확인 후 직접 머지).
- 글당 슬롯 ≤3, 글 상세 첫 화면 광고 0개, 숨김 `<ins>` DOM 0개, 자동 refresh 금지.
- **현재 상태 (2026-08-25~)**: **Auto ads 단독**. 수동 유닛 전면 철거 — `AdSlot.astro`·
  `src/lib/ads-lazy.ts`·`.ad-wrap` CSS·`PUBLIC_ADSENSE_SLOT_*` 삭제 완료. 소스에 수동
  `<ins class="adsbygoogle">` 0건이 정상이며, 재도입은 운영자 지시가 있을 때만.
  광고 진입점은 `Base.astro` head 로더 1개. 신규 Auto ads 기능(앵커·vignette) 활성화 금지.
- 긴급 차단 2단: ① 즉시(수 초) = CF Pages **Rollback to previous deployment**
  ② 정식(5~10분+큐 대기) = env `PUBLIC_ADSENSE_CLIENT` 비우기 + Retry.
  `public` ads.txt 는 킬스위치와 무관 — 건드리지 않는다.
- 정책 센터 알림 발견 시 모든 발행 중단 후 처리 우선.

## 자주 쓰는 슬래시 명령어

- `/plan` — 워크플로 변경 전
- `/diff` — 머지 전 변경 검토
- `/review` — PR 로컬 리뷰
- `/rewind` — 발행 사고 시 즉시 되돌리기
- `/ultrareview` — 10+ file 변경 머지 전 (클라우드 멀티에이전트)
- `/batch` — 30+ article 동시 변경 시 (워크트리 병렬)

## 이력·현황

- **자동 발행 파이프라인 (R95 chain)**: 2026-06-11 완전 폐기 (PR 참조). 코드·워크플로·briefs 큐·게이트 전부 삭제, git 히스토리에서 복구 가능. 기존 자동 발행 글(aiAssisted)·검증 UI 컴포넌트·schema 필드는 유지.
- 공개 페이지(about·editorial-policy·llms.txt)의 검증 파이프라인 서술은 과거형으로 정정됨 — 신규 글에 "자동 검증" 주장 금지 (허위 주장 방지).
- **AdSense 승인 완료 (2026-06-11)** → 수익화 운영 단계. 무효 클릭 유도·과도 광고 밀도·정책 위반 소지 변경은 절대 금지 (신규 계정 정지 리스크). 수익화 기획: docs/23-adsense-revenue-ops.md 참조.
