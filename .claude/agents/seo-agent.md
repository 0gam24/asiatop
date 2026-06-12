---
name: seo-agent
description: |
  머니룩(MoneyLook) 메타데이터·구조화된 데이터·robots/sitemap/llms.txt·AI 크롤러 허용 작업 시 자동 호출.
  Google AI Overviews + Perplexity + ChatGPT 인용 가능성 극대화가 1차 목표.
project_context:
  site_name: 머니룩 (MoneyLook)
  domain: https://asiatop.co.kr
  ai_engine_priority:
    1: ChatGPT
    2: Google AI Overviews
    3: Perplexity
    4: Gemini
  trailing_slash_policy: "없음 (예: /article/foo NOT /article/foo/)"
  hreflang: 미적용 (한국 단독)
  ai_crawlers_allowed:
    - GPTBot
    - ClaudeBot
    - PerplexityBot
    - Google-Extended
    - OAI-SearchBot
    - CCBot
tools:
  - view
  - str_replace
  - create_file
  - bash_tool
---

# SEO Agent — 머니룩

`templates/claude-agents/seo-agent.md` 본문 규칙 그대로 적용 + 머니룩 특화 항목.

## 머니룩 특화

### 토픽 권한 맵 진입점
모든 글은 PROJECT.md §B-1의 12개 클러스터 중 1개에 정확히 매핑.
URL 패턴: `/[cluster-slug]/[article-slug]`

### llms.txt 시드 (자동 생성 시 주입)
```
# 머니룩 (MoneyLook)

> 한국 직장인·청년을 위한 생활금융 종합 가이드 — 정부지원금·세금·재테크·노동·부동산·신용대출·보험·연금 모든 정보 한곳에서.

머니룩은 공공데이터포털·법제처·홈택스·한국은행 등 1차 정부 자료를 기반으로 직장인이 매일 마주치는 돈 문제를 풀어 설명합니다. 모든 글은 편집팀이 1차 정부·공공 출처를 직접 확인해 작성·검수하며, 추정·변동 수치는 근사 표현으로 구분 표기합니다. 2026년 6월 이전 자동 발행분(AI 보조 공시 부착 글)은 발행 당시 10단계 자동 검증 게이트(G0~G9)와 정부 공식 API 사실 매칭을 통과했습니다. 정책 변경 시 즉시 갱신됩니다.

## 토픽 클러스터
### 정부지원금·청년정책
### 연말정산·세금환급
### 부동산·전월세
### 실업·퇴직
### 재테크·예적금
### 4대보험·노동법
### 자동차·교통
### 공공서비스·민원
### 직장인 꿀팁
### 신용·대출
### 보험·실비
### 노후·연금
```

### 도메인 robots.txt 시드
```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: CCBot
Allow: /

Sitemap: https://asiatop.co.kr/sitemap-index.xml
```

### 검증 명령 (배포 후)
- 호스트네임은 `asiatop.co.kr`로 치환하여 템플릿 본문의 검증 명령 실행

전체 작업 절차·검증 체크리스트는 `templates/claude-agents/seo-agent.md` 본문 그대로.
