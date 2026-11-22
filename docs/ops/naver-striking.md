# 네이버 웹문서 4~30위 글 (2026-11-23)

`scripts/audit/site-rank-sample.mjs` 가 만든다(손으로 고치면 다음 실행에 덮인다). 계획 docs/28 §1-5.

- 글마다 대표 검색어(targetQuery, 없으면 keywords 첫 항목) 하나를 네이버 공식 웹문서 검색 API 30위까지 잰 값이다. 통합검색 첫 화면 순위와 다르다.
- /topics 리프레시 후보 입력이다. 본문을 실질적으로 고칠 때만 updatedAt 을 바꾼다(날짜만 바꾸기 금지).

## 지난 표본(2026-11-16) 대비 10위 안 들고 남

- 빠짐: 종합소득세 D-1 9 → 밖 (comprehensive-income-tax-d1-final-hour-checklist)
- 빠짐: 이중근로자 연말정산 10 → 밖 (dual-employment-year-end-tax-combined-filing)
- 빠짐: 2026 4대보험 요율 5 → 밖 (four-insurance-rate-2026-summary)
- 빠짐: 2027년 건강보험료율 8 → 밖 (health-insurance-rate-2027-frozen)
- 빠짐: 청약통장 비대면 해지 4 → 밖 (housing-subscription-online-termination)
- 빠짐: 상속주택 양도세 취득가액 8 → 밖 (inherited-house-capital-gains-acquisition-value)
- 빠짐: 전세 만기 전 이사 복비 1 → 밖 (jeonse-early-move-brokerage-fee)
- 빠짐: 한국형 레몬법 9 → 밖 (korean-lemon-law-new-car-exchange)
- 빠짐: 회식비 영수증 1 → 밖 (meal-expense-receipt-tax-treatment)

## 4~30위 중 검색량이 잡히는 글 1편 (리프레시 먼저)

- 검색량은 검색어 트렌드 최근 30일, 실업급여 30일 평균 = 100 눈금이다(0.5 이상만, 측정 2026-11-23). 순위와 검색량이 둘 다 측정된 글이라 이 목록부터 고친다.

| 검색량 | 순위 | 검색어 | 웹문서 결과 수 | 발행 | 글 |
|---|---|---|---|---|---|
| 87.8 | 26 | 연말정산 미리보기 | 10만~100만 | 2026-08-20 | yearend-tax-preview-service-guide |

## 4~30위 5편

| 순위 | 검색어 | 웹문서 결과 수 | 검색량 | 발행 | 글 |
|---|---|---|---|---|---|
| 8 | 초등 예체능 학원비 세액공제 | 3만~10만 | 0 | 2026-08-05 | elementary-arts-sports-academy-tax-credit-2026 |
| 16 | 근로장려금 압류 | 10만~100만 | 0 | 2026-08-18 | earned-income-credit-seizure-protection-account |
| 17 | 근로계약서 갱신 | 100만+ | 0 | 2026-05-13 | labor-contract-1year-auto-vs-renewal |
| 26 | 연말정산 미리보기 | 10만~100만 | 87.8 | 2026-08-20 | yearend-tax-preview-service-guide |
| 28 | 생활비 증여세 | 10만~100만 | 0 | 2026-08-18 | parent-living-expense-allowance-gift-tax |
