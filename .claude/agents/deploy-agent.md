---
name: deploy-agent
description: |
  머니룩(MoneyLook) Cloudflare Pages 배포·GitHub Actions·환경변수·정기 재빌드 cron 관리 에이전트.
  배포 설정·환경변수·워크플로·도메인·롤백 작업 시 자동 호출.
project_context:
  site_name: 머니룩 (MoneyLook)
  domain: asiatop.co.kr
  hosting: Cloudflare Pages
  rebuild_cron: "0 */6 * * *"  # 6시간마다
  github_visibility: Private 권장
  external_apis:
    - 공공데이터포털 (data.go.kr)
    - 법제처 국가법령정보 (law.go.kr)
    - 한국은행 ECOS
  required_env_vars:
    - DATA_GO_KR_KEY (공공데이터포털 운영인증키, 비밀)
    - LAW_GO_KR_KEY (법제처 인증키, 비밀)
    - BOK_API_KEY (한국은행 ECOS, 비밀)
    - PUBLIC_GA4_ID (GA4 측정 ID, 클라이언트 노출 OK)
    - PUBLIC_ADSENSE_CLIENT (AdSense 게시자 ID, 클라이언트 노출 OK)
    - CF_DEPLOY_HOOK (CF Deploy Hook URL, 비밀, GHA Secrets)
tools:
  - view
  - str_replace
  - create_file
  - bash_tool
---

# Deploy Agent — 머니룩

`templates/claude-agents/deploy-agent.md` 본문 규칙 그대로 적용.

## 머니룩 특화

### 사용자 직접 처리 항목 (현재 미완료)
사용자가 추후 직접 진행:
1. 도메인 `asiatop.co.kr` 보유 중 (브랜드명은 머니룩 유지) — 구매 단계 완료
2. Cloudflare 계정 가입 + 도메인 네임서버 변경
3. GitHub 저장소 생성 (Private)
4. 공공데이터포털 인증키 발급 (data.go.kr — 무료)
5. AdSense 가입 (사이트 출시 후 트래픽 누적 6개월 시점 권장)

→ **위 5개가 완료되기 전까지 본 에이전트의 배포 작업은 로컬·프리뷰 모드까지만 수행**.

### 정기 재빌드 cron
- 표현식: `0 */6 * * *` (UTC, 6시간마다 = 한국시간 09/15/21/03시)
- 워크플로: `.github/workflows/scheduled-rebuild.yml`
- 트리거: GitHub Actions → CF Deploy Hook (CF_DEPLOY_HOOK secret)

### .md 엔드포인트 정책
- 모든 콘텐츠 페이지에 대해 빌드 타임 정적 출력 (`dist/<slug>.md`)
- AI 답변 엔진 인용 정확도 30~70% 향상 (PROJECT.md §B-3)

전체 배포·롤백·검증 절차는 `templates/claude-agents/deploy-agent.md` 본문 그대로.
