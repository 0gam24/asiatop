# 머니룩(asiatop.co.kr) AdSense 수익 극대화 — 통합 실행 기획서 (R3: 실측 정정 반영판)

> 기준일: 2026-06-11 (AdSense 승인 당일) · 저장소: `C:/Users/Necon/Downloads/Bibe-Code/00 Website/05 moneylook`
> 통합 원칙: ① 최고 득점 초안(rpm)의 "0→1 최속 가동" 골격을 기둥으로, ② measure의 측정·판단 규칙, ③ harness의 정책·롤백 구조 방어, ④ traffic의 시즌·리프레시 레버를 접목. ⑤ 충돌은 전부 **"1인 운영자 + 신규 AdSense 계정 + PageSpeed 100 사수 + LLM 비용 민감"** 기준으로 가장 보수적인 쪽을 채택.
> **R2 개정 원칙 (라운드 1 검토 반영)**: ⑥ 실물 코드와 어긋난 전제는 전부 폐기·정정 — auto-merge.yml(opt-out 실사 확인), Experiment.astro(전 variant 렌더+hidden 토글), Analytics.astro(consent default가 ga4Id 게이트 안), lighthouserc(전 assertion warn) 재실사 완료. ⑦ 광고 로드는 **IntersectionObserver lazy-init이 기본 설계**(fallback이 아님). ⑧ A/B 실험은 광고에서 폐기, **전후 비교(순차)** 로 전환. ⑨ 자동화 브라우저(Claude Preview·Chrome MCP)는 프로덕션 광고 페이지에 절대 접근 금지. ⑩ 운영 물량은 **주간 시간 예산 20h** 에서 역산. ⑪ 검색 품질(색인 건강·카니발리제이션·E-E-A-T)을 수익 방정식의 PV 인자 보호 장치로 격상.

## R3 — 실측 정정 레이어 (2026-06-12: AdSense·GSC 대시보드 + 프로덕션 curl 검증)

> 아래 실측이 R2 본문의 일부 전제를 뒤집는다. **충돌 시 R3 가 우선.** R2 본문은 이력 보존을 위해 유지.

### R3-1. 검증된 사실

| 사실 | 근거 | 뒤집히는 전제 |
|---|---|---|
| **광고 이미 송출 중 (Auto ads)** | AdSense: asiatop.co.kr 이번 달 $1.76·클릭 24 / 오늘 PV 187·노출 709 (페이지당 ~3.8개). 프로덕션 HTML `<ins>` 0개 → 노출은 전부 Auto ads | §2 "광고 노출 0" / §3-0 "Auto ads 전면 OFF로 시작" / 결정 #12 (env 는 이미 주입됨) |
| **이중 로더 라이브 확인** | curl 실측: 메인스레드 `ca-pub-7830821732287404` + Partytown `pub-…` (**ca- 접두사 누락 — 깨진 파라미터**) 동시 존재 | R2 가 "env 주입 시 발생할 것"으로 예측한 상태가 **현재 진행형** |
| **계정 신규 아님** | 잔고 $67.65·최종 지급 $101.79·전년 동기 비교 존재·calculatorhost.com 동거 | "신규 계정" → **"기존 계정 + 신규 사이트"**: 사이트 단위 ramp-up 만 유효. 정책 사고 시 calculatorhost.com 수익까지 동반 정지 — 정책 가드 중요도 오히려 상승 |
| **ads.txt 정상 서빙** | curl: `google.com, pub-7830821732287404, DIRECT` 200 | §3-1 (8) 정적 분리는 유효하되 긴급도 하향 (이미 인증 동작 중) |
| **색인률 71.5% (294/411)** | GSC 색인생성: 색인 294·미색인 117 | §4-2 케이던스 킬스위치 임계(70%) **바로 위** — 미색인 트리아지가 '즉시 과제'로 승격 |
| **병목 = 트래픽 (광고 노출 아님)** | RPM $2.31 (~₩3,200, §1-2 가정 범위 내). 일 PV ~187 → 월 ~6천 = 손익분기(3만 PV)의 1/5 | §1-1 공략 순서: "광고 노출/PV 1순위" → **"PV·색인 건강 1순위, 광고는 배선 정리·통제 회복"** |
| **실증 강점 쿼리 확보** | GSC 3개월: 클릭 714·노출 12.5만·CTR 0.6%·평균 7.7위, 최근 일 50~60클릭 상승 추세. 1위 "국세 납부 신용카드 추천 2026" (11/148, CTR 7.4%), "확정일자 모바일", "청년 ISA·도약계좌 중복", "건강보험료 갑자기 인상" | §5-2 SERP 갭 실사의 1차 입력 — **세금×카드납부 교차 주제 실증**, 7월 재산세 카드납부 시즌과 직결 |

### R3-2. 결정 변경

| R2 결정 | R3 변경 | 근거 |
|---|---|---|
| §3-0 "Auto ads 전면 OFF로 시작" | **전환 순서 역전**: 수동 유닛 2개 PR-A' 머지·프로덕션 노출 확인 **후** Auto ads OFF. 이행기(수일) Auto+수동 병행 허용 — 일일 육안에 '글당 광고 수' 체크 추가 | 현재 수익 100%가 Auto ads — 선 OFF 는 수익 공백. 후 OFF 는 무중단 전환 |
| 결정 #12 가동 순서 (PR-A→env) | **무효** (env 기주입). 대체 순서: PR-A'(배선 정리+수동 유닛) → 배포 확인 → Auto ads OFF → 1~2주 전후 비교 | 전제 소멸 |
| 결정 #11 lazy-init | **유지하되 적용 대상 명확화**: lazy-init 은 수동 유닛 push 에 적용. Auto ads 병행기 동안 head 메인스레드 로더는 유지(Auto ads 가 의존), **Partytown 로더만 즉시 삭제**(깨진 파라미터·비공식 조합·이중 로드 — 유일한 무위험 즉시 수정). Auto ads OFF 시점에 로더 lazy-init 전환 2차 PR | Auto ads 는 로더가 스스로 슬롯 주입 — lazy-init 과 비양립 |
| §3-2 env 주입 단계 | 삭제. **PUBLIC_GA4_ID 주입 여부 확인**만 잔존 (consent·계측 의존) | env 기주입 확인 |
| §10-3 체크리스트 4번 | env 주입 → **"Auto ads OFF (수동 유닛 프로덕션 노출 확인 후)"** 로 교체 | 동상 |
| §1-2 매트릭스 | 실측 기입: 현재 좌표 = **(월 ~6천 PV, RPM ~₩3,200) → 월 ~₩20,000 안팎** (이번 달 $1.76/12일 페이스). 베이스라인 윈도우는 '수동 유닛 전환 완료 후 D+14~28'로 리셋 | 실데이터 우선 |
| PSI 100 검증 | **보류 항목 등록**: PSI API 키리스 쿼터 소진 (2026-06-12) — pagespeed.web.dev 수동 1회 또는 API 키 발급 후 측정. **Auto ads 상태의 CLS·TBT 기준 점수를 먼저 확보**해야 OFF 전후 비교 가능 | 측정 경로 확보 |
| 근중복 통합 웨이브 시점 | M2 → **W2 로 당김** | 색인률 71.5% — 미색인 117 중 중복·canonical 사유 비중 확인 필요 |

### R3-3. 수정된 즉시 실행 (D+0~2)

1. **PR-A' (배선 정리 — 범위 조정판)**: Analytics.astro Partytown 로더 **삭제** + AdSlot.astro 신설 + 수동 유닛 2슬롯 (R2 §3-1 (3)~(7) 동일: PROD 게이트·min-height 래퍼·ToC≥3 가드·author-box 뒤) + consent default 게이트 밖·head 최상단 이동 + perf-agent.md·docs/17 룰북 정합. head 메인스레드 로더는 병행기 유지.
2. AdSense 대시보드: 민감 카테고리 차단 + 사이트 인증 + URL 채널 12개 (R2 §3-0·§3-4 동일 — **Auto ads OFF 만 보류**).
3. **미색인 117 트리아지**: GSC 페이지 보고서에서 사유 분류 (발견-미크롤 / 크롤-미색인 / 중복·canonical) → 통합·리프레시·noindex 배분.
4. PR-B (허위 서술 전수 정정) — R2 그대로, 우선순위 불변.
5. PSI 기준 점수 확보 (Auto ads ON 상태) → 수동 유닛 추가 후 → Auto ads OFF 후, 3시점 비교.

---

## 편집자 충돌 해소 결정 (통합 전제 — 본문 전체에 적용)

