# 네이버 웹문서 4~30위 글 (2026-10-12)

`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.

- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.
- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).

## 지난 표본(2026-10-08) 대비 10위 안 들고 남

- 빠짐: 건강보험 피부양자 박탈 6 → 17 (health-insurance-dependent-loss-recovery)
- 빠짐: 건강보험료 정산 분할납부 8 → 13 (health-insurance-settlement-installment-2026-july)
- 들어옴: 4세대 실손보험 갱신 13 → 10 (4th-gen-silson-renewal-strategy)
- 들어옴: 운전자 범위 한정 11 → 9 (car-insurance-driver-scope-rider)
- 들어옴: 종합소득세 분납 11 → 10 (comprehensive-income-tax-installment-payment)
- 들어옴: 이직확인서 미발급 15 → 7 (departure-confirmation-employer-refusal)
- 들어옴: 청약 부적격 당첨 17 → 9 (housing-subscription-ineligible-rewin-restriction)
- 들어옴: 전세 갱신 청구권 16 → 9 (jeonse-renewal-claim-5percent-cap)
- 들어옴: 구직급여 자영업 등록 11 → 10 (unemployment-self-employed-registration)

## 4~30위 중 검색량이 잡히는 글 10편 (리프레시 먼저)

- 검색량은 검색어 트렌드 최근 30일, 실업급여 30일 평균 = 100 눈금이다(0.5 이상만, 측정 2026-10-12). 순위와 검색량이 둘 다 측정된 글이라 이 목록부터 고친다.

| 검색량 | 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |
|---|---|---|---|---|---|
| 5.6 | 20 | 추석 명절 지원금 | 100만+ | 2026-08-20 | chuseok-holiday-support-payment-2026 |
| 4.5 | 23 | 일용직 4대보험 | 100만+ | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 2.9 | 13 | 자차 자기부담금 | 10만~100만 | 2026-06-21 | car-insurance-self-pay-deductible |
| 2.7 | 9 | 전세 갱신 청구권 | 10만~100만 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 2.4 | 28 | 계약만료 실업급여 | 10만~100만 | 2026-07-25 | contract-expiration-unemployment-benefit |
| 1.9 | 13 | 청년미래적금 자동이체 | 3만~10만 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 1.4 | 14 | 월세 현금영수증 | 10만~100만 | 2026-08-25 | monthly-rent-cash-receipt-income-deduction |
| 1 | 15 | 오피스텔 아파트 차이 | 100만+ | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 0.9 | 21 | 상생임대인 | 100만+ | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 0.6 | 29 | 결혼세액공제 | 10만~100만 | 2026-07-28 | marriage-tax-credit-2026 |

## 4~30위 87편

| 순위 | 검색어 | 웹문서 결과 수 | 검색량 | 발행 | 글 |
|---|---|---|---|---|---|
| 4 | 퇴직 후 재취업 4대보험 | 100만+ | 0 | 2026-05-08 | reemployment-30day-4insurance-transfer |
| 4 | 국가유공자 가족 의료급여 | 100만+ | 0 | 2026-05-11 | state-merit-family-medical-education |
| 4 | 여름 휴가비 비과세 | 10만~100만 | 0 | 2026-06-07 | summer-vacation-bonus-tax-free-limit |
| 5 | 종소세 첫 환급 | <3만 | 0 | 2026-06-04 | comprehensive-income-tax-refund-first-batch-june |
| 5 | 근로장려금 기초생활수급 | 100만+ | 0 | 2026-08-19 | eitc-basic-livelihood-recipient-income |
| 5 | 2026 4대보험 요율 | 100만+ | 0.3 | 2026-06-15 | four-insurance-rate-2026-summary |
| 6 | 종합소득세 D-1 | 3만~10만 | 0 | 2026-05-30 | comprehensive-income-tax-d1-final-hour-checklist |
| 6 | 종소세 마감 후 | <3만 | 0 | 2026-05-30 | comprehensive-income-tax-first-24h-after-deadline |
| 6 | 가짜 3.3 계약 | 10만~100만 | 0 | 2026-08-05 | fake-3-3-contract-disguised-freelancer |
| 6 | 외화 수입 종합소득세 | 10만~100만 | 0 | 2026-05-24 | foreign-income-comprehensive-tax-d7 |
| 6 | 국가기술자격 응시료 감면 | 100만+ | 0 | 2026-08-25 | national-technical-qualification-exam-fee-reduction-youth |
| 6 | 6월 매수자 | 10만~100만 | 0 | 2026-06-01 | property-tax-june-buyer-june-2-deed-guide |
| 7 | 자동차세 자동이체 할인 | 3만~10만 | 0 | 2026-05-02 | car-tax-auto-debit-discount-application |
| 7 | 이직확인서 미발급 | <3만 | 0 | 2026-04-23 | departure-confirmation-employer-refusal |
| 7 | 묵시적 갱신 보증금 인상 | 10만~100만 | 0 | 2026-05-06 | deposit-implicit-renewal-5percent |
| 7 | 예적금 풍차돌리기 | <3만 | 0 | 2026-04-23 | deposit-windmill-1year-staggered |
| 7 | 회식비 영수증 | 10만~100만 | 0 | 2026-04-23 | meal-expense-receipt-tax-treatment |
| 7 | 온누리상품권 유형 | 100만+ | 0 | 2026-07-03 | onnuri-gift-certificate-types-comparison |
| 7 | 청년도약계좌 미가입 | 3만~10만 | 0 | 2026-06-04 | youth-leap-account-non-applicants-june-final-check |
| 8 | 환경개선부담금 환급 | 100만+ | 0 | 2026-04-19 | car-disposal-environment-fee-refund |
| 9 | 운전자 범위 한정 | 100만+ | 0 | 2026-06-22 | car-insurance-driver-scope-rider |
| 9 | 법인차 사적 사용 | 100만+ | 0 | 2026-04-28 | corporate-car-private-use-tax-penalty |
| 9 | 청약 부적격 당첨 | 10만~100만 | 0 | 2026-06-27 | housing-subscription-ineligible-rewin-restriction |
| 9 | 전세 갱신 청구권 | 10만~100만 | 2.7 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 10 | 4세대 실손보험 갱신 | 10만~100만 | 0 | 2026-04-01 | 4th-gen-silson-renewal-strategy |
| 10 | 양도세 7월 신고 | 10만~100만 | 0 | 2026-06-01 | capital-gains-tax-may-seller-d60-prep |
| 10 | 종합소득세 분납 | 3만~10만 | 0 | 2026-05-21 | comprehensive-income-tax-installment-payment |
| 10 | 주택연금 중도해지 | 10만~100만 | 0 | 2026-08-14 | housing-pension-early-termination |
| 10 | 구직급여 자영업 등록 | 3만~10만 | 0 | 2026-04-26 | unemployment-self-employed-registration |
| 11 | 부양가족 소득요건 2026 | 100만+ | 0 | 2026-08-08 | dependent-deduction-income-threshold-300m-2026 |
| 11 | 근로장려금 압류 | 10만~100만 | 0 | 2026-08-18 | earned-income-credit-seizure-protection-account |
| 11 | 청약통장 비대면 해지 | 3만~10만 | 0 | 2026-09-22 | housing-subscription-online-termination |
| 11 | 한국형 레몬법 | 100만+ | 0 | 2026-06-30 | korean-lemon-law-new-car-exchange |
| 11 | 육아휴직 복귀 보장 | 10만~100만 | 0 | 2026-04-26 | parental-leave-return-refusal-response |
| 13 | 자차 자기부담금 | 10만~100만 | 2.9 | 2026-06-21 | car-insurance-self-pay-deductible |
| 13 | 종소세 환급 안 들어옴 | <3만 | 0 | 2026-06-05 | comprehensive-income-tax-refund-not-deposited-diagnosis |
| 13 | 건강보험료 정산 분할납부 | 10만~100만 | 0 | 2026-07-12 | health-insurance-settlement-installment-2026-july |
| 13 | 소득세 누진세율 | 10만~100만 | 0 | 2026-05-10 | income-tax-progressive-marginal-vs-average |
| 13 | 자영업자 4대보험 | 100만+ | 0 | 2026-05-24 | self-employed-4-major-insurance-after-tax-filing |
| 13 | 청년미래적금 자동이체 | 3만~10만 | 1.9 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 14 | 상속주택 양도세 취득가액 | 10만~100만 | 0 | 2026-08-10 | inherited-house-capital-gains-acquisition-value |
| 14 | 월세 현금영수증 | 10만~100만 | 1.4 | 2026-08-25 | monthly-rent-cash-receipt-income-deduction |
| 15 | 자동차 개별소비세 인하 종료 | 10만~100만 | 0.1 | 2026-07-21 | car-excise-tax-cut-ended-2026-july |
| 15 | 신용카드 발급 거절 | 10만~100만 | 0 | 2026-04-03 | credit-card-rejection-response |
| 15 | 장기 채권 ETF | 10만~100만 | 0 | 2026-04-24 | long-term-bond-etf-vs-deposit-5year |
| 15 | 오피스텔 아파트 차이 | 100만+ | 1 | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 16 | 육아휴직 후 퇴사 실업급여 | 3만~10만 | 0.3 | 2026-04-28 | childcare-leave-resign-unemployment |
| 16 | 일용근로자 비과세 | 3만~10만 | 0 | 2026-05-09 | daily-worker-non-tax-150k-limit |
| 17 | 건강보험 피부양자 박탈 | 10만~100만 | 0 | 2026-04-22 | health-insurance-dependent-loss-recovery |
| 17 | 근저당권 설정 등록면허세 | 3만~10만 | 0 | 2026-06-20 | mortgage-registration-tax-cost |
| 17 | 2026 병사 봉급 | <3만 | 0 | 2026-08-04 | soldier-salary-2026-discharge-savings |
| 17 | 무순위 청약 자격 | 10만~100만 | 0 | 2026-08-01 | unranked-subscription-homeless-only-2026 |
| 18 | 카드포인트 현금화 | 100만+ | 0 | 2026-07-27 | card-point-integrated-lookup-cash-conversion |
| 18 | 2027년 건강보험료율 | 100만+ | 0 | 2026-09-09 | health-insurance-rate-2027-frozen |
| 18 | 평균 순자산 | 10만~100만 | 0.1 | 2026-06-29 | korea-average-net-worth-2025 |
| 18 | 혼인 합가 2주택 양도세 | 10만~100만 | 0 | 2026-08-09 | marriage-combined-household-1house-cgt-exemption |
| 18 | 국민연금 가입 이력 조회 | 100만+ | 0 | 2026-04-30 | nps-enrollment-history-correction |
| 18 | 반전세 계산 | 100만+ | 0.4 | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 19 | 운전자보험 자기부담금 | 100만+ | 0 | 2026-05-10 | driver-insurance-self-cost-accident-cap |
| 20 | 추석 명절 지원금 | 100만+ | 5.6 | 2026-08-20 | chuseok-holiday-support-payment-2026 |
| 20 | 예금 풍차돌리기 | <3만 | 0.3 | 2026-05-04 | deposit-vs-installment-windmill-comparison |
| 20 | 적금 만기 처리 | 10만~100만 | 0 | 2026-05-13 | installment-maturity-auto-vs-cancel |
| 20 | 건강보험 부정수급 | 100만+ | 0 | 2026-05-12 | nhis-fraud-report-recovery |
| 20 | 구직급여 정지 | 10만~100만 | 0 | 2026-05-08 | unemployment-employment-report-suspension |
| 21 | 민영주택 신생아 특별공급 | 10만~100만 | 0 | 2026-08-10 | newborn-special-supply-private-housing-2026 |
| 21 | 상생임대인 | 100만+ | 0.9 | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 22 | 종부세 회피 | 3만~10만 | 0 | 2026-05-24 | property-tax-may-30-deed-completion-d8 |
| 22 | 권고사직 합의서 | 10만~100만 | 0.3 | 2026-04-15 | recommended-resignation-agreement-rights |
| 23 | 일용직 4대보험 | 100만+ | 4.5 | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 23 | 상속포기 사망보험금 | 10만~100만 | 0 | 2026-08-09 | death-insurance-inheritance-renounce-tax |
| 24 | 초등 예체능 학원비 세액공제 | 10만~100만 | 0 | 2026-08-05 | elementary-arts-sports-academy-tax-credit-2026 |
| 24 | 건강보험료 인상 원인 | 100만+ | 0 | 2026-04-14 | health-insurance-premium-spike-adjustment |
| 24 | 추석 상여금 세금 | 10만~100만 | 0.1 | 2026-07-28 | holiday-bonus-tax-withholding-year-end |
| 24 | 종부세 주택 수 산정 제외 | 100만+ | 0 | 2026-09-10 | property-tax-house-count-exclusion-september |
| 25 | 근로장려금 환수 | 10만~100만 | 0 | 2026-08-03 | earned-income-credit-clawback-appeal |
| 25 | 산재 사망 유족급여 | 10만~100만 | 0 | 2026-04-20 | workers-comp-death-survivor-benefit |
| 25 | 산재 통상재해 | 10만~100만 | 0 | 2026-05-03 | workers-comp-routine-vs-commute |
| 26 | 친환경차 세제 혜택 | 100만+ | 0.4 | 2026-04-04 | eco-friendly-vehicle-tax-benefits-2026 |
| 26 | 고용보험료율 2027 | 100만+ | 0 | 2026-09-15 | employment-insurance-rate-2027-increase-plan |
| 27 | 신용카드 소득공제 2026 | 100만+ | 0 | 2026-08-07 | credit-card-deduction-child-reform-2026 |
| 27 | 배우자 인적공제 | 10만~100만 | 0.1 | 2026-05-14 | spouse-personal-deduction-100m-exception |
| 28 | 계약만료 실업급여 | 10만~100만 | 2.4 | 2026-07-25 | contract-expiration-unemployment-benefit |
| 28 | 종합소득세 마감 후 | 10만~100만 | 0 | 2026-05-26 | june-first-week-tax-post-deadline-guide |
| 28 | 생활비 증여세 | 10만~100만 | 0 | 2026-08-18 | parent-living-expense-allowance-gift-tax |
| 29 | 근로장려금 반기신청 안내문 | 10만~100만 | 0 | 2026-08-29 | earned-income-credit-semiannual-no-notice |
| 29 | 청약통장 25만원 | 3만~10만 | 0.1 | 2026-08-13 | housing-subscription-monthly-recognition-250k |
| 29 | 결혼세액공제 | 10만~100만 | 0.6 | 2026-07-28 | marriage-tax-credit-2026 |
