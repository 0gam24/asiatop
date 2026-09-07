# 구글 회복 리서치: 2026년 8월 스팸 업데이트와 머니룩 대응 (2026-09-07)

리서치 범위: 구글 공식 문서·Search Status Dashboard, Search Engine Land(SEL), Search Engine Journal(SEJ), Search Engine Roundtable(SER), Glenn Gabe(GSQi), Marie Haynes, Lily Ray, Cyrus Shepard(Zyppy) 및 2차 집계 연구.
표기 원칙: 구글 1차 출처 = [공식], 업계 전문가 1차 관찰 = [전문가], 집계·에이전시 2차 자료 = [2차], 출처 없는 해석 = "추정".
확인된 공백: 2026년 8월 업데이트를 다룬 한국어 SEO 매체·커뮤니티 자료는 검색되지 않았다. 일본 SEO 매체(allegro-inc, devo, pecopla)만 아시아권 관찰을 제공.

---

## 0. 한 줄 결론

8월 업데이트는 "새 정책 없는 일반 스팸 업데이트"이고, 구글 공식 회복 문구는 하나뿐이다. "자동 시스템이 수개월에 걸쳐 사이트가 스팸 정책을 준수한다고 학습하면 개선될 수 있다." 다음 업데이트를 반드시 기다려야 한다는 공식 문구는 없지만, 실제 회복 사례는 대부분 수개월 뒤 후속 코어·스팸 업데이트에서 계단식으로 나타났다. 머니룩의 운영자 진단(대량 기계 발행·익명 저자·균일 템플릿 = scaled content abuse 풋프린트)은 구글 스팸 정책·품질평가 가이드라인(QRG) 문언과 정합한다. 이미 P0~P4를 끝냈으므로, 이제 핵심은 (a) 아직 색인된 채 남은 얕은 재고의 2차 정리, (b) "Who·How·Why"를 페이지에 눈에 보이게 박는 것, (c) 커머디티 콘텐츠를 벗어나는 독창 데이터 레이어, (d) 측정 체계 고정과 인내다.

---

## 1. 업데이트 팩트 요약

### 1-1. 일정과 성격 [공식]

| 항목 | 내용 | 출처 |
|---|---|---|
| 시작 | 2026-08-18 09:27 PDT (한국 8/19 01:27) | https://status.search.google.com/incidents/LEubPCm2octf2uMqCFKE |
| 완료 | 2026-08-21 01:49 PDT (2일 16시간) | 동일 |
| 범위 | 전 세계, 전 언어 | 동일 |
| 성격 | "normal spam update". 신규 스팸 정책 없음, 동반 블로그 글 없음 | https://searchengineland.com/google-august-2026-spam-update-done-rolling-out-485471 , https://www.seroundtable.com/google-august-2026-spam-update-done-41906.html |
| 2026년 순서 | 3번째 스팸 업데이트 (3/24~25, 6/24~26, 8/18~21). 코어 업데이트는 3월·5월(5/21~6/2) 2회 | https://www.searchenginejournal.com/google-begins-rolling-out-the-august-2026-spam-update/586301/ , https://www.numinix.com/blog/september-2026-seo-algorithm-news-update/ |
| 정책 맥락 | 2026-05-15 스팸 정의 개정: "attempting to manipulate generative AI responses in Google Search"가 스팸에 포함. 6월 업데이트가 첫 집행. 8월 업데이트가 이를 겨냥했는지는 구글 미확인 | https://searchengineland.com/google-updates-search-spam-policies-to-clarify-it-applies-to-generative-ai-responses-477657 |
| 9월 현황 | 9/1 기준 9월 코어·스팸 업데이트 미발표. 8/26 이후에도 순위 변동 지속 관찰 | https://www.seroundtable.com/google-search-ranking-volatility-continues-41952.html |

### 1-2. 구글 공식 회복 문구 [공식]

- 스팸 업데이트 문서: "Sites that see a change after a spam update should review our spam policies to ensure they are complying with those. Making changes may help a site improve if our automated systems learn over a period of months that the site complies with our spam policies."
  https://developers.google.com/search/docs/appearance/spam-updates
- 링크 스팸 예외: 링크 효과가 제거된 경우 "making changes might not generate an improvement". (머니룩은 링크 스팸 아님, 해당 없음)
- 스팸 정책의 scaled content abuse 정의: "Scaled content abuse is when many pages are generated for the primary purpose of manipulating search rankings and not helping users." 예시에 생성형 AI 대량 생성 포함. 해당 콘텐츠를 호스팅하는 사이트는 "exclude it from Search"(noindex·robots) 권고.
  https://developers.google.com/search/docs/essentials/spam-policies
- 코어 업데이트 문서: "some changes can take effect in a few days, but it could take several months for our systems to learn", "you don't necessarily have to wait for a major core update to see the effect of your improvements", "Deleting content is a last resort", "Avoid doing 'quick fix' changes".
  https://developers.google.com/search/updates/core-updates
- 트래픽 하락 진단 문서: "there's no guarantee that changes you make to your website will result in noticeable impact in search results".
  https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops
- 헬프풀 콘텐츠 시스템(2022, 현재 코어에 통합): 사이트 단위 신호. "removing unhelpful content could help the rankings of your other content", 분류는 "over a period of months" 적용되며 "unhelpful content has not returned in the long-term"이 확인돼야 해제.
  https://developers.google.com/search/blog/2022/08/helpful-content-update
