# docs/19 — 배포 (Cloudflare Pages + GitHub Actions)

본 표준의 배포 아키텍처. **GitHub 저장소 → CF Pages 자동 배포 + GHA 정기 재빌드**.

---

## 1. 전체 아키텍처

```
[로컬 코드 작성]
   ↓ git push
[GitHub Repository]
   │
   ├─→ [Cloudflare Pages 자동 빌드·배포]
   │      ↓
   │   pnpm install → pnpm build → dist/
   │      ↓
   │   [전 세계 CDN 엣지 배포]
   │      ↓
   │   [사용자 접속]
   │
   └─→ [GitHub Actions]
          ├─ PR마다: lint, test, Lighthouse CI
          ├─ Push마다: 보안 스캔
          └─ Cron(예: 6시간마다): CF Deploy Hook 호출 → 재빌드
```

---

## 2. GitHub 저장소 설정

### 2-1. 초기화

```bash
git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin https://github.com/USER/REPO.git
git push -u origin main
```

### 2-2. 브랜치 보호

GitHub 저장소 → Settings → Branches → Add rule:

- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - 필수 체크: `CI`, `Lighthouse CI`
- ✅ Require conversation resolution
- ✅ Do not allow bypassing the above settings

### 2-3. Secret Scanning 활성화

Settings → Code security → Secret scanning → Enable.

---

## 3. Cloudflare Pages 연결

### 3-1. 초기 연결 (대시보드 GUI)

1. Cloudflare 대시보드 → Workers & Pages → Create → Pages
2. **Connect to Git** → GitHub 권한 부여 → 저장소 선택
3. 빌드 설정:
   - Production branch: `main`
   - Framework preset: `Astro`
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Root directory: `/`
4. 환경변수 등록 (다음 섹션)
5. **Save and Deploy**

이후 `main` 브랜치에 푸시될 때마다 자동 빌드·배포.

### 3-2. 환경변수 등록

대시보드 → 프로젝트 → Settings → Environment variables.

**Production** 환경:

```
NODE_VERSION=20
PNPM_VERSION=9
API_KEY=<공공데이터포털·외부 API 키 등>
SITE_URL=https://example.com
```

**Preview** 환경 (PR 미리보기):

```
NODE_VERSION=20
PNPM_VERSION=9
API_KEY=<테스트용 키>
SITE_URL=https://preview.example.com
```

⚠️ **민감한 키는 "Encrypt" 토글 활성화**. 한 번 암호화하면 다시 볼 수 없으니 따로 안전하게 보관.

### 3-3. 커스텀 도메인

대시보드 → 프로젝트 → Custom domains → Set up a custom domain.

DNS 자동 설정(같은 CF 계정의 도메인) 또는 CNAME 레코드 직접 추가.

자동: HTTPS 인증서 + HTTP/3 + CDN.

---

## 4. PR 미리보기

### 4-1. 자동 동작

PR을 생성하면 CF Pages가 자동으로 미리보기 URL 생성:

```
https://abc123.example.pages.dev
https://feature-branch.example.pages.dev
```

PR 코멘트에 자동 게시.

### 4-2. PR 미리보기에서의 SEO 보호

**중요**: 미리보기 환경은 **검색 엔진 인덱싱 차단** 필수.

`public/_headers`에 환경 분기:

```
# Production은 그대로 두고
# Preview만 noindex
```

또는 Astro 빌드에서 환경 변수로:

```astro
---
const isPreview = !import.meta.env.PROD || import.meta.env.CF_PAGES_BRANCH !== 'main';
---
<head>
  {isPreview && <meta name="robots" content="noindex, nofollow" />}
</head>
```

---

## 5. GitHub Actions — 정기 재빌드 cron

### 5-1. CF Deploy Hook 생성

대시보드 → 프로젝트 → Settings → Builds & deployments → Deploy hooks → Add deploy hook.

- Hook name: `Scheduled rebuild`
- Branch: `main`

생성 후 URL을 받음:
```
https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/UUID
```

### 5-2. GitHub Secret 등록

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret:

- Name: `CF_DEPLOY_HOOK`
- Secret: <위 URL 전체>

### 5-3. 워크플로 작성

`.github/workflows/scheduled-rebuild.yml` (또는 `templates/github-actions/deploy-hook-cron.yml` 복사):

```yaml
name: Scheduled rebuild

on:
  schedule:
    # PROJECT.md의 재빌드 주기에 맞춰 수정
    # 예: 6시간마다
    - cron: '0 */6 * * *'
  workflow_dispatch:  # 수동 트리거 가능

jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cloudflare Pages rebuild
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${{ secrets.CF_DEPLOY_HOOK }}")
          if [ "$response" != "200" ]; then
            echo "Deploy hook failed with status $response"
            exit 1
          fi
          echo "Deploy hook triggered successfully"
```

### 5-4. cron 표현식 가이드

| 주기 | cron |
|---|---|
| 매시간 | `0 * * * *` |
| 4시간마다 | `0 */4 * * *` |
| 6시간마다 | `0 */6 * * *` |
| 12시간마다 | `0 */12 * * *` |
| 매일 자정 (UTC) | `0 0 * * *` |
| 매일 오전 9시 (KST) | `0 0 * * *` (UTC) |

⚠️ GitHub Actions cron은 UTC. 한국 시간(KST)으로 환산: KST = UTC + 9시간.

---

## 6. GitHub Actions — Lighthouse CI

