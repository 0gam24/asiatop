# 네이버 웹문서 4~30위 글 (2026-11-02)

`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.

- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.
- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).

## 지난 표본(2026-10-26) 대비 10위 안 들고 남

- 빠짐: 4세대 실손보험 갱신 10 → 12 (4th-gen-silson-renewal-strategy)
- 빠짐: 일용근로자 비과세 10 → 12 (daily-worker-non-tax-150k-limit)
- 빠짐: 건강보험 피부양자 박탈 4 → 11 (health-insurance-dependent-loss-recovery)
- 빠짐: 장기 채권 ETF 10 → 12 (long-term-bond-etf-vs-deposit-5year)
- 빠짐: 6월 매수자 5 → 20 (property-tax-june-buyer-june-2-deed-guide)
- 빠짐: 청년도약계좌 미가입 10 → 11 (youth-leap-account-non-applicants-june-final-check)
- 들어옴: 6월 매도 양도세 26 → 10 (capital-gains-tax-june-seller-aug-31-prep)
- 들어옴: 운전자보험 자녀 가입 밖 → 2 (driver-insurance-child-19-vs-20)
- 들어옴: 첫 신고 사업자 밖 → 3 (first-time-business-tax-filer-guide-d3)
- 들어옴: 2027년 건강보험료율 12 → 10 (health-insurance-rate-2027-frozen)
- 들어옴: 구직급여 정지 13 → 10 (unemployment-employment-report-suspension)
- 들어옴: 구직급여 자영업 등록 11 → 9 (unemployment-self-employed-registration)

## 4~30위 중 검색량이 잡히는 글 16편 (리프레시 먼저)

- 검색량은 검색어 트렌드 최근 30일, 실업급여 30일 평균 = 100 눈금이다(0.5 이상만, 측정 2026-11-02). 순위와 검색량이 둘 다 측정된 글이라 이 목록부터 고친다.

| 검색량 | 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |
|---|---|---|---|---|---|
| 10.3 | 27 | SK하이닉스 성과급 | 100만+ | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 4.6 | 24 | 일용직 4대보험 | 100만+ | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 3.2 | 19 | 자차 자기부담금 | 10만~100만 | 2026-06-21 | car-insurance-self-pay-deductible |
| 3.1 | 26 | 국민연금 임의계속가입 | 10만~100만 | 2026-04-08 | national-pension-voluntary-continued-payment |
| 2.9 | 6 | 전세 갱신 청구권 | 10만~100만 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 1.4 | 19 | 국민연금 추후납부 | 10만~100만 | 2026-04-26 | nps-additional-payment-coverage-extension |
| 1.4 | 19 | 국민연금 추후납부 | 10만~100만 | 2026-05-05 | nps-additional-vs-voluntary-before-60 |
| 0.9 | 5 | 오피스텔 아파트 차이 | 100만+ | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 0.9 | 15 | 국민연금 지급일 | 10만~100만 | 2026-10-08 | national-pension-payment-date-calendar |
| 0.6 | 10 | 청년미래적금 자동이체 | 3만~10만 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 0.6 | 16 | 상생임대인 | 100만+ | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 0.5 | 17 | 반전세 계산 | 100만+ | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 0.5 | 22 | 스트레스 DSR 3단계 | 10만~100만 | 2026-07-13 | stress-dsr-stage3-2026-loan-limit |
| 0.5 | 27 | 1종 보통 운전면허 갱신 | 10만~100만 | 2026-05-20 | drivers-license-class1-online-renewal |
| 0.5 | 27 | 부녀자공제 | 10만~100만 | 2026-06-26 | female-single-parent-tax-deduction |
| 0.5 | 27 | 65세 이상 고용보험 | 100만+ | 2026-05-09 | over-65-employment-insurance-voluntary |

## 4~30위 114편

| 순위 | 검색어 | 웹문서 결과 수 | 검색량 | 발행 | 글 |
|---|---|---|---|---|---|
| 4 | 종소세 환급 안 들어옴 | <3만 | 0 | 2026-06-05 | comprehensive-income-tax-refund-not-deposited-diagnosis |
| 4 | 부양가족 소득요건 2026 | 100만+ | 0 | 2026-08-08 | dependent-deduction-income-threshold-300m-2026 |
| 4 | 가짜 3.3 계약 | 10만~100만 | 0 | 2026-08-05 | fake-3-3-contract-disguised-freelancer |
| 4 | 전월세 누수 | 10만~100만 | 0 | 2026-06-10 | rental-water-leak-repair-landlord-tenant |
| 5 | 법인차 사적 사용 | 100만+ | 0 | 2026-04-28 | corporate-car-private-use-tax-penalty |
| 5 | 건강보험료 정산 분할납부 | 10만~100만 | 0 | 2026-07-12 | health-insurance-settlement-installment-2026-july |
| 5 | 오피스텔 아파트 차이 | 100만+ | 0.9 | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 6 | 종합소득세 D-1 | 3만~10만 | 0 | 2026-05-30 | comprehensive-income-tax-d1-final-hour-checklist |
| 6 | 종소세 마감 후 | <3만 | 0 | 2026-05-30 | comprehensive-income-tax-first-24h-after-deadline |
| 6 | 예적금 풍차돌리기 | <3만 | 0 | 2026-04-23 | deposit-windmill-1year-staggered |
| 6 | 고용보험료율 2027 | 100만+ | 0 | 2026-09-15 | employment-insurance-rate-2027-increase-plan |
| 6 | 2026 4대보험 요율 | 100만+ | 0.3 | 2026-06-15 | four-insurance-rate-2026-summary |
| 6 | 상속주택 양도세 취득가액 | 10만~100만 | 0 | 2026-08-10 | inherited-house-capital-gains-acquisition-value |
| 6 | 전세 갱신 청구권 | 10만~100만 | 2.9 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 6 | 국가기술자격 응시료 감면 | 100만+ | 0 | 2026-08-25 | national-technical-qualification-exam-fee-reduction-youth |
| 6 | 온누리상품권 유형 | 100만+ | 0 | 2026-07-03 | onnuri-gift-certificate-types-comparison |
| 7 | 자동차 개별소비세 인하 종료 | 10만~100만 | 0.1 | 2026-07-21 | car-excise-tax-cut-ended-2026-july |
| 7 | 자동차세 자동이체 할인 | 3만~10만 | 0 | 2026-05-02 | car-tax-auto-debit-discount-application |
| 7 | 종소세 첫 환급 | <3만 | 0 | 2026-06-04 | comprehensive-income-tax-refund-first-batch-june |
| 7 | 묵시적 갱신 보증금 인상 | 10만~100만 | 0 | 2026-05-06 | deposit-implicit-renewal-5percent |
| 7 | 주택연금 중도해지 | 10만~100만 | 0 | 2026-08-14 | housing-pension-early-termination |
| 7 | 종부세 회피 | 3만~10만 | 0 | 2026-05-24 | property-tax-may-30-deed-completion-d8 |
| 8 | 이중근로자 연말정산 | 10만~100만 | 0 | 2026-08-16 | dual-employment-year-end-tax-combined-filing |
| 8 | 청약 부적격 당첨 | 10만~100만 | 0 | 2026-06-27 | housing-subscription-ineligible-rewin-restriction |
| 9 | 환경개선부담금 환급 | 100만+ | 0 | 2026-04-19 | car-disposal-environment-fee-refund |
| 9 | 육아휴직 후 퇴사 실업급여 | 10만~100만 | 0.2 | 2026-04-28 | childcare-leave-resign-unemployment |
| 9 | 이직확인서 미발급 | <3만 | 0 | 2026-04-23 | departure-confirmation-employer-refusal |
| 9 | 한국형 레몬법 | 100만+ | 0 | 2026-06-30 | korean-lemon-law-new-car-exchange |
| 9 | 구직급여 자영업 등록 | 3만~10만 | 0 | 2026-04-26 | unemployment-self-employed-registration |
| 10 | 6월 매도 양도세 | 10만~100만 | 0 | 2026-05-30 | capital-gains-tax-june-seller-aug-31-prep |
| 10 | 운전자보험 자기부담금 | 100만+ | 0 | 2026-05-10 | driver-insurance-self-cost-accident-cap |
| 10 | 2027년 건강보험료율 | 100만+ | 0 | 2026-09-09 | health-insurance-rate-2027-frozen |
| 10 | 혼인 합가 2주택 양도세 | 10만~100만 | 0 | 2026-08-09 | marriage-combined-household-1house-cgt-exemption |
| 10 | 구직급여 정지 | 10만~100만 | 0 | 2026-05-08 | unemployment-employment-report-suspension |
| 10 | 청년미래적금 자동이체 | 3만~10만 | 0.6 | 2026-09-20 | youth-future-savings-auto-transfer-contribution |
| 11 | 종소세 과세예고통지서 | <3만 | 0 | 2026-10-06 | comprehensive-income-tax-pre-assessment-notice-30days |
| 11 | 근로장려금 반기신청 안내문 | 10만~100만 | 0 | 2026-08-29 | earned-income-credit-semiannual-no-notice |
| 11 | 건강보험 피부양자 박탈 | 10만~100만 | 0 | 2026-04-22 | health-insurance-dependent-loss-recovery |
| 11 | 육아휴직 복귀 보장 | 10만~100만 | 0 | 2026-04-26 | parental-leave-return-refusal-response |
| 11 | 청년도약계좌 미가입 | 3만~10만 | 0 | 2026-06-04 | youth-leap-account-non-applicants-june-final-check |
| 12 | 4세대 실손보험 갱신 | 10만~100만 | 0 | 2026-04-01 | 4th-gen-silson-renewal-strategy |
| 12 | 일용근로자 비과세 | 3만~10만 | 0 | 2026-05-09 | daily-worker-non-tax-150k-limit |
| 12 | 장기 채권 ETF | 10만~100만 | 0 | 2026-04-24 | long-term-bond-etf-vs-deposit-5year |
| 12 | 근저당권 설정 등록면허세 | 3만~10만 | 0 | 2026-06-20 | mortgage-registration-tax-cost |
| 12 | 실업급여 주 6일 지급 | 100만+ | 0 | 2026-09-08 | unemployment-benefit-weekly-6day-payment-reform |
| 13 | 운전자 범위 한정 | 100만+ | 0 | 2026-06-22 | car-insurance-driver-scope-rider |
| 13 | 가족관계증명서 발급 한도 | 100만+ | 0 | 2026-04-29 | family-relation-residence-record-retention |
| 13 | 종부세 주택 수 산정 제외 | 100만+ | 0 | 2026-09-10 | property-tax-house-count-exclusion-september |
| 13 | 자영업자 4대보험 | 100만+ | 0 | 2026-05-24 | self-employed-4-major-insurance-after-tax-filing |
| 15 | 신용카드 발급 거절 | 10만~100만 | 0 | 2026-04-03 | credit-card-rejection-response |
| 15 | 근로장려금 환수 | 10만~100만 | 0 | 2026-08-03 | earned-income-credit-clawback-appeal |
| 15 | 근로장려금 압류 | 10만~100만 | 0 | 2026-08-18 | earned-income-credit-seizure-protection-account |
| 15 | 국민연금 지급일 | 10만~100만 | 0.9 | 2026-10-08 | national-pension-payment-date-calendar |
| 16 | 야간 진료비 가산 | 10만~100만 | 0 | 2026-08-21 | night-holiday-medical-fee-surcharge-30-percent |
| 16 | 국세청 환급계좌 등록 | 10만~100만 | 0 | 2026-05-08 | nts-refund-account-registration |
| 16 | 상생임대인 | 100만+ | 0.6 | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 17 | 민영주택 신생아 특별공급 | 10만~100만 | 0 | 2026-08-10 | newborn-special-supply-private-housing-2026 |
| 17 | 반전세 계산 | 100만+ | 0.5 | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 17 | 산재 사망 유족급여 | 10만~100만 | 0.1 | 2026-04-20 | workers-comp-death-survivor-benefit |
| 18 | 카드포인트 현금화 | 100만+ | 0 | 2026-07-27 | card-point-integrated-lookup-cash-conversion |
| 18 | 초등 예체능 학원비 세액공제 | 3만~10만 | 0 | 2026-08-05 | elementary-arts-sports-academy-tax-credit-2026 |
| 18 | 국민연금 가입 이력 조회 | 100만+ | 0 | 2026-04-30 | nps-enrollment-history-correction |
| 18 | 퇴직연금 갈아타기 | 10만~100만 | 0 | 2026-04-17 | retirement-pension-db-dc-irp-switch |
| 19 | 양도세 7월 신고 | 10만~100만 | 0 | 2026-06-01 | capital-gains-tax-may-seller-d60-prep |
| 19 | 자동차 환경부담금 | 100만+ | 0 | 2026-04-27 | car-environment-fee-diesel-old-exempt |
| 19 | 자차 자기부담금 | 10만~100만 | 3.2 | 2026-06-21 | car-insurance-self-pay-deductible |
| 19 | 상속포기 사망보험금 | 10만~100만 | 0 | 2026-08-09 | death-insurance-inheritance-renounce-tax |
| 19 | 적금 만기 처리 | 10만~100만 | 0 | 2026-05-13 | installment-maturity-auto-vs-cancel |
| 19 | 국민연금 추후납부 | 10만~100만 | 1.4 | 2026-04-26 | nps-additional-payment-coverage-extension |
| 19 | 국민연금 추후납부 | 10만~100만 | 1.4 | 2026-05-05 | nps-additional-vs-voluntary-before-60 |
| 19 | 부모급여 2026 | 100만+ | 0 | 2026-08-19 | parental-benefit-2026-infant-cash |
| 20 | 추석 명절 지원금 | 100만+ | 0 | 2026-08-20 | chuseok-holiday-support-payment-2026 |
| 20 | 디딤돌 대출 2026 | 100만+ | 0 | 2026-05-17 | didimdol-2026-h2-limit-change-checklist |
| 20 | 생활비 증여세 | 10만~100만 | 0 | 2026-08-18 | parent-living-expense-allowance-gift-tax |
| 20 | 6월 매수자 | 10만~100만 | 0 | 2026-06-01 | property-tax-june-buyer-june-2-deed-guide |
| 20 | 중고거래 세금 | 100만+ | 0.3 | 2026-07-08 | used-goods-trade-tax-liability |
| 21 | 무순위 청약 자격 | 10만~100만 | 0 | 2026-08-01 | unranked-subscription-homeless-only-2026 |
| 22 | 2026 병사 봉급 | <3만 | 0 | 2026-08-04 | soldier-salary-2026-discharge-savings |
| 22 | 스트레스 DSR 3단계 | 10만~100만 | 0.5 | 2026-07-13 | stress-dsr-stage3-2026-loan-limit |
| 22 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-05-14 | unemployment-fraud-criminal-civil-penalty |
| 22 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-04-16 | unemployment-fraud-detection-self-report |
| 22 | 구직급여 부정수급 | 10만~100만 | 0 | 2026-04-22 | unemployment-fraud-notice-response |
| 23 | 차량 압류 해제 | 10만~100만 | 0.1 | 2026-05-08 | car-impoundment-tax-debt-release |
| 23 | 친환경차 세제 혜택 | 100만+ | 0.4 | 2026-04-04 | eco-friendly-vehicle-tax-benefits-2026 |
| 23 | 소득세 누진세율 | 10만~100만 | 0 | 2026-05-10 | income-tax-progressive-marginal-vs-average |
| 23 | 개별연장급여 | 100만+ | 0 | 2026-04-19 | unemployment-individual-extension-benefit |
| 24 | 일용직 4대보험 | 100만+ | 4.6 | 2026-04-29 | daily-worker-4insurance-1month-exempt |
| 24 | 예금 풍차돌리기 | <3만 | 0.3 | 2026-05-04 | deposit-vs-installment-windmill-comparison |
| 25 | 연차사용 의무 | 100만+ | 0 | 2026-04-07 | mandatory-annual-leave-employer-duty |
| 25 | 중도퇴사 연말정산 | 3만~10만 | 0.4 | 2026-06-18 | mid-year-resignation-tax-settlement |
| 25 | 권고사직 합의서 | 10만~100만 | 0.3 | 2026-04-15 | recommended-resignation-agreement-rights |
| 25 | 단기 근로 실업급여 | 10만~100만 | 0 | 2026-04-20 | short-term-worker-unemployment-eligibility |
| 26 | 아파트 계약 해제 | 100만+ | 0 | 2026-04-24 | apartment-sale-contract-cancellation-penalty |
| 26 | 자동차 사고 합의서 | 100만+ | 0 | 2026-05-13 | car-accident-settlement-effect-dispute |
| 26 | 자녀세액공제 2026 | 10만~100만 | 0 | 2026-08-07 | child-tax-credit-increase-2026-reform |
| 26 | 근로계약서 갱신 | 100만+ | 0 | 2026-05-13 | labor-contract-1year-auto-vs-renewal |
| 26 | 국민연금 임의계속가입 | 10만~100만 | 3.1 | 2026-04-08 | national-pension-voluntary-continued-payment |
| 26 | 산재 통상재해 | 10만~100만 | 0 | 2026-05-03 | workers-comp-routine-vs-commute |
| 27 | 1종 보통 운전면허 갱신 | 10만~100만 | 0.5 | 2026-05-20 | drivers-license-class1-online-renewal |
| 27 | 부녀자공제 | 10만~100만 | 0.5 | 2026-06-26 | female-single-parent-tax-deduction |
| 27 | SK하이닉스 성과급 | 100만+ | 10.3 | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 27 | 65세 이상 고용보험 | 100만+ | 0.5 | 2026-05-09 | over-65-employment-insurance-voluntary |
| 27 | 속초 민생지원금 | 10만~100만 | 0.1 | 2026-07-19 | sokcho-minsaeng-support-fund-application |
| 28 | 종합소득세 분납 | 10만~100만 | 0.1 | 2026-05-21 | comprehensive-income-tax-installment-payment |
| 28 | 신용카드 소득공제 2026 | 100만+ | 0 | 2026-08-07 | credit-card-deduction-child-reform-2026 |
| 28 | 추석 상여금 세금 | 10만~100만 | 0 | 2026-07-28 | holiday-bonus-tax-withholding-year-end |
| 28 | 배우자 인적공제 | 10만~100만 | 0.1 | 2026-05-14 | spouse-personal-deduction-100m-exception |
| 28 | 가상자산 과세 2027 | 10만~100만 | 0 | 2026-08-07 | virtual-asset-crypto-tax-2027-start |
| 29 | 종합소득세 마감 후 | 10만~100만 | 0 | 2026-05-26 | june-first-week-tax-post-deadline-guide |
| 29 | 미납국세 열람 | 10만~100만 | 0.1 | 2026-08-13 | landlord-unpaid-tax-inspection-tenant-2026 |
| 29 | 주차장 사고 과실비율 | 10만~100만 | 0 | 2026-06-17 | parking-lot-accident-fault-ratio |
| 30 | 청약통장 25만원 | 3만~10만 | 0.1 | 2026-08-13 | housing-subscription-monthly-recognition-250k |
| 30 | 유산취득세 | 10만~100만 | 0.4 | 2026-08-01 | inheritance-acquisition-tax-reform-explainer |
| 30 | 건강보험 본인부담률 | 100만+ | 0.2 | 2026-04-26 | nhis-copayment-rate-income-tier |
