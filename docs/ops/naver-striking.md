# 네이버 웹문서 4~30위 글 (2026-11-16)

`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.

- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.
- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).

## 지난 표본(2026-11-09) 대비 10위 안 들고 남

- 빠짐: 6월 매도자 양도세 3 → 밖 (capital-gains-tax-june-seller-document-organization)
- 빠짐: 환경개선부담금 환급 8 → 밖 (car-disposal-environment-fee-refund)
- 빠짐: 자동차 개별소비세 인하 종료 5 → 밖 (car-excise-tax-cut-ended-2026-july)
- 빠짐: 종소세 마감 후 8 → 11 (comprehensive-income-tax-first-24h-after-deadline)
- 빠짐: 이직확인서 미발급 7 → 밖 (departure-confirmation-employer-refusal)
- 빠짐: 운전자보험 자녀 가입 3 → 밖 (driver-insurance-child-19-vs-20)
- 빠짐: 고용보험료율 2027 7 → 18 (employment-insurance-rate-2027-increase-plan)
- 빠짐: 가짜 3.3 계약 4 → 밖 (fake-3-3-contract-disguised-freelancer)
- 빠짐: 건강보험 7월 정산 1 → 밖 (health-insurance-july-settlement-simulation)
- 빠짐: 건강보험료 정산 분할납부 5 → 밖 (health-insurance-settlement-installment-2026-july)
- 빠짐: 온열질환 실손보험 1 → 밖 (heat-illness-emergency-room-silson-claim)
- 빠짐: 주택연금 중도해지 6 → 밖 (housing-pension-early-termination)
- 빠짐: 전세 갱신 청구권 9 → 밖 (jeonse-renewal-claim-5percent-cap)
- 빠짐: 7월 자영업자 세무 1 → 밖 (july-tax-calendar-self-employed)
- 빠짐: 회식비 비과세 2 → 밖 (meeting-expense-tax-exempt-2026)
- 빠짐: 국가기술자격 응시료 감면 6 → 밖 (national-technical-qualification-exam-fee-reduction-youth)
- 빠짐: 국민연금 부양가족 가산금 2 → 밖 (nps-dependent-additional-payment)
- 빠짐: 오피스텔 아파트 차이 5 → 14 (officetel-vs-apartment-cost-comparison)
- 빠짐: 퇴직 후 재취업 4대보험 2 → 밖 (reemployment-30day-4insurance-transfer)
- 빠짐: 퇴직 통보 시점 2 → 밖 (resignation-notice-1month-vs-immediate)
- 빠짐: 실업급여 주 6일 지급 4 → 밖 (unemployment-benefit-weekly-6day-payment-reform)
- 빠짐: 구직급여 해외 출국 2 → 밖 (unemployment-overseas-travel-report)
- 들어옴: 초등 예체능 학원비 세액공제 18 → 9 (elementary-arts-sports-academy-tax-credit-2026)

## 4~30위 중 검색량이 잡히는 글 4편 (리프레시 먼저)

- 검색량은 검색어 트렌드 최근 30일, 실업급여 30일 평균 = 100 눈금이다(0.5 이상만, 측정 2026-11-16). 순위와 검색량이 둘 다 측정된 글이라 이 목록부터 고친다.

| 검색량 | 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |
|---|---|---|---|---|---|
| 65.6 | 28 | 연말정산 미리보기 | 10만~100만 | 2026-08-20 | yearend-tax-preview-service-guide |
| 8.5 | 23 | SK하이닉스 성과급 | 10만~100만 | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 1 | 14 | 국민연금 지급일 | 10만~100만 | 2026-10-08 | national-pension-payment-date-calendar |
| 0.8 | 14 | 오피스텔 아파트 차이 | 100만+ | 2026-04-26 | officetel-vs-apartment-cost-comparison |

## 4~30위 24편

| 순위 | 검색어 | 웹문서 결과 수 | 검색량 | 발행 | 글 |
|---|---|---|---|---|---|
| 4 | 청약통장 비대면 해지 | 3만~10만 | 0 | 2026-09-22 | housing-subscription-online-termination |
| 5 | 부양가족 소득요건 2026 | 100만+ | 0 | 2026-08-08 | dependent-deduction-income-threshold-300m-2026 |
| 5 | 2026 4대보험 요율 | 100만+ | 0.4 | 2026-06-15 | four-insurance-rate-2026-summary |
| 8 | 2027년 건강보험료율 | 100만+ | 0.1 | 2026-09-09 | health-insurance-rate-2027-frozen |
| 8 | 상속주택 양도세 취득가액 | 10만~100만 | 0 | 2026-08-10 | inherited-house-capital-gains-acquisition-value |
| 9 | 종합소득세 D-1 | 3만~10만 | 0 | 2026-05-30 | comprehensive-income-tax-d1-final-hour-checklist |
| 9 | 초등 예체능 학원비 세액공제 | 3만~10만 | 0 | 2026-08-05 | elementary-arts-sports-academy-tax-credit-2026 |
| 9 | 한국형 레몬법 | 100만+ | 0 | 2026-06-30 | korean-lemon-law-new-car-exchange |
| 10 | 이중근로자 연말정산 | 100만+ | 0 | 2026-08-16 | dual-employment-year-end-tax-combined-filing |
| 11 | 종소세 마감 후 | <3만 | 0 | 2026-05-30 | comprehensive-income-tax-first-24h-after-deadline |
| 14 | 국민연금 지급일 | 10만~100만 | 1 | 2026-10-08 | national-pension-payment-date-calendar |
| 14 | 오피스텔 아파트 차이 | 100만+ | 0.8 | 2026-04-26 | officetel-vs-apartment-cost-comparison |
| 16 | 차량 압류 해제 | 10만~100만 | 0.1 | 2026-05-08 | car-impoundment-tax-debt-release |
| 17 | 일용근로자 비과세 | 3만~10만 | 0 | 2026-05-09 | daily-worker-non-tax-150k-limit |
| 18 | 고용보험료율 2027 | 100만+ | 0 | 2026-09-15 | employment-insurance-rate-2027-increase-plan |
| 18 | 생활비 증여세 | 10만~100만 | 0 | 2026-08-18 | parent-living-expense-allowance-gift-tax |
| 19 | 종소세 사후 적발 | <3만 | 0 | 2026-05-30 | comprehensive-income-tax-5-year-audit-risk |
| 19 | 근로계약서 갱신 | 100만+ | 0 | 2026-05-13 | labor-contract-1year-auto-vs-renewal |
| 21 | 근로장려금 압류 | 10만~100만 | 0 | 2026-08-18 | earned-income-credit-seizure-protection-account |
| 23 | SK하이닉스 성과급 | 10만~100만 | 8.5 | 2026-07-19 | hynix-bonus-tax-take-home-calculation |
| 26 | 종소세 환급 추적 | <3만 | 0 | 2026-06-01 | comprehensive-income-tax-refund-tracking-diagnosis |
| 28 | 야간 진료비 가산 | 10만~100만 | 0 | 2026-08-21 | night-holiday-medical-fee-surcharge-30-percent |
| 28 | 무순위 청약 자격 | 10만~100만 | 0 | 2026-08-01 | unranked-subscription-homeless-only-2026 |
| 28 | 연말정산 미리보기 | 10만~100만 | 65.6 | 2026-08-20 | yearend-tax-preview-service-guide |