| # | 충돌 | 결정 | 근거 |
|---|---|---|---|
| 1 | 광고 코드 PR 머지 경로 | **R2 정정** — `.github/workflows/auto-merge.yml` 실물은 **opt-out**: 조건은 author=owner/bot + 비draft + `no-auto-merge` 라벨 부재뿐이고 `auto-publish` 라벨은 어떤 워크플로도 참조하지 않음(전 워크플로 grep 0건, 실사 확인). 따라서 광고·인프라 PR은 **① draft로 생성 + ② `no-auto-merge` 라벨 부착 의무** → perf+ads 듀얼 게이트 + `/review` 후 운영자가 직접 머지. PR-B(정정 PR)도 동일 적용. auto-merge.yml의 opt-in 전환은 별도 검토 항목으로 `/plan` 선행 | 기존 'auto-publish 미부착=수동 머지' 전제는 존재하지 않는 메커니즘 — 라벨 없이는 CI green 즉시 자가 머지됨. CLAUDE.md의 stale 서술('auto-publish가 붙은 PR은 auto-merge') 정정은 PR-B 범위 |
| 2 | D+0 슬롯 2개의 포맷 | 두 슬롯 모두 **디스플레이 반응형으로 시작**. **R2 추가: AdSlot Props에서 `multiplex` enum 제거** — global.css에 전용 높이 예약 CSS가 없어 무예약 주입 경로가 됨. 멀티플렉스는 M3 도입 PR에서 전용 min-height CSS와 함께 재추가 | 신규 계정 ramp-up 변수 최소화 + 죽은 enum의 무예약 사용 차단 |
| 3 | 성능 합격선 | **PageSpeed 100 + CWV 임계 사수 유지. 완화 기준 기각.** 단 R2에서 달성 수단을 교체: head 내 eager async 로더로는 lab 측정 중 로더 평가+경매+iframe 렌더 TBT 때문에 100이 구조적으로 불가 → **lazy-init(#11)이 기본 설계** | 고정 제약 + 메모리 "임계 더 낮추지 말 것" + feasibility 실측 가능 구조로 전환 |
| 4 | 메타 인프라 규모 | **다이어트 유지**: 신설 서브에이전트 `ads-agent` 1개(W2), 신설 명령 `/revenue-weekly`·`/ads-audit` 2개. **R2 추가: `scripts/audit/revenue-pull.mjs`(API 기반·무LLM) 1개** — 주간 Chrome MCP 대시보드 순회(최고 토큰 비용·최저 안정성)를 대체 | 1인 운영 유지보수 부담 + LLM 비용 가드 |
| 5 | 일일 수익 점검 | **운영자 육안 1분, LLM 0** 유지. **R2 추가: 일일 1분에 '광고 검토 센터 신규 광고 훑기' 포함 — D+0부터** | 신규 계정 초기 2주가 광고주 믹스 최불안정기 — 사기성 금융·사행성 광고 무방비 구간을 없앰 |
| 6 | 트래픽 작업 물량 | **R2 추가 감량**: 발행 **일 1~2편**(상향은 D+45 실측 RPM이 정당화할 때만), 유튜브 체인은 **D+45 피벗 판정 후 개시**, faq 백필은 별도 트랙이 아니라 **리프레시 대상 글과 같은 PR로 묶음**(1차 출처 검증·빌드 1회 합침). 주간 운영 시간 예산 **20h** 선언(§7) | 기존 일 3~4편은 'LLM 비용' 사유로 당일 폐기한 자동 파이프라인 물량(4월 249·5월 156편 — 전부 파이프라인 산출)을 수동으로 재도입하는 것 — 토큰 비용 부활 + 운영자 시간만 추가. 합산 주 25~45h는 1인 지속 불가능선 |
| 7 | `ad_position` 실험 | **R2 전면 재설계 — A/B 폐기, 전후 비교(각 2주 순차)로 전환.** `Experiment.astro`는 광고에 재사용 전면 금지: 실물은 모든 variant를 HTML에 렌더 후 클라이언트 JS가 `el.hidden`만 토글(L51-54, L72 `display:none`)하는 구조라, variant별 AdSlot을 넣으면 **모든 페이지 DOM에 숨김 `<ins>`가 존재하고 push까지 나감 = '사용자에게 보이지 않는 광고 게재' 정책 직격**(무효 노출, 신규 계정 정지 사유). 또한 is:inline 스크립트에 data-astro-rerun이 없어 ClientRouter 전환 후 두 variant 모두 visible로 push되는 경로도 있음. '`experiments.ts` 기등록=추가 인프라 0' 서술 철회(variants도 top/middle이라 재정의 필요했음) | 1인 운영에서 전후 비교가 비용·정책 리스크 모두 우월. §8-3이 이미 fallback으로 인정한 방식을 기본으로 승격 |
| 8 | 본문 중간 자동 삽입 | **rehype 채택 유지** (`src/lib/rehype-ad-slot.mjs`). **R2 일정 정합**: 실험 1의 '2번째 H2 앞' 위치는 rehype 주입에 의존하므로 실험 1 시점을 W3에서 **M2 전반으로 이동**(rehype 머지 후) | W3 실험이 M2 인프라에 의존하던 자기모순 제거 |
| 9 | 앵커 광고 | **D+60 이후, 무사고 + 무경고 + 데이터 검토 후에만** 유지. **R2 선행 조건 추가**: ConsentBanner(fixed bottom, z-100)와 동일 위치 충돌 — 배너 미선택 사용자에게 앵커 미게재(또는 배너 우선)를 도입 전제 조건으로. vignette 90일 보류 유지 | 배너-앵커 겹침 = '광고를 가리는 요소' 배치 정책 경로 |
| 10 | 허위 서술 정정 범위 | **R2 재확대** — 기존 목록(아래)에 추가: **`src/content/authors/kim-junhyeok.json` L4 bio**('모든 글은 발행 전 8단계 자동 검증 게이트를 통과합니다' 현재형 — 운영자 author 페이지 + 전 글 author-box에 노출, 기존 목록 최대 누락), `src/pages/[cluster]/[slug].md.ts` **L87**(L75 외 추가 '(자동 검증)' 표기), `src/pages/editorial-policy.astro` L72의 '10단계(G0~G9)' vs 타 페이지 '8단계(G0~G8)' **모순을 한 가지 사실(과거형)로 전 페이지 단일화**, CLAUDE.md의 auto-publish stale 서술, 그리고 휴면 상태인 self-ClaimReview(5/5 자기 평가)·Dataset 스키마 코드 **삭제**(존치 아님 — §3-3). '전수'는 손 목록이 아니라 **grep 결과 첨부로 기계 증명**: `grep -rn "8단계|자동 검증|G0~G8|10단계|G0~G9" src public scripts .claude` 를 PR-B 본문에 첨부, 본문 MDX의 '신청 절차 8단계'·'8단계 누진세율' 등 무관 매치는 제외 목록 명시 | AdSense 승인 직후 전 페이지 노출 허위 주장 = 최악의 정책 노출. 신뢰 페이지 간 단계 수 모순 자체가 신뢰 신호 훼손 |
| 11 | **(신설)** 로더 전략 | head 내 eager async 로더 폐기 → **첫 슬롯이 뷰포트 rootMargin(초기 200px, 실측으로 확정)에 근접할 때 adsbygoogle.js를 동적 주입 + 슬롯별 관찰 시점 push** (IntersectionObserver lazy-init). 두 슬롯 모두 below-fold이므로 lab 측정에서는 로드되지 않음 — Google 공식 권장 '광고 lazy loading' 패턴이며 클로킹 아님. 기존 §9-2의 '첫 인터랙션 후 주입 fallback'은 폐기(lazy-init이 기본이 됨). 부수 효과: Active View 동반 상승(화면 밖 선로드 제거) — 기존 설계의 'eager 로드 vs Active View 50% 정리' 자가당착 해소 | PSI 100과 광고 송출의 유일한 양립 구조. feasibility는 머지 전 CF 프리뷰 실측으로 검증(§3-1) |
| 12 | **(신설)** 가동 순서 | **PR-A 머지 → 프로덕션 배포 반영 확인 → 그 다음 env 주입.** 역순 금지 | env를 먼저 주입하면 현행 코드의 (a) Base.astro 메인스레드 로더 + (b) Analytics.astro Partytown 로더(비공식 조합·ca- 접두사 불일치)가 **동시에 451편 전면 활성화** — 슬롯이 없어 수익 0인데 TBT 회귀·초기화 에러만 전액 지불. daily/scheduled-rebuild가 깨진 상태를 계속 송출 |
| 13 | **(신설)** dev/Preview 광고 비활성 | `.env.local`의 실 pub ID를 더미 값으로 교체 + AdSlot 렌더 조건을 `client && import.meta.env.PROD`로 강화 + **자동화 브라우저(Claude Preview·Chrome MCP)로 프로덕션 광고 페이지 열기 금지**(ads-agent 금지 규칙 ⑧). 렌더 검증은 빌드 산출물(dist) grep + curl + 운영자 광고차단 프로필 육안으로 대체. 부득이한 동적 검증은 CF 프리뷰 env + `data-adtest="on"` 경로만. AdSense '사이트 인증(인증된 사이트에만 게재)' 활성화 | 운영자 1인 IP에서 자동화 도구가 광고 활성 페이지를 정기 순회하는 패턴 자체가 무효 트래픽 시그니처. LLM 조작 브라우저의 광고 iframe 오클릭 1회 = 신규 계정 정지 직결 |

---

## 1. 목표와 수익 방정식 (90일)

### 1-1. 수익 방정식과 병목

```
월 수익 = 월 PV × (광고 노출/PV) × Active View × CTR(관찰만) × CPC믹스 ÷ 1,000 − 무효 트래픽 공제
```

| 변수 | 현재 값 | 공략 순서 |
|---|---|---|
| 광고 노출/PV | **0** (`<ins class="adsbygoogle">` 저장소 전체 0건) | **1순위 — D+0** |
| 계측(수익↔클러스터 조인) | 미가동. **PV 계측 자체도 결함**(GA4 consent 게이트로 동의 소수 표본만 집계 — §8-1에서 소스 이원화) | 1순위 — D+0~7 |
| 배치·Active View | 미지 | 2순위 — M2 (전후 비교) |
| 밀도 | 미지 | 3순위 — M2~3 (데이터로만 증설) |
| CPC믹스 | cpcTier 최상 2개 클러스터 존재. 단 '저공급' 진단은 R2에서 정정(§2) — 증산은 SERP 갭 실사 후에만 | 3순위 — **실측+품질 게이트 후** |
| PV | 인프라 완비, 절대량 미실측. **색인 건강(색인률·무노출 재고) 미계측 — D+1~2 기준선 필수 항목** | 병행 — W2~ 리프레시·시즌 |

**곱셈식에서 0인 인자는 트래픽이 아니라 광고 노출이다.** 첫 7일은 최적화가 아니라 "계측 가능한 수익화 파이프 완성"에 전부 건다. 단 계정 정지는 수익 전체를 영구 0으로 만드는 유일한 사건이므로, 모든 단계에서 정책 가드가 수익 가드보다 상위다. **그리고 PV 인자는 검색 품질(스팸 정책·코어 업데이트) 강등 시 통째로 죽는다 — 색인 건강·카니발리제이션·E-E-A-T 가드(§4·§5·§9-3)가 광고 가드와 동급이다.**

### 1-2. 90일 목표 (수치는 전부 가정 명시 — D+30 실측으로 교체)

- **D+7**: 프로덕션 광고 송출 + 클러스터별 계측 가동 + PageSpeed 100·CLS 무회귀(프리뷰 실측 리포트 보관) + 정책 센터 위반 0
- **D+30**: 베이스라인 확정(산정 윈도우 D+14~28 — §8-2), 클러스터별 RPM 1차 순위표
- **D+90**: 실측 기반 연간 수익 모델 재산정, 발행 배분 재설계 1회전, 정책 센터 위반 누적 0, 기명(저자/검수자) 비율 KPI 달성(§5-2)

**손익분기 시나리오 매트릭스** (가정: 월 고정비 ≈ ₩150,000 — Claude 구독 중심, 운영자 실비로 교체. Page RPM은 한국 금융 정보성 사이트 통상 범위를 차용한 **작업 가정**. **R2 주석: 현행 consent 구조에서 한국 사용자 대다수가 배너 무시 → ad_storage denied 비개인화 송출이라 RPM은 통상 범위보다 하방 편향될 수 있음 — §3-4 consent 결정 항목과 연동**):

| 월 PV \ RPM 가정 | 보수 ₩2,000 | 기본 ₩5,000 | 낙관 ₩12,000 |
|---|---|---|---|
| 10,000 | ₩20,000 | ₩50,000 | ₩120,000 |
| 30,000 | ₩60,000 | **₩150,000 (손익분기)** | ₩360,000 |
| 100,000 | ₩200,000 | ₩500,000 | ₩1,200,000 |
| 300,000 | ₩600,000 | ₩1,500,000 | ₩3,600,000 |

손익분기 역산: RPM 2,000원→75,000 PV / 5,000원→30,000 PV / 12,000원→12,500 PV. 이 표의 존재 이유는 수치가 아니라 **"어느 변수가 병목인지"를 주간 리뷰에서 즉시 판별하는 틀**이다. 자연 마일스톤: 핀 검증 임계 누적 ₩10,000(→§10 피벗 기준), 지급 임계 ₩100,000. PV 축의 소스는 GA4 단독이 아니라 CF Web Analytics·GSC 클릭과 병기(§8-1).

---

## 2. 현황 진단 요약 (팩트팩 + R1 재실사 반영)

**수익화 인프라 — "로더와 CSS만 있고 광고는 없다 + 켜는 순간 깨지는 배선"**
- 광고 유닛 **미배치**: `<ins>` 0건, `src/components/AdSlot.astro` 미존재(STRUCTURE.md L80·docs/17 L365가 참조 — stale). `src/styles/global.css` L189-204의 `.ad-slot` aspect-ratio CSS는 **재사용 불가 판정(R2)**: adsbygoogle.js는 채움 시 `<ins>`에 inline height를 직접 박아 aspect-ratio를 덮어쓰므로, ins 자체 예약은 CLS 가드로 무효 — 래퍼 min-height 방식으로 전면 교체(§3-1).
- **스크립트 이중 로드 버그(실측 검증)**: `src/layouts/Base.astro` L256-262 메인 스레드 async(`client=ca-${env}`) + `src/components/Analytics.astro` L42-48 Partytown(`client=${env}`, ca- 접두사 없음). **env 주입 즉시 둘 다 활성화 — 가동 순서 결정 #12의 근거.** Partytown은 AdSense 비공식 조합(iframe 생성·viewability 측정 깨짐).
- **Consent Mode v2 — '구성 완료' 서술 철회(R2)**: ① consent default 인라인이 `{ga4Id && (...)}` 게이트 안(Analytics.astro L5) — CF Pages에 GA4 ID 미주입+AdSense ID만 주입이면 **consent 신호 전무 상태로 광고 송출**. ② AdSense 로더(Base.astro head)가 `<Analytics />`(L276)보다 앞 — 'Google 태그 로드 전 default 설정' 순서 미보장. 둘 다 PR-A 정정 대상(§3-1).
- **CSP**: Report-Only이나 report-uri `/api/csp-report`는 **미구현 + `output:'static'`이라 POST 수신 자체 불가** — '리포트 무위반' 데이터는 허수. 허용목록에 `*.adtrafficquality.google`(Google IVT 측정)·`*.safeframe.googlesyndication.com`·`fundingchoicesmessages.google.com` 누락 — 이대로 enforce하면 광고 렌더와 무효 트래픽 측정이 같이 깨짐(§3-1·§5-3).
- env: `.env.local`에 실 pub ID 존재 — **더미화 대상(결정 #13)**. CF Pages 프로덕션 주입 여부 미확인. `src/pages/ads.txt.ts`는 env 연동 동적 생성 — **킬스위치와 엉켜 있어 정적 분리 대상**(§3-1).
- `src/lib/experiments.ts`의 `ad_position` 기등록 — **'추가 인프라 0' 서술 철회(결정 #7)**: Experiment.astro는 광고용으로 구조적 부적합.

**콘텐츠 포트폴리오 (R2 재진단)**
- 451편/12클러스터 — 단, **전량이 2026-04-01~06-10 70일간 발행**(4월 249·5월 156·6월 46, 전부 폐기된 자동 파이프라인 산출)되고 **451/451편이 author=editor-team(무기명 조직)**. 근중복군 잔존(예: 6/1 재산세 과세기준일 훅 6편 — property-tax-d-day-june-1-confirmation 외 5편). **2026 스팸 정책의 scaled content abuse 노출면이자 코어 업데이트 사이트 단위 평가 리스크** — 색인 건강 계측(§3-4)·프루닝(§5-2)·기명 전환(§5-2)이 광고 가동과 동급 과제.
- cpcTier 최상 2개 클러스터의 '고수익 저공급' 진단 **정정**: 실측 분포는 office-tips 30·public-services 30 < insurance-personal 31 < credit-loan 32(=pension 32)로, tax(74)·realestate(48) 제외 시 평평. 고CPC 증산은 '저공급 해소'가 아니라 **SERP 갭 실사를 통과한 미커버 쿼리에만**(§5-2). 둘 다 `adRiskTier: high` + authorityCoverage 0.5/0.55(전 클러스터 최저) — explainer 강제 대상.
- faq 보급 76.1%(108편 누락), `lastReviewed` 0%, updatedAt 4.2%. 발행 케이던스 '일 4편'은 파이프라인 산출이지 수동 기준이 아님 — 수동 기준 재산정(결정 #6).

**트래픽 인프라** — indexnow.yml + daily-rebuild + 12분할 RSS + Discover 매니페스트 + popular-queries 완비. GSC·GA4 절대량 미실측. **R2 추가**: `public/_headers`의 `/*.md` 블록이 `X-Robots-Tag: index, follow` — `[slug].md.ts`의 canonical 헤더는 static output에서 무시되므로 **전문 복제 .md 451 URL이 canonical 0 상태로 색인 허용** 중(noindex 전환 대상, §3-3). GEO 인용 풀세트(robots 전면 Allow·llms.txt·.md 미러·aiCitationQuestions)와 PV 광고 수익화의 상충은 측정 항목으로 신설(§8-1).

**신뢰 리스크(재실사로 범위 재확대)** — "8단계 자동 검증" **현재형 허위 서술**이 본문 템플릿·기본 메타·humans.txt에 더해 **운영자 실명 author bio(kim-junhyeok.json)** 에도 잔존, editorial-policy는 '10단계'로 페이지 간 모순. self-ClaimReview(자기 글 5/5 평가)·Dataset 가장·NewsMediaOrganization+뉴스 사이트맵 과대표시 — 휴면인 지금이 무비용 제거 적기(§3-3).

---

## 3. Phase 1 — 즉시 실행 (D+0~7): 광고 배치·AdSense 설정·성능 가드

> **D+0~1 신규 콘텐츠 발행 일시 정지** — 빌드 큐와 운영자 시간을 광고 가동에 전용(과적재 해소, R2). 순서 고정: **D+0 = 사전 준비 + PR-A + env 주입**, **D+1 = 대시보드 잔여 + PR-B**, **D+2~4 = 시즌 콘텐츠(대부분 리프레시)**.

### 3-0. 사전 준비 (D+0 오전)

0. **로컬 도구체인**: `corepack enable`(또는 `npm i -g pnpm`) → `pnpm install` → `pnpm build` 1회 성공 확인. 실패 시 폴백: 로컬 검증을 전부 CF Pages 브랜치 프리뷰 URL 검증으로 대체(체크리스트에 명시 — 현 머신 pnpm 미설치 확인됨, CLAUDE.md도 'CI 위임' 명시).
1. **AdSense 최소 설정(슬롯 ID가 PR-A의 입력)**: Auto ads **전면 OFF** / 광고 유닛 2개 생성(`article_top`, `article_bottom` — 실험용 유닛은 M2에 생성) / **차단 관리 → 민감 카테고리: 도박·사행성, 데이트, 단기 고금리 대부(가능 범위), 암호화폐 투기성 즉시 차단 — 금융 일반 카테고리는 유지(CPC 보호와 민감 차단은 양립, R2)** / **사이트 인증(인증된 사이트에만 광고 게재) 활성화**(타 도메인·localhost 송출 차단).
2. `.env.local`의 `PUBLIC_ADSENSE_CLIENT`를 **더미 값으로 교체**(결정 #13) — 로컬·Claude Preview에서 광고 코드 비활성.

### 3-1. PR-A (D+0) — 광고 가동 단일 PR `[draft 생성 + no-auto-merge 라벨 필수 — 결정 #1]`

**(1) 로더 전면 재설계 — lazy-init 기본(결정 #11·#12)**:
- `src/components/Analytics.astro` L42-48 Partytown adsbygoogle 로더 **삭제**.
- `src/layouts/Base.astro` L256-262 head eager 로더도 **삭제**.
- `src/lib/ads-lazy.ts` 신설(번들 모듈): 첫 `<ins>`가 뷰포트 rootMargin 200px(프리뷰 실측으로 확정 — 짧은 글에서 lab 측정 시 IO가 즉발하지 않는 값인지 확인) 근접 시 adsbygoogle.js를 1회 동적 주입, **push는 슬롯별 IO 콜백에서 실행**. preconnect는 유지하되 lab 영향 실측 후 dns-prefetch로 강등 검토.
- 검사: 빌드 산출물에서 `pagead2.googlesyndication.com` 참조가 **정확히 1곳(ads-lazy 모듈 내 문자열)** 인지 grep — perf 게이트 체크리스트에 추가.

**(2) Consent Mode 정정**: consent default 인라인 스크립트를 `ga4Id` 게이트 **밖**으로 분리해 **Base.astro head 최상단(preconnect·모든 스크립트보다 위)** 의 is:inline으로 이동 — `adsenseClient || ga4Id` 중 하나라도 있으면 실행. lazy 로더 주입은 런타임상 항상 그 이후이므로 'default가 태그보다 먼저' 순서가 구조적으로 보장됨.

**(3) `src/components/AdSlot.astro` 신설**:
```astro
---
interface Props { slot: string; format?: 'banner'|'square'|'in-feed'; } // multiplex 제거 — 결정 #2
const { slot, format = 'banner' } = Astro.props;
const client = import.meta.env.PUBLIC_ADSENSE_CLIENT;
const enabled = client && import.meta.env.PROD; // dev/Preview 미렌더 — 결정 #13
---
{enabled && (
  <div class="ad-wrap" data-pagefind-ignore data-format={format}>
    <span class="ad-label">광고</span>
    <ins class="adsbygoogle" data-ad-client={`ca-${client}`} data-ad-slot={slot}
      data-ad-format="auto" data-full-width-responsive="false" />
  </div>
)}
```
- "광고" 라벨 의무(표시광고법 + 오인 방지). `data-pagefind-ignore`로 검색 인덱스 보호.

**(4) CLS 가드 재설계 (R2 — 기존 '삼중 가드' 1번 축 폐기)**: 높이 예약을 `<ins>`가 아니라 **래퍼 `.ad-wrap`에 min-height**로 — Google이 채움 시 ins에 박는 inline height와 충돌하지 않는 표준 패턴. 모바일(320~412px) min-height 250~280px, 데스크톱(720px 컬럼) 90~280px 구간에서 시작해 실측 채움 분포로 확정. ins는 `display:block; width:100%`만. unfilled(`ins[data-ad-status="unfilled"]`) 비접힘도 래퍼 기준으로 작성. 기존 `.ad-slot` aspect-ratio CSS는 폐기 표기. 래퍼에 `margin-block: 2rem` 표준 간격 고정(탭 가능 요소와 24px 이상 이격 — 오클릭 가드). 대안 검토 항목: auto 대신 고정 크기 유닛(300x250)으로 시작해 높이를 결정론적으로.

**(5) push/init 스크립트 규격 (R2 — 중복 등록·중복 push·숨김 push 사중 가드 명문화)**:
```js
// src/lib/ads-lazy.ts 내 — 번들 모듈 1회 실행 + 명시 가드
if (!window.__adsLazyInit) {
  window.__adsLazyInit = true;             // ① 단일 등록 가드 (Base.astro L292·Analytics L58 패턴 준수)
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target; io.unobserve(el);
      if (el.dataset.adsPushed === '1') continue;   // ② 요소별 멱등 마크 (push 직전 자체 마킹)
      if (el.offsetParent === null) continue;       // ③ 가시성 필터 — 숨김 ins push 원천 차단
      el.dataset.adsPushed = '1';
      ensureLoader();                                // adsbygoogle.js 1회 주입
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  }, { rootMargin: '200px' });
  const observe = () => document.querySelectorAll('ins.adsbygoogle')
    .forEach((el) => { if (!el.dataset.adsObserved) { el.dataset.adsObserved = '1'; io.observe(el); } });
  document.addEventListener('astro:page-load', observe);  // ④ 리스너는 모듈 1회 등록 — swap 누적 없음
  observe();
}
```
- push가 IO 콜백에서 분리 실행되므로 소프트 내비게이션 직후 메인스레드(INP 구간)와도 분리됨. `:not([data-adsbygoogle-status])` 셀렉터 의존(처리 후에야 붙는 속성) 폐기.

**(6) 슬롯 2개 배치** — `src/pages/[cluster]/[slug].astro` 단일 템플릿 수정 = PR 1건·빌드 1회로 451편 가동(MDX 무수정 레버리지 유지):
- 슬롯 1: ToC와 prose 사이. **단 렌더 조건에 `tocItems.length >= 3` 가드 동반** — ToC가 조건부(H2≥3)라 짧은 글에서는 슬롯 1이 Hero 직후로 당겨져 첫 화면 침범·LCP 경쟁 경로가 됨 → ToC 부재 글은 슬롯 1 생략(R2).
- 슬롯 2: **author-box 뒤, related 직전**(R2 위치 확정 — 기존 'sources 뒤' 서술은 실제 DOM 순서 sources→MainBackrefBox→author-box→related 와 불일치했고, MainBackrefBox(자체 프로모 박스)와 광고가 연속 스택되면 광고/콘텐츠 오인 배치가 됨 → 비연속 배치로 해소).
- 홈·클러스터 인덱스·계산기 페이지는 Phase 3까지 광고 미배치. 글당 4개 이상 영구 비권장.

**(7) ConsentBanner 겹침 해소(R2)**: 배너 표시 중(동의 미선택)에는 본문 하단에 배너 높이만큼 padding-bottom 부여 — 슬롯 2가 fixed 배너에 가려진 채 노출 집계되는 경로 제거. ('동의 전 push 보류' 안은 기각 — 한국 사용자 다수가 배너 무시 → 사실상 광고 0 + Consent Mode의 비개인화 송출은 정책상 허용되는 정상 경로이므로 보류 실익 없음.)

**(8) ads.txt 정적 분리(R2)**: `src/pages/ads.txt.ts` 삭제 → `public/ads.txt`에 `google.com, pub-…, DIRECT, f08c47fec0942fa0` **하드코딩**(승인 완료로 ID 확정). `_headers`의 ads.txt s-maxage=86400 단축(예: 3600). 효과: env 킬스위치가 로더만 끄고 **ads.txt 인증은 건드리지 않음** — 복구 시 재크롤 지연으로 송출 공백이 연장되는 부작용 제거.

**(9) CSP Report-Only 허용목록 선반영(R2)**: `*.adtrafficquality.google`·`*.safeframe.googlesyndication.com`·`fundingchoicesmessages.google.com` 추가. report-uri는 수신 불능 상태임을 주석으로 명시(enforce 정책은 §5-3).

**(10) 게이트 룰북 동일 PR 정합(R2)**: `.claude/agents/perf-agent.md` L33-38의 'AdSense는 Partytown 격리 또는 동의 후 lazy' 규칙을 **'Partytown 격리 = 공식 미지원, 금지. 표준 = 뷰포트 근접 lazy-init'** 으로 교체. `docs/17-performance-budget.md` §12-1(Partytown lazy 강제)·§12-2(광고 ON 임계 ≥85/≥80 → 100점 기준과 일치)·§12-4(Partytown이라 영향 X 서술) 동시 정정. **게이트 룰북과 구현이 같은 커밋에서 정합되어야 D+0 머지 차단 모순(룰북이 PR-A를 막거나 비공식 조합 재도입을 제안)이 안 생긴다.**

**(11) Lighthouse CI 게이트 실효화(R2)**: lighthouserc.json·lighthouserc.mobile.json의 핵심 assertion(categories:performance, cumulative-layout-shift, total-blocking-time)을 warn→**error** 승격 + 임계를 결정 #3(100점)과 일치. `.github/workflows` 연동 변경이므로 **CLAUDE.md 규칙대로 `/plan` 선행**(필요 시 PR-A 직전 선행 PR로 분리). 단 CI 빌드에는 ADSENSE env가 없어 광고 없는 페이지만 측정함을 한계로 명시 — 광고 포함 측정은 아래 (12)의 프리뷰 실측(수동 1회)으로 보완. 광고 PR은 드물어 운영자 수동으로 충분.

**(12) 검증 절차 (R2 전면 교체 — 자동화 브라우저의 실광고 접근 0)**:
1. **정적 검사(dist grep)**: 글 페이지당 `<ins>` 정확히 2개(ToC 부재 글 1개)·**숨김 상태 ins 0개**·"광고" 라벨 존재·pagead2 참조 1곳.
2. **CF Pages 브랜치 프리뷰 실측(feasibility 스파이크 — 머지 게이트)**: 프리뷰 env에만 `PUBLIC_ADSENSE_CLIENT` + `data-adtest="on"` 주입 → PSI/Lighthouse **모바일 3회 측정 중앙값 100 확인 후에만** 머지 진행. 미달 시 사다리: rootMargin 축소 → 슬롯 1 생략 폭 확대 → 재실측.
3. **NPA 신호 확인**: adtest 프리뷰에서 동의 거부 상태로 pagead 요청 파라미터에 비개인화(NPA/limited ads) 신호가 실리는지 네트워크 검사 — Partytown 워커 gtag(dataLayer)와 메인스레드 adsbygoogle 간 동의 신호 전달이 이 분리 구조에서 검증된 바 없으므로(R2), 단절 확인 시 consent 경로 보강 후 docs/23에 기록. ConsentBanner의 '비개인화 제공' 약속 위반 방지.
4. **Claude Preview**: 더미 env 상태(광고 미렌더)로 **같은 페이지 재방문 포함 5회 전환** → 콘솔 에러 0 — 리스너 누적·중복 등록을 실제로 잡는 시나리오. (프로덕션·실광고 페이지는 열지 않음 — 결정 #13)
5. `/review` → 운영자 직접 머지(draft 해제) → 프로덕션 배포 확인 + **이 배포 ID를 docs/23에 '광고 도입 직전 롤백 타깃'으로 기록**.

### 3-2. env 주입 (D+0 오후 — PR-A 프로덕션 반영 확인 후에만, 결정 #12)

CF Pages 대시보드에서 `PUBLIC_ADSENSE_CLIENT` 주입(+`PUBLIC_GA4_ID` 주입 여부 동시 확인 — consent·계측 모두 의존, R2) → Retry deployment → 송출 확인은 **curl HTML 검사 + 운영자 광고차단 프로필 육안 1회**로 한정. 같은 세션에서 **콘텐츠 브랜치 프리뷰 빌드 skip 설정**(CF branch build control — 월 500빌드 한도 방어, §7).

### 3-3. PR-B (D+1) — 허위 서술·과대표시 전수 정정 `[no-auto-merge + /ultrareview]`

- 결정 #10의 **확대 목록** 전부: 기존 12개 경로 + `src/content/authors/kim-junhyeok.json` L4 bio(과거형 또는 '당시 자동 발행 글에 한해' 서술 — '자격 보유 전문가 아님' 정직 고지는 유지) + `[slug].md.ts` L87 + editorial-policy '10단계' 모순 단일화 + **CLAUDE.md의 'label: auto-publish가 붙은 PR은 auto-merge' stale 서술 정정**(실물은 opt-out).
- **스키마 과대표시 제거(R2 — 존치 방침 철회)**: `[slug].astro`의 self-ClaimReview(reviewRating 5/5)·Dataset 스키마 코드 블록 **삭제**(sources_verified 글 0편으로 휴면인 지금이 무비용 적기 — 검증 이력 공시는 VerificationDetails UI 텍스트로 충분). NewsMediaOrganization→Organization 다운그레이드 + sitemap-news.xml 제거는 검토 항목으로 기재(시의성 신규 글 상시 0이면 무익+과대표시).
- **`public/_headers`의 `/*.md` 1줄 변경**: `X-Robots-Tag: index, follow` → `noindex` — Google 색인만 막고 AI 크롤러 fetch는 유지(GEO 보존, R2).
- **완료 정의**: `grep -rn "8단계|자동 검증|G0~G8|10단계|G0~G9" src public scripts .claude` 결과가 과거형 화이트리스트 외 0건(본문 MDX의 '신청 절차 8단계' 등 무관 매치는 제외 목록 명시). 회귀 방지용 `scripts/audit/claims-guard.mjs` 가드 스크립트화.
- **충돌 회피**: PR-B 중 `[slug].astro` 변경분은 **PR-A 머지 후 리베이스**(두 PR이 같은 파일 수정 — 병렬 금지, R2).

### 3-4. 대시보드 잔여 + 기준선 (D+1~2)

| 작업 | 위치 | 내용 |
|---|---|---|
| URL 채널 12개 | AdSense → 보고서 | 클러스터 경로별 — 클러스터별 RPM 무상 분리 측정 |
| GA4 연결 | GA4 관리 → 제품 링크 | AdSense 링크. **`PUBLIC_GA4_ID` CF 주입 확인 행 — consent·계측 의존(R2)** |
| **Privacy & messaging (R2 신설)** | AdSense → 개인 정보 보호 및 메시지 | EEA/UK용 **Google 인증 CMP 요건** 대응: Google 자체 CMP(GDPR 메시지)를 EEA/UK 한정 게재로 활성화하거나, EEA 트래픽 사실상 0 확인 시 '해당 지역 광고 미게재' 옵션 명시 선택. **자체 ConsentBanner는 비인증·TCF 신호 없음 — 한국 사용자용으로 역할 분리**, 이중 구조를 docs/23에 기록 |
| ads.txt | AdSense → 사이트 | `public/ads.txt` 정적 서빙 확인 → "승인됨"까지 일일 추적 |
| GA4 consent 결정(R2) | — | **D+1 결정 항목으로 격상**: gtag consent default에 region 파라미터로 EEA/UK만 denied·한국 granted 전환(PIPA 적합성 1회 검토 포함) 또는 현행 유지 — 현행 유지 시 'GA4 과소집계(동의 소수 표본) + 비개인화 RPM 하방'을 §8 KPI 정의에 명시하고 PV 소스 이원화(§8-1)로 보완 |

- **D+1~2 기준선 수집(R2 확장)**: 쿼리·페이지 Top 100 + Discover에 더해 **① 색인률(색인 URL/451) ② 90일 무노출 URL 목록 ③ `site:`·GSC에서 .md URL 색인 여부** 를 필수 항목으로(GSC 페이지 보고서 + URL 검사 샘플링). 수집은 **GSC API 우선**(scripts/audit/revenue-pull.mjs의 GSC 모듈 선행 가동 — §6-3), Chrome MCP는 API 부재 화면(네이버 서치어드바이저)만.
- **D+1**: GA4 gtag config에 `cluster` 페이지 파라미터 추가 + 맞춤 정의 등록. **revenue-pull용 API OAuth 1회 셋업**(AdSense Management·GA4 Data·GSC — 전부 무료, W1~2 내 완료).

### 3-5. D+2~7 잔여

- **D+2~4 시즌 콘텐츠 — 카니발리제이션 대조 의무(R2: 기존 4편 신규 지정 철회)**: 발행 전 `grep` 기존 슬러그 대조 + GSC 쿼리 대조 → 기존 글 존재 시 신규 금지·리프레시 전환. 판정: ① 자동차세 연납 2차 → **신규 금지, car-tax-yeonnap-discount·car-tax-june-installment-vs-january 리프레시**(본문 갱신+updatedAt). ③ 부가세 1기 확정신고 예고 → **신규 금지, vat-filing-july-25-d2month-preparation 리프레시**(동일 훅 기존재). ② 7월 재산세 1기분 → 기존 property-tax-* 12편+와 **타겟 쿼리 분할 설계(납부 방법/카드 혜택/분납 등 비중복 앵글)를 통과한 경우에만** 신규. ④ 종소세 성실신고확인(6/30) → 동일 절차 통과 후 진행. 각 편 publishedAt 직전 `Get-Date` KST 검증 + 법정 기한·세율 1차 출처 재확인(deep-research).
- **D+3**: CLAUDE.md "AdSense 운영 가드" 섹션(§6-2) + `docs/23-adsense-ops.md` 런북 신설(슬롯 ID 대장·실험 레지스트리·롤백 2단 절차·광고 PR 체크리스트·측정 절차·.md/CMP 이중 구조 기록) + 메모리 `feedback_adsense_policy.md`.
- **D+3~7**: 일일 육안 1분(AdSense 홈 + 정책 센터 + **검토 센터 신규 광고 훑기** — LLM 0).

**긴급 차단 런북 — 2단 구분(R2: '1분' 표기 전면 정정)**:
- **즉시 차단(수 초)**: CF Pages **Rollback to previous deployment** — 광고 도입 직전 배포 ID(§3-1 (12)에서 기록)로. 빌드 없이 즉시 서빙 전환.
- **정식 차단(5~10분+)**: env `PUBLIC_ADSENSE_CLIENT` 비우기 + Retry deployment — 451페이지 재빌드 ~3분 + 무료 플랜 동시 1건 큐 대기 가변(진행 중 빌드 있으면 CF 대시보드에서 취소 후 Retry를 1단계로). **ads.txt는 정적 파일이라 어느 쪽에도 영향 없음 — 건드리지 않는다.**

**Phase 1 완료 정의**: 프로덕션 광고 노출 + URL 채널 적재 시작 + 프리뷰 PSI 100 실측 리포트 보관 + 정책 센터 위반 0 + 허위 서술·스키마 정정 머지 + 색인 건강 기준선 확보.

---

## 4. Phase 2 — 트래픽 성장 (2~4주차)

> 전제: **베이스라인 산정 윈도우 D+14~28(§8-2)** — 그 전 어떤 배치·밀도 변경도 금지. 이 기간의 에너지는 트래픽·콘텐츠·계측 측에 쓴다.

### 4-1. 리프레시 > 신규 (주 10편 목표·상한 14 — R3 케이던스 합의 2026-06-13)

> 케이던스 전면 합의: docs/revenue-log/cadence-decision-2026-06-12.md (전 에이전트 토론 8/8 합의)

- 첫 2주(~6/26)는 '주 10'을 하한이 아닌 목표치로 운영 — 미달 페널티 없음 (검증 품질 > 편수, 무리한 충족은 G4 입력값 오염).
- 미색인 트리아지 '②개선 후 재색인' 작업은 본 쿼터에 **포함** (주 20h 예산 보호).
- 집계 기준(docs/21 §4-2 준용): updatedAt = 본문 실질 변경 시에만 / lastReviewed = 출처·수치 확인 동반 시에만(단독 갱신 금지) / 본문 무변경 재검토 = dataValidAsOf 만 갱신. **리프레시 편수 집계는 updatedAt 갱신 자격 편만 산입** (date stamping 편수 부풀리기 차단).
- 우선순위: ①고위험 클러스터(credit-loan·insurance-personal·세금 — 법정 수치 오류 가능성) ②스트라이킹 디스턴스(11~30위) ③시즌 글. **이 큐의 오류 발견량은 게이트 입력값 아님** (§4-2 G4 — 선택 편향 차단).
- 선정 공식: GSC 노출 상위 ∩ 고cpcTier 클러스터 ∩ updatedAt 부재 + 11~30위 스트라이킹 디스턴스 우선.
- 절차: deep-research 1차 출처 재검증 → 본문 갱신 → updatedAt/lastReviewed 기입(실제 재검증 글에만). **faq 백필도 같은 글이면 같은 PR로 묶음**(검증·빌드 1회 합침 — 결정 #6).
- 30+ 파일 누적 시 `scripts/audit/refresh-wave1.mjs`(DRY_RUN=1, "본문 diff 0이면 lastReviewed 단독 변경 차단" 로직).

### 4-2. 발행 캘린더 (R2 — 일 1~2편으로 감축, 시간 예산 역산)

| 클러스터 | 주간 | 근거 |
|---|---|---|
| pension (상, risk medium) | 2 | 고CPC 안전 1순위 — IRP·연금저축 explainer |
| tax (상, risk low) | 2 | 7월 재산세·부가세 시즌 직전 |
| realestate (상, medium) | 1~2 | 시즌 + 상 tier |
| credit-loan (최상, high) | **1 상한** | explainer 강제, 상품 추천 프레임 금지, SERP 갭 게이트(§5-2) |
| insurance-personal (최상, high) | **1 상한** | 동일 |
| 유연 슬롯(시즌·계산기 연계) | 2~3 | **계산기 4종(SalaryCalculator 등) 연계 글을 W2부터 편성** — AI가 대체 못 하는 상호작용 트래픽 자산(R2, GEO 자기잠식 방어축) |

- **운영 규칙(R2 신설)**: ① 단일 클러스터 주간 발행 점유 **상한 30%**(고CPC 쏠림 = '대출 콘텐츠 팜'화 → 코어 업데이트 취약). ② **신규 정당화 체크** — 기존 글 갱신으로 흡수 불가함을 발행 전 증명(grep+GSC 대조), 흡수 가능하면 리프레시 전환. ③ **신규 글은 기명(kim-junhyeok) 디폴트**(§5-2 E-E-A-T). ④ **케이던스 킬스위치**(본선 임계 불변): 색인률 <70% 또는 90일 무노출 비중 >30% → 신규 발행 반감, 통합·리프레시 스프린트 우선(scaled content 방어 — §9-3).
  - **색인률 단일 정의(R3)**: GSC URL 검사 확인 색인 수 ÷ 라이브 indexable 사이트맵 URL 수. 410·301 처분 URL 은 URL 검사에서 제거·리다이렉트 인식 확인 후에만 분모 제외. GSC 커버리지 보고서 수치는 보조 확인용.
  - **소프트 트리거(R3 신설)**: ⒜ 전체 색인률 2주 연속 하락 또는 ≤73% → 신규 2편째 슬롯 동결(일 1편 고정) ⒝ 신규 14일 코호트 색인률 <80%(n≥10 충족 시 판정) → Stage 한 단계 하향 ⒞ 현행 파이프라인 산출물 사후 무작위 재검증 오류율 >30% 2주 → 신규 0편·전량 리프레시 전환 (레거시 우선순위 큐 발견량으로는 발동하지 않음 — 선택 편향 차단).
- **케이던스 3단계 게이트제 (R3 — 2026-06-13 시행, 합의안 §2 준용)**:
  - **Stage 0 (즉시)** = 신규 일 1편 기본 + **2편째 슬롯 자동승인** (① /topics GSC 실측 노출 키워드 또는 ② 사전 합의 세무 캘린더(§5-2) AND 카니발리제이션 대조 통과 audit 기록 — 둘 다 충족 시 별도 승인 없이 발동, 주 2회 상한). **주간 신규 총량 ≤9편 절대 상한**.
  - **Stage 1 (일 2편 고정)** = G1(미색인 117 트리아지: 분류 100% 6/26 + 실행·위생 7/3) · G2(재계산 색인률 ≥75% 2주 연속, 신규 코호트 포함) · G3(신규 14일 코호트 ≥80%, n≥10 — 미달 시 측정 연장) · G4(현행 산출물 무작위 재검증 오류 <10% AND 레거시 무작위·층화 표본 주 5편 추세 비상승 2주) · G5(정책 센터 무경고) **전부 충족 시** — 최속 7월 초~중순.
  - **Stage 2 (일 3편 검토, D+45)** = 색인률 ≥80% 4주 연속 + 30일 코호트 ≥90% + **실측 RPM 정당화** + 주 20h 4주 수렴 + LLM 비용 4주 기록 후 월 상한 명문화. 색인 소요 중앙값 ≤14일은 보조 지표(단독 차단 불가). 통과 시에도 2주 관찰 후 고정.
  - risk high 상한 완화는 무사고 8주 + 무경고 후에만(불변). 매 편 docs/21 게이트 + content-agent 산출물 ls/Read 실존 검증(불변).

### 4-3. faq 백필 + 채널 + 빌드 한도 운영

- **faq 백필 3원칙 내장(R2 — `scripts/audit/faq-backfill.mjs`)**: ① 답변은 해당 글 본문에서 **이미 1차 출처 확인된 사실의 재구성으로 한정** — 신규 수치·기한 도입 금지(필요 시 리프레시 트랙으로 승격해 deep-research 검증) ② 클러스터 내 Q/A 텍스트 유사도 검사로 보일러플레이트 중복 임계 초과 차단 ③ faq만 추가된 글의 updatedAt·lastReviewed 갱신 금지(허위 신선도 차단). 리프레시 PR에 동승하는 방식이 기본, 잔여분만 `/batch`.
- **네이버**: naver-mate-econ 주 1~2회 운영자 트리거(4핵 도메인, 대출·보험 제외 유지, `utm_source=naver_blog`).
- **유튜브**: **D+45 피벗 판정 후 개시**(결정 #6 — 검증 안 된 최대 시간 단위 작업을 주간 고정하지 않음). 개시 시 storytelling→srt-narration-10sec→youtube-sumnail 체인, 주 1편.
- 외부 채널 UTM 분리 계측, 품앗이·트래픽 교환 절대 금지.
- **CF Pages 월 500빌드 한도 운영(R2 신설)**: cron 리빌드만 ~150/월 소모. ① 콘텐츠 발행은 **일 묶음 PR**(그날 발행분 1 PR = 프리뷰+프로덕션 2빌드/일) ② 콘텐츠 브랜치 프리뷰 빌드 skip(§3-2에서 기설정) ③ 수동 전환으로 존재 이유가 약해진 scheduled-rebuild 4회/일 감축 검토 — 워크플로 수정이므로 `/plan` 선행 ④ `/revenue-weekly`에 월 누적 빌드 수 항목.
- `discover-priority.ts` 재정렬 + `popular-queries.ts` 6·7월 점검.

### 4-4. 광고·계측 측 (W2~4)

- **W2: ads-agent 신설 + `/revenue-weekly`·`/ads-audit` 작성 + `scripts/audit/revenue-pull.mjs` 가동**(§6) — 데이터가 생기는 시점에 맞춤.
- **W3~4: rehype-ad-slot 개발**(렌더 HTML H2 4개 이상 글, 2번째 H2 앞 주입, H2<4 skip). `/ultrareview`. **적용(슬롯 3 활성)·위치 실험은 M2에**(결정 #8).
- **소프트 내비게이션 노출 정합성 검증(R2 — §8-2 연동)**: AdSense 수동 유닛은 SPA식 소프트 내비 공식 미지원 — D+14~28 기간에 GA4 페이지뷰 vs AdSense 노출수 대조로 '소프트 내비 vs 풀 리로드' 집계 정합성 확인. 이상 징후(노출/PV 비율 비정상) 시 폴백: 글 상세 내부 링크에 `data-astro-reload` 부여(article→article만 풀 리로드) — docs/23 런북에 옵션 기재.
- 광고 검토 센터: **D+0부터 일일 1분 루틴에 포함(결정 #5)** — 차단은 사기성·과장 광고주 개별 단위. 금융 일반 카테고리 일괄 차단 금지(민감 카테고리 차단과 구분 — §3-0).

---

## 5. Phase 3 — 확장·최적화 (2~3개월)

### 5-1. 광고 — 데이터 기반 단계 확장 (각 단계 프리뷰 PSI 100 실측 통과 후에만)

- **M2 전반: 실험 1 — 위치(전후 비교)**: 슬롯 1을 'ToC 직후'(현행) 2주 → '2번째 H2 앞'(rehype 이동) 2주 순차 비교. 슬롯 DOM은 항상 1개 — 숨김 variant 자체가 존재하지 않음(결정 #7). 기간별 유닛 ID 분리로 AdSense 보고서가 결과표.
- **M2 후반: 실험 2 — 밀도(전후 비교)**: 2슬롯 2주 → 3슬롯(rehype ON) 2주. 가드레일: CrUX/AdSense 지표 기준(§8-1), CWV 무회귀, 정책 위반 0. 글당 슬롯 상한 3 고정.
- **M3 착수 결정: 실험 3 — 포맷**(슬롯 2 디스플레이 vs 멀티플렉스): **전용 min-height 예약 CSS를 같은 PR에 추가하기 전 도입 금지**(결정 #2). D+90에는 착수 여부만 판정.
- **D+60 이후**: 모바일 앵커 검토 — 무사고+무경고+실험 데이터 + **ConsentBanner 미선택 사용자 미게재 조건(결정 #9)** 전제. vignette 보류.
- viewability 정리(Active View 50% 미만 슬롯 이동/제거 — lazy-init으로 기본 상승 기대), 클러스터 차등 배치(상한 3 내).

### 5-2. 콘텐츠 — 실측 기반 재배분 + 품질 게이트 + 시즌 사이클

- **발행 배분 재설계 — 이중 게이트(R2)**: 실측 RPM × 세션으로 cpcTier 보정하되, ① **'RPM 단독 판단 금지'를 감축뿐 아니라 증산 방향에도 동일 적용** ② 고CPC 증산 전 **키워드맵+SERP 점유 실사** — 상위 10이 기관·핀테크 도배인 헤드 쿼리 제외, 미커버 쿼리 갭만 타겟(두 클러스터는 authorityCoverage 전 클러스터 최저 — 증산분이 자사 롱테일끼리 겹치는 구조) ③ 단일 클러스터 점유 상한 30% 유지. credit-loan·insurance-personal 본격 증산은 D+30 실측 + 8주 무사고 + SERP 갭 실사 3중 통과 후.
- **근중복 통합 웨이브(R2 — M2)**: 6/1 재산세 D-day 시리즈 6편 등 도어웨이성 마이크로 슬라이싱군을 **대표 1편+301**로 통합(docs/21 L279 절차). 90일 무노출 URL 재고는 통합·리프레시·noindex 트리아지.
- **E-E-A-T 기명 전환(R2 신설)**: ① 고리스크 2클러스터(credit-loan·insurance-personal)부터 author 또는 reviewedBy를 **kim-junhyeok 실명으로 마이그레이션** — 30+ 파일이므로 `scripts/audit/author-migration.mjs` dry-run 패턴. **기존 bio의 '자격 보유 전문가 아님' 정직 고지 유지 — 자격 위장 절대 금지.** ② 신규 글 기명 디폴트(§4-2). ③ D+90 마일스톤에 기명 비율 KPI. ④ 외부 유자격 검수(세무사 등) 협업은 비용 검토 항목으로만.
- 세무 캘린더 시즌 선점(매 건 §3-5 카니발리제이션 대조 절차 통과 후): 7월 재산세 1기·부가세 확정 → 8월 주민세 → 9월 재산세 2기·장려금 반기 → 10월~ 연말정산(tax 74편) 전수 리프레시.
- lastReviewed 보급 30%(~135편). **GEO 운영 재정의(R2)**: 콘텐츠 2계층 분리 — 정의·기한형(인용 양보 = 브랜드 채널 간주, 지명 검색량 KPI) vs 상호작용·시뮬레이션형(클릭 유인 축, 계산기 연계). 월간 GEO 점검은 '인용 늘리기' 일변도가 아니라 **'인용↑·클릭↓ 쿼리군 식별'을 포함**(§8-4).

### 5-3. 시기상조·보류 명시

- AdX/헤더비딩·MCM: 월 PV 수십만 이전 검토 금지.
- **CSP enforce: 90일 내 보류 확정(R2)** — '리포트 2주 무위반 후 enforce' 기준 폐기: report-uri `/api/csp-report`는 미구현+static이라 수신 불능, '데이터 없음=무위반' 오판 구조였음. 외부 수집기(CF Worker 1개 또는 report-uri.com류) 도입 후에만 리포트 기반 기준을 인정, 그때도 `/plan` 선행.
- **무인용 훈련 봇(CCBot·Bytespider 등) robots 허용은 분리 재검토 항목(R2)** — 인용 트래픽 0인 훈련 전용 봇의 전면 Allow 유지 여부.
- 풀자동 발행 부활 금지(고정 제약).

---

## 6. 에이전트 팀 구성 — 7요소

### 6-1. 프롬프트 (신설 1 · 재정의 6)

**[신설] `.claude/agents/ads-agent.md`** (W2) — 광고 배치·정책 게이트 전담, perf-agent와 동급 머지 차단 권한(듀얼 게이트). 강제 규칙: ① 글당 슬롯 ≤3 ② 글 상세 첫 화면 광고 0개 ③ "광고" 라벨 필수 ④ 클릭 유도 문구·오인 유도 UI 즉시 거부 ⑤ Auto Ads·자동 refresh 거부 ⑥ adRiskTier high 글 단정·과장 표현 추가 스캔 ⑦ 광고·인프라 PR의 **draft+`no-auto-merge` 라벨 누락 거부**(결정 #1 — 라벨명 정확히 no-auto-merge) ⑧ **자동화 브라우저(Chrome MCP·Claude Preview)로 프로덕션 광고 페이지 열기 거부 — 검증은 dist grep·curl·adtest 프리뷰만**(결정 #13) ⑨ **숨김 상태 `<ins>` DOM 존재 = 즉시 거부**(빌드 산출물 grep으로 판정). 데이터 해석 시 읽기 전용·제안만.

**[재정의] 기존 6개** (각 .md에 수익화 섹션 추가 — perf-agent만 PR-A 동일 PR에서 선행 정정, 나머지 W2):

| 에이전트 | 추가 임무 |
|---|---|
| content-agent | AdSense 친화 레이아웃을 AdSlot 실구현 기준으로 갱신(슬롯은 템플릿·rehype 주입 — 본문 수동 마커 불필요). risk high 글 explainer 프레임 강제. 신규 글 기명 디폴트 반영 |
| seo-agent | L46 허위 서술 정정(PR-B 연동), **색인 건강(색인률·무노출)·카니발리제이션 grep 대조 절차 보유**, 고CPC 키워드 갭 분석, FAQPage 보급 |
| perf-agent | **L33-38 'Partytown 격리' 규칙을 '공식 미지원 — 금지, 표준=뷰포트 근접 lazy-init'으로 교체(PR-A 동일 PR — 결정 #11)**. 합격선 PageSpeed 100 유지. .ad-wrap min-height 예약 검증을 PR 체크리스트에, 주 1회 프로덕션 PSI(외부 PSI API — 브라우저 순회 아님) |
| deploy-agent | CF Pages env 변경 절차 + **2단 롤백 런북(즉시=Rollback to previous deployment / 정식=env+재빌드 5~10분)** + 광고 도입 직전 배포 ID 대장 |
| author-agent | credit-loan·insurance-personal reviewedBy·검수 표기 + **kim-junhyeok 기명 마이그레이션 실행 주체(§5-2)** + lastReviewed 운영 |
| rss-agent | 신규 고CPC 글 indexnow 확인, discover-priority 실측 재정렬 |

### 6-2. 컨텍스트

- **CLAUDE.md "AdSense 운영 가드" 섹션** (D+3):
```
## AdSense 운영 가드 (2026-06-11 승인)
- 무효 클릭·자기 클릭·클릭 유도 문구 절대 금지. 개발·검수는 광고 차단 확장 켠 별도 프로필.
- 자동화 브라우저(Claude Preview·Chrome MCP)로 프로덕션 광고 페이지 열기 금지 —
  검증은 dist grep·curl·CF 프리뷰(data-adtest=on)만. .env.local 은 더미 client 유지.
- CTR 은 KPI 가 아니다 — 관찰만. 개선 시도 금지.
- 광고·인프라 PR: draft 생성 + `no-auto-merge` 라벨 필수.
  (auto-merge.yml 은 opt-out — 라벨 없으면 owner PR 도 CI green 즉시 자동 머지된다.)
  perf+ads 듀얼 게이트 + /review 후 운영자가 직접 머지.
- 글당 슬롯 ≤3, 글 상세 첫 화면 광고 0개, Auto Ads·자동 refresh 금지. 숨김 ins DOM 0개.
- 긴급 차단 2단: ① 즉시(수 초) = CF Pages Rollback to previous deployment
  (광고 도입 직전 배포 ID 는 docs/23 대장 참조) ② 정식(5~10분+큐 대기 가변) =
  env PUBLIC_ADSENSE_CLIENT 비우기 + Retry. 진행 중 빌드 있으면 취소 후 Retry 가 1단계.
  ads.txt 는 public/ads.txt 정적 — 킬스위치와 무관, 건드리지 않는다.
- 정책 센터 알림 발견 시 모든 발행 중단 후 처리 우선.
- 검토 센터: 금융 일반 카테고리 일괄 차단 금지(개별 광고주만).
  민감 카테고리(도박·사행성·데이트·암호화폐 투기 등) 차단은 유지.
```
- `docs/23-adsense-ops.md` 런북(D+3): 슬롯 ID 대장 / 롤백 타깃 배포 ID / 실험 레지스트리(전후 비교) / 광고 PR 체크리스트(draft+라벨·dist grep·프리뷰 PSI 실측·NPA 확인) / multiplex 도입 시 예약 CSS 동반 규칙 / data-astro-reload 폴백 / ConsentBanner·Google CMP 이중 구조 / 측정 절차.
- `docs/revenue-log/` — revenue-pull 산출 CSV/JSON + 주간 델타 1파일(원데이터 재요약 금지).
- 메모리 `feedback_adsense_policy.md`. CLAUDE.md stale 서술 정정(PR-B).

### 6-3. 도구

`src/lib/ads-lazy.ts`(IO lazy-init+사중 가드) · `src/lib/rehype-ad-slot.mjs`(W3~4 개발, M2 적용) · `scripts/audit/`: `revenue-pull.mjs`(AdSense·GA4·GSC API, OAuth 1회, **LLM 0**), `refresh-wave1.mjs`, `faq-backfill.mjs`(3원칙 내장), `claims-guard.mjs`(허위 서술 회귀 가드), `author-migration.mjs`(기명 전환) · Claude Preview(**더미 env 전용** — 전환 5회 콘솔 검증) · **`Experiment.astro`는 광고 용도 사용 금지 명시(결정 #7 — hero_cta 등 비광고 용도만)**.

### 6-4. MCP

| MCP | 용도 | 빈도 |
|---|---|---|
| Chrome 브라우저 제어 | **한정 운용(R2)**: CF Pages env·AdSense 대시보드 설정(단발)·정책 센터·네이버 서치어드바이저(API 부재 화면만). **프로덕션 광고 페이지 열기 금지** | 설정 시 단발 + 주 1회 최소 |
| scheduled-tasks | 주간 리뷰 알림 1건(매주 월 09:00 KST, 알림 전용) | 주 1회, 토큰 ~0 |
| Claude Preview | 광고 PR 머지 전 검증 — 더미 env(광고 미렌더)로 전환·콘솔·레이아웃만 | 광고 PR마다 |
| computer-use | Chrome MCP 불가 화면(핀 인증 등) 보조 | 비정기 |

### 6-5. 스킬

| 스킬 | 배치 |
|---|---|
| `/revenue-weekly` [신설, W2] | 주 1회 운영자 트리거: **revenue-pull.mjs 산출 파일(API 적재분)의 델타 해석 + §8-4 의사결정만 수행**(토큰 소). 대시보드 브라우저 순회 아님. 읽기 전용 |
| `/ads-audit` [신설, W2] | 주 1회: **빌드 산출물(dist) grep**(슬롯 수·숨김 ins 0·라벨·min-height·광고-프로모 인접 0) + **뷰포트 오프셋 자동 측정**(412x823·1280x900에서 슬롯 1 상단 오프셋 > 뷰포트 높이 — H2 최소/최대 표본 3편) + curl 프로덕션 HTML 검사 + `no-auto-merge` 라벨 확인 항목 — pass/fail만 출력 |
| naver-mate-econ | 주 1~2회 |
| storytelling·srt-narration-10sec·youtube-sumnail | **D+45 피벗 판정 후 개시** |
| deep-research | YMYL 1차 출처 검증 관문 |
| schedule | 주간 알림 1건 등록만 |
| /plan·/diff·/review·/ultrareview·/rewind·/batch | 기존 용법 + 광고 PR=/review, lighthouserc·워크플로 변경=/plan 선행 |

### 6-6. 서브에이전트 요약

신설 1(ads-agent) / 재정의 6 / 미신설: revenue-agent(역할은 /revenue-weekly로 흡수).

### 6-7. 팀 운영표 (R2 — 시간·비용 컬럼 추가)

| 주기 | 루틴 | 트리거 | 투입 | 시간 | LLM 비용 |
|---|---|---|---|---|---|
| 매일 | AdSense 홈+정책 센터+검토 센터 육안 | 운영자 | (없음) | 1~2분 | **0** |
| 매일 | 글 1~2편 발행(일 묶음 PR) | 운영자 | content→author→seo+실존 검증 | 1~2h | 중 |
| 주 1회(월) | /revenue-weekly — revenue-pull 델타 해석·차주 결정 | 운영자(cron은 알림만) | 스크립트+세션 | 30분 | 소~중 |
| 주 1회 | /ads-audit | 운영자 | ads-agent | 15분 | 소 |
| 주 1회 | 리프레시 5~10편(+faq 동승) | 운영자 | deep-research+content | 3~5h | 중 |
| 주 1~2회 | naver-mate-econ | 운영자 | 스킬 | 1~2h | 중 |
| 월 1회 | popular-queries·discover 갱신 + GEO 점검(인용↑클릭↓ 포함) | 운영자 | seo/rss-agent | 1h | 중 |
| 월 1회 | 클러스터 RPM 리포트 + 쿼리당 2+URL 카니발리제이션 탐지(GSC API 스크립트 — LLM 0) | 운영자 | revenue-pull 확장 | 1h | 소 |

---

## 7. 일·주·월 운영 루틴 (LLM 비용·시간 예산 기준)

**시간 예산(R2 신설)**: 주간 운영 합계 **≤20h** 선언 — §6-7 합산(발행 7~14h + 리프레시 3~5h + 측정·점검 ~2h + 네이버 1~2h)이 상한 내인지 월간 점검. 초과 시 발행부터 감축(품질>양). 유튜브(2~4h/편)는 D+45 후 이 예산 안에서 재배분.

**비용 원칙**: ① LLM 호출 cron 0건. ② 일일 점검 육안. ③ 주간 수집은 **API 스크립트(LLM 0) + 해석만 세션**. ④ revenue 로그는 델타 1줄. ⑤ /loop 상시 실행 금지. ⑥ GitHub Actions cron은 LLM 0이므로 유지하되 scheduled-rebuild 감축 검토(/plan — 빌드 한도).

**빌드 큐·한도 운영**(CF 무료 — 동시 1건·편당 ~3분·**월 500빌드**): 광고 코드 PR은 오전 단독 슬롯(킬스위치 가용성 확보 — 사고 시 큐가 비어 있어야 차단이 빠름), 콘텐츠는 일 묶음 PR 1건, 콘텐츠 브랜치 프리뷰 빌드 skip, cron 리빌드 시각(06:00/09:15/15:15/21:15/03:15)과 머지 겹침 회피, 월 누적 빌드 수를 /revenue-weekly에서 추적.

| 시간대 | 루틴 | 도구 매핑 | 시간 | LLM |
|---|---|---|---|---|
| 매일 아침 | 정책 센터·검토 센터·수익 육안 → 이상 시에만 세션 | 브라우저(수동) | 1~2분 | 0 |
| 매일 오전 | 광고/인프라 PR 처리(있을 때만 — draft+no-auto-merge) | /diff → perf+ads → /review → 직접 머지 | 가변 | 소~중 |
| 매일 오후 | 발행 1~2편(KST 검증 → 일 묶음 PR → URL 200) | content-agent+체인 | 1~2h | 중 |
| 월요일 | /revenue-weekly + /ads-audit | revenue-pull+ads-agent | 45분 | 소~중 |
| 주중 1회 | 리프레시 묶음(+faq 동승) | deep-research, audit 스크립트 | 3~5h | 중 |
| 주 1~2회 | naver-mate-econ | 스킬 | 1~2h | 중 |
| 월 1회 | 시즌 갱신 + GEO 점검 + 쿼터 재배분 + 빌드 카운트 | seo/rss-agent | 2h | 중 |

---

## 8. KPI·측정·실험 루프

### 8-1. KPI 트리와 소스 (R2 — 소스 이원화 + AI referral 신설)

| 레벨 | 지표 | 소스 | 주기 |
|---|---|---|---|
| North Star | 월 AdSense 순수익(공제 후) | AdSense 지급 페이지 | 월 |
| L1 | Page RPM / 월 PV | AdSense / **GA4+CF Web Analytics(쿠키리스·동의 비의존)+GSC 클릭 병기** — GA4 단독 금지: consent 게이트로 동의 소수 표본만 집계(R2) | 주 |
| L2 수익 | 유닛별 노출 RPM·Active View·CPC (CTR 관찰만 — KPI 금지) | AdSense 유닛·URL채널 | 주 |
| L2 트래픽 | 검색 노출·CTR·Discover·세션당 PV + **AI referral 세션 수·세션당 PV·RPM**(chatgpt.com·perplexity.ai·gemini.google.com 등 — GEO 자기잠식 감지, R2) | GSC/네이버/GA4 | 주 |
| L2 콘텐츠 | faq 보급(76→95%), lastReviewed(0→30%), **색인률·90일 무노출 비중(R2)**, **기명 비율(R2)**, risk high 무경고 주수 | audit 스크립트+GSC | 주~월 |
| 가드레일 | CLS·PageSpeed 100(절대 — 단 판정은 §10-2 규칙), **CrUX 필드 데이터·AdSense 유닛 지표 기준 이탈 가드**(GA4 이탈률 단독 사용 금지 — 동의 표본 왜곡, R2), 무효 트래픽 공제율, 정책 위반 0(절대) | perf-agent/CrUX/AdSense | 매 PR/주 |

### 8-2. 베이스라인 규칙 (R2 — ramp-up 유보 원칙과 정합)

- D+0~14: ramp-up 학습 기간 — 기록만, 판단 유보. 배치·밀도 변경 전면 금지.
- **공식 베이스라인 산정 윈도우 = D+14~28 실측**(초기 2주는 송출 학습·ads.txt 승인 지연으로 하방 편향 — 오염 표본 제외). §1-2 매트릭스 교체·클러스터 RPM 1차 순위 확정은 **D+30**(§10-1과 모순 제거).
- 이 기간에 **소프트 내비 vs 풀 리로드 노출 정합성 검증**(GA4 PV vs AdSense 노출 대조 — §4-4) 수행.

### 8-3. 실험 루프 (R2 — 전부 전후 비교·순차, 한 번에 1실험)

| # | 실험 | 시점 | 설계 | 판정 |
|---|---|---|---|---|
| 1 | ad_position — 슬롯 1 'ToC 직후' 2주 → '2번째 H2 앞' 2주 | **M2 전반**(rehype 머지 후 — 결정 #8) | **슬롯 DOM 1개·전후 비교**(결정 #7 — Experiment.astro 사용 금지, 숨김 ins 0). 기간별 유닛 ID 분리로 AdSense 보고서가 결과표 | 주지표=유닛 노출 RPM·Active View. p값 흉내 금지 — 방향성+가드레일 무손상. 계절성 보정: 동일 요일 묶음 비교 |
| 2 | ad_density — 2슬롯 2주 → 3슬롯(rehype ON) 2주 | M2 후반 | 동일(전후 비교) | RPM vs CrUX·체류 트레이드오프 |
| 3 | ad_format — 슬롯 2 디스플레이 → 멀티플렉스 | M3(착수 여부만 D+90 판정) | 전용 min-height CSS 동반 필수(결정 #2) | 동일 |

### 8-4. 주간 리뷰 의사결정 규칙 (/revenue-weekly — revenue-pull 산출 기반, 보는 순서 고정)

1. **정책 센터·무효 트래픽 공제율 먼저** — 공제율 10% 초과→유입 채널 점검, 20% 지속→노출 축소+정밀 감사.
2. 진행 실험(전후 비교) 가드레일 점검 — CrUX·AdSense 지표 기준.
3. URL 채널(클러스터)별 RPM 순위 → 차주 발행 쿼터(점유 상한 30% 내).
4. GSC 쿼리 이동 + **쿼리당 2+ URL 랭킹(카니발리제이션) 탐지**(월 1회 GSC API 스크립트 — LLM 0, R2) + **AI referral 추이·'인용↑클릭↓' 쿼리군 식별**(R2) → 리프레시·통합 대상 선정.
5. GSC CWV 필드 데이터 → 회귀 조짐 시 perf-agent 정밀 점검.
6. **색인률·무노출 비중 추이 → 케이던스 킬스위치 판정**(§4-2, R2) + 월 누적 빌드 수 확인.
7. `docs/revenue-log/`에 델타 commit.

---

## 9. 리스크 가드

### 9-1. AdSense 정책 (치명 — 수익 전체를 0으로 만드는 유일 사건)

| 리스크 | 가드 |
|---|---|
| 무효 클릭·자기 클릭 | 운영자 본인 클릭 금지 — 개발·검수는 광고 차단 확장 켠 별도 프로필. 가족·지인 안내 |
| **자동화 도구발 무효 트래픽·에이전트 오클릭(R2 신설)** | .env.local 더미화 + AdSlot PROD 게이트 + **자동화 브라우저의 프로덕션 광고 페이지 접근 금지(ads-agent 규칙 ⑧)** + 검증은 dist grep·curl·adtest 프리뷰만 + AdSense 사이트 인증 활성화 |
| **숨김 광고 유닛(R2 신설)** | Experiment.astro 광고 재사용 금지(결정 #7) + push에 가시성 필터 + /ads-audit '빌드 산출물 숨김 ins 0개' 강제 |
| 클릭 유도 변질 | CTR 비KPI, 클릭 유도 문구·오인 배치 ads-agent 즉시 거부, "광고" 라벨 의무, **래퍼 margin 2rem·탭 요소 24px 이격·광고-프로모(MainBackrefBox) 비연속 배치(R2)** |
| 과밀 배치 | 2슬롯 시작→상한 3, 첫 화면 0개(+ToC 부재 글 슬롯 1 생략 가드), Auto Ads OFF, 앵커 D+60+배너 조건, vignette 보류 |
| **동의·CMP 미비(R2 신설)** | consent default를 head 최상단·게이트 밖으로(PR-A) + NPA 신호 실측 + EEA/UK Google 인증 CMP 또는 미게재 명시 선택(§3-4) |
| **사기성 광고 인접 노출(R2 신설)** | 민감 카테고리 D+0 차단(도박·데이트·고금리 대부·코인 투기 — 금융 일반은 유지) + 검토 센터 일일 훑기 D+0 가동 |
| risk high 클러스터 | 주간 상한(각 1편) + explainer 강제 + 기명 검수 표기, 완화는 8주 무경고 후 |
| 허위 신뢰 주장 | PR-B 확대 전수 정정 + grep 기계 증명 + claims-guard.mjs 회귀 가드 |
| 무효 트래픽 오인 | UTM 분리, 품앗이 금지, 공제율 10%/20% 단계 발동 |
| CPC 자해 | 금융 일반 카테고리 일괄 차단 금지 — 개별 광고주만(민감 카테고리 차단과 구분) |
| 사고 대응 | 정책 경고→전 발행 중단·해당 슬롯 비활성·`/rewind` → **2단 차단**(즉시 Rollback 수 초 / env+재빌드 5~10분, ads.txt 불변) |

### 9-2. 성능 (perf-agent 머지 차단 = 수익 지연)

- **CLS 가드(R2 재설계)**: `.ad-wrap` min-height 예약(ins inline height와 무충돌) + unfilled 비접힘(래퍼 기준) + full-width-responsive false. ins 자체 aspect-ratio 방식 폐기.
- **lazy-init이 기본 설계**(결정 #11) — lab 측정 중 광고 미로드로 PSI 100 양립. feasibility는 매 광고 PR마다 CF 프리뷰(adtest) 실측으로 증명.
- push 사중 가드(단일 등록·요소 멱등·가시성·IO 분리 — §3-1 (5)) + Preview 재방문 포함 5회 전환 검증.
- **게이트 실효화**: lighthouserc error 승격(/plan) + 광고 포함 측정은 프리뷰 수동 1회 의무(§3-1 (11)(12)) — 'CI는 광고 없는 페이지만 측정' 한계 명시.
- 슬롯 1→2→3 각 단계 프리뷰 PSI 100 실측 통과 후 확장. **PageSpeed 100 합격선 불변.**
- CSP Report-Only 유지 + 광고 도메인 허용목록 선반영, enforce 90일 보류(§5-3).
- perf-agent·docs/17 룰북은 PR-A와 같은 커밋에서 정합(§3-1 (10)).

### 9-3. SEO·검색 품질 (R2 — PV 인자 보호로 격상)

- **scaled content 방어**: 색인 건강 기준선(D+1~2) + 케이던스 킬스위치(색인률<70% 또는 무노출>30% → 발행 반감) + 근중복 통합 웨이브(M2) + 신규 정당화 체크.
- 카니발리제이션: 발행 전 grep+GSC 대조 의무(시즌 글 포함 — §3-5에서 D+2~4 4편 중 2편 리프레시 전환 확정) + 월 1회 쿼리당 2+URL 탐지 스크립트.
- **.md 미러 noindex**(PR-B) — AI 크롤러 fetch는 유지(GEO 보존).
- E-E-A-T: 기명 전환 마이그레이션 + 신규 기명 디폴트 + 자격 위장 절대 금지.
- 허위 lastReviewed 차단(본문 diff 0 시 단독 변경 거부) · faq 3원칙 · 스키마 과대표시 제거(PR-B) · 내부링크 자연성 우선 · `data-pagefind-ignore` · 빌드 큐·한도 분산.
- GEO 자기잠식: AI referral 계측 + 2계층 콘텐츠 + 계산기 자산 편성(§5-2).

### 9-4. YMYL

법정·공시 수치는 법제처·국세청 1차 출처 확인 후에만 단정, 추정은 "약 N" · 시즌 글 기한·세율 발행 시점 재확인 · publishedAt KST 실시각 검증 + "D-N" 정합 점검 · 수익 드라이브의 품질 게이트 압박 금지(케이던스 상향은 D+45 실측 정당화 시만) · "대출 권유"로 읽히는 문맥 인접 광고 금지 — 슬롯은 구조 요소 기준으로만 · faq 신규 수치 도입 금지(리프레시 트랙 승격).

### 9-5. 운영·비용

LLM cron 0건·델타 기록·육안 일일 점검 · **주간 시간 예산 20h + 시간 컬럼 운영(§6-7)** · **월 500빌드 한도 카운터·일 묶음 PR·프리뷰 skip(§4-3)** · 측정은 API 스크립트 우선(Chrome MCP 최소화) · content-agent 파일 미반영 가드 · ramp-up 기간 구조 변경 금지 · 워크플로 수정 `/plan` 우선 · 로컬 도구체인 셋업을 크리티컬 패스 0번에(§3-0).

---

## 10. 90일 마일스톤과 피벗 기준

### 10-1. 마일스톤

| 시점 | 마일스톤 | 판정 데이터 |
|---|---|---|
| D+2 | 첫 광고 노출 + ads.txt(정적) 200 + **프리뷰 PSI 100 실측 리포트 보관**(머지 게이트 통과 증빙) | curl·광고차단 프로필 육안·PSI 리포트 |
| D+7 | 2슬롯 전 글 가동 + URL 채널 적재 + 허위 서술·스키마 정정 머지 + 색인 건강 기준선 + 시즌 글(리프레시 중심) 처리 | AdSense·PR 이력·GSC |
| D+14 | ramp-up 유보 종료, 베이스라인 산정 윈도우(D+14~28) 개시, 소프트내비 노출 정합성 1차 확인 | AdSense·GA4 대조 |
| D+30 | **베이스라인 확정 → §1-2 매트릭스 실측 교체 + 클러스터 RPM 1차 순위**, 핀 검증(₩10,000) 진행 점검 | D+14~28 실측 |
| D+45 | **피벗 판정일**(아래) + 유튜브 개시 여부 결정 | 누적 수익 |
| D+60 | 실험 1 판정(M2 전반 전후 비교), 발행 배분 1차 재설계, faq 백필 완료(95%+), 앵커 도입 여부(배너 조건 포함) | 주간 로그 누적 |
| D+90 | 연간 수익 모델 실측 재산정, 실험 2 판정·실험 3 착수 결정, lastReviewed 30%, **기명 비율 KPI·근중복 통합 완료**, risk high 상한 완화 여부, 연말정산 시즌 준비 착수 | 90일 전체 데이터 |

### 10-2. 피벗·발동 기준

| 조건 | 판정 | 액션 |
|---|---|---|
| D+45 누적 수익 < ₩10,000 | 병목 = 트래픽 절대량 | 광고 실험 중지(2슬롯 유지), 리프레시·네이버·(개시 시)유튜브로 축 이동. 밀도 슬금슬금 상향 금지 |
| 클러스터 RPM 격차 3배 이상 4주 지속 | 발행 배분 재설계 | **증산·감축 양방향 모두 RPM 단독 판단 금지(R2)** — 감축은 내부링크 허브 기여 확인 후, 증산은 SERP 갭 실사 통과 후 |
| **색인률 <70% 또는 무노출 >30%(R2 신설)** | scaled content 위험 | 신규 발행 반감 + 통합·리프레시 스프린트 우선 |
| 무효 트래픽 공제율 10% 초과 / 20% 지속 | 채널 이상 / 계정 위협 | 유입 채널 점검 / 노출 축소+정밀 감사 — 수익보다 계정 생존 |
| 정책 센터 알림 ≥1 | 전 작업 중단 사유 | 발행 중단 → 원인 특정 → 슬롯 비활성·`/rewind` → 필요 시 2단 차단 |
| **PSI 100 미달·CWV 악화(R2 — 즉시 킬스위치 데드락 해소)** | **단계적 완충 사다리** — lab 점수 단독이 아니라 PSI 3회 중앙값 + CLS·TBT 수치 임계 병기로 판정(광고 fill 무작위성 감안) | ① lazy rootMargin 축소·로드 지연 강화 → ② 슬롯 1개 감축 → ③ 그래도 미달 시에만 env 전면 OFF. **즉시 차단(Rollback)은 정책 경고·CrUX 필드 데이터 악화 전용** |
| 실험(전후 비교) 신호 불명 지속 | 윈도우 연장 | 비교 윈도우 2주→4주 연장 — 틀린 유의성보다 정직한 방향성 |

### 10-3. 첫 24~48시간 체크리스트 (R2 — 순서 강제: PR-A → env)

0. **로컬 도구체인**: corepack enable → pnpm install → pnpm build 확인(실패 시 CF 프리뷰 검증 폴백) `[D+0 오전]`
1. **AdSense 최소 설정**: Auto ads OFF + 유닛 2개 + **민감 카테고리 차단(금융 일반 유지)** + 사이트 인증 / `.env.local` 더미화 `[D+0 오전]`
2. **PR-A (draft + no-auto-merge)**: Partytown·head eager 로더 삭제 + ads-lazy.ts(IO lazy-init+사중 가드) + consent default head 최상단 이동 + AdSlot(PROD 게이트·multiplex 제거) + .ad-wrap min-height CLS 가드 + 슬롯 2개(ToC≥3 가드·author-box 뒤) + 배너 패딩 + ads.txt 정적화 + CSP 허용목록 + perf-agent.md·docs/17 정정 + lighthouserc error 승격(/plan 선행) `[D+0]`
3. **검증**: dist grep(ins 2·숨김 0·pagead2 1곳) → CF 프리뷰(client+adtest) PSI 모바일 3회 중앙값 100 → NPA 신호 → Preview 더미 env 5회 전환 콘솔 0 → /review → 직접 머지 → **배포 ID 기록** `[D+0]`
4. **env 주입(PR-A 프로덕션 반영 후에만)**: PUBLIC_ADSENSE_CLIENT(+GA4 ID 확인) → Retry → curl+광고차단 프로필 육안 → 콘텐츠 브랜치 프리뷰 빌드 skip 설정 `[D+0 오후]`
5. **PR-B**: 확대 전수 정정(kim-junhyeok.json·md.ts L87·10단계 모순·CLAUDE.md stale 포함) + 스키마 삭제 + _headers .md noindex → grep 증명 첨부 → [slug].astro 분량은 PR-A 후 리베이스 → /ultrareview `[D+1]`
6. **대시보드 잔여**: URL 채널 12 + GA4 연결 + **Privacy & messaging(EEA/UK)** + GA4 consent region 결정 + OAuth 셋업 `[D+1]`
7. CLAUDE.md 가드 섹션 + docs/23 런북(2단 롤백·배포 ID 대장) + 메모리 기록 `[D+1]`
8. **기준선 수집**: GSC 쿼리·페이지 + **색인률·무노출 URL·.md 색인 점검** `[D+1~2]`
9. 시즌 콘텐츠 — **카니발리제이션 대조 후**: 자동차세·부가세는 기존 글 리프레시, 재산세는 비중복 앵글 통과 시만 신규. publishedAt KST 검증 `[D+2~4]`
※ **D+0~1 신규 발행 정지** — 빌드 큐·운영자 시간을 광고 가동에 전용.