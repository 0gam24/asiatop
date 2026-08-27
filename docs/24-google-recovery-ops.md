# 24. 구글 스팸 억제 회복 운영 (2026-08-26 발효)

> 지시서: 2026-08-26 운영자 브리핑 "머니룩 구글 회복 작업 지시서".
> 목표: 다음 알고리즘 재평가 시점에 "대량생성 사이트"가 아니라 "정예 콘텐츠 사이트"로
> 보이도록 발행 시스템·사이트 구조를 전환. 네이버 트래픽(유일한 유입 채널)은 유지·개선.

## 0. 상황 요약

- 2026-08-18 구글 스팸 업데이트에서 **사이트 단위 알고리즘 억제**. 구글 트래픽 -95%
  (일 250클릭 → 10클릭). 수동 조치 아님 — 재심사 요청 불가, 알고리즘 재평가로만 회복.
- GSC: 색인 371/685. "발견됨 – 현재 색인이 생성되지 않음" 328건 (크롤 거부).
  robots/sitemap/canonical/meta 는 정상 — 기술 문제 아님.
- 억제 원인 = 발행 패턴의 스팸 풋프린트:
  1. 일 3~4편 기계적 발행 (실측: description "~정리했~" 종결 485편, "총정리" 제목 66편)
  2. 전 글 단일 익명 저자 (author "editor-team" 572편 / 685편)
  3. 메타 디스크립션 균일 템플릿
  4. 제목 "X 2026, Y 총정리" 공식
- 네이버는 건강 (색인 670/685, 일 245클릭 유지). **네이버에 영향을 주는 변경 금지**
  (robots·canonical·RSS·네이버 인증·IndexNow 체인 불변).

## 1. 트랙별 구현 (P0~P4)

### P0 — 발행 속도 제어 (완료 기준: 승인 게이트 없이 발행되지 않는다 — 2026-08-27 루틴 예외는 운영자 상시 지시로 갈음)

- `auto-merge.yml` **opt-out → opt-in 전환**: `merge-approved` 라벨이 있는 PR 만
  CI green 시 자동 squash merge. 라벨 부착 = 발행 승인.
  Claude·봇·자동화는 원칙적으로 이 라벨을 붙이지 않는다. **유일한 예외 (2026-08-27
  운영자 지시)**: 루틴 일일 포스팅(daily-post 사이클) 콘텐츠 PR 은 조건 전부 충족 시
  Claude 가 라벨 부착 가능 — 조건 목록의 SSoT 는 `.claude/skills/daily-post/SKILL.md`
  §3-5 (신규 일 1편 이하·auditor PASS·전 가드·CI green·정책 이슈 0·PR 구성 제한).
  직접 머지는 여전히 금지(자동 머지 체인 경유만). 프루닝·대량 변경·비루틴 PR 은
  운영자 전용 유지. `no-auto-merge` 라벨은 긴급 정지로 우선.
- `scripts/audit/publish-cadence.mjs`: 신규 글(publishedAt ≥ 2026-08-27) **일 1편 상한**.
  초과 시 빌드·CI 차단. 리프레시는 미집계. `pnpm audit:cadence`.
- 참고: 브리핑의 "자동 발행 GitHub Actions 스케줄"과 "발행 큐 미발행 원고"는
  2026-06-11 파이프라인 폐기 때 이미 제거됨 (큐 잔존물 0건 확인). 현재의 발행 경로는
  수동(daily-post 스킬) 뿐이며, 그 캐던스·머지 게이트를 본 트랙이 제어한다.
- daily-rebuild(홈 갱신 empty commit)·scheduled-rebuild(CF 훅)는 유지 — article
  lastmod 는 frontmatter(lastReviewed>updatedAt>publishedAt)에서만 산출되므로
  "본문 무변경 lastmod 갱신" 금지 조항과 충돌하지 않음 (sitemap-lastmod.mjs 확인).

### P1 — 템플릿 풋프린트 제거

- 콘텐츠 에이전트 팀 재편 (`.claude/agents/`):
  - `content-strategist` — 검색의도·SERP·Information Gap·카니발리제이션 분석
  - `content-agent` — 본문 작성 (GOOGLE CONTENT MASTER PROMPT v4 적용)
  - `content-auditor` — 발행 전 중복·독창성·풋프린트·사실 감사
  - 마스터 프롬프트 원문: `templates/claude-agents/google-content-master-prompt-v4.md`
- 메타 디스크립션: "~정리했습니다" 류 종결 금지, 문형 5종 로테이션
  (①핵심 수치 선행 ②질문 제기 ③조건 제시 ④변경사항 강조 ⑤행동 안내).
- 제목: "총정리/완벽 정리/한눈에 보기" 류 금지, 검색 의도별 유형 로테이션
  (조건형·금액형·질문형·비교형·절차형·마감형).
