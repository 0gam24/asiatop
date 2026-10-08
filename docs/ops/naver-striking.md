# 네이버 웹문서 4~30위 글 (2026-10-08)

`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.

- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.
- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).

## 지난 표본(2026-10-07) 대비 10위 안 들고 남

- 들어옴: 건강보험료 정산 분할납부 18 → 8 (health-insurance-settlement-installment-2026-july)
- 들어옴: 온누리상품권 유형 11 → 9 (onnuri-gift-certificate-types-comparison)

## 4~30위 82편

| 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |
|---|---|---|---|---|
| 4 | 종소세 첫 환급 | <3만 | 2026-06-04 | comprehensive-income-tax-refund-first-batch-june |
| 4 | 근로장려금 기초생활수급 | 100만+ | 2026-08-19 | eitc-basic-livelihood-recipient-income |
| 4 | 2026 4대보험 요율 | 100만+ | 2026-06-15 | four-insurance-rate-2026-summary |
| 4 | 퇴직 후 재취업 4대보험 | 100만+ | 2026-05-08 | reemployment-30day-4insurance-transfer |
| 5 | 종소세 마감 후 | <3만 | 2026-05-30 | comprehensive-income-tax-first-24h-after-deadline |
| 5 | 6월 매수자 | 10만~100만 | 2026-06-01 | property-tax-june-buyer-june-2-deed-guide |
| 6 | 환경개선부담금 환급 | 100만+ | 2026-04-19 | car-disposal-environment-fee-refund |
| 6 | 자동차세 자동이체 할인 | 3만~10만 | 2026-05-02 | car-tax-auto-debit-discount-application |
| 6 | 종합소득세 D-1 | 3만~10만 | 2026-05-30 | comprehensive-income-tax-d1-final-hour-checklist |
| 6 | 묵시적 갱신 보증금 인상 | 10만~100만 | 2026-05-06 | deposit-implicit-renewal-5percent |
| 6 | 외화 수입 종합소득세 | 10만~100만 | 2026-05-24 | foreign-income-comprehensive-tax-d7 |
| 6 | 건강보험 피부양자 박탈 | 10만~100만 | 2026-04-22 | health-insurance-dependent-loss-recovery |
| 6 | 회식비 영수증 | 10만~100만 | 2026-04-23 | meal-expense-receipt-tax-treatment |
| 6 | 국가기술자격 응시료 감면 | 100만+ | 2026-08-25 | national-technical-qualification-exam-fee-reduction-youth |
| 6 | 청년도약계좌 미가입 | 3만~10만 | 2026-06-04 | youth-leap-account-non-applicants-june-final-check |
| 7 | 예적금 풍차돌리기 | <3만 | 2026-04-23 | deposit-windmill-1year-staggered |
| 7 | 주택연금 중도해지 | 10만~100만 | 2026-08-14 | housing-pension-early-termination |
| 8 | 가짜 3.3 계약 | 10만~100만 | 2026-08-05 | fake-3-3-contract-disguised-freelancer |
| 8 | 건강보험료 정산 분할납부 | 10만~100만 | 2026-07-12 | health-insurance-settlement-installment-2026-july |
| 9 | 양도세 7월 신고 | 10만~100만 | 2026-06-01 | capital-gains-tax-may-seller-d60-prep |
| 9 | 법인차 사적 사용 | 100만+ | 2026-04-28 | corporate-car-private-use-tax-penalty |
| 9 | 온누리상품권 유형 | 100만+ | 2026-07-03 | onnuri-gift-certificate-types-comparison |
| 11 | 운전자 범위 한정 | 100만+ | 2026-06-22 | car-insurance-driver-scope-rider |
| 11 | 종합소득세 분납 | 3만~10만 | 2026-05-21 | comprehensive-income-tax-installment-payment |
| 11 | 종소세 환급 안 들어옴 | <3만 | 2026-06-05 | comprehensive-income-tax-refund-not-deposited-diagnosis |
| 11 | 부양가족 소득요건 2026 | 100만+ | 2026-08-08 | dependent-deduction-income-threshold-300m-2026 |
| 11 | 근로장려금 압류 | 10만~100만 | 2026-08-18 | earned-income-credit-seizure-protection-account |
| 11 | 육아휴직 복귀 보장 | 10만~100만 | 2026-04-26 | parental-leave-return-refusal-response |
| 11 | 종부세 회피 | 3만~10만 | 2026-05-24 | property-tax-may-30-deed-completion-d8 |
| 11 | 구직급여 자영업 등록 | 3만~10만 | 2026-04-26 | unemployment-self-employed-registration |
| 12 | 소득세 누진세율 | 10만~100만 | 2026-05-10 | income-tax-progressive-marginal-vs-average |
| 12 | 한국형 레몬법 | 100만+ | 2026-06-30 | korean-lemon-law-new-car-exchange |
| 13 | 4세대 실손보험 갱신 | 10만~100만 | 2026-04-01 | 4th-gen-silson-renewal-strategy |
| 13 | 장기 채권 ETF | 10만~100만 | 2026-04-24 | long-term-bond-etf-vs-deposit-5year |
| 13 | 자영업자 4대보험 | 100만+ | 2026-05-24 | self-employed-4-major-insurance-after-tax-filing |
| 13 | 청년미래적금 자동이체 | 3만~10만 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 14 | 육아휴직 후 퇴사 실업급여 | 3만~10만 | 2026-04-28 | childcare-leave-resign-unemployment |
| 14 | 상속주택 양도세 취득가액 | 10만~100만 | 2026-08-10 | inherited-house-capital-gains-acquisition-value |
| 15 | 신용카드 발급 거절 | 10만~100만 | 2026-04-03 | credit-card-rejection-response |
| 15 | 이직확인서 미발급 | <3만 | 2026-04-23 | departure-confirmation-employer-refusal |
| 15 | 오피스텔 아파트 차이 | 100만+ | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 15 | 상생임대인 | 100만+ | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 15 | 2026 병사 봉급 | <3만 | 2026-08-04 | soldier-salary-2026-discharge-savings |
| 16 | 전세 갱신 청구권 | 10만~100만 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 16 | 근저당권 설정 등록면허세 | 3만~10만 | 2026-06-20 | mortgage-registration-tax-cost |
| 17 | 자동차 개별소비세 인하 종료 | 10만~100만 | 2026-07-21 | car-excise-tax-cut-ended-2026-july |
| 17 | 일용근로자 비과세 | 3만~10만 | 2026-05-09 | daily-worker-non-tax-150k-limit |
| 17 | 청약 부적격 당첨 | 10만~100만 | 2026-06-27 | housing-subscription-ineligible-rewin-restriction |
| 18 | 추석 명절 지원금 | 100만+ | 2026-08-20 | chuseok-holiday-support-payment-2026 |
| 18 | 2027년 건강보험료율 | 100만+ | 2026-09-09 | health-insurance-rate-2027-frozen |
| 18 | 적금 만기 처리 | 10만~100만 | 2026-05-13 | installment-maturity-auto-vs-cancel |
| 18 | 평균 순자산 | 10만~100만 | 2026-06-29 | korea-average-net-worth-2025 |
| 19 | 일용직 4대보험 | 100만+ | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 19 | 월세 현금영수증 | 10만~100만 | 2026-08-25 | monthly-rent-cash-receipt-income-deduction |
| 19 | 국민연금 가입 이력 조회 | 100만+ | 2026-04-30 | nps-enrollment-history-correction |
| 19 | 반전세 계산 | 100만+ | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 19 | 구직급여 정지 | 10만~100만 | 2026-05-08 | unemployment-employment-report-suspension |
| 20 | 상속포기 사망보험금 | 10만~100만 | 2026-08-09 | death-insurance-inheritance-renounce-tax |
| 20 | 예금 풍차돌리기 | <3만 | 2026-05-04 | deposit-vs-installment-windmill-comparison |
| 20 | 건강보험료 인상 원인 | 100만+ | 2026-04-14 | health-insurance-premium-spike-adjustment |
| 20 | 민영주택 신생아 특별공급 | 10만~100만 | 2026-08-10 | newborn-special-supply-private-housing-2026 |
| 21 | 운전자보험 자기부담금 | 100만+ | 2026-05-10 | driver-insurance-self-cost-accident-cap |
| 22 | 고용보험료율 2027 | 100만+ | 2026-09-15 | employment-insurance-rate-2027-increase-plan |
| 22 | 추석 상여금 세금 | 10만~100만 | 2026-07-28 | holiday-bonus-tax-withholding-year-end |
| 22 | 종부세 주택 수 산정 제외 | 100만+ | 2026-09-10 | property-tax-house-count-exclusion-september |
| 23 | 근로장려금 환수 | 10만~100만 | 2026-08-03 | earned-income-credit-clawback-appeal |
| 23 | 권고사직 합의서 | 10만~100만 | 2026-04-15 | recommended-resignation-agreement-rights |
| 23 | 가상자산 과세 2027 | 10만~100만 | 2026-08-07 | virtual-asset-crypto-tax-2027-start |
| 24 | 친환경차 세제 혜택 | 100만+ | 2026-04-04 | eco-friendly-vehicle-tax-benefits-2026 |
| 25 | 혼인 합가 2주택 양도세 | 10만~100만 | 2026-08-09 | marriage-combined-household-1house-cgt-exemption |
| 25 | 산재 사망 유족급여 | 10만~100만 | 2026-04-20 | workers-comp-death-survivor-benefit |
| 26 | 생활비 증여세 | 10만~100만 | 2026-08-18 | parent-living-expense-allowance-gift-tax |
| 27 | 계약만료 실업급여 | 10만~100만 | 2026-07-25 | contract-expiration-unemployment-benefit |
| 27 | 1종 보통 운전면허 갱신 | 10만~100만 | 2026-05-20 | drivers-license-class1-online-renewal |
| 27 | 건강보험 부정수급 | 100만+ | 2026-05-12 | nhis-fraud-report-recovery |
| 28 | 신용카드 소득공제 2026 | 100만+ | 2026-08-07 | credit-card-deduction-child-reform-2026 |
| 28 | 청약통장 25만원 | 3만~10만 | 2026-08-13 | housing-subscription-monthly-recognition-250k |
| 29 | SK하이닉스 성과급 | 100만+ | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 29 | 종합소득세 마감 후 | 10만~100만 | 2026-05-26 | june-first-week-tax-post-deadline-guide |
| 30 | 자동차 사고 합의서 | 100만+ | 2026-05-13 | car-accident-settlement-effect-dispute |
| 30 | ISA 중도해지 | 10만~100만 | 2026-07-03 | isa-early-termination-tax |
| 30 | 산재 통상재해 | 10만~100만 | 2026-05-03 | workers-comp-routine-vs-commute |
