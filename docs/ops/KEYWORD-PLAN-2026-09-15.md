# 네이버 빈틈 키워드 계획 v1 — 머니룩 (2026-09-15, 운영자 결재 전)

목적은 하나다. **머니룩 글이 네이버 통합검색 웹문서 블록 최상단에 올라 트래픽을 모으고 애드센스 수익을 키운다.**
"검색량 큰 키워드"가 아니라 **"자리가 열린 키워드"** 를 찾는다. 검색량은 정렬용이고 발행 판단은 검색 결과 실측으로 한다.

- 1단계 프로파일: `SITE-KEYWORD-PROFILE.md` (축·트랙·패밀리·출처·함정·자매 경계·속도)
- 근거 실측: `research/2026-09-15-naver-probe.json` · 큰 키워드 초안: `big-keywords.json`
- 참조 구현: awoo.or.kr `docs/ops/KEYWORD-PLAN-2026-09-10.md` 와 scripts. **구조만 가져왔다.**
- **이 문서가 결재되기 전에는 코드를 쓰지 않는다.** §13 결정이 먼저다.

## 1. 실측이 말한 것 (2026-09-15)

| # | 사실 | 수치 | 결론 |
|---|---|---|---|
| 1 | 큰 키워드는 전부 벽 | 헤드 42개 자사 10위 내 **0**. 상위 10 구성: 관공서 32% · 도구 17% · 상업 13% · 공단 11% · UGC 11% · 법률 9% · 금융사 6% | 헤드는 타깃이 아니라 롱테일의 뿌리 |
| 2 | 롱테일은 더 관공서 | 롱테일 27개 문서 270건: 관공서 46% · 상업 21% · 도구 9% · 공단 7% · **자매 5%** | 열린 자리는 드물다. 자리를 재고 들어가야 한다 |
| 3 | **병목은 색인이 아니라 순위** | 9/8~9/15 루틴 신규 8편: 정확한 제목 검색으로 **7편 색인 확인**(1~6일). 대표 키워드로는 **7편 모두 30위 밖** | 사건 헤드("아동기본수당")가 아니라 **사건 × 대상** 롱테일을 타깃으로 |
| 4 | 자매가 우리 자리에 있다 | 롱테일 27개 중 **10개에 awoo.or.kr 13회**, 조기재취업수당 조건·주휴수당 15시간 미만은 **awoo 1위**. 근로장려금 35% 선지급 awoo 1위·자사 5위 | 경계 결정(§13-2) 없이는 같은 집안끼리 싸운다 |
| 5 | 열린 자리의 절반은 **이미 우리 글이 있다** | 권고사직(3편)·주휴수당(2편)·조기재취업수당(04-04)·ISA 중도해지(07-03) — 모두 10위 밖 | 신규보다 **기존 글 갱신·진단**이 먼저인 자리가 많다 |
| 6 | 루틴이 자매 각도를 고른다 | 신규 8편 중 3편(종부세 주택 수 제외·고령 운전자 면허·아동기본수당) | 주제 선정에 자매 경계를 넣는다 |
| 7 | 추적이 끊겼다 | 순위 측정 9/8 이후 0회, 네이버 수요 측정 9/7 이후 0회 (로컬 주 2회 운영이 안 지켜짐) | **GitHub Actions 로 자동화** (§9) |
| 8 | 추적 키워드 순위 | 10위 내 3/13 (9/8 대비: 연말정산 일정 2027년 1월 3위→권외, 종부세 고지서 11월 7→17위) | 기존 상위 글도 갱신 없으면 빠진다 |

한계: 순위는 **웹문서 검색 API 기준**이라 통합검색 첫 화면과 다르다. 네이버 실유입(서치어드바이저·애널리틱스)은 아직 한 번도 투입되지 않았다. awoo 는 7일 실유입으로 설계 판단 18개를 뒤집었다. **머니룩도 첫 CSV 가 들어오면 이 계획의 가중치를 다시 맞춘다.**

## 2. 원칙