- 자동 가드: `scripts/audit/template-footprint.mjs` (신규 글 publishedAt ≥ 2026-08-27)
  가 빌드 체인에서 금지 패턴·종결 중복률을 차단. `pnpm audit:template`.
- **기존 글 메타는 한 번에 전량 교체 금지** (대량 변경 자체가 신호).
  프루닝(P3) 후 남는 글부터 P4 경량 리프레시 트랙으로 순차 교체.

### P2 — 저자 실체화 (E-E-A-T)

- 저자 인프라(authors 컬렉션·`/author/[slug]`·Person 스키마·바이라인)는 기구축.
  남은 작업 = "머니룩 편집팀"(익명 Organization, 572편) → 실명 저자 전환.
- `scripts/audit/author-transition.mjs` (DRY_RUN 기본)로 author frontmatter 일괄 전환
  → `kim-junhyeok` (실명·사업자등록 공개 프로필). updatedAt 미변경 — lastmod 불변.
- 바이라인 검수 표기 정직성: 2026-06-11(수동 전환일) 이전 발행분은 "책임 편집",
  이후는 "작성·검수" 로 구분 표기 ([slug].astro).
- 신규 글 schema 기본 author = `kim-junhyeok` (content.config.ts).
- `editor-team` 프로필 페이지는 잔존 (구 색인·외부 링크 대응). 신규 글 사용 금지.

### P3 — 프루닝 인프라

- `scripts/prune/apply-pruning.mjs` — CSV 입력 → 일괄 처리 (DRY_RUN 기본):
  - CSV 형식: `slug,action,target` (action: `merge` | `delete` | `noindex`)
  - `merge`: 글 파일을 `src/content/_pruned/` 로 이동(콘텐츠 컬렉션 이탈 = 페이지·
    사이트맵·RSS 자동 제외) + `/{cluster}/{slug}/ → target 301` 리디렉션
  - `delete`: 동일 이동 + 클러스터 허브로 301
  - `noindex`: frontmatter `noindex: true` → **googlebot 전용** noindex meta + 사이트맵 제외
    (페이지·RSS 는 유지, 일반 robots 메타는 index 그대로 — 네이버 Yeti 색인 보존).
    2026-08-27 정정: 기존 구현이 범용 `<meta name="robots" noindex>` 라 네이버 색인까지
    제거하는 결함이 있어 `<meta name="googlebot" noindex>` 로 스코프 축소 (Base.astro).
- 리디렉션 SSoT: `scripts/prune/redirect-map.json` → `public/_redirects` 의
  관리 블록을 스크립트가 재생성 (수동 편집 금지 구간).
- 사이트맵: noindex 글은 sitemap-0(astro.config filter)·sitemap-news·sitemap-images
  에서 제외.
- 프루닝 대상 목록은 운영자가 GSC 실적 기반 CSV 로 제공 예정.

### P4 — 네이버 CTR 개선 (경량 리프레시)

- `scripts/refresh/apply-title-meta.mjs` — CSV(`slug,new_title,new_description`) →
  frontmatter title/description 만 교체. **본문·날짜 필드 불변** (updatedAt 미조작 =
  수정일 정직). 스키마 길이(제목 20~70, 설명 80~170)·금지 패턴 검증 내장.
- 대상: 네이버 노출 상위·클릭 하위 글 (운영자 목록 제공 → Claude 가 리라이트 초안
  작성 → CSV 적용 → PR → 운영자 라벨 승인).
- 기존 "발행 글 제목 불변" 규칙의 유일한 예외 트랙. 구글 순위는 이미 억제 상태라
  리스크 수용 — 단 색인 살아있는 글(GSC 클릭 발생 글)은 제목 변경 전 운영자 확인.

## 2. 금지 사항 (지시서 §4 그대로)

- 구글 색인 재요청(Indexing API·수동 요청) 자동화 — 효과 없고 신호만 악화.
- 콘텐츠 변경 없이 lastmod/수정일만 갱신.
- 대량 삭제 후 대량 재발행.
- robots.txt·canonical·네이버 관련 설정(인증 파일·RSS·IndexNow 네이버 직타) 변경.

## 3. 완료 기준 체크리스트

- [x] 발행 캐던스 일 1편 이하 + 승인 게이트 (P0 — 2026-08-27 루틴 예외 신설)
- [x] 신규 글 메타/제목 패턴 가드 + 에이전트 팀 (P1)
- [x] 전 글 실체 저자 연결 (P2)
- [x] 프루닝 CSV → 리디렉션·사이트맵 자동 반영 (P3)
- [x] 제목/메타 경량 리프레시 도구 (P4)
- [ ] 프루닝 목록 CSV 수령 → 실행 (운영자 제공 대기)
- [ ] 네이버 CTR 대상 목록 수령 → 제목 리라이트 (운영자 제공 대기)
- [ ] 신규 20편 발행 후 패턴 중복률 재측정 (`pnpm audit:template`)
