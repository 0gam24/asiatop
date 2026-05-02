# 머니룩 보안 정책

## 1. 핵심 원칙

- **API 키·시크릿은 절대 git에 커밋하지 않습니다.**
- **다중 방어선**으로 실수에 의한 노출 차단:
  1. `.gitignore` — 시크릿 파일 패턴 차단
  2. **pre-commit hook** — 커밋 시 시크릿 패턴 자동 감지·차단
  3. **CI gitleaks 스캔** — push·PR 시 추가 검증
  4. **자체 시크릿 스캐너** — 한국 공공·금융 키 패턴 추가 검사
  5. **주간 히스토리 스캔** — 매주 월요일 과거 커밋 점검

## 2. 키 보관 위치 매트릭스

| 키 종류 | 로컬 (.env.local) | GitHub Secrets | CF Pages Env | 코드 |
|---|:---:|:---:|:---:|:---:|
| `DATA_GO_KR_KEY` (공공데이터포털) | ✅ 개발용 | ❌ | ✅ Production | ❌ |
| `LAW_GO_KR_OC` (법제처 OC) | ✅ 개발용 | ❌ | ✅ Production | ❌ |
| `BOK_API_KEY` (한국은행 ECOS) | ✅ 개발용 | ❌ | ✅ Production | ❌ |
| `GA4_SERVICE_ACCOUNT_JSON` | ✅ 개발용 | ❌ | ✅ Production | ❌ |
| `PUBLIC_GA4_ID` (공개 ID) | ✅ 개발용 | ❌ | ✅ Production | ❌ |
| `PUBLIC_ADSENSE_CLIENT` (공개) | ✅ 개발용 | ❌ | ✅ Production | ❌ |
| `PUBLIC_SENTRY_DSN` (공개 DSN) | ✅ 개발용 | ❌ | ✅ Production | ❌ |
| `CF_DEPLOY_HOOK` (workflow용) | ❌ | ✅ | ❌ | ❌ |
| `INDEXNOW_KEY` (workflow용) | ❌ | ✅ | ❌ | ❌ (단, public/<key>.txt는 OK) |

> ❌ = 절대 두지 말 것 / ✅ = 적절한 위치

## 3. 신규 키 추가 절차

새 API 키를 추가할 때:

1. **`.env.example`에 키 이름 + 발급 절차 주석 추가** (값 X)
2. **`.env.local`에 실제 값 추가** (이 파일은 자동 .gitignore)
3. **CF Pages Environment Variables에 등록** (Production 탭)
4. **코드는 `import.meta.env.X`로만 참조**
5. **GitHub Actions 사용 키라면 GitHub Secrets에도 등록**

## 4. 실수로 시크릿이 커밋·푸시됐을 때

### 즉시 조치 (5분 안에)

1. **노출된 키 즉시 폐기·재발급**
   - 발급기관 웹사이트에서 키 삭제 또는 회전(rotate)
   - data.go.kr → 마이페이지 → 인증키 폐기·재발급
   - GA4 service account → JSON 삭제 후 새로 발급
   - CF Deploy Hook → CF Pages → Deploy hooks → 삭제·재발급
2. **새 키를 정상 위치(.env.local·CF Env·GH Secrets)에 등록**
3. **빌드·배포 정상 동작 확인**

### git 히스토리에서 제거

```bash
# BFG Repo-Cleaner 권장 (가장 빠름)
brew install bfg   # macOS
# 또는 https://rtyley.github.io/bfg-repo-cleaner/

# 1. 클린 클론
git clone --mirror https://github.com/0gam24/moneylook.git

# 2. 시크릿 제거
bfg --replace-text passwords.txt moneylook.git

# 3. 푸시 (force)
cd moneylook.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

자세한 가이드: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

## 5. 다중 방어선 상세

### 1차: .gitignore
```
.env
.env.local
.env.*.local
*.pem, *.key, *.p12
credentials.json, service-account*.json
secrets/, **/secrets/
*.secret, *.secrets
```

### 2차: pre-commit hook
- 위치: `scripts/git-hooks/pre-commit`
- 자동 설치: `pnpm install` 시 `prepare` script가 `core.hooksPath` 설정
- 검사 항목:
  - 차단된 파일명 패턴 (.env, *.pem, credentials.json 등)
  - 본문 시크릿 패턴 (AWS·GCP·GitHub·Stripe·Anthropic·OpenAI·data.go.kr·BOK 등)
- 통과 시에만 커밋 허용

### 3차: GitHub Actions (.github/workflows/secrets-scan.yml)
- **gitleaks**: 업계 표준 스캐너, 300+ 패턴
- **자체 스캐너**: 한국 공공·금융 키 패턴
- **주간 히스토리 검사**: 매주 월요일 과거 커밋 점검

### 4차 (옵션): GitHub Push Protection
GitHub Settings → Code security and analysis → Secret scanning → **Push protection enabled**

활성화 시 GitHub이 푸시 자체를 거부 (가장 강력한 마지막 방어선).

## 6. PUBLIC_ prefix vs 일반 변수

Astro 환경변수 규칙:
- **`PUBLIC_` 접두사 있음** → 빌드 후 클라이언트 JS에 포함 → **공개됨**
  - 사용 가능: GA4 Measurement ID, AdSense Client ID, Sentry DSN (모두 공개 키)
  - **절대 비밀 키 넣지 말 것** (커밋 안 했어도 사이트 방문자가 dev tools에서 조회 가능)
- **접두사 없음** → 빌드 타임에만 사용, 클라이언트 노출 X
  - 사용: data.go.kr·BOK·법제처·GA4 service account 등 모든 비밀 키

## 7. 정기 점검 체크리스트 (월 1회)

- [ ] `pnpm secrets:scan` 수동 실행 → 0건 확인
- [ ] CF Pages Env 항목 점검 (불필요한 키 삭제)
- [ ] GitHub Secrets 항목 점검 (사용하지 않는 키 삭제)
- [ ] 발급기관에서 키 사용 통계 확인 (오용 여부)
- [ ] `.gitignore` vs 실제 파일 시스템 점검 (실수로 추적되는 키 파일 X)

## 8. 문의·신고

보안 이슈 발견 시: smartdatashop@gmail.com (책임 있는 공개 원칙)