- AI 콘텐츠 가이드(2023-02): "Appropriate use of AI or automation is not against our guidelines", 단 "Using automation, including AI, to generate content with the primary purpose of manipulating ranking in search results is a violation of our spam policies."
  https://developers.google.com/search/blog/2023/02/google-search-and-ai-content

### 1-3. 타깃 (전문가 관찰) [전문가]

- Glenn Gabe, 8월 업데이트 케이스 4건: (1) 초YMYL 사이트, programmatic + AI 청크 혼합 → 20만+ 쿼리 상실 (2) 아마존 씬 어필리에이트 → 1.4만 쿼리 상실 (3) 색인 150만 URL, 85% programmatic → 사이트 전 섹션 하락 (4) 25만 URL + 오도성 리다이렉트. 결론: "Address the spam aggressively", 회복은 "typically at least several months", 사례 중 "five months" 언급. 익명 저자·발행 속도·템플릿 풋프린트에 대한 직접 언급은 없음.
  https://www.gsqi.com/marketing-blog/august-2026-google-spam-update-case-studies/
- 데이터(SE Ranking, 미국 10만 키워드·20업종): top10 URL의 16.71%가 100위 밖으로 이탈(7월 기준 9.2%, 1.8배). 20업종 전부 변동, 부동산·헬스 등 YMYL은 상대적으로 안정. 금융 별도 수치 없음. 사이트 유형별 분석은 없음.
  https://searchengineland.com/google-august-2026-spam-update-ranking-impact-485980
- 일본 SEO 매체 관찰: AI 생성 비율 높은 매체, 외부 리뷰 전재 사이트, 요약·큐레이션 사이트가 타격. Discover 유입이 이전의 10~30%로 붕괴한 매체 다수. [2차]
  https://www.allegro-inc.com/seo/google-august-2026-spam-update/
- 6월 업데이트 분석: "AI 콘텐츠 자체가 아니라 scaled content abuse"가 타깃. [2차]
  https://www.techseo.berlin/en/blog/google-june-2026-spam-update
- 1월 2026 미확인 업데이트(Gabe): "commodity content"·자기 홍보 리스티클을 대량 생산한 사이트가 붕괴, 5월 코어까지 대부분 미회복. 단 일부는 회복 시작.
  https://x.com/glenngabe/status/2076647517182140794 , https://www.gsqi.com/marketing-blog/core-roars-back-google-may-2026-core-update-analysis/

### 1-4. 스팸 업데이트와 코어 업데이트의 관계 [전문가]

- Gabe(2024-12): 코어 업데이트에서 급등한 스팸 사이트가 이후 스팸 업데이트에서 반전 하락. 두 시스템은 독립적으로 평가.
  https://www.gsqi.com/marketing-blog/google-december-2024-spam-update-case-studies/
- Gabe(2025-12 코어 분석): 스팸 업데이트 피해 사이트가 스팸을 정리하고 "typically at least a few months" 뒤 코어 업데이트에서 회복한 사례 존재. "Quality includes content, the user experience, the advertising situation, affiliate situation, technical SEO problems."
  https://www.gsqi.com/marketing-blog/google-december-2025-broad-core-update-analysis-findings/
- 해석(추정): 머니룩은 스팸 업데이트에서 억제됐으므로 1차 관문은 SpamBrain의 "정책 준수 학습"이고, 2차 관문은 코어 시스템의 사이트 품질 재평가다. 두 관문 모두 "수개월"이 단위이며, 다음 스팸 업데이트(2026년 패턴상 2~3개월 간격, 추정 10~11월)와 다음 코어 업데이트가 관측 창이 된다.

### 1-5. GSC 데이터 주의 [공식]

- 2026-08-13부터 Generative AI(검색) 성능 리포트와 Discover 리포트에 로깅 오류로 노출 감소가 기록됨. John Mueller: "This is just a logging issue and not representative of visibility changes in Search." 8/31 데이터 정정 완료. 웹 검색 성능 리포트 총계는 영향 없음.
  https://searchengineland.com/google-search-console-generative-ai-performance-report-in-search-data-bug-485215 , https://www.seroundtable.com/google-search-console-performance-reports-drop-41884.html
- 함의: 머니룩의 주 57,000→400 노출 감소는 웹 검색 리포트 기준이면 실제다. 단 8/13~8/31 구간의 Generative AI·Discover 수치는 기준선에서 제외한다.

---

## 2. 회복 사례 표 (2024~2026)