1. **발행 트리거 = 열린 자리.** 위에 관공서·공단·도구가 적고, 자매가 상위 3 에 없고, 우리 글이 3위 안이 아닐 때.
2. **이미 1~3위면 새 글 금지, 갱신만.** 4~30위면 새 글보다 기존 글 진단 먼저.
3. **검색량 0 이어도 버리지 않는다.** 검색어 트렌드 API 는 작은 쿼리를 0 으로 준다. 정렬에만 쓴다.
4. **없는 제도·가짜 차수로 쓰지 않는다.** 수요가 크면 "없다·아직 아니다"를 1차 출처로 확인하는 V형.
5. **신규 일 1편은 그대로다.** 구글 회복 체제(CLAUDE.md). 물결은 갱신으로 흡수한다.
6. **공식 API 만 쓴다.** 네이버 통합검색 페이지 수집·브라우저 위장·매크로·계정 대량·링크 구매·클릭 조작은 설계에서 뺀다.
7. **자매 각도는 경쟁하지 않는다.** 신규 선정에만 적용, 기존 글은 삭제하지 않는다.

## 3. 트랙

| 트랙 | 대상 | 타깃 쿼리 형태 | 배분 | 게이트 |
|---|---|---|---|---|
| **T1 물결 버스트** | 정책 사건(정부안·확정·개시·적용일) × 대상 세그먼트 | "2027 고용보험료율 월급 300만원 공제액" | 창 안이면 **그날 1건 자리 최우선** | 창(발표 D0~D+10 / 개시 D-7~D+8) + scout T1 open + 1차 출처 URL + 잠금 장부 |
| **T2 대형 세부 롱테일** | big-keywords × 의도(조건·계산·기한·예외·비교·사후) | "주휴수당 퇴사하는 주", "본인부담상한제 사전급여" | 창 밖 날의 1건 자리 | scout T2 open + 잠금 장부 |
| **T3 선점 캘린더** | 연례 날짜(연말정산·종소세·근로장려금·요율 적용일·"내년부터 달라지는") | "2027년부터 달라지는 월급 공제" | writeBy 도래분, 주 0~1건 | `landgrab-calendar.json` writeBy ≤ 오늘 + scout |
| **갱신** | 기존 글: 날짜 D-3~D+1, 4위 이하 하락, 열린 자리인데 10위 밖 | 제목·slug 불변 | 신규와 별도(카운트 안 됨), 일 2~3건 | 사실·날짜·표·updatedAt 만 |

패밀리 A(하기 전)·B(하고 난 뒤)·V(정말인가) 정의와 잠금 단위는 프로파일 §3.

## 4. 측정 — 공식 API 로 무엇을 재고, 못 재는 것은 어떻게 채우나

### 4-1. awoo scout 필드와 머니룩 대응

awoo `naver-rank-check.mjs --mode=scout` 는 `search.naver.com` 을 크롬 User-Agent 로 받아 파싱한다. 머니룩은 그 페이지를 받지 않는다(robots `Disallow: /`). **출력 필드 이름은 awoo 와 맞춰** 파이프라인·위젯 코드를 옮겨 쓰기 쉽게 한다.

| 필드 | awoo 방법 | 머니룩 방법 | 차이 |
|---|---|---|---|
| `rank` | 통합검색 웹문서 블록 | **webkr API 30위까지** | 첫 화면 순위와 다름 |
| `webDocCount` | 블록 문서 수 | webkr `total` | 의미 다름(총량) |
| `openSlots` | 상업·블로그·옛 문서 | 상위 10 중 commercial·ugc·stale | 동일 개념 |
| `mainGovAbove` | 본청 go.kr | 상위 5 안 gov | 동일 개념 |
| `publicAbove` · `toolAbove` · `fincoAbove` | — | **신설** (금융 분야 벽) | 추가 |
| `pressAbove` | 블록 위 언론 | **`newsWall`** = 뉴스 API 7일 기사 수 | webkr 에 언론은 1% 뿐, 뉴스는 별도 블록이라 대리지표 |
| `sisterAbove` | sister-sites | 동일 (awoo.or.kr 추가) | 동일 |
| `webDocOffset` | HTML 에서 블록 시작 위치 % | **자동 측정 불가** → `eyeOffset` (§4-3) | 사람 확인 |
| `verdictT1/T2` | 규칙 | 규칙(§4-4) | 임계값 새로 |

