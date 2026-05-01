# Brief 시스템

머니룩 콘텐츠 발행의 **첫 단계** — 글 작성 전 "왜·누구를 위해·무엇을·어떻게" 정식화하는 입력 파일.

## Brief가 무엇이고 왜 필요한가

기존엔 article-pipeline에 토픽 한 줄(`--topic "..."`)만 던지면 글이 나왔습니다. 이러면 누구를 위한 글인지·검색 의도가 무엇인지·어떤 1차 자료를 쓸지가 매번 달라져 품질·SEO 일관성이 흔들립니다.

`brief.yaml`은 발행 전 **10~15분 사이에 채워서** 시스템이 글을 만드는 데 필요한 모든 결정을 박제합니다. 기획 단계가 명시화되면 다음이 가능해집니다.

- AI가 동일 입력에서 동일 품질을 보장
- 글 하나당 출처·키워드·차별점·내부 링크가 사전 계획
- 발행 후 성과 추적·재검토 시 원래 의도와 비교 가능

## 작성 흐름

```
1. 니치 발굴 (검색 트렌드·경쟁사·독자 페르소나)
   ↓
2. brief 작성 (이 디렉토리, 10~15분)
   ↓
3. 검증 (pnpm brief:validate)
   ↓
4. article-pipeline 입력 (Gap 2에서 통합 예정)
   ↓
5. 초안 생성 → 사람 검수 → 발행
```

## 파일명 규칙

```
{YYYY-MM-DD}-{slug}.yaml
```

- `YYYY-MM-DD`: 발행 예정일 (`scheduled_publish` 와 동일)
- `slug`: 영문 소문자·하이픈만, 50자 이내

예: `2026-05-08-didimdol-vs-bogeumjari.yaml`

## 명령어

### 새 brief 만들기

```bash
pnpm brief:new
```

인터랙티브로 `cluster`·`slug`·`scheduled_publish`를 묻고 `_template.yaml`을 복사해 `meta` 섹션을 자동으로 채웁니다.

### brief 검증

```bash
pnpm brief:validate briefs/2026-05-08-didimdol-vs-bogeumjari.yaml
```

검증 항목:
- YAML 문법
- Zod 스키마 (필수 필드·타입)
- `meta.cluster` 가 12개 클러스터 enum 중 하나인지
- `meta.slug` 형식 (영문 소문자·하이픈, 50자 이내)
- `primary_sources[].url` 이 신뢰할 수 있는 도메인인지 (`.go.kr`, `.or.kr` 등 화이트리스트)
- `structure.sections[].uses_facts_from` 의 `src` id가 실제 `primary_sources` 에 있는지
- 키워드·검색의도 일관성 (경고 수준)

성공 시 ✅, 실패 시 ❌ 위치·수정 제안, 경고 시 ⚠️ 출력.

## 작성 시 참고

- [`_template.yaml`](_template.yaml) — 빈 양식, 필드별 한국어 주석
- 12 클러스터: `gov-support` / `tax` / `realestate` / `unemployment` / `savings` / `insurance-labor` / `auto` / `public-services` / `office-tips` / `credit-loan` / `insurance-personal` / `pension`
- 신뢰 도메인 화이트리스트: [`scripts/geo-audit.mjs`](../scripts/geo-audit.mjs) 참조

## 보관·버전관리

- 모든 brief 는 git 으로 관리됩니다 (`/briefs/*.yaml` 커밋 OK)
- 시크릿·개인정보 절대 포함 금지
- 발행 후에도 삭제하지 말고 보관 (재검토·성과 추적 시 원본 의도 확인용)