| 사이트 유형 | 피해 | 조치 | 회복 소요·정도 | 출처 |
|---|---|---|---|---|
| 공기청정기 리뷰 (HouseFresh) | 2023-09 HCU, -95% (일 4,000→200) | 얕은 리뷰 수백 편 제거, 실측·사진·영상 추가, 저자 전문성 페이지, 광고 밀도 축소, 유튜브 채널·LTT 협업으로 브랜드 신호. 운영자 자평 "hard work and a lot of luck" | 25개월(2025-10-11 이전 수준 초과). 2025-06 코어에서 부분 회복 후 완전 회복 | https://ppc.land/housefresh-achieves-notable-traffic-recovery-after-google-algorithm-impacts-2/ [전문가·당사자] |
| 의료 이커머스 (Haynes 사례1) | 2024-08 코어 | 저자 E-E-A-T 자격 강화, 고객서비스·배송 개선, 제품 설명·FAQ, 블로그 품질, 리뷰 확보. "what helped the most had very little to do with SEO" | 여러 코어 업데이트 경과, 2025-12 코어에서 회복 확인 (약 16개월) | https://www.searchenginejournal.com/4-sites-that-recovered-from-googles-december-2025-core-update/567960/ [전문가] |
| 고가 제품 어필리에이트 (Haynes 사례2) | 코어 업데이트(시점 미상) | 제품 직접 구매·촬영, 시연 영상, 경험 인사이트 전면 배치, 구조 재편, CWV | "many months of tireless work" 후 2025-12 코어에서 상승 | 동일 |
| YMYL 이커머스 (Haynes 사례3) | 미상 | 내비게이션·디자인·체크아웃, About 확장, 시의성 콘텐츠로 권위 링크 획득 → 브랜드 지식패널 확보 | 시점 미명시, "search traffic is climbing" | 동일 |
| 도시 가이드 (Haynes 사례4) | HCU | 팀 촬영 영상·원본 사진·경험 인사이트·의사결정 가이드, 신선도 유지 | 시점 미명시, "nice improvements" | 동일 |
| 여행 블로그 (seo.ai 사례) | 2023-09 HCU | 삭제·noindex 없이 기존 글 재작성: 저자 소개·사진, 목차, 콘텐츠 확장(11→21항목), 상위 3 추천 표시 | 기간·비율 미명시 | https://seo.ai/blog/how-to-recover-from-a-google-helpful-content-update [2차] |
| 400+ HCU 피해 집계 (Gabe 코호트 인용) | 2023-09 HCU | 얕은 콘텐츠 40~60% 제거 후 신규 발행한 사이트가 발행만 한 사이트 대비 3배 회복률. 한 사례: 640편 제거, 180→45편 통합, 12주 만에 손실의 55% 회복 | 첫 개선 4~8주, 20%+ 부분 회복 2~6개월(비YMYL)/3~8개월(YMYL), 50%+ 5~10/8~16개월, 완전 회복 12~24개월 이상 "rare to never". 2024-08 기준 20%+ 회복 22% | https://thestacc.com/blog/helpful-content-update-recovery/ [2차, 수치 검증 불가] |
| 업종별 집계 | 동일 | YMYL 부분 회복률 15~20%, 표준 6~12개월. 의료 이커머스 1건은 1년 이상 "trust-layer changes" 후 2025-12 코어에서 억제 해제 | 동일 | https://serps.io/blog/helpful-content-update-recovery [2차] |
| 50사이트 승패 상관 (Zyppy) | 2023 8~12월 코어·스팸·HCU | 승자 특성: 1인칭 대명사 +0.383, 직접 경험 +0.333, 연락처 +0.288. 패자 특성: 고정 푸터 광고 -0.522, 고정 영상 광고 -0.52, 스톡 이미지 -0.403, 총 광고 수 -0.383. 저자 박스·단어 수·어필리에이트 고지는 유의미하지 않음 | 상관 연구, 인과 아님 | https://zyppy.com/seo/google-update-case-study/ [전문가] |
| Lily Ray 130사이트 추적 | 2023-09 HCU | 129/130이 수개월간 하락만 지속 | 회복 극히 드묾 | https://serps.io/blog/helpful-content-update-recovery (인용) [2차] |
| 스팸 업데이트 피해 사이트 (Gabe) | 2025 이전 스팸 업데이트 | 스팸 제거 후 방치 없이 운영 지속 | "at least a few months" 뒤 2025-12 코어에서 회복 | https://www.gsqi.com/marketing-blog/google-december-2025-broad-core-update-analysis-findings/ [전문가] |

사례에서 반복되는 공통 인자(출처 종합): (1) 얕은 재고 정리가 신규 발행보다 선행 (2) 실명 저자·경험·원본 미디어 (3) 광고·UX 감점 제거 (4) 오프사이트 브랜드 신호 (5) 수개월~2년의 인내, 회복은 후속 업데이트에서 계단식.

---

## 3. 머니룩 적용 우선순위 액션 (10개)

전제: docs/24의 P0(캐던스)·P1(풋프린트 가드)·P2(실명 저자 전환)·P3(프루닝 웨이브 1: noindex 77·merge 18·delete 5·keep 227)·P4(네이버 CTR 도구)는 완료. 아래는 그 다음 단계다. 네이버 불변 원칙(robots·canonical·RSS·인증·IndexNow)은 모든 항목의 상위 제약이다.