### 4-2. 호스트 분류표 (금융 분야 초안)

순서대로 판정한다. 실측 보정 이력은 research JSON `_readme`.

| kind | 규칙 | 예 |
|---|---|---|
| `us` | asiatop.co.kr | |
| `sister` | sister-sites.json hosts + awoo.or.kr | awoo.or.kr |
| `tool` | 조회·계산·발급 서비스 호스트 목록, 또는 제목·URL 에 계산기·모의계산 | hometax·wetax·si4n.nhis·4insure·gov.kr·plus.gov.kr·realtyprice·carinfo.knia·finlife.fss·safedriving |
| `law` | 법률·노무 상담 | easylaw.go.kr·nodong.kr·lawtalk·scourt |
| `gov` | *.go.kr · korea.kr | nts·moel·work24·mohw·molit·지자체 |
| `public` | *.or.kr 공단·공공기관 | nhis·nps·kinfa·khug·silson24 |
| `press` | 언론 호스트 목록 + news·ilbo·times 패턴 | yna·chosun·mk·taxtimes |
| `finco` | 은행·카드·보험·증권·핀테크 | toss·banksalad·kbstar·wooribank·kebhana·miraeasset·kbsec·kakaobank |
| `naver` | **신설** 네이버 자사 서비스 | pay.naver.com·terms.naver.com(지식백과) |
| `ugc` | 블로그·카페·위키·커뮤니티 | blog.naver·tistory·brunch·namu.wiki |
| `commercial` | 그 외 | 정보성 상업 사이트 |

`stale` = 제목 속 연도 최댓값 < 올해. 옛 문서는 kind 와 무관하게 빈자리로 센다(자사·자매 제외).

### 4-3. 웹문서 블록 위치 — 사람 눈 1분

API 로는 통합검색에서 웹문서 블록이 얼마나 아래 있는지 알 수 없다. awoo 는 이 값(≥30% 닫힘)을 핵심 게이트로 쓴다.

- **대시보드 상위 5건에만** [첫 화면] [한 번 스크롤] [그 아래] 버튼. 운영자가 본인 브라우저로 검색해 보고 누른다. 하루 1분.
- 누른 값은 `eyeOffset` 1/2/3 으로 큐에 저장. 3 이면 닫힘.
- 안 누르면 0점(감점 없음). 대신 **쿼리 성격 대리지표**: 상업 의도(대출·보험 가입·카드·계좌 개설)는 광고·금융사 블록이 위에 선다 → 경고.
- 사후 진실값은 서치어드바이저 CSV 의 노출·평균순위(§4-6).
- Claude 는 자동화 브라우저로 네이버 검색을 대신 하지 않는다(수집과 같다).

### 4-4. verdict 규칙 (초안, 2주 뒤 CSV 로 보정)

| 조건 | T2 open | T1 open |
|---|---|---|
| 자사 순위 | null 또는 >3 | null 또는 >3 |
| 도구 (상위 10) | ≤2 | ≤2 |
| 관공서+공단+도구 (상위 5) | ≤3 | ≤4 |
| 자매 (상위 3) | 0 | 0 |
| 네이버 자사 서비스 (상위 3) | 0 | 0 |
| openSlots | ≥1 | 제한 없음 |
| newsWall (7일 기사) | ≤15 | ≤40 (15 초과는 경고) |
| eyeOffset | ≠3 | ≠3 |

### 4-5. 검색량

