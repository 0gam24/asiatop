# 네이버 웹문서 4~30위 글 (2026-10-19)

`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.

- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.
- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).

## 지난 표본(2026-10-12) 대비 10위 안 들고 남

- 빠짐: 양도세 7월 신고 10 → 15 (capital-gains-tax-may-seller-d60-prep)
- 빠짐: 운전자 범위 한정 9 → 15 (car-insurance-driver-scope-rider)
- 빠짐: 종합소득세 분납 10 → 11 (comprehensive-income-tax-installment-payment)
- 들어옴: 자동차 개별소비세 인하 종료 15 → 9 (car-excise-tax-cut-ended-2026-july)
- 들어옴: 종소세 환급 안 들어옴 13 → 9 (comprehensive-income-tax-refund-not-deposited-diagnosis)
- 들어옴: 부양가족 소득요건 2026 11 → 3 (dependent-deduction-income-threshold-300m-2026)
- 들어옴: 운전자보험 자기부담금 19 → 8 (driver-insurance-self-cost-accident-cap)
- 들어옴: 이중근로자 연말정산 밖 → 10 (dual-employment-year-end-tax-combined-filing)
- 들어옴: 고용보험료율 2027 26 → 6 (employment-insurance-rate-2027-increase-plan)
- 들어옴: 건강보험 피부양자 박탈 17 → 4 (health-insurance-dependent-loss-recovery)
- 들어옴: 청약통장 비대면 해지 11 → 7 (housing-subscription-online-termination)
- 들어옴: 상속주택 양도세 취득가액 14 → 8 (inherited-house-capital-gains-acquisition-value)
- 들어옴: 한국형 레몬법 11 → 7 (korean-lemon-law-new-car-exchange)
- 들어옴: 장기 채권 ETF 15 → 10 (long-term-bond-etf-vs-deposit-5year)
- 들어옴: 오피스텔 아파트 차이 15 → 8 (officetel-vs-apartment-cost-comparison)
- 들어옴: 청년미래적금 자동이체 13 → 9 (youth-future-savings-auto-transfer-contribution)

## 4~30위 중 검색량이 잡히는 글 15편 (리프레시 먼저)

- 검색량은 검색어 트렌드 최근 30일, 실업급여 30일 평균 = 100 눈금이다(0.5 이상만, 측정 2026-10-19). 순위와 검색량이 둘 다 측정된 글이라 이 목록부터 고친다.

| 검색량 | 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |
|---|---|---|---|---|---|
| 10.3 | 18 | SK하이닉스 성과급 | 100만+ | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 4.5 | 24 | 일용직 4대보험 | 100만+ | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 4.3 | 29 | 연말정산 미리보기 | 100만+ | 2026-08-20 | yearend-tax-preview-service-guide |
| 3.6 | 17 | 확정일자 부여현황 | 100만+ | 2026-09-17 | fixed-date-grant-status-before-lease |
| 3 | 14 | 자차 자기부담금 | 10만~100만 | 2026-06-21 | car-insurance-self-pay-deductible |
| 2.8 | 6 | 전세 갱신 청구권 | 10만~100만 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 2.4 | 25 | 추석 명절 지원금 | 100만+ | 2026-08-20 | chuseok-holiday-support-payment-2026 |
| 1.9 | 23 | 음주운전 방지장치 | 100만+ | 2026-09-03 | dui-interlock-conditional-license-2026 |
| 1.5 | 9 | 청년미래적금 자동이체 | 3만~10만 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 1.5 | 30 | 월세 현금영수증 | 10만~100만 | 2026-08-25 | monthly-rent-cash-receipt-income-deduction |
| 1.2 | 28 | ISA 만기 연장 | 3만~10만 | 2026-09-21 | isa-maturity-extension-deadline |
| 1 | 8 | 오피스텔 아파트 차이 | 100만+ | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 0.7 | 13 | 상생임대인 | 100만+ | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 0.6 | 21 | 중고차 명의이전 | 100만+ | 2026-04-26 | used-car-title-transfer-tax |
| 0.5 | 26 | 65세 이상 고용보험 | 100만+ | 2026-05-09 | over-65-employment-insurance-voluntary |

## 4~30위 104편

| 순위 | 검색어 | 웹문서 결과 수 | 검색량 | 발행 | 글 |
|---|---|---|---|---|---|
| 4 | 법인차 사적 사용 | 100만+ | 0 | 2026-04-28 | corporate-car-private-use-tax-penalty |
| 4 | 묵시적 갱신 보증금 인상 | 10만~100만 | 0 | 2026-05-06 | deposit-implicit-renewal-5percent |
| 4 | 외화 수입 종합소득세 | 10만~100만 | 0 | 2026-05-24 | foreign-income-comprehensive-tax-d7 |
| 4 | 건강보험 피부양자 박탈 | 10만~100만 | 0 | 2026-04-22 | health-insurance-dependent-loss-recovery |
| 4 | 국가기술자격 응시료 감면 | 100만+ | 0 | 2026-08-25 | national-technical-qualification-exam-fee-reduction-youth |
| 4 | 퇴직 후 재취업 4대보험 | 100만+ | 0 | 2026-05-08 | reemployment-30day-4insurance-transfer |
| 4 | 국가유공자 가족 의료급여 | 100만+ | 0 | 2026-05-11 | state-merit-family-medical-education |
| 4 | 여름 휴가비 비과세 | 10만~100만 | 0 | 2026-06-07 | summer-vacation-bonus-tax-free-limit |
| 5 | 종합소득세 D-1 | 3만~10만 | 0 | 2026-05-30 | comprehensive-income-tax-d1-final-hour-checklist |
| 5 | 종소세 첫 환급 | <3만 | 0 | 2026-06-04 | comprehensive-income-tax-refund-first-batch-june |
| 5 | 이직확인서 미발급 | <3만 | 0 | 2026-04-23 | departure-confirmation-employer-refusal |
| 5 | 예적금 풍차돌리기 | <3만 | 0 | 2026-04-23 | deposit-windmill-1year-staggered |
| 6 | 고용보험료율 2027 | 100만+ | 0 | 2026-09-15 | employment-insurance-rate-2027-increase-plan |
| 6 | 2026 4대보험 요율 | 100만+ | 0.4 | 2026-06-15 | four-insurance-rate-2026-summary |
| 6 | 전세 갱신 청구권 | 10만~100만 | 2.8 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 6 | 회식비 비과세 | 3만~10만 | 0 | 2026-04-14 | meeting-expense-tax-exempt-2026 |
| 6 | 6월 매수자 | 10만~100만 | 0 | 2026-06-01 | property-tax-june-buyer-june-2-deed-guide |
| 6 | 전월세 누수 | 10만~100만 | 0 | 2026-06-10 | rental-water-leak-repair-landlord-tenant |
| 7 | 종소세 마감 후 | <3만 | 0 | 2026-05-30 | comprehensive-income-tax-first-24h-after-deadline |
| 7 | 주택연금 중도해지 | 10만~100만 | 0 | 2026-08-14 | housing-pension-early-termination |
| 7 | 청약통장 비대면 해지 | 3만~10만 | 0 | 2026-09-22 | housing-subscription-online-termination |
| 7 | 한국형 레몬법 | 100만+ | 0 | 2026-06-30 | korean-lemon-law-new-car-exchange |
| 8 | 환경개선부담금 환급 | 100만+ | 0 | 2026-04-19 | car-disposal-environment-fee-refund |
| 8 | 자동차세 자동이체 할인 | 3만~10만 | 0 | 2026-05-02 | car-tax-auto-debit-discount-application |
| 8 | 운전자보험 자기부담금 | 100만+ | 0 | 2026-05-10 | driver-insurance-self-cost-accident-cap |
| 8 | 청약 부적격 당첨 | 10만~100만 | 0 | 2026-06-27 | housing-subscription-ineligible-rewin-restriction |
| 8 | 상속주택 양도세 취득가액 | 10만~100만 | 0 | 2026-08-10 | inherited-house-capital-gains-acquisition-value |
| 8 | 회식비 영수증 | 10만~100만 | 0 | 2026-04-23 | meal-expense-receipt-tax-treatment |
| 8 | 오피스텔 아파트 차이 | 100만+ | 1 | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 8 | 온누리상품권 유형 | 100만+ | 0 | 2026-07-03 | onnuri-gift-certificate-types-comparison |
| 9 | 4세대 실손보험 갱신 | 10만~100만 | 0 | 2026-04-01 | 4th-gen-silson-renewal-strategy |
| 9 | 자동차 개별소비세 인하 종료 | 10만~100만 | 0.1 | 2026-07-21 | car-excise-tax-cut-ended-2026-july |
| 9 | 종소세 환급 안 들어옴 | <3만 | 0 | 2026-06-05 | comprehensive-income-tax-refund-not-deposited-diagnosis |
| 9 | 구직급여 자영업 등록 | 3만~10만 | 0 | 2026-04-26 | unemployment-self-employed-registration |
| 9 | 청년미래적금 자동이체 | 3만~10만 | 1.5 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 9 | 청년도약계좌 미가입 | 3만~10만 | 0 | 2026-06-04 | youth-leap-account-non-applicants-june-final-check |
| 10 | 이중근로자 연말정산 | 10만~100만 | 0 | 2026-08-16 | dual-employment-year-end-tax-combined-filing |
| 10 | 장기 채권 ETF | 10만~100만 | 0 | 2026-04-24 | long-term-bond-etf-vs-deposit-5year |
| 11 | 종합소득세 분납 | 3만~10만 | 0 | 2026-05-21 | comprehensive-income-tax-installment-payment |
| 11 | 종부세 주택 수 산정 제외 | 100만+ | 0 | 2026-09-10 | property-tax-house-count-exclusion-september |
| 11 | 종부세 회피 | 3만~10만 | 0 | 2026-05-24 | property-tax-may-30-deed-completion-d8 |
| 12 | 육아휴직 후 퇴사 실업급여 | 3만~10만 | 0.3 | 2026-04-28 | childcare-leave-resign-unemployment |
| 12 | 건강보험료 정산 분할납부 | 10만~100만 | 0 | 2026-07-12 | health-insurance-settlement-installment-2026-july |
| 12 | 국민연금 가입 이력 조회 | 100만+ | 0 | 2026-04-30 | nps-enrollment-history-correction |
| 13 | 근저당권 설정 등록면허세 | 3만~10만 | 0 | 2026-06-20 | mortgage-registration-tax-cost |
| 13 | 상생임대인 | 100만+ | 0.7 | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 13 | 자영업자 4대보험 | 100만+ | 0 | 2026-05-24 | self-employed-4-major-insurance-after-tax-filing |
| 14 | 자차 자기부담금 | 10만~100만 | 3 | 2026-06-21 | car-insurance-self-pay-deductible |
| 14 | 근로장려금 반기신청 안내문 | 10만~100만 | 0 | 2026-08-29 | earned-income-credit-semiannual-no-notice |
| 15 | 양도세 7월 신고 | 10만~100만 | 0 | 2026-06-01 | capital-gains-tax-may-seller-d60-prep |
| 15 | 운전자 범위 한정 | 100만+ | 0 | 2026-06-22 | car-insurance-driver-scope-rider |
| 15 | 2027년 건강보험료율 | 100만+ | 0 | 2026-09-09 | health-insurance-rate-2027-frozen |
| 15 | 반전세 계산 | 100만+ | 0.4 | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 15 | 구직급여 정지 | 10만~100만 | 0 | 2026-05-08 | unemployment-employment-report-suspension |
| 16 | 신용카드 발급 거절 | 10만~100만 | 0 | 2026-04-03 | credit-card-rejection-response |
| 16 | 일용근로자 비과세 | 3만~10만 | 0 | 2026-05-09 | daily-worker-non-tax-150k-limit |
| 16 | 근로장려금 환수 | 10만~100만 | 0 | 2026-08-03 | earned-income-credit-clawback-appeal |
| 16 | 근로장려금 압류 | 10만~100만 | 0 | 2026-08-18 | earned-income-credit-seizure-protection-account |
| 16 | 혼인 합가 2주택 양도세 | 10만~100만 | 0 | 2026-08-09 | marriage-combined-household-1house-cgt-exemption |
| 16 | 권고사직 합의서 | 10만~100만 | 0.3 | 2026-04-15 | recommended-resignation-agreement-rights |
| 16 | 무순위 청약 자격 | 10만~100만 | 0 | 2026-08-01 | unranked-subscription-homeless-only-2026 |
| 17 | 확정일자 부여현황 | 100만+ | 3.6 | 2026-09-17 | fixed-date-grant-status-before-lease |
| 17 | 소득세 누진세율 | 10만~100만 | 0 | 2026-05-10 | income-tax-progressive-marginal-vs-average |
| 18 | 상속포기 사망보험금 | 10만~100만 | 0 | 2026-08-09 | death-insurance-inheritance-renounce-tax |
| 18 | SK하이닉스 성과급 | 100만+ | 10.3 | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 19 | 자녀세액공제 2026 | 10만~100만 | 0 | 2026-08-07 | child-tax-credit-increase-2026-reform |
| 19 | 예금 풍차돌리기 | <3만 | 0.4 | 2026-05-04 | deposit-vs-installment-windmill-comparison |
| 20 | 카드포인트 현금화 | 100만+ | 0 | 2026-07-27 | card-point-integrated-lookup-cash-conversion |
| 21 | 2026 병사 봉급 | <3만 | 0 | 2026-08-04 | soldier-salary-2026-discharge-savings |
| 21 | 실업급여 주 6일 지급 | 100만+ | 0 | 2026-09-08 | unemployment-benefit-weekly-6day-payment-reform |
| 21 | 중고차 명의이전 | 100만+ | 0.6 | 2026-04-26 | used-car-title-transfer-tax |
| 21 | 가상자산 과세 2027 | 10만~100만 | 0 | 2026-08-07 | virtual-asset-crypto-tax-2027-start |
| 21 | 산재 사망 유족급여 | 10만~100만 | 0 | 2026-04-20 | workers-comp-death-survivor-benefit |
| 22 | 초등 예체능 학원비 세액공제 | 10만~100만 | 0 | 2026-08-05 | elementary-arts-sports-academy-tax-credit-2026 |
| 22 | 종합소득세 마감 후 | 10만~100만 | 0 | 2026-05-26 | june-first-week-tax-post-deadline-guide |
| 23 | 음주운전 방지장치 | 100만+ | 1.9 | 2026-09-03 | dui-interlock-conditional-license-2026 |
| 23 | 청약통장 25만원 | 3만~10만 | 0.1 | 2026-08-13 | housing-subscription-monthly-recognition-250k |
| 23 | 민영주택 신생아 특별공급 | 10만~100만 | 0 | 2026-08-10 | newborn-special-supply-private-housing-2026 |
| 23 | 주차장 사고 과실비율 | 10만~100만 | 0.1 | 2026-06-17 | parking-lot-accident-fault-ratio |
| 23 | 개별연장급여 | 100만+ | 0 | 2026-04-19 | unemployment-individual-extension-benefit |
| 24 | 차량 압류 해제 | 10만~100만 | 0 | 2026-05-08 | car-impoundment-tax-debt-release |
| 24 | 일용직 4대보험 | 100만+ | 4.5 | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 24 | 육아휴직 복귀 보장 | 10만~100만 | 0 | 2026-04-26 | parental-leave-return-refusal-response |
| 24 | 퇴직연금 갈아타기 | 10만~100만 | 0 | 2026-04-17 | retirement-pension-db-dc-irp-switch |
| 24 | 배우자 인적공제 | 10만~100만 | 0.1 | 2026-05-14 | spouse-personal-deduction-100m-exception |
| 24 | 산재 통상재해 | 10만~100만 | 0 | 2026-05-03 | workers-comp-routine-vs-commute |
| 25 | 추석 명절 지원금 | 100만+ | 2.4 | 2026-08-20 | chuseok-holiday-support-payment-2026 |
| 25 | 미납국세 열람 | 10만~100만 | 0.1 | 2026-08-13 | landlord-unpaid-tax-inspection-tenant-2026 |
| 25 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-05-14 | unemployment-fraud-criminal-civil-penalty |
| 25 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-04-16 | unemployment-fraud-detection-self-report |
| 25 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-04-22 | unemployment-fraud-notice-response |
| 26 | 친환경차 세제 혜택 | 100만+ | 0.4 | 2026-04-04 | eco-friendly-vehicle-tax-benefits-2026 |
| 26 | 평균 순자산 | 10만~100만 | 0.1 | 2026-06-29 | korea-average-net-worth-2025 |
| 26 | 65세 이상 고용보험 | 100만+ | 0.5 | 2026-05-09 | over-65-employment-insurance-voluntary |
| 27 | 자동차 사고 합의서 | 100만+ | 0 | 2026-05-13 | car-accident-settlement-effect-dispute |
| 27 | 1종 보통 운전면허 갱신 | 10만~100만 | 0.4 | 2026-05-20 | drivers-license-class1-online-renewal |
| 27 | 생활비 증여세 | 10만~100만 | 0 | 2026-08-18 | parent-living-expense-allowance-gift-tax |
| 28 | 자동차 환경부담금 | 100만+ | 0.1 | 2026-04-27 | car-environment-fee-diesel-old-exempt |
| 28 | ISA 만기 연장 | 3만~10만 | 1.2 | 2026-09-21 | isa-maturity-extension-deadline |
| 29 | 적금 만기 처리 | 10만~100만 | 0 | 2026-05-13 | installment-maturity-auto-vs-cancel |
| 29 | 연말정산 미리보기 | 100만+ | 4.3 | 2026-08-20 | yearend-tax-preview-service-guide |
| 30 | 신용카드 소득공제 2026 | 100만+ | 0 | 2026-08-07 | credit-card-deduction-child-reform-2026 |
| 30 | 월세 현금영수증 | 10만~100만 | 1.5 | 2026-08-25 | monthly-rent-cash-receipt-income-deduction |
| 30 | 실업급여 아르바이트 | 10만~100만 | 0.1 | 2026-07-10 | unemployment-benefit-part-time-work |