`.github/workflows/lighthouse-ci.yml` (또는 `templates/github-actions/lighthouse-ci.yml` 복사):

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Lighthouse CI (Mobile)
        run: pnpm dlx @lhci/cli@0.13.x autorun --config=./lighthouserc.json
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Lighthouse CI (Desktop)
        run: pnpm dlx @lhci/cli@0.13.x autorun --config=./lighthouserc.desktop.json
```

`LHCI_GITHUB_APP_TOKEN`: Lighthouse CI GitHub App 설치 (https://github.com/apps/lighthouse-ci) 후 발급.

---

## 7. 무중단 배포 + 롤백

### 7-1. 무중단

CF Pages는 새 배포가 완료될 때까지 이전 배포가 살아있음 → 자동 무중단.

### 7-2. 롤백

대시보드 → 프로젝트 → Deployments → 이전 deployment → "Rollback to this deployment" 버튼.

또는 git revert 후 push → 자동 재배포.

### 7-3. 빌드 실패 시

CF Pages는 빌드 실패하면 이전 배포 유지 → 사이트 정상.

알림: 대시보드 → Notifications에서 빌드 실패 시 이메일 발송 설정.

---

## 8. 모니터링·알림

### 8-1. Uptime 모니터링

- Cloudflare Health Checks (유료)
- UptimeRobot (무료, 5분 간격)
- Pingdom

핵심 페이지 (홈, 결제, 로그인) 5분 간격 체크.

### 8-2. 에러 알림

- Sentry → Slack/이메일 (`docs/14`)

### 8-3. CWV 저하 알림

- PageSpeed Insights API + GitHub Actions cron + Slack

```yaml
# .github/workflows/psi-monitor.yml (선택)
on:
  schedule: [{ cron: '0 9 * * *' }]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          score=$(curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&category=performance" \
            | jq '.lighthouseResult.categories.performance.score')
          echo "PSI Mobile Performance: $score"
          if (( $(echo "$score < 0.95" | bc -l) )); then
            curl -X POST -H 'Content-type: application/json' \
              --data "{\"text\":\"⚠️ PSI 점수 하락: $score\"}" \
              ${{ secrets.SLACK_WEBHOOK }}
          fi
```

---

## 9. 백업·복구

### 9-1. 코드

- GitHub 자체가 백업
- 추가로 GitHub Mirror(GitLab 등)로 이중화 검토

### 9-2. 콘텐츠

CMS 사용 시:
- Sanity, Contentful: 자체 백업 + 정기 export
- 자체 DB: 일일 백업, 30일 보관, 분기별 복구 훈련

### 9-3. 환경변수·시크릿

- 안전한 비밀 관리자(1Password, Bitwarden Family Plan)에 별도 보관
- CF 대시보드에서 한 번 암호화하면 다시 못 봄

### 9-4. 도메인·DNS

- 도메인 자동 갱신 활성화
- DNS 설정 스크린샷 또는 export 보관

---

## 10. 출시 절차 (Production Deploy Day)

### 10-1. 출시 전날

- [ ] `docs/22-go-live-checklist.md` 모든 항목 ✅
- [ ] 스테이징 환경에서 최종 점검
- [ ] 팀 공지

### 10-2. 출시 당일

1. PR 머지 → main 브랜치
2. CF Pages 자동 빌드 트리거
3. 빌드 로그 모니터링 (실패 시 즉시 롤백)
4. 배포 완료 후 즉시 검증:
   - PageSpeed Insights 점수 확인
   - 핵심 플로우 수동 테스트
   - 에러 모니터링 (Sentry)
   - 보안 헤더 (securityheaders.com)
   - AI 크롤러 시뮬레이션 (curl)
5. Search Console 사이트맵 제출
6. 4주간 일일 트래픽·순위 모니터링

### 10-3. 마이그레이션인 경우

- [ ] 301 리다이렉트 매핑 검증 (체인·루프 0건)
- [ ] Search Console 주소 변경 도구 사용 (도메인 변경 시)
- [ ] 기존 사이트 검색 순위 모니터링

---

## 11. 비용

| 항목 | 무료 한도 | 비고 |
|---|---|---|
| Cloudflare Pages | 빌드 500회/월, 무제한 트래픽 | 충분 |
| GitHub Actions (Public) | 무제한 | Public 저장소 |
| GitHub Actions (Private) | 2,000분/월 | 6시간 cron = ~120회/월 = 충분 |
| Cloudflare Web Analytics | 무료 | 무제한 |
| GA4 | 무료 | 월 1천만 이벤트까지 |
| 도메인 | $10~15/년 | |
| Sentry | 무료 (5K 에러/월) | 작은 사이트 |

**총 비용: 도메인 비용($10~15/년)만**.

---

## 12. 검증 체크리스트

- [ ] GitHub 저장소 생성, 브랜치 보호 활성화
- [ ] Cloudflare Pages 연결, 자동 빌드 동작
- [ ] 환경변수 등록 (Production + Preview)
- [ ] 커스텀 도메인 연결, HTTPS 인증서 발급
- [ ] PR 미리보기 noindex 처리
- [ ] CF Deploy Hook 생성, GitHub Secret 등록
- [ ] 정기 재빌드 cron 워크플로 동작
- [ ] Lighthouse CI 워크플로 PR 검증 동작
- [ ] CI 워크플로 (lint, test, e2e) 통과
- [ ] Uptime 모니터링 설정
- [ ] 에러 알림 설정 (Sentry)
- [ ] 빌드 실패 알림 활성화
- [ ] 백업·복구 절차 문서화
- [ ] 출시 절차 문서화

---

**다음 작업**: `docs/20-external-api.md` — 외부 API 통합 패턴.