- **기준어 = 실업급여** (30일 평균 = 100). 호출마다 포함해 호출 간 정규화 문제를 없앤다. awoo 와 같은 눈금이라 자매끼리 비교 가능.
- 값 0 인 날짜는 축에 맞춰 0 으로 채운다(`alignToAxis`, API 가 0 을 생략한다).
- `born` = 최초 관측 후 일수 ≤14. awoo 의 `days` 버그(창 길이로 계산해 전부 신생 판정)를 처음부터 피한다.
- `recent7 / prev7 ≥ 1.5` = 상승.

### 4-6. 순위·실유입

- 순위: 기존 `naver-rank-track.mjs` 에 `docs/ops/rank-targets.json` 입력을 추가. 매일 1회.
- 실유입: 기존 `naver-console-import.mjs`. 서치어드바이저 **검색어** + **문서** 탭, 네이버 애널리틱스 검색어를 **주 1회** inbox 투입(§13-6). 결과 JSON 을 파이프라인이 읽어 `inbound7d` 로 쓴다.

## 5. 기존 도구와 awoo 대응 (새로 만들지 않고 확장)

| awoo | 머니룩 현재 | 할 일 |
|---|---|---|
| `naver-rank-check --mode=scout` (수집) | `audit/naver-serp.mjs` (webkr·blog·kin 상위 문서) | **`audit/naver-scout.mjs`** 로 확장: §4-1 필드·§4-2 분류표·§4-4 verdict. 단건 `--query`, 파일 `--file` |
| `naver-rank-check --mode=track` | `audit/naver-rank-track.mjs` | rank-targets.json 입력, 글 frontmatter `targetQuery` 자동 수집 |
| `keyword-radar.mjs` | `audit/naver-discover.mjs`(뉴스 신생어) + `audit/naver-demand.mjs`(경쟁·트렌드) | 시드를 big-keywords 로 바꾸고 스냅샷을 `docs/ops/radar/` 에 |
| `keyword-volume.mjs` | naver-demand 의 주간 상대값 | **`audit/naver-volume.mjs`** 신설 (§4-5) |
| `ingest-analytics.mjs` | `audit/naver-console-import.mjs` | 주간 결과를 파이프라인 입력으로 |
| `build-cluster-intents.mjs` | 없음 | **`audit/naver-ledger.mjs`** 신설 → `docs/ops/cluster-intents.json` |
| `keyword-pipeline.mjs` | topics SKILL §2-3 수작업 규칙 | **`audit/naver-pipeline.mjs`** 신설 |
| `landgrab-calendar.json` | `editorial/policy-calendar-2026-Q4.json` (45건) | 변환 + writeBy + 2027 Q1 추가 |
| `ops-widget.mjs` · `목록.md` | 없음 | 신설 |
| `ops-dashboard.mjs` | 없음 | 신설 (dashboard.html 은 gitignore) |
| `post.md` | daily-post 스킬 + 콘텐츠 팀 3단 | `/post` 신설, 기존 팀 재사용 |
| 에이전트 hunter·serp-scout·writer·fact-checker·gatekeeper·quality-gate | content-strategist·content-agent·content-auditor + 빌드 가드 | **신설 3**: naver-gap-hunter · naver-serp-scout · fact-checker. writer = content-agent. gatekeeper·quality-gate 는 content-auditor + 기존 가드(publish-cadence·template-footprint·ai-tell-style·safe-expression)에 **잠금 장부·14자 shingle 15%** 두 개를 더해 흡수 |

## 6. 판정과 큐

### 6-1. 잠금 장부 `docs/ops/cluster-intents.json`

- 673편을 **[제도 × 세그먼트 × 적용연도] × 패밀리** 로 분류. frontmatter 에 coreFacts 가 없으므로 제목·keywords·faq·첫 표에서 추출하고, 추출 실패는 `needsReview` 로 남긴다.
- 30편 넘는 산출이라 CLAUDE.md 대규모 변경 패턴: dry-run 리포트 먼저, 샘플 20편 사람 확인 후 확정.
- 신규 글부터 frontmatter 선택 필드 `targetQuery`·`coreFacts{who, amount|rate, deadline|effectiveDate, basis}` 추가(기존 글 무변경 → lastmod 영향 없음).
- 명령: `--check "<제도 세그먼트 연도>" <A|B|V> [--facts=파일]` → PASS / VETO(같은 조합) / FIX(coreFacts 핵심값 2개 이상 겹침). `--append <파일>`.
- 패밀리 판정 정규식은 프로파일 §3 제목 단서.

