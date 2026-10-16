/**
 * 근로소득 간이세액표로 매월 원천징수하는 근로소득세·지방소득세 계산.
 *
 * 표: 소득세법 시행령 [별표 2] 근로소득 간이세액표(제189조제1항 관련), 2026. 2. 27. 개정(대통령령 제36129호),
 *     부칙 제15조에 따라 2026년 3월 1일 이후 원천징수하는 경우부터 적용.
 *     데이터는 src/data/income-tax-withholding-table.json (scripts/data/income-tax-table-from-pdf.mjs 로 원문 PDF 에서 옮김).
 *
 * 이 모듈은 표 데이터를 import 하지 않는다. 호출하는 쪽이 표를 넘긴다.
 * (계산기는 표를 동적 import 로 불러와 첫 화면 번들에 넣지 않는다.)
 */

export interface WithholdingTable {
  /** 행마다 [월급여액 이상(천원), 미만(천원), 공제대상가족 1명 세액, …, 11명 세액] (원, 원문의 "-" 는 0) */
  rows: number[][];
  /** 월급여액 10,000천원인 경우의 세액 (공제대상가족 1명 … 11명) */
  top: number[];
}

/** 표에 열이 있는 공제대상가족 수의 최댓값 */
export const TABLE_MAX_FAMILY = 11;
/** 표 첫 행의 월급여액 하한 (770천원) */
export const TABLE_MIN_SALARY = 770_000;
const TOP_SALARY = 10_000_000;

/**
 * 표 6호 끝의 10,000천원 초과 구간 계산식에서 "10,000천원인 경우의 해당 세액"에 더하는 금액.
 * 비율은 1만분율 정수(98% × 35% = 3430 등)로 들고 있어 소수 오차 없이 계산한다.
 * 반환값은 10원 미만 끝수를 버린 금액이다(국고금 관리법 제47조제1항).
 */
const OVER_TOP: ReadonlyArray<{ upTo: number; from: number; base: number; per10000: number }> = [
  // 10,000천원 초과 14,000천원 이하: (10,000천원 초과 금액 × 98% × 35%) + 25,000원
  { upTo: 14_000_000, from: 10_000_000, base: 25_000, per10000: 3430 },
  // 14,000천원 초과 28,000천원 이하: 1,397,000원 + (14,000천원 초과 금액 × 98% × 38%)
  { upTo: 28_000_000, from: 14_000_000, base: 1_397_000, per10000: 3724 },
  // 28,000천원 초과 30,000천원 이하: 6,610,600원 + (28,000천원 초과 금액 × 98% × 40%)
  { upTo: 30_000_000, from: 28_000_000, base: 6_610_600, per10000: 3920 },
  // 30,000천원 초과 45,000천원 이하: 7,394,600원 + (30,000천원 초과 금액 × 40%)
  { upTo: 45_000_000, from: 30_000_000, base: 7_394_600, per10000: 4000 },
  // 45,000천원 초과 87,000천원 이하: 13,394,600원 + (45,000천원 초과 금액 × 42%)
  { upTo: 87_000_000, from: 45_000_000, base: 13_394_600, per10000: 4200 },
  // 87,000천원 초과: 31,034,600원 + (87,000천원 초과 금액 × 45%)
  { upTo: Infinity, from: 87_000_000, base: 31_034_600, per10000: 4500 },
];

function overTopAddition(salaryWon: number): number {
  const bracket = OVER_TOP.find((b) => salaryWon <= b.upTo) ?? OVER_TOP[OVER_TOP.length - 1]!;
  const excess = salaryWon - bracket.from;
  // excess × per10000 / 10000 원을 10원 미만 버림 → floor(excess × per10000 / 100000) × 10
  return bracket.base + Math.floor((excess * bracket.per10000) / 100_000) * 10;
}

function findRow(table: WithholdingTable, salaryWon: number): number[] | undefined {
  let lo = 0;
  let hi = table.rows.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const row = table.rows[mid]!;
    if (salaryWon < row[0]! * 1000) hi = mid - 1;
    else if (salaryWon >= row[1]! * 1000) lo = mid + 1;
    else return row;
  }
  return undefined;
}

/** 공제대상가족 수 1~11명 열의 세액 */
function columnTax(table: WithholdingTable, salaryWon: number, family: number): number {
  if (salaryWon >= TOP_SALARY) {
    const topTax = table.top[family - 1]!;
    return salaryWon === TOP_SALARY ? topTax : topTax + overTopAddition(salaryWon);
  }
  // 월급여액 770천원 미만은 표에 행이 없다. 770천원~1,060천원 행이 모두 "-" 라서 0원으로 본다.
  const row = findRow(table, salaryWon);
  return row ? row[family + 1]! : 0;
}

/**
 * 표 비고 3: 공제대상가족 중 8세 이상 20세 이하 자녀 수별로 표의 세액에서 빼는 금액.
 * 1명 20,830원, 2명 45,830원, 3명 이상 45,830원 + 2명 초과 자녀 1명당 33,330원.
 */
export function childDeduction(children: number): number {
  const n = Math.max(0, Math.floor(children));
  if (n === 0) return 0;
  if (n === 1) return 20_830;
  return 45_830 + (n - 2) * 33_330;
}

/**
 * 간이세액표 해당란 세액(100% 기준, 소득세법 시행령 제194조제1항 본문).
 *
 * @param salaryWon 월급여액(원, 비과세 및 학자금 제외). 1원 미만은 버린다.
 * @param family 공제대상가족 수(본인 포함, 본인과 배우자도 각각 1명으로 셈: 표 비고 2). 1 미만은 1로 본다.
 * @param children 공제대상가족 중 8세 이상 20세 이하 자녀 수(표 비고 3). 본인을 뺀 가족 수를 넘지 못한다.
 *
 * - 공제대상가족 11명 초과: 11명 세액 − (10명 세액 − 11명 세액) × 11명을 초과하는 가족 수 (표 비고 4).
 *   원문 비고 4에는 결과가 0원 미만일 때의 규정이 없다. 이 함수는 0원 미만을 0원으로 돌려준다(원천징수액 표시용).
 * - 자녀 공제 후 금액이 음수면 0원 (표 비고 3 단서).
 */
export function withholdingIncomeTax(
  table: WithholdingTable,
  salaryWon: number,
  family: number,
  children = 0,
): number {
  const won = Number.isFinite(salaryWon) ? Math.max(0, Math.floor(salaryWon)) : 0;
  const fam = Number.isFinite(family) ? Math.max(1, Math.floor(family)) : 1;
  const kids = Number.isFinite(children) ? Math.min(Math.max(0, Math.floor(children)), fam - 1) : 0;

  let tax: number;
  if (fam <= TABLE_MAX_FAMILY) {
    tax = columnTax(table, won, fam);
  } else {
    const t11 = columnTax(table, won, 11);
    const t10 = columnTax(table, won, 10);
    tax = t11 - (t10 - t11) * (fam - TABLE_MAX_FAMILY);
  }
  return Math.max(0, tax - childDeduction(kids));
}

/**
 * 근로소득세와 함께 특별징수하는 지방소득세: 소득세의 100분의 10 (지방세법 제103조의13제1항).
 * 10원 미만은 버린다 (지방회계법 제55조: 10원 미만은 계산하지 아니할 수 있음).
 */
export function localIncomeTax(incomeTax: number): number {
  return Math.floor(Math.max(0, incomeTax) / 100) * 10;
}
