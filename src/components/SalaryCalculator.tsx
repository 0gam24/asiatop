import { useMemo, useState } from 'react';

interface CalcResult {
  monthlyGross: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localTax: number;
  totalDeduction: number;
  netMonthly: number;
  effectiveRate: number;
}

// 2026년 근로자 부담 요율
// 국민연금 9.5%의 절반 (국민연금법 부칙 <법률 제20903호> 제4조제1항)
const NP_RATE = 0.0475;
// 국민연금 기준소득월액 상한 (2026.7.1.~2027.6.30., 국민연금공단 안내)
const NP_CEILING = 6590000;
// 건강보험 7.19%의 절반 (국민건강보험법 시행령 제44조제1항)
const HI_RATE = 0.03595;
// 장기요양보험료 = 건강보험료 × 장기요양보험료율 0.9448% ÷ 건강보험료율 7.19%
// (노인장기요양보험법 제9조제1항, 같은 법 시행령 제4조)
const LTC_OF_HI = 0.009448 / 0.0719;
// 고용보험 실업급여 1.8%의 절반 (고용산재보험료징수법 시행령 제12조제1항제2호)
const EI_RATE = 0.009;

function estimateIncomeTax(monthlyGross: number): number {
  const annual = monthlyGross * 12;
  const taxableSalary = Math.max(annual - 1500000, 0);
  let tax = 0;
  const brackets: Array<[number, number]> = [
    [14000000, 0.06],
    [50000000, 0.15],
    [88000000, 0.24],
    [150000000, 0.35],
    [300000000, 0.38],
    [500000000, 0.40],
    [1000000000, 0.42],
    [Infinity, 0.45],
  ];
  let prev = 0;
  for (const [limit, rate] of brackets) {
    if (taxableSalary > limit) {
      tax += (limit - prev) * rate;
      prev = limit;
    } else {
      tax += (taxableSalary - prev) * rate;
      break;
    }
  }
  return Math.round(tax / 12);
}

function calc(annualGross: number, dependents: number): CalcResult {
  const monthlyGross = annualGross / 12;
  const npBase = Math.floor(Math.min(monthlyGross, NP_CEILING) / 1000) * 1000;
  const np = npBase * NP_RATE;
  const hi = monthlyGross * HI_RATE;
  const ltc = hi * LTC_OF_HI;
  const ei = monthlyGross * EI_RATE;
  const incomeTaxBase = estimateIncomeTax(monthlyGross);
  const dependentRebate = dependents * 4000;
  const incomeTax = Math.max(incomeTaxBase - dependentRebate, 0);
  const localTax = incomeTax * 0.1;
  const total = np + hi + ltc + ei + incomeTax + localTax;
  const net = monthlyGross - total;
  return {
    monthlyGross: Math.round(monthlyGross),
    nationalPension: Math.round(np),
    healthInsurance: Math.round(hi),
    longTermCare: Math.round(ltc),
    employmentInsurance: Math.round(ei),
    incomeTax: Math.round(incomeTax),
    localTax: Math.round(localTax),
    totalDeduction: Math.round(total),
    netMonthly: Math.round(net),
    effectiveRate: total / monthlyGross,
  };
}

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function SalaryCalculator() {
  const [annualGross, setAnnualGross] = useState(40000000);
  const [dependents, setDependents] = useState(1);

  const result = useMemo(() => calc(annualGross, dependents), [annualGross, dependents]);

  const presets = [30000000, 40000000, 50000000, 60000000, 80000000];

  return (
    <div className="calc">
      <div className="calc-controls">
        <div className="field">
          <label htmlFor="gross">연봉 (세전, 원)</label>
          <input
            id="gross"
            type="number"
            value={annualGross}
            onChange={(e) => setAnnualGross(Math.max(0, Number(e.target.value) || 0))}
            step={1000000}
            min={0}
          />
          <div className="presets">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className={annualGross === p ? 'active' : ''}
                onClick={() => setAnnualGross(p)}
              >
                {fmt(p / 10000)}만원
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="dep">부양가족 수 (본인 포함)</label>
          <input
            id="dep"
            type="number"
            value={dependents}
            onChange={(e) => setDependents(Math.max(0, Number(e.target.value) || 0))}
            min={1}
            max={10}
          />
        </div>
      </div>

      <div className="result">
        <div className="result-headline">
          <p className="label">월 실수령액 (예상)</p>
          <p className="value">{fmt(result.netMonthly)}<span>원</span></p>
          <p className="sub">월 세전 {fmt(result.monthlyGross)}원 · 공제율 {fmtPct(result.effectiveRate)}</p>
        </div>

        <table className="breakdown">
          <thead>
            <tr><th>항목</th><th>금액 (원)</th></tr>
          </thead>
          <tbody>
            <tr><td>월 세전 급여</td><td>{fmt(result.monthlyGross)}</td></tr>
            <tr><td>국민연금 (4.75%)</td><td>−{fmt(result.nationalPension)}</td></tr>
            <tr><td>건강보험 (3.595%)</td><td>−{fmt(result.healthInsurance)}</td></tr>
            <tr><td>장기요양 (약 13.14%)</td><td>−{fmt(result.longTermCare)}</td></tr>
            <tr><td>고용보험 (0.9%)</td><td>−{fmt(result.employmentInsurance)}</td></tr>
            <tr><td>근로소득세 (간이)</td><td>−{fmt(result.incomeTax)}</td></tr>
            <tr><td>지방소득세 (10%)</td><td>−{fmt(result.localTax)}</td></tr>
            <tr className="total"><td>총 공제</td><td>−{fmt(result.totalDeduction)}</td></tr>
            <tr className="net"><td><strong>월 실수령</strong></td><td><strong>{fmt(result.netMonthly)}</strong></td></tr>
          </tbody>
        </table>

        <p className="note">
          ※ 본 계산기는 2026년 4대보험 요율과 근로소득세 간이 추정치·지방소득세로 산정한 <strong>참고용</strong>입니다.
          비과세 항목(식대 월 20만원, 자가운전보조금 등)·연말정산 결과·특수 공제는 미반영. 실제 실수령액은 회사 급여 명세서를 따르세요.
        </p>
      </div>
    </div>
  );
}