### 6-2. 파이프라인 `audit/naver-pipeline.mjs`

입력: 레이더 스냅샷 · 순위 이력 · 검색량 · big-keywords · landgrab-calendar · 잠금 장부 · 기존 글 · 서치어드바이저 주간 결과
→ 후보 생성(T1 / T2 / T3 / 새 키워드 / 갱신)
→ 실측 예산 안에서 scout
→ `exposureOf` 점수
→ `docs/ops/pipeline-queue.json` + `docs/ops/DAILY-KEYWORDS.md`

**실측 예산 (하루)**. awoo 는 수집 예의 때문에 35건이지만 머니룩 병목은 API 한도가 아니라 **발행 1건**이다. 넉넉히 재고 10건만 보여준다.

| 구분 | scout | 비고 |
|---|---|---|
| T1 (창 안) | 60 | 사건 × 세그먼트 |
| T2 | 50 | big-keywords × 의도 |
| T3 | 10 | writeBy 도래분 |
| 새 키워드 (discover) | 20 | 1차 출처 실재 확인 전은 `unverified` |
| 재측정 | 30 | 큐 proposed·approved |
| **합계** | **170** (호출 약 340) | 검색 API 무료 일 25,000 · 트렌드 월 30,000 중 약 1,500 |

### 6-3. 노출 가능성 점수 `exposureOf` (머니룩 v0)

awoo 기본식에서 API 로 못 재는 항목을 바꾸고 금융 분야 벽을 넣었다. 가중치는 CSV 투입 2주 뒤 보정.

```
자사 1~3위                        → 점수 0, 갱신으로 보냄
verdict open                      +40
openSlots  ≥4 +15 · 2~3 +10 · 1 +5
관공서+공단+도구(상위 5)  0 +10 · 1 +5
newsWall(7일 기사)  ≤3 +10 · ≤15 +5
eyeOffset  첫 화면 +10 · 한 번 스크롤 +5 · 그 아래 → 닫힘 · 미확인 0
자사 4~10위 +5 · 11~30위 +3
실유입(서치어드바이저 주 클릭) ≥100 +10 · ≥30 +5
최근 7일 상승(≥1.5배) +5 · 신생(≤14일) +5 · 창 안(T1·T3) +5
금융사(상위 10) ≥4            −10   상업 의도, 광고 블록
1차 출처 URL 미확보·정부안 단계  −10   V형 제안
자매 상위 4~10                −5    (상위 3 이면 이미 닫힘)
0~100 clamp · 70↑ 높음 · 45~69 중간
```

### 6-4. 큐 상태와 보존

- 상태: `proposed` / `approved` / `published` / `hold` / `rejected`.
- 사람이 넣은 항목(id 접두 `빈틈:`)은 자동 실행이 지우지 않고 **21일 보존**(awoo 2026-09-14 사고 방지).
- 글의 `targetQuery` 가 큐 쿼리와 같으면 자동 `published`.
- 시한 글(마감·신청 기간)은 발행 시 **종료 후 갱신 항목**을 큐에 자동 추가.

### 6-5. 갱신 후보

1. 날짜 사실이 D-3~D+1 인 글 (policy-calendar 날짜 + 본문 날짜 추출)
2. 추적 쿼리 4위 이하로 하락 → 패밀리 B 신규 또는 갱신 판단
3. **열린 자리인데 우리 글이 10위 밖** (§1-5) → 진단 리포트: 타깃 쿼리가 제목 선두에 있나 · 1차 출처·날짜가 올해인가 · 자매 글과 각도 겹침
갱신 범위: 사실·날짜·표 행·updatedAt·lastReviewed. **제목·slug·구조·전면 재작성 금지**(CLAUDE.md). 본문 무변경 lastmod 금지.

