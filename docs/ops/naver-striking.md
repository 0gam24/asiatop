# 네이버 웹문서 4~30위 글 (2026-11-09)

`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.

- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.
- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).

## 지난 표본(2026-11-02) 대비 10위 안 들고 남

- 빠짐: 교통상해진단금 1 → 밖 (accident-insurance-claim-diagnosis)
- 빠짐: 6월 매도 양도세 10 → 밖 (capital-gains-tax-june-seller-aug-31-prep)
- 빠짐: 자동차세 자동이체 할인 7 → 밖 (car-tax-auto-debit-discount-application)
- 빠짐: 육아휴직 후 퇴사 실업급여 9 → 밖 (childcare-leave-resign-unemployment)
- 빠짐: 종소세 사후 적발 1 → 18 (comprehensive-income-tax-5-year-audit-risk)
- 빠짐: 종소세 첫 환급 7 → 밖 (comprehensive-income-tax-refund-first-batch-june)
- 빠짐: 종소세 환급 안 들어옴 4 → 밖 (comprehensive-income-tax-refund-not-deposited-diagnosis)
- 빠짐: 종소세 환급 추적 1 → 25 (comprehensive-income-tax-refund-tracking-diagnosis)
- 빠짐: 법인차 사적 사용 5 → 밖 (corporate-car-private-use-tax-penalty)
- 빠짐: 기초생활수급자 예금 한도 2 → 밖 (debtor-protection-deposit-1m-limit)
- 빠짐: 묵시적 갱신 보증금 인상 7 → 밖 (deposit-implicit-renewal-5percent)
- 빠짐: 예적금 풍차돌리기 6 → 밖 (deposit-windmill-1year-staggered)
- 빠짐: 운전자보험 자기부담금 10 → 밖 (driver-insurance-self-cost-accident-cap)
- 빠짐: 첫 신고 사업자 3 → 밖 (first-time-business-tax-filer-guide-d3)
- 빠짐: 외화 수입 종합소득세 3 → 밖 (foreign-income-comprehensive-tax-d7)
- 빠짐: 청약 부적격 당첨 8 → 밖 (housing-subscription-ineligible-rewin-restriction)
- 빠짐: 주택임대차 보증금 인하 1 → 밖 (jeonse-deposit-reduction-tenant-request)
- 빠짐: 혼인 합가 2주택 양도세 10 → 11 (marriage-combined-household-1house-cgt-exemption)
- 빠짐: 5월 29일 마지막 영업일 1 → 밖 (may-29-last-business-day-deadline-actions)
- 빠짐: 온누리상품권 유형 6 → 밖 (onnuri-gift-certificate-types-comparison)
- 빠짐: 종부세 회피 7 → 밖 (property-tax-may-30-deed-completion-d8)
- 빠짐: 전월세 누수 4 → 밖 (rental-water-leak-repair-landlord-tenant)
- 빠짐: 국가유공자 가족 의료급여 3 → 밖 (state-merit-family-medical-education)
- 빠짐: 여름 휴가비 비과세 2 → 30 (summer-vacation-bonus-tax-free-limit)
- 빠짐: 구직급여 정지 10 → 15 (unemployment-employment-report-suspension)
- 빠짐: 구직급여 자영업 등록 9 → 밖 (unemployment-self-employed-registration)
- 빠짐: 청년미래적금 자동이체 10 → 밖 (youth-future-savings-auto-transfer-contribution)
- 들어옴: 실업급여 주 6일 지급 12 → 4 (unemployment-benefit-weekly-6day-payment-reform)

## 4~30위 중 검색량이 잡히는 글 12편 (리프레시 먼저)

- 검색량은 검색어 트렌드 최근 30일, 실업급여 30일 평균 = 100 눈금이다(0.5 이상만, 측정 2026-11-09). 순위와 검색량이 둘 다 측정된 글이라 이 목록부터 고친다.

| 검색량 | 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |
|---|---|---|---|---|---|
| 41.7 | 15 | 연말정산 미리보기 | 10만~100만 | 2026-08-20 | yearend-tax-preview-service-guide |
| 9.1 | 22 | SK하이닉스 성과급 | 100만+ | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 3.3 | 20 | 자차 자기부담금 | 10만~100만 | 2026-06-21 | car-insurance-self-pay-deductible |
| 3.1 | 27 | 국민연금 임의계속가입 | 10만~100만 | 2026-04-08 | national-pension-voluntary-continued-payment |
| 2.7 | 9 | 전세 갱신 청구권 | 10만~100만 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 1.3 | 19 | 국민연금 추후납부 | 10만~100만 | 2026-04-26 | nps-additional-payment-coverage-extension |
| 1.3 | 19 | 국민연금 추후납부 | 10만~100만 | 2026-05-05 | nps-additional-vs-voluntary-before-60 |
| 0.9 | 14 | 국민연금 지급일 | 10만~100만 | 2026-10-08 | national-pension-payment-date-calendar |
| 0.8 | 5 | 오피스텔 아파트 차이 | 100만+ | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 0.5 | 24 | 반전세 계산 | 100만+ | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 0.5 | 30 | 65세 이상 고용보험 | 100만+ | 2026-05-09 | over-65-employment-insurance-voluntary |
| 0.5 | 30 | 상생임대인 | 100만+ | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |

## 4~30위 58편

| 순위 | 검색어 | 웹문서 결과 수 | 검색량 | 발행 | 글 |
|---|---|---|---|---|---|
| 4 | 부양가족 소득요건 2026 | 100만+ | 0 | 2026-08-08 | dependent-deduction-income-threshold-300m-2026 |
| 4 | 근로장려금 기초생활수급 | 100만+ | 0 | 2026-08-19 | eitc-basic-livelihood-recipient-income |
| 4 | 가짜 3.3 계약 | 10만~100만 | 0 | 2026-08-05 | fake-3-3-contract-disguised-freelancer |
| 4 | 청약통장 비대면 해지 | 3만~10만 | 0 | 2026-09-22 | housing-subscription-online-termination |
| 4 | 실업급여 주 6일 지급 | 100만+ | 0 | 2026-09-08 | unemployment-benefit-weekly-6day-payment-reform |
| 5 | 자동차 개별소비세 인하 종료 | 10만~100만 | 0.1 | 2026-07-21 | car-excise-tax-cut-ended-2026-july |
| 5 | 2026 4대보험 요율 | 100만+ | 0.4 | 2026-06-15 | four-insurance-rate-2026-summary |
| 5 | 건강보험료 정산 분할납부 | 10만~100만 | 0 | 2026-07-12 | health-insurance-settlement-installment-2026-july |
| 5 | 오피스텔 아파트 차이 | 100만+ | 0.8 | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 6 | 주택연금 중도해지 | 10만~100만 | 0 | 2026-08-14 | housing-pension-early-termination |
| 6 | 국가기술자격 응시료 감면 | 100만+ | 0 | 2026-08-25 | national-technical-qualification-exam-fee-reduction-youth |
| 7 | 이직확인서 미발급 | <3만 | 0 | 2026-04-23 | departure-confirmation-employer-refusal |
| 7 | 고용보험료율 2027 | 100만+ | 0 | 2026-09-15 | employment-insurance-rate-2027-increase-plan |
| 7 | 상속주택 양도세 취득가액 | 10만~100만 | 0 | 2026-08-10 | inherited-house-capital-gains-acquisition-value |
| 8 | 환경개선부담금 환급 | 100만+ | 0 | 2026-04-19 | car-disposal-environment-fee-refund |
| 8 | 종합소득세 D-1 | 3만~10만 | 0 | 2026-05-30 | comprehensive-income-tax-d1-final-hour-checklist |
| 8 | 종소세 마감 후 | <3만 | 0 | 2026-05-30 | comprehensive-income-tax-first-24h-after-deadline |
| 9 | 이중근로자 연말정산 | 100만+ | 0 | 2026-08-16 | dual-employment-year-end-tax-combined-filing |
| 9 | 2027년 건강보험료율 | 100만+ | 0 | 2026-09-09 | health-insurance-rate-2027-frozen |
| 9 | 전세 갱신 청구권 | 10만~100만 | 2.7 | 2026-04-18 | jeonse-renewal-claim-5percent-cap |
| 10 | 한국형 레몬법 | 100만+ | 0 | 2026-06-30 | korean-lemon-law-new-car-exchange |
| 11 | 혼인 합가 2주택 양도세 | 10만~100만 | 0 | 2026-08-09 | marriage-combined-household-1house-cgt-exemption |
| 12 | 신용카드 발급 거절 | 10만~100만 | 0 | 2026-04-03 | credit-card-rejection-response |
| 13 | 건강보험 피부양자 박탈 | 3만~10만 | 0 | 2026-04-22 | health-insurance-dependent-loss-recovery |
| 14 | 국민연금 지급일 | 10만~100만 | 0.9 | 2026-10-08 | national-pension-payment-date-calendar |
| 15 | 일용근로자 비과세 | 3만~10만 | 0 | 2026-05-09 | daily-worker-non-tax-150k-limit |
| 15 | 근로장려금 환수 | 10만~100만 | 0 | 2026-08-03 | earned-income-credit-clawback-appeal |
| 15 | 구직급여 정지 | 10만~100만 | 0 | 2026-05-08 | unemployment-employment-report-suspension |
| 15 | 산재 사망 유족급여 | 10만~100만 | 0.1 | 2026-04-20 | workers-comp-death-survivor-benefit |
| 15 | 연말정산 미리보기 | 10만~100만 | 41.7 | 2026-08-20 | yearend-tax-preview-service-guide |
| 16 | 육아휴직 복귀 보장 | 10만~100만 | 0 | 2026-04-26 | parental-leave-return-refusal-response |
| 17 | 야간 진료비 가산 | 10만~100만 | 0 | 2026-08-21 | night-holiday-medical-fee-surcharge-30-percent |
| 18 | 종소세 사후 적발 | <3만 | 0 | 2026-05-30 | comprehensive-income-tax-5-year-audit-risk |
| 18 | 초등 예체능 학원비 세액공제 | 3만~10만 | 0 | 2026-08-05 | elementary-arts-sports-academy-tax-credit-2026 |
| 18 | 생활비 증여세 | 10만~100만 | 0 | 2026-08-18 | parent-living-expense-allowance-gift-tax |
| 19 | 국민연금 추후납부 | 10만~100만 | 1.3 | 2026-04-26 | nps-additional-payment-coverage-extension |
| 19 | 국민연금 추후납부 | 10만~100만 | 1.3 | 2026-05-05 | nps-additional-vs-voluntary-before-60 |
| 20 | 자차 자기부담금 | 10만~100만 | 3.3 | 2026-06-21 | car-insurance-self-pay-deductible |
| 20 | 적금 만기 처리 | 10만~100만 | 0 | 2026-05-13 | installment-maturity-auto-vs-cancel |
| 21 | 부모급여 2026 | 100만+ | 0 | 2026-08-19 | parental-benefit-2026-infant-cash |
| 22 | 상속포기 사망보험금 | 10만~100만 | 0 | 2026-08-09 | death-insurance-inheritance-renounce-tax |
| 22 | 근로장려금 압류 | 10만~100만 | 0 | 2026-08-18 | earned-income-credit-seizure-protection-account |
| 22 | SK하이닉스 성과급 | 100만+ | 9.1 | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 22 | 근로계약서 갱신 | 100만+ | 0 | 2026-05-13 | labor-contract-1year-auto-vs-renewal |
| 22 | 스트레스 DSR 3단계 | 10만~100만 | 0.4 | 2026-07-13 | stress-dsr-stage3-2026-loan-limit |
| 23 | 차량 압류 해제 | 10만~100만 | 0.1 | 2026-05-08 | car-impoundment-tax-debt-release |
| 23 | 소득세 누진세율 | 10만~100만 | 0 | 2026-05-10 | income-tax-progressive-marginal-vs-average |
| 24 | 추석 상여금 세금 | 10만~100만 | 0 | 2026-07-28 | holiday-bonus-tax-withholding-year-end |
| 24 | 반전세 계산 | 100만+ | 0.5 | 2026-05-01 | semi-jeonse-deposit-monthly-rent-calc |
| 25 | 종소세 환급 추적 | <3만 | 0 | 2026-06-01 | comprehensive-income-tax-refund-tracking-diagnosis |
| 25 | 무순위 청약 자격 | 10만~100만 | 0 | 2026-08-01 | unranked-subscription-homeless-only-2026 |
| 27 | 국민연금 임의계속가입 | 10만~100만 | 3.1 | 2026-04-08 | national-pension-voluntary-continued-payment |
| 27 | 주차장 사고 과실비율 | 10만~100만 | 0 | 2026-06-17 | parking-lot-accident-fault-ratio |
| 28 | 미납국세 열람 | 10만~100만 | 0 | 2026-08-13 | landlord-unpaid-tax-inspection-tenant-2026 |
| 28 | 권고사직 합의서 | 10만~100만 | 0.3 | 2026-04-15 | recommended-resignation-agreement-rights |
| 30 | 65세 이상 고용보험 | 100만+ | 0.5 | 2026-05-09 | over-65-employment-insurance-voluntary |
| 30 | 상생임대인 | 100만+ | 0.5 | 2026-08-02 | sangsaeng-landlord-capital-gains-tax-2026 |
| 30 | 여름 휴가비 비과세 | 3만~10만 | 0 | 2026-06-07 | summer-vacation-bonus-tax-free-limit |