### A1. 스팸 정책 자체 감사서 작성 (1주 내)
- 내용: 구글 스팸 정책 항목별(scaled content abuse, thin affiliate, doorway, keyword stuffing, hidden text, site reputation abuse, expired domain, link spam, 생성형 AI 응답 조작)로 머니룩 현황을 "해당/비해당/조치 완료"로 기록. 특히 자동 발행기(R95, 2026-06-11 폐기) 시기 글의 비중, 제목·메타 템플릿 중복률, AI 보조 표기 현황을 수치로.
- 근거: 구글 공식 1차 지시가 "review our spam policies" (https://developers.google.com/search/docs/appearance/spam-updates). 수동 조치가 없어 재심사 요청 경로는 없으므로, 감사서는 내부 의사결정 기준이자 향후 정책 문서(editorial policy) 갱신의 근거로 쓴다.
- 예상 효과: 직접 랭킹 효과 없음. 후속 액션의 대상 선정 정확도 향상.
- 리스크: 없음. 단 "자동 검증" 같은 과거 주장을 현재형으로 되살리지 말 것 (허위 주장 방지 원칙).

### A2. 프루닝 웨이브 2: "색인된 얕은 재고" 판정 (2~4주)
- 내용: 웨이브 1은 미색인 327건만 다뤘다. 이번엔 색인된 358건 + keep 227건 중 (a) 구글·네이버 모두 90일 클릭 0 (b) 자동 발행기 시기 발행 (c) 본문 독창 요소(계산·실측·1차 출처 인용) 부재 (d) 동일 클러스터 내 의도 중복, 4조건 중 3개 이상이면 merge(통합) 또는 googlebot 전용 noindex. 네이버 클릭이 있는 글은 무조건 "개선" 트랙.
- 근거: scaled content abuse 정책의 "exclude it from Search" 권고 (https://developers.google.com/search/docs/essentials/spam-policies), HCU 문서의 "removing unhelpful content could help the rankings of your other content"와 "unhelpful content has not returned in the long-term" 해제 조건 (https://developers.google.com/search/blog/2022/08/helpful-content-update), 코어 문서의 "Deleting content is a last resort" (https://developers.google.com/search/updates/core-updates), Gabe의 improve→noindex→410 3단 기준 (https://www.gsqi.com/marketing-blog/remove-versus-improve-low-quality-thin-content/), 40~60% 프루닝 3배 회복률 [2차] (https://thestacc.com/blog/helpful-content-update-recovery/).
- 예상 효과: 사이트 단위 분류기가 보는 "unhelpful 비율" 하향. 회복 사례의 최상위 공통 인자.
- 리스크: (1) 네이버: googlebot 전용 noindex라 네이버 색인은 보존되지만 merge·delete는 네이버에도 301이 적용되므로 네이버 클릭 글은 제외 (2) 대량 변경 신호: 웨이브를 2~3회로 나누고 각 웨이브 사이 2주 이상 간격 (3) Mueller "removing content doesn't make the rest rank higher" (https://www.seroundtable.com/google-removing-content-36097.html): 제거는 필요조건이지 충분조건이 아님. A4·A5 없이 제거만 하면 효과 제한.

### A3. 저자 페이지를 "검증 가능한" 수준으로 (2주)
- 내용: `/author/kim-junhyeok/`에 (a) 실명·사진·사업자등록 공개 정보 (b) 금융 관련 경력·자격(있는 것만, 없으면 "N년 실무·집필 경험"으로 정직하게) (c) 외부 프로필 sameAs 3개 이상 (LinkedIn·브런치·네이버 블로그·유튜브 등 실제 활동 중인 것) (d) 연락 수단 (e) ProfilePage + Person 스키마(jobTitle·sameAs·description·image). Article 스키마는 author.name에 이름만, author.url로 저자 페이지 연결. 검토자가 생기면 reviewedBy 추가.
- 근거: 구글 "Who": "Is it self-evident to your visitors who authored your content?", 바이라인이 저자 배경 정보로 이어져야 함 (https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Article 저자 마크업 모범사례 (https://developers.google.com/search/docs/appearance/structured-data/article). ProfilePage 문서 (https://developers.google.com/search/docs/appearance/structured-data/profile-page). 2025-09 QRG: YMYL은 자격 있는 저자 소개 필수 (https://www.seo-kreativ.de/en/blog/google-quality-raters-update_9-25/) [2차 요약]. Zyppy: 연락처 정보 +0.288 (https://zyppy.com/seo/google-update-case-study/).
- 예상 효과: E-E-A-T의 Trust 축 직접 보강. 단 Zyppy에서 "저자 박스" 자체는 유의미하지 않았으므로, 박스가 아니라 검증 가능성(외부 프로필·연락처·실체)이 핵심.
- 리스크: 허위·과장 자격은 YMYL에서 치명. 저자 필드 갱신은 본문 무변경이므로 updatedAt·lastmod 불변 유지.

### A4. "How" 공개: 편집·검증 프로세스 페이지와 글 단위 표기 (2주)
- 내용: editorial-policy에 (a) 취재·집필·검수 절차 (b) AI 보조 사용 범위와 사람 검수 방식 (c) 1차 출처 원칙(법제처·국세청·금감원·금융위·한은) (d) 정정·업데이트 정책 (e) 광고·제휴 고지. 글 단위에는 "작성·검수", "최종 검토일", "정정 이력"(실제 정정 있을 때만)을 표시.
- 근거: 구글 "How": "Is the use of automation, including AI-generation, self-evident to visitors through disclosures or in other ways?" (https://developers.google.com/search/docs/fundamentals/creating-helpful-content). AI 콘텐츠 가이드의 공개 권고 (https://developers.google.com/search/blog/2023/02/google-search-and-ai-content). QRG 2025-01 §4.6.6: AI 생성 + 노력·독창성·부가가치 부재 = Lowest (https://searchengineland.com/google-quality-raters-content-ai-generated-454161).
- 예상 효과: 기존 aiAssisted 글의 "검증 UI"가 정직한 공개로 기능. 스팸 분류기의 직접 입력이라기보다 품질평가 정합성.
- 리스크: 과거 자동 발행 시기 글에 "사람이 검수했다"고 소급 표기하지 말 것. docs/24 P2의 "책임 편집/작성·검수" 구분 유지.

### A5. 커머디티 탈출: 글당 독창 요소 1개 이상 의무화 (지속)
- 내용: 신규·리프레시 글에 (a) 머니룩 계산기 실행 결과 표 (b) 법령·고시 조문 직접 인용 + 시행일 (c) 실제 사례 수치(익명화) (d) 기관 간 수치 차이 대조 (e) 원본 스크린샷·도표 중 1개 이상. content-auditor 체크리스트에 "독창 요소" 항목 추가.
- 근거: QRG "filler"·"paraphrased content" Lowest (https://searchengineland.com/google-quality-raters-content-ai-generated-454161). Gabe: 1월 2026 업데이트가 "commodity content" 직격 (https://x.com/glenngabe/status/2076647517182140794). Haynes: "surface level AI generated content, people don't want that" (https://www.searchenginejournal.com/4-sites-that-recovered-from-googles-december-2025-core-update/567960/). Zyppy: 직접 경험 +0.333, 스톡 이미지 -0.403 (https://zyppy.com/seo/google-update-case-study/). 원본 데이터 사이트 +19% [2차] (https://thestacc.com/blog/helpful-content-update-recovery/).
- 예상 효과: "다른 페이지와 같은 정보"에서 벗어나는 유일한 경로. AI 검색 인용에도 유리 (추정).
- 리스크: 편당 제작 시간 증가. 법정 수치는 1차 출처 확인 후에만 단정 (기존 규칙).

### A6. 딥 리프레시 트랙 신설: 주 2~3편, 본문 실질 개편 (지속)
- 내용: 네이버 클릭 상위 + 구글 색인 유지 글부터, A5 독창 요소 추가·오래된 수치 갱신·의도 중복 통합·내부링크 3~5개 정비. 실질 변경 시에만 updatedAt 갱신. 제목은 P4 운영자 지정 목록 외 불변.
- 근거: 코어 문서 "improve" 우선, 삭제는 최후 (https://developers.google.com/search/updates/core-updates). 날짜 갱신 기준: Mueller "only update the date when you actually make significant changes" (https://searchengineland.com/guide/byline-dates). 발행 빈도는 신호 아님: Mueller "a site isn't a machine that pumps out content at a fixed rate" (https://www.seroundtable.com/google-content-frequency-25367.html). 회복 사이트는 "one deep article weekly vs three shallow" [2차] (https://serps.io/blog/helpful-content-update-recovery).
- 예상 효과: 색인 유지 글의 품질 상향이 사이트 평균을 끌어올림. 신규 1편/일 상한과 충돌 없음(리프레시는 캐던스 미집계).
- 리스크: 본문 무변경 lastmod 갱신은 금지 (구글 자체평가 질문 "changing the date of pages to make them seem fresh"). 리프레시 PR도 라벨 승인 경로 유지.

### A7. 광고·UX 감점 측정과 상한 고정 (1주 + 지속)
- 내용: Auto ads 단독 상태에서 글 상세 페이지 표본 20개의 광고 수·뷰포트 점유율·고정형(앵커) 노출 여부를 측정해 기록. 앵커·vignette 비활성 유지, 첫 화면 광고 0 유지, 페이지당 광고 상한을 문서화. CWV 회귀 감시.
- 근거: Zyppy 최강 음의 상관 = 고정 푸터 광고 -0.522, 고정 영상 광고 -0.52, 총 광고 -0.383 (https://zyppy.com/seo/google-update-case-study/). Gabe 2025-12: 건너뛸 수 없는 영상 광고 팝업 사이트가 "one of the biggest drops", 품질 평가에 "advertising situation" 포함 (https://www.gsqi.com/marketing-blog/google-december-2025-broad-core-update-analysis-findings/). HouseFresh·Haynes 사례 모두 광고 축소 포함.
- 예상 효과: 사이트 단위 품질 평가의 UX 감점 제거. 상관 연구라 효과 크기는 추정.
- 리스크: 수익 감소. Auto ads는 배치 통제가 제한적이므로 AdSense 설정에서 포맷 단위 제한으로 대응. 자동화 브라우저로 프로덕션 광고 페이지 열기 금지 원칙 유지.

### A8. 오프사이트 브랜드·저자 신호 (지속, 저비용)
- 내용: 저자 실명으로 외부 채널 활동(브런치·네이버 블로그·유튜브 쇼츠·링크드인)에서 머니룩 글을 1차 출처로 인용, 언론·커뮤니티 인용 유도, 브랜드 검색(머니룩) 추이 관측. 구글 비즈니스·지식패널 후보 정보 정비.
- 근거: HouseFresh 회복의 핵심 인자가 유튜브·협업 (https://ppc.land/housefresh-achieves-notable-traffic-recovery-after-google-algorithm-impacts-2/). Haynes 사례3 지식패널 확보 후 상승. Danny Sullivan: 코어 업데이트는 "a variety of ranking signals"와 "anonymized user interactions" 사용 (https://www.seroundtable.com/interview-google-august-core-update-38024.html). Lily Ray: 오가닉 하락은 AI 검색 인용 하락(-22.5%)과 동행 (https://lilyraynyc.substack.com/p/are-citations-in-ai-search-affected).
- 예상 효과: 직접 랭킹 신호라는 공식 근거는 없음(추정). 회복 사례에서는 공통 인자.
- 리스크: 링크 구매·교환은 절대 금지(링크 스팸은 회복 불가 영역). 네이버 블로그 활동이 네이버 본진 유입과 충돌하지 않도록 중복 게시 금지.

### A9. 내부링크·클러스터 정합성 2차 점검 (1~2주)
- 내용: 프루닝 후 고아 페이지·301 체인·허브 링크 누락 점검(`pnpm audit:links` 확장). 통합글에 흡수된 의도의 내부링크가 최종 URL로 직결되는지 확인. 클러스터 허브에 "핵심 글 5편" 큐레이션.
- 근거: 구글 트래픽 하락 진단 문서의 Page Indexing·Crawl Stats 점검 항목 (https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops). 카니발리제이션 클러스터는 회복에 역효과 [2차] (https://serps.io/blog/helpful-content-update-recovery). 내부링크가 억제 해제의 직접 요인이라는 공식 근거는 없음(추정).
- 예상 효과: 크롤 예산이 남은 고품질 글에 집중. 효과 크기는 작음.
- 리스크: 네이버가 리다이렉트를 "리다이렉션된 페이지"로 집계한 전례(2026-09-04 103건). 내부링크는 항상 최종 URL.

### A10. 측정 체계 고정과 판단 규칙 (즉시)
- 내용: §4의 지표·주기를 `scripts/audit/revenue-pull.mjs` 산출에 추가하고, "회복 중" 판단 규칙을 문서화. 다음 업데이트 발표 시 롤아웃 완료 +7일 전까지 판단 보류.
- 근거: 구글 진단 문서의 기간 비교 방식 (https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops). SEL 가이드: 롤아웃 완료 후 최소 1주 뒤 비교, 회복은 "multiple update cycles" (https://searchengineland.com/guide/google-core-updates).
- 예상 효과: 조기 과잉 반응(대량 변경 반복) 방지.
- 리스크: 없음.

우선순위 근거(추정): A2·A3·A4·A5가 "사이트가 무엇인가"를 바꾸는 항목이라 상위. A7은 비용 대비 근거가 강함. A8·A9는 보조. A1·A10은 나머지의 정확도를 결정.

---

## 4. "회복 중" 판단 지표와 체크 주기

### 4-1. 기준선
- 웹 검색 성능 리포트: 2026-07-21~08-17 4주(피해 전)와 08-22 이후를 비교. 08-18~08-21 롤아웃 구간 제외.
- Generative AI·Discover 리포트: 08-13~08-31 로깅 오류 구간 제외 (https://searchengineland.com/google-search-console-generative-ai-performance-report-in-search-data-bug-485215).
- 세그먼트: (a) 프루닝 대상 (b) 딥 리프레시 대상 (c) 무변경 대조군 (d) 신규 글(2026-08-27 이후). 세그먼트별 노출·클릭·평균 순위·노출 쿼리 수를 따로 본다. [2차 방법론] https://www.digitalapplied.com/blog/august-2026-spam-update-complete-what-to-measure

### 4-2. 선행 지표 (클릭보다 먼저 움직임)
1. 색인 페이지 수 (Page Indexing 리포트): 371/685에서 상승 추세. 프루닝으로 분모가 줄어드니 "색인/색인 의도 페이지" 비율로 본다.
2. "발견됨, 현재 색인 생성 안 됨"·"크롤됨, 현재 색인 생성 안 됨" 건수 감소. Gary Illyes: 다수의 크롤됨-미색인은 "could hint at general quality issues" (https://www.searchenginejournal.com/deindexing-reports-keep-coming-google-sees-nothing-unusual/579847/). Mueller 2025-07: 기술적으로 정상인데 색인이 안 되면 "our systems aren't convinced about the site overall" (https://ppc.land/google-says-poor-indexing-on-strong-hosting-indicates-quality-issues/). 머니룩의 328건 "발견됨-미색인"은 크롤 거부 단계라, 이 수치의 하락이 가장 이른 신호(추정).
3. 크롤 통계 리포트: 일 크롤 요청 수·평균 응답 상승 (재평가 크롤, 추정).
4. 노출 쿼리 수(고유 쿼리)와 노출: 클릭보다 먼저 회복. SEL 가이드·집계 연구 공통 (https://searchengineland.com/guide/google-core-updates , https://thestacc.com/blog/helpful-content-update-recovery/).
5. 평균 순위: 노출이 늘며 평균 순위가 일시 하락(롱테일 재진입)하는 것은 정상.

### 4-3. 후행 지표
- 클릭, 비브랜드 클릭 비중, 클러스터별 클릭 분포, AI 검색 인용(Generative AI 리포트, 로깅 정상화 이후).

### 4-4. 판단 규칙 (제안, 추정)
- "회복 중": 4주 연속 노출 상승 + 색인 수 상승 + 미색인 건수 감소가 동시에 성립.
- "재분류 이벤트": 스팸·코어 업데이트 롤아웃 완료 후 2주 내 노출 +30% 이상 점프. Status Dashboard 히스토리 구독 (https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history).
- "정체": 8주간 세 지표 모두 횡보 → A2 웨이브 확대 또는 A5 강도 상향 검토. 단 구글 공식 문구가 "수개월"이므로 8주 정체는 실패 판정이 아님.
- 기대 타임라인(2차 집계, 검증 불가): 첫 개선 4~8주, YMYL 부분 회복 3~8개월, 50%+ 회복 8~16개월, 완전 회복은 드묾. 공식 근거는 "over a period of months"뿐.

### 4-5. 체크 주기
- 주 1회(월요일): 7일 이동합계로 세그먼트별 노출·쿼리 수·색인 수·미색인 건수 기록.
- 월 1회: 28일 비교, 프루닝·리프레시 세그먼트 vs 대조군 차이 보고.
- 업데이트 발표 시: 롤아웃 완료 +7일 후 별도 비교. 롤아웃 중 변경 금지.
- 수동 조치·보안 문제 리포트: 주 1회 확인 (현재 수동 조치 없음이 전제).

---

## 5. 절대 금지 목록과 근거

| 금지 | 근거 |
|---|---|
| 대량 삭제 후 대량 재발행 | 헬프풀 콘텐츠 분류기는 "unhelpful content has not returned in the long-term"을 확인해야 해제 (https://developers.google.com/search/blog/2022/08/helpful-content-update). 재발행은 재트리거. scaled content abuse 정의는 생성 목적·규모를 본다 (https://developers.google.com/search/docs/essentials/spam-policies). Sullivan: "Are you deleting content... because you somehow believe Google doesn't like 'old' content? That's not a thing!" (https://searchengineland.com/google-warns-against-content-pruning-as-cnet-deletes-thousands-of-pages-430509) |
| 기존 글 제목 대량 변경 | Mueller 2021: 품질 하락 사이트에서 "tweaking a title is not going to get things back to before" (https://www.seroundtable.com/google-title-tags-wont-improve-seo-31468.html). 대량 변경 자체가 풋프린트 신호(추정). P4 운영자 지정 목록만 예외 |
| 색인 요청 스팸·Indexing API 오용 | Mueller: 요청 도구가 정크로 남용돼 쿼터 확대 계획 없음 (https://www.seroundtable.com/google-unlikely-to-increase-request-indexing-quota-34742.html). 빈번한 수동 제출이 필요한 사이트는 시스템이 "aren't convinced about the site overall" (https://ppc.land/google-says-poor-indexing-on-strong-hosting-indicates-quality-issues/) |
| 본문 무변경 날짜·lastmod 갱신 | Mueller: "Changing the date without doing anything else is just noise & useless" (https://searchengineland.com/guide/byline-dates). 구글 자체평가 질문 "Are you changing the date of pages to make them seem fresh when the content has not substantially changed?" (https://developers.google.com/search/docs/fundamentals/creating-helpful-content) |
| AI 대량 생성·AI 티(줄표, 상투구, 근거 없는 승자·패자 목록) | QRG 2025-01 §4.6.5~4.6.6: AI 생성 + 노력·독창성 부재 = Lowest (https://searchengineland.com/google-quality-raters-content-ai-generated-454161). Lily Ray "AI slop": 출처 없는 일반화·AI 이미지·최소 인간 개입이 특징 (https://lilyraynyc.substack.com/p/the-ai-slop-loop). Gabe "Mt. AI" 경고 (https://www.gsqi.com/marketing-blog/august-2026-google-spam-update-case-studies/) |
| 생성형 AI 응답 조작(숨은 프롬프트·클로킹·AI 전용 텍스트) | 2026-05-15 스팸 정의에 "attempting to manipulate generative AI responses in Google Search" 포함 (https://searchengineland.com/google-updates-search-spam-policies-to-clarify-it-applies-to-generative-ai-responses-477657). Lily Ray: 단기 AI 가시성 전술이 오가닉을 해침 (https://lilyraynyc.substack.com/p/are-citations-in-ai-search-affected) |
| 링크 구매·교환·PBN | 링크 스팸은 효과 제거 후 "making changes might not generate an improvement" (https://developers.google.com/search/docs/appearance/spam-updates) |
| 커머디티 콘텐츠·자기 홍보 리스티클 확장 | Gabe 1월 2026 업데이트 관찰 (https://x.com/glenngabe/status/2076647517182140794 , https://www.gsqi.com/marketing-blog/core-roars-back-google-may-2026-core-update-analysis/) |
| 기술적 "quick fix" 반복·요소 제거 | 코어 문서: "Avoid doing 'quick fix' changes (like removing some page element because you heard it was bad for SEO)" (https://developers.google.com/search/updates/core-updates) |
| 신규 광고 포맷(앵커·vignette) 활성화·광고 밀도 상향 | Zyppy 고정형 광고 -0.52 (https://zyppy.com/seo/google-update-case-study/). Gabe 2025-12 팝업 광고 사례 |
| 재심사 요청 제출 | 수동 조치가 없으면 경로 자체가 없음. 수동 조치 리포트 확인 (https://support.google.com/webmasters/answer/9044175) |
| 롤아웃 중 대규모 변경·판단 | SEL 가이드: 완료 후 최소 1주 뒤 비교 (https://searchengineland.com/guide/google-core-updates) |
| robots·canonical·RSS·네이버 인증·IndexNow 변경 | 내부 원칙(docs/24). 네이버가 유일한 건강 채널 |

---

## 6. 머니룩 진단 대조 (운영자 진단 vs 구글 문언)

| 운영자 진단 | 구글 문언·전문가 관찰 | 정합성 |
|---|---|---|
| 일 3~4편 기계 발행 | 자체평가 "Are you producing lots of content on many different topics in hopes that some of it might perform well?", "extensive automation" (creating-helpful-content). scaled content abuse 정의 | 높음 |
| 익명 단일 저자 572/685 | "Who": 바이라인이 저자 배경으로 이어져야. QRG YMYL 저자 자격. "Admin/Staff Writer" 불리 [2차] | 높음 |
| 균일 제목·메타 템플릿 | 구글 공식 문언 없음. Gabe 케이스도 직접 언급 없음. 템플릿 균일성은 "규모·기계 생성"의 간접 지표(추정) | 중간(추정) |
| 기술 문제 아님 | 구글 진단 문서의 하락 유형 중 "algorithmic update, site-wide spam issue" 형태와 일치 | 높음 |
| 수동 조치 아님 | 재심사 불가, 알고리즘 재평가만 | 확인 필요: GSC 수동 조치 리포트 주 1회 |

보완 관점(추정): Gabe 8월 케이스 4건은 모두 "programmatic + AI" 대규모(수만~150만 URL) 사이트였다. 685편 규모의 머니룩이 동일 분류기에 걸렸다면 절대 규모보다 "사이트 내 비율"(자동 발행 글 비중, 템플릿 중복률, 독창 요소 부재율)이 결정적이었을 가능성이 크다. 따라서 A2(비율 낮추기)와 A5(독창 요소)가 A3·A4보다 선행 효과가 클 수 있다.

---

## 7. 출처 목록

구글 공식
- https://status.search.google.com/incidents/LEubPCm2octf2uMqCFKE
- https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history
- https://developers.google.com/search/docs/appearance/spam-updates
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/updates/core-updates
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops
- https://developers.google.com/search/blog/2022/08/helpful-content-update
- https://developers.google.com/search/blog/2023/02/google-search-and-ai-content
- https://developers.google.com/search/blog/2023/11/q-and-a-on-search-updates
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/appearance/structured-data/profile-page
- https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
- https://support.google.com/webmasters/answer/9044175

업계 매체·전문가
- https://searchengineland.com/google-august-2026-spam-update-done-rolling-out-485471
- https://searchengineland.com/google-august-2026-spam-update-ranking-impact-485980
- https://searchengineland.com/google-updates-search-spam-policies-to-clarify-it-applies-to-generative-ai-responses-477657
- https://searchengineland.com/google-search-console-generative-ai-performance-report-in-search-data-bug-485215
- https://searchengineland.com/guide/google-core-updates
- https://searchengineland.com/guide/byline-dates
- https://searchengineland.com/google-warns-against-content-pruning-as-cnet-deletes-thousands-of-pages-430509
- https://searchengineland.com/google-danny-sullivan-algorithm-update-recovery-uncertain-446317
- https://searchengineland.com/google-quality-raters-content-ai-generated-454161
- https://www.searchenginejournal.com/google-begins-rolling-out-the-august-2026-spam-update/586301/
- https://www.searchenginejournal.com/4-sites-that-recovered-from-googles-december-2025-core-update/567960/
- https://www.searchenginejournal.com/deindexing-reports-keep-coming-google-sees-nothing-unusual/579847/
- https://www.seroundtable.com/google-august-2026-spam-update-done-41906.html
- https://www.seroundtable.com/google-search-ranking-volatility-continues-41952.html
- https://www.seroundtable.com/google-search-console-performance-reports-drop-41884.html
- https://www.seroundtable.com/google-title-tags-wont-improve-seo-31468.html
- https://www.seroundtable.com/google-content-frequency-25367.html
- https://www.seroundtable.com/google-removing-content-36097.html
- https://www.seroundtable.com/google-unlikely-to-increase-request-indexing-quota-34742.html
- https://www.seroundtable.com/interview-google-august-core-update-38024.html
- https://www.gsqi.com/marketing-blog/august-2026-google-spam-update-case-studies/
- https://www.gsqi.com/marketing-blog/google-december-2024-spam-update-case-studies/
- https://www.gsqi.com/marketing-blog/google-december-2025-broad-core-update-analysis-findings/
- https://www.gsqi.com/marketing-blog/core-roars-back-google-may-2026-core-update-analysis/
- https://www.gsqi.com/marketing-blog/remove-versus-improve-low-quality-thin-content/
- https://x.com/glenngabe/status/2076647517182140794
- https://lilyraynyc.substack.com/p/the-ai-slop-loop
- https://lilyraynyc.substack.com/p/are-citations-in-ai-search-affected
- https://zyppy.com/seo/google-update-case-study/
- https://ppc.land/housefresh-achieves-notable-traffic-recovery-after-google-algorithm-impacts-2/
- https://ppc.land/google-says-poor-indexing-on-strong-hosting-indicates-quality-issues/

2차 자료 (수치 검증 불가, 참고용)
- https://thestacc.com/blog/helpful-content-update-recovery/
- https://serps.io/blog/helpful-content-update-recovery
- https://seo.ai/blog/how-to-recover-from-a-google-helpful-content-update
- https://www.seo-kreativ.de/en/blog/google-quality-raters-update_9-25/
- https://www.allegro-inc.com/seo/google-august-2026-spam-update/
- https://www.techseo.berlin/en/blog/google-june-2026-spam-update
- https://www.digitalapplied.com/blog/august-2026-spam-update-complete-what-to-measure
- https://www.numinix.com/blog/september-2026-seo-algorithm-news-update/