## 7. 운영자 화면과 명령

### 7-1. "목록"

`.claude/commands/목록.md` + `audit/naver-ops-widget.mjs`. 운영자가 **목록** 이라고 치면 채팅 위젯으로 노출 가능성 순 10건.

- 맨 위 한 줄: `오늘 발행 N건(자동 N · 수동 N) · 어제 N건 · 오늘 신규 자리 남음/없음` — git 에 추적된 파일만 센다.
- 행마다: 쿼리 · 점수 · 이유 3개 · 조건 한 줄 · **[발행 지시 ↗]** **[보류]**. 미측정은 **[실측 ↗]**. 상위 5건은 웹문서 위치 버튼 3개(§4-3).
- 버튼은 채팅으로 `/post 대시보드 지시: <id>` / `보류: <id>` 를 보낸다.

### 7-2. 대시보드

`audit/naver-ops-dashboard.mjs` → `docs/ops/dashboard.html` (gitignore). 앱 오른쪽 브라우저 패널에서 로컬 파일로 연다(프로덕션 광고 페이지 아님).
**킥포인트 6칸만**: 오늘 할 일 / 어떤 키워드·어떻게 / 오늘 쓸 글감 / 순위 / 갱신 / 일정. 보기 복잡하면 실패다.

### 7-3. `/post`

- 인자에 `대시보드 지시` 가 있으면 버튼을 누른 것이다. 큐 항목을 브리프로 쓰고 `exposure.reasons` 를 content-agent 브리프 맨 앞에 둔다. content-strategist 단계와 결재 질문은 생략(큐가 이미 SERP 분석을 담고 있다).
- `보류:` 로 시작하면 `hold` 로 바꾸고 끝낸다.
- **오늘 신규 자리가 이미 쓰였으면** 검증까지 끝낸 초안을 브랜치에 두고 "왜 오늘 안 내는지·언제 내는지"를 보고한다.

### 7-4. 에이전트 (신설 3)

| 에이전트 | 일 | 한도 |
|---|---|---|
| naver-gap-hunter | 새 빈틈 발굴. discover·레이더에서 후보를 골라 scout, **1차 출처로 실재 확인** | scout 25회/실행 |
| naver-serp-scout | scout JSON 을 사람 말로 해석, 열림·닫힘 이유 | — |
| fact-checker | 1차 출처 교차검증, 점수 제안, "현재 문장 → 고칠 문장" | — |

content-auditor 에 추가: 잠금 장부 `--check` · 14자 shingle ≤15% · 소멸성 부채(시한 글에 갱신 일정 있나) · 미확정 단정(safe-expression 연동).

## 8. 발행 규칙 (CLAUDE.md 와 맞춤)

순서: 작성(content-agent) → **fact-checker · content-auditor 병렬** → FIX 반영 → 빌드 가드 → 커밋 → PR → CI green → 라벨(§13-5) → 자동 머지 → URL 200 → IndexNow(기존 `indexnow.yml`) → 큐 `published` → 잠금 장부 append.

- 신규 일 1편: 루틴·수동 합산. `publish-cadence.mjs` 가 막는다.
- 제목 형태 3일 연속 금지(`template-footprint.mjs` 확장).
- 이미 자사가 1~3위인 자리에 새 글 금지. 없는 제도·가짜 이름 금지.
- 품질 점수 noindex 구조는 머니룩에 없음 → 해당 없음.
- 루틴은 `pipeline-queue.json` 의 `approved` 를 **첫 입력**으로 읽는다(자격증명 없이 읽기만). 승인 항목이 없으면 기존 §2-3 순서(달력 → 신생 → 갭 → GSC).

## 9. 자동화

