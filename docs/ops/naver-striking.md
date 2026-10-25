# 네이버 웹문서 4~30위 글 (2026-10-26)

`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.

- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.
- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).

## 지난 표본(2026-10-19) 대비 10위 안 들고 남

- 빠짐: 구직급여 자영업 등록 9 → 11 (unemployment-self-employed-registration)
- 들어옴: 육아휴직 후 퇴사 실업급여 12 → 7 (childcare-leave-resign-unemployment)
- 들어옴: 일용근로자 비과세 16 → 10 (daily-worker-non-tax-150k-limit)
- 들어옴: 건강보험료 정산 분할납부 12 → 9 (health-insurance-settlement-installment-2026-july)
- 들어옴: 혼인 합가 2주택 양도세 16 → 8 (marriage-combined-household-1house-cgt-exemption)
- 들어옴: 종부세 회피 11 → 10 (property-tax-may-30-deed-completion-d8)

## 4~30위 중 검색량이 잡히는 글 20편 (리프레시 먼저)

- 검색량은 검색어 트렌드 최근 30일, 실업급여 30일 평균 = 100 눈금이다(0.5 이상만, 측정 2026-10-26). 순위와 검색량이 둘 다 측정된 글이라 이 목록부터 고친다.

| 검색량 | 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |
|---|---|---|---|---|---|
| 8.8 | 23 | SK하이닉스 성과급 | 100만+ | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 5.9 | 21 | 연말정산 미리보기 | 100만+ | 2026-08-20 | yearend-tax-preview-service-guide |
| 4.4 | 22 | 일용직 4대보험 | 100만+ | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 4 | 21 | 확정일자 부여현황 | 100만+ | 2026-09-17 | fixed-date-grant-status-before-lease |
| 3.1 | 25 | 국민연금 임의계속가입 | 10만~100만 | 2026-04-08 | national-pension-voluntary-continued-payment |
| 3 | 18 | 자차 자기부담금 | 10만~100만 | 2026-06-21 | car-insurance-self-pay-deductible |
| 2.9 | 5 | 전세 갱신 청구권 | 10만~100만 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 1.5 | 19 | 국민연금 추후납부 | 10만~100만 | 2026-04-26 | nps-additional-payment-coverage-extension |
| 1.5 | 19 | 국민연금 추후납부 | 10만~100만 | 2026-05-05 | nps-additional-vs-voluntary-before-60 |
| 1.2 | 30 | ISA 만기 연장 | 3만~10만 | 2026-09-21 | isa-maturity-extension-deadline |
| 1.1 | 7 | 청년미래적금 자동이체 | 3만~10만 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 0.9 | 5 | 오피스텔 아파트 차이 | 100만+ | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 0.7 | 18 | 상생임대인 | 100만+ | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 0.6 | 24 | 중고차 명의이전 | 100만+ | 2026-04-26 | used-car-title-transfer-tax |
| 0.6 | 28 | 자녀양육수당 | 100만+ | 2026-06-04 | child-care-allowance-2026-application-guide |
| 0.5 | 16 | 반전세 계산 | 100만+ | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 0.5 | 21 | 스트레스 DSR 3단계 | 10만~100만 | 2026-07-13 | stress-dsr-stage3-2026-loan-limit |
| 0.5 | 24 | 1종 보통 운전면허 갱신 | 10만~100만 | 2026-05-20 | drivers-license-class1-online-renewal |
| 0.5 | 25 | 추석 명절 지원금 | 100만+ | 2026-08-20 | chuseok-holiday-support-payment-2026 |
| 0.5 | 27 | 65세 이상 고용보험 | 100만+ | 2026-05-09 | over-65-employment-insurance-voluntary |

## 4~30위 109편

| 순위 | 검색어 | 웹문서 결과 수 | 검색량 | 발행 | 글 |
|---|---|---|---|---|---|
| 4 | 종소세 환급 안 들어옴 | <3만 | 0 | 2026-06-05 | comprehensive-income-tax-refund-not-deposited-diagnosis |
| 4 | 기초생활수급자 예금 한도 | 10만~100만 | 0 | 2026-05-09 | debtor-protection-deposit-1m-limit |
| 4 | 외화 수입 종합소득세 | 10만~100만 | 0 | 2026-05-24 | foreign-income-comprehensive-tax-d7 |
| 4 | 건강보험 피부양자 박탈 | 10만~100만 | 0 | 2026-04-22 | health-insurance-dependent-loss-recovery |
| 4 | 퇴직 후 재취업 4대보험 | 100만+ | 0 | 2026-05-08 | reemployment-30day-4insurance-transfer |
| 5 | 종합소득세 D-1 | 3만~10만 | 0 | 2026-05-30 | comprehensive-income-tax-d1-final-hour-checklist |
| 5 | 묵시적 갱신 보증금 인상 | 10만~100만 | 0 | 2026-05-06 | deposit-implicit-renewal-5percent |
| 5 | 청약 부적격 당첨 | 10만~100만 | 0 | 2026-06-27 | housing-subscription-ineligible-rewin-restriction |
| 5 | 전세 갱신 청구권 | 10만~100만 | 2.9 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 5 | 오피스텔 아파트 차이 | 100만+ | 0.9 | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 5 | 6월 매수자 | 10만~100만 | 0 | 2026-06-01 | property-tax-june-buyer-june-2-deed-guide |
| 6 | 환경개선부담금 환급 | 100만+ | 0 | 2026-04-19 | car-disposal-environment-fee-refund |
| 6 | 종소세 마감 후 | <3만 | 0 | 2026-05-30 | comprehensive-income-tax-first-24h-after-deadline |
| 6 | 법인차 사적 사용 | 100만+ | 0 | 2026-04-28 | corporate-car-private-use-tax-penalty |
| 6 | 예적금 풍차돌리기 | <3만 | 0 | 2026-04-23 | deposit-windmill-1year-staggered |
| 6 | 고용보험료율 2027 | 100만+ | 0 | 2026-09-15 | employment-insurance-rate-2027-increase-plan |
| 6 | 회식비 영수증 | 10만~100만 | 0 | 2026-04-23 | meal-expense-receipt-tax-treatment |
| 6 | 국가기술자격 응시료 감면 | 100만+ | 0 | 2026-08-25 | national-technical-qualification-exam-fee-reduction-youth |
| 7 | 자동차 개별소비세 인하 종료 | 10만~100만 | 0.1 | 2026-07-21 | car-excise-tax-cut-ended-2026-july |
| 7 | 육아휴직 후 퇴사 실업급여 | 3만~10만 | 0.3 | 2026-04-28 | childcare-leave-resign-unemployment |
| 7 | 종소세 첫 환급 | <3만 | 0 | 2026-06-04 | comprehensive-income-tax-refund-first-batch-june |
| 7 | 주택연금 중도해지 | 10만~100만 | 0 | 2026-08-14 | housing-pension-early-termination |
| 7 | 상속주택 양도세 취득가액 | 10만~100만 | 0 | 2026-08-10 | inherited-house-capital-gains-acquisition-value |
| 7 | 온누리상품권 유형 | 100만+ | 0 | 2026-07-03 | onnuri-gift-certificate-types-comparison |
| 7 | 청년미래적금 자동이체 | 3만~10만 | 1.1 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 8 | 자동차세 자동이체 할인 | 3만~10만 | 0 | 2026-05-02 | car-tax-auto-debit-discount-application |
| 8 | 이직확인서 미발급 | <3만 | 0 | 2026-04-23 | departure-confirmation-employer-refusal |
| 8 | 운전자보험 자기부담금 | 100만+ | 0 | 2026-05-10 | driver-insurance-self-cost-accident-cap |
| 8 | 2026 4대보험 요율 | 100만+ | 0.4 | 2026-06-15 | four-insurance-rate-2026-summary |
| 8 | 한국형 레몬법 | 100만+ | 0 | 2026-06-30 | korean-lemon-law-new-car-exchange |
| 8 | 혼인 합가 2주택 양도세 | 10만~100만 | 0 | 2026-08-09 | marriage-combined-household-1house-cgt-exemption |
| 8 | 전월세 누수 | 10만~100만 | 0 | 2026-06-10 | rental-water-leak-repair-landlord-tenant |
| 9 | 이중근로자 연말정산 | 10만~100만 | 0 | 2026-08-16 | dual-employment-year-end-tax-combined-filing |
| 9 | 건강보험료 정산 분할납부 | 10만~100만 | 0 | 2026-07-12 | health-insurance-settlement-installment-2026-july |
| 10 | 4세대 실손보험 갱신 | 10만~100만 | 0 | 2026-04-01 | 4th-gen-silson-renewal-strategy |
| 10 | 일용근로자 비과세 | 3만~10만 | 0 | 2026-05-09 | daily-worker-non-tax-150k-limit |
| 10 | 장기 채권 ETF | 10만~100만 | 0 | 2026-04-24 | long-term-bond-etf-vs-deposit-5year |
| 10 | 종부세 회피 | 3만~10만 | 0 | 2026-05-24 | property-tax-may-30-deed-completion-d8 |
| 10 | 청년도약계좌 미가입 | 3만~10만 | 0 | 2026-06-04 | youth-leap-account-non-applicants-june-final-check |
| 11 | 육아휴직 복귀 보장 | 10만~100만 | 0 | 2026-04-26 | parental-leave-return-refusal-response |
| 11 | 종부세 주택 수 산정 제외 | 100만+ | 0 | 2026-09-10 | property-tax-house-count-exclusion-september |
| 11 | 구직급여 자영업 등록 | 3만~10만 | 0 | 2026-04-26 | unemployment-self-employed-registration |
| 12 | 신용카드 발급 거절 | 10만~100만 | 0 | 2026-04-03 | credit-card-rejection-response |
| 12 | 근로장려금 반기신청 안내문 | 10만~100만 | 0 | 2026-08-29 | earned-income-credit-semiannual-no-notice |
| 12 | 2027년 건강보험료율 | 100만+ | 0 | 2026-09-09 | health-insurance-rate-2027-frozen |
| 13 | 근저당권 설정 등록면허세 | <3만 | 0 | 2026-06-20 | mortgage-registration-tax-cost |
| 13 | 자영업자 4대보험 | 100만+ | 0 | 2026-05-24 | self-employed-4-major-insurance-after-tax-filing |
| 13 | 실업급여 주 6일 지급 | 100만+ | 0 | 2026-09-08 | unemployment-benefit-weekly-6day-payment-reform |
| 13 | 구직급여 정지 | 10만~100만 | 0 | 2026-05-08 | unemployment-employment-report-suspension |
| 14 | 양도세 7월 신고 | 10만~100만 | 0 | 2026-06-01 | capital-gains-tax-may-seller-d60-prep |
| 14 | 근로장려금 환수 | 10만~100만 | 0 | 2026-08-03 | earned-income-credit-clawback-appeal |
| 14 | 근로장려금 압류 | 10만~100만 | 0 | 2026-08-18 | earned-income-credit-seizure-protection-account |
| 15 | 운전자 범위 한정 | 100만+ | 0 | 2026-06-22 | car-insurance-driver-scope-rider |
| 15 | 초등 예체능 학원비 세액공제 | 10만~100만 | 0 | 2026-08-05 | elementary-arts-sports-academy-tax-credit-2026 |
| 15 | 민영주택 신생아 특별공급 | 10만~100만 | 0 | 2026-08-10 | newborn-special-supply-private-housing-2026 |
| 15 | 국민연금 가입 이력 조회 | 100만+ | 0 | 2026-04-30 | nps-enrollment-history-correction |
| 16 | 반전세 계산 | 100만+ | 0.5 | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 18 | 자차 자기부담금 | 10만~100만 | 3 | 2026-06-21 | car-insurance-self-pay-deductible |
| 18 | 자녀세액공제 2026 | 10만~100만 | 0 | 2026-08-07 | child-tax-credit-increase-2026-reform |
| 18 | 상생임대인 | 100만+ | 0.7 | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 19 | 상속포기 사망보험금 | 10만~100만 | 0 | 2026-08-09 | death-insurance-inheritance-renounce-tax |
| 19 | 소득세 누진세율 | 10만~100만 | 0 | 2026-05-10 | income-tax-progressive-marginal-vs-average |
| 19 | 적금 만기 처리 | 10만~100만 | 0 | 2026-05-13 | installment-maturity-auto-vs-cancel |
| 19 | 국민연금 추후납부 | 10만~100만 | 1.5 | 2026-04-26 | nps-additional-payment-coverage-extension |
| 19 | 국민연금 추후납부 | 10만~100만 | 1.5 | 2026-05-05 | nps-additional-vs-voluntary-before-60 |
| 19 | 무순위 청약 자격 | 10만~100만 | 0 | 2026-08-01 | unranked-subscription-homeless-only-2026 |
| 19 | 가상자산 과세 2027 | 10만~100만 | 0 | 2026-08-07 | virtual-asset-crypto-tax-2027-start |
| 20 | 생활비 증여세 | 10만~100만 | 0 | 2026-08-18 | parent-living-expense-allowance-gift-tax |
| 21 | 차량 압류 해제 | 10만~100만 | 0 | 2026-05-08 | car-impoundment-tax-debt-release |
| 21 | 카드포인트 현금화 | 100만+ | 0 | 2026-07-27 | card-point-integrated-lookup-cash-conversion |
| 21 | 확정일자 부여현황 | 100만+ | 4 | 2026-09-17 | fixed-date-grant-status-before-lease |
| 21 | 스트레스 DSR 3단계 | 10만~100만 | 0.5 | 2026-07-13 | stress-dsr-stage3-2026-loan-limit |
| 21 | 개별연장급여 | 100만+ | 0 | 2026-04-19 | unemployment-individual-extension-benefit |
| 21 | 산재 사망 유족급여 | 10만~100만 | 0 | 2026-04-20 | workers-comp-death-survivor-benefit |
| 21 | 연말정산 미리보기 | 100만+ | 5.9 | 2026-08-20 | yearend-tax-preview-service-guide |
| 22 | 자동차 사고 합의서 | 100만+ | 0 | 2026-05-13 | car-accident-settlement-effect-dispute |
| 22 | 일용직 4대보험 | 100만+ | 4.4 | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 22 | 연차사용 의무 | 100만+ | 0 | 2026-04-07 | mandatory-annual-leave-employer-duty |
| 22 | 권고사직 합의서 | 10만~100만 | 0.3 | 2026-04-15 | recommended-resignation-agreement-rights |
| 22 | 2026 병사 봉급 | <3만 | 0 | 2026-08-04 | soldier-salary-2026-discharge-savings |
| 23 | SK하이닉스 성과급 | 100만+ | 8.8 | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 24 | 자동차 환경부담금 | 100만+ | 0.1 | 2026-04-27 | car-environment-fee-diesel-old-exempt |
| 24 | 종합소득세 분납 | 3만~10만 | 0 | 2026-05-21 | comprehensive-income-tax-installment-payment |
| 24 | 1종 보통 운전면허 갱신 | 10만~100만 | 0.5 | 2026-05-20 | drivers-license-class1-online-renewal |
| 24 | 주차장 사고 과실비율 | 10만~100만 | 0 | 2026-06-17 | parking-lot-accident-fault-ratio |
| 24 | 퇴직연금 갈아타기 | 10만~100만 | 0 | 2026-04-17 | retirement-pension-db-dc-irp-switch |
| 24 | 배우자 인적공제 | 10만~100만 | 0.1 | 2026-05-14 | spouse-personal-deduction-100m-exception |
| 24 | 중고차 명의이전 | 100만+ | 0.6 | 2026-04-26 | used-car-title-transfer-tax |
| 25 | 추석 명절 지원금 | 100만+ | 0.5 | 2026-08-20 | chuseok-holiday-support-payment-2026 |
| 25 | 예금 풍차돌리기 | <3만 | 0.3 | 2026-05-04 | deposit-vs-installment-windmill-comparison |
| 25 | 국민연금 임의계속가입 | 10만~100만 | 3.1 | 2026-04-08 | national-pension-voluntary-continued-payment |
| 26 | 6월 매도 양도세 | 10만~100만 | 0 | 2026-05-30 | capital-gains-tax-june-seller-aug-31-prep |
| 26 | 근로계약서 갱신 | 100만+ | 0 | 2026-05-13 | labor-contract-1year-auto-vs-renewal |
| 26 | 미납국세 열람 | 10만~100만 | 0.1 | 2026-08-13 | landlord-unpaid-tax-inspection-tenant-2026 |
| 27 | 청약통장 25만원 | 3만~10만 | 0.1 | 2026-08-13 | housing-subscription-monthly-recognition-250k |
| 27 | 종합소득세 마감 후 | 10만~100만 | 0 | 2026-05-26 | june-first-week-tax-post-deadline-guide |
| 27 | 65세 이상 고용보험 | 100만+ | 0.5 | 2026-05-09 | over-65-employment-insurance-voluntary |
| 28 | 자녀양육수당 | 100만+ | 0.6 | 2026-06-04 | child-care-allowance-2026-application-guide |
| 28 | 평균 순자산 | 10만~100만 | 0.1 | 2026-06-29 | korea-average-net-worth-2025 |
| 28 | 속초 민생지원금 | 10만~100만 | 0.1 | 2026-07-19 | sokcho-minsaeng-support-fund-application |
| 28 | 산재 통상재해 | 10만~100만 | 0 | 2026-05-03 | workers-comp-routine-vs-commute |
| 29 | 청약 가점제 | 10만~100만 | 0.1 | 2026-04-06 | housing-subscription-priority-system |
| 29 | 청약 가점제 | 10만~100만 | 0.1 | 2026-04-20 | subscription-points-family-dependents |
| 29 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-05-14 | unemployment-fraud-criminal-civil-penalty |
| 29 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-04-16 | unemployment-fraud-detection-self-report |
| 29 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-04-22 | unemployment-fraud-notice-response |
| 30 | 신용카드 소득공제 2026 | 100만+ | 0 | 2026-08-07 | credit-card-deduction-child-reform-2026 |
| 30 | 추석 상여금 세금 | 10만~100만 | 0 | 2026-07-28 | holiday-bonus-tax-withholding-year-end |
| 30 | ISA 만기 연장 | 3만~10만 | 1.2 | 2026-09-21 | isa-maturity-extension-deadline |