| 워크플로 | 주기 | 하는 일 |
|---|---|---|
| `naver-keywords.yml` · radar | 하루 2회 (KST 07:10 · 16:10) | discover + demand 스냅샷 |
| `naver-keywords.yml` · rank | 매일 KST 08:40 | rank-track |
| `naver-keywords.yml` · pipeline | 매일 KST 09:00 | ledger 재생성 → volume → scout → pipeline → 큐·보고서. 운영자가 낮에 "목록"으로 승인한 항목을 **다음 날 03:00 루틴**이 소비 |

- **자격증명**: 리포 시크릿 `X_NCP_APIGW_API_KEY_ID` · `X_NCP_APIGW_API_KEY` 를 **운영자가 등록**한다(Claude 는 키를 입력하지 않는다). 기존 `NAVER_CLIENT_ID/SECRET` 은 개발자센터 키라 트렌드가 401.
- **빌드 큐 보호**: 봇 커밋 메시지에 `[CF-Pages-Skip]` → Cloudflare Pages 가 데이터 커밋으로 빌드하지 않는다(무료 플랜 동시 1건).
- 포맷 검사: 머니룩에는 biome·prettier 가 없어 제외 설정이 필요 없다.
- 워크플로 신설이라 `ci.yml`·`auto-merge.yml` 은 건드리지 않는다.

## 10. 구현 순서 (결재 후)

| 단계 | # | 파일 | 의존 |
|---|---|---|---|
| **P1 측정** | 1 | `docs/ops/sister-sites.json` (머니룩 관점, awoo.or.kr 포함) + 분류표 모듈 | 결정 1·2 |
| | 2 | `audit/naver-scout.mjs` (naver-serp 확장) | 1 |
| | 3 | `audit/naver-volume.mjs` | — |
| | 4 | `docs/ops/rank-targets.json` + rank-track 입력 | — |
| **P2 판정** | 5 | `audit/naver-ledger.mjs` → `cluster-intents.json` (dry-run → 샘플 확인 → 확정) | — |
| | 6 | content schema 선택 필드 `targetQuery`·`coreFacts` | — |
| | 7 | `docs/ops/landgrab-calendar.json` | — |
| | 8 | `audit/naver-pipeline.mjs` → 큐·DAILY-KEYWORDS.md | 2~7 |
| **P3 화면** | 9 | `목록.md` + ops-widget | 8 |
| | 10 | ops-dashboard (gitignore) | 8 |
| | 11 | `/post` + 에이전트 3 + content-auditor 보강 | 5·8 |
| **P4 연결** | 12 | topics·daily-post SKILL §2-3 첫 입력 = 큐 approved | 8 · 결정 5 |
| | 13 | `naver-keywords.yml` | 시크릿 등록(결정 7) |
| | 14 | CLAUDE.md 개정 (라벨 권한·신규 입력원) | 결정 4·5 |

P1~P3 는 인프라 PR 3개(draft + `no-auto-merge`), P4 는 루틴에 닿으므로 따로 1개.

## 11. 완료 기준

1. 대표 키워드 3개(예: 주휴수당 퇴사 주 · 본인부담상한제 사전급여 · 청년미래적금 중도해지)로 scout 를 돌려 자사·관공서·공단·도구·언론·금융사·자매·상업을 **금융 분야 기준으로 맞게** 분류함을 보여준다.
2. 파이프라인 1회 실행으로 **머니룩 주제 후보 5건 이상**이 점수 순으로 큐와 보고서에 나오고, 후보마다 이유·조건이 붙는다. awoo 주제(지자체 지원금)가 섞이면 실패.
3. "목록" → 위젯 → [발행 지시] → `/post` 흐름이 초안 1건의 검증(fact-checker·auditor·빌드 가드)까지 끝까지 동작한다.
4. 잠금 장부가 기존 글을 [제도 × 세그먼트 × 연도] × 패밀리로 분류하고, 중복 후보를 VETO 한다(예: "조기재취업수당 신청 A" → `early-reemployment-allowance-application` 과 VETO).
5. 이 문서에 트랙·점수식·실측 예산·함정·운영자 결정 표가 있다. ✅

## 12. 지표 (결재 후 2주·4주 판정)

| # | 지표 | 기준선 (2026-09-15) | 2주 목표 |
|---|---|---|---|
| 1 | 파이프라인 경유 신규 글, 발행 14일째 타깃 쿼리 웹문서 10위 내 | 루틴 신규 0/7 (대표 키워드) | ≥ 50% |
| 2 | 추적 키워드 웹문서 10위 내 비율 | 3/13 | ≥ 40% |
| 3 | 자매 각도 신규 발행 | 3/8 | 0 |
| 4 | 도구·자매 점령 쿼리에 신규 발행 | 미측정 | 0 |
| 5 | 갱신으로 10위 내 복귀 | 연말정산 일정 2027년 1월 권외 | 1건 이상 |
| 6 | 서치어드바이저 주간 클릭 | **CSV 미투입** | 첫 투입 후 기준선 확정 |
| 7 | 큐 제안 대비 발행률·보류 사유 기록 | — | 사유 100% 기록 |

## 13. 운영자 결정

| # | 항목 | 기본값 (Claude 권고) | 이유 |
|---|---|---|---|
| 1 | 머니룩 몫 = "직장인·사회초년생의 돈" 6축 | 확정 | 자매 roles `사회초년생` |
| 2 | awoo 와 경계 (실업급여·주휴수당·근로장려금·청년미래적금) | **머니룩 몫**, awoo 는 지자체형만. awoo roles 에 awoo 자신을 추가 | 롱테일 10/27 에 awoo, 2개 1위 |
| 3 | 육아휴직급여(직장인 관점) · ISA·연금저축(절세 계좌) | 머니룩 몫. 육아 일반·투자 상품 비교는 금지 | 기존 ISA 9편·월급 관점 |
| 4 | T1 물결에도 신규 일 1편 유지 | **유지**, 넘치면 갱신 | 구글 억제 원인이 대량 발행 |
| 5 | [발행 지시] 버튼 = 운영자 승인 → Claude 가 `merge-approved` 부착 | 허용, 항목 단위·일 1편 이내. CLAUDE.md 개정 | 버튼이 곧 항목별 결재 |
| 6 | 서치어드바이저(검색어·문서) + 애널리틱스 검색어 CSV 주 1회 투입 | 한다 (월요일) | 가중치 보정의 유일한 실측 |
| 7 | GitHub 시크릿 HUB 키 2개 등록 | 운영자가 등록 | 로컬 주 2회가 끊겼다(§1-7) |
| 8 | 웹문서 위치 눈 확인 하루 5건 | 한다 (1분) | 안 하면 awoo 핵심 게이트 없이 운영 |
| 9 | 자매 각도 기존 글(연금·부동산 등) | 갱신은 계속, 신규만 금지 | 대량 삭제 금지 |

## 14. 미해결

- 웹문서 블록 위치를 API 로 못 잰다. 대리지표(뉴스량·쿼리 성격)의 정확도는 CSV 대조 전까지 모른다.
- 네이버 실유입 0건 투입. 점수 가중치는 awoo 값을 옮긴 것이다.
- 웹문서 API 순위 ≠ 통합검색 첫 화면. 9/8 메모리: 근로장려금 글 3편 API 1~3위인데 첫 화면 0건.
- 신규 8편 "30위 밖"은 대표 키워드(헤드) 기준이다. 세그먼트 롱테일로 재면 다를 수 있다 — P1 scout 로 재측정.
- awoo roles 에 awoo 자신이 없다. 경계 결정은 awoo 쪽 파일에도 반영돼야 한다.
- 잠금 장부 추출 정확도(coreFacts 없는 673편) — dry-run 샘플로 확인.
- 정부안 글이 확정됐을 때 갱신 일정을 큐에 넣는 트리거(고시·국회 통과 감지)는 discover 뉴스 규칙으로 만들 예정, 오탐률 미측정.
