import { useMemo, useState } from 'react';

interface SeveranceResult {
  averageDaily: number;
  averageMonthly: number;
  yearsOfService: number;
  baseSeverance: number;
  totalSeverance: number;
  estimatedTax: number;
  netSeverance: number;
}

function calc(monthlySalary: number, monthlyBonus: number, monthsServed: number): SeveranceResult {
  const totalAnnualPay = monthlySalary * 12 + monthlyBonus * 12;
  const recent3MonthsPay = monthlySalary * 3 + monthlyBonus * 3;
  const days3M = 90;
  const averageDaily = recent3MonthsPay / days3M;
  const averageMonthly = averageDaily * 30;
  const yearsOfService = monthsServed / 12;
  const baseSeverance = averageMonthly * yearsOfService;
  const taxRate = totalAnnualPay > 50000000 ? 0.08 : 0.04;
  const estimatedTax = baseSeverance * taxRate;
  const netSeverance = baseSeverance - estimatedTax;
  return {
    averageDaily: Math.round(averageDaily),
    averageMonthly: Math.round(averageMonthly),
    yearsOfService: Math.round(yearsOfService * 10) / 10,
    baseSeverance: Math.round(baseSeverance),
    totalSeverance: Math.round(baseSeverance),
    estimatedTax: Math.round(estimatedTax),
    netSeverance: Math.round(netSeverance),
  };
}

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

export default function SeverancePayCalculator() {
  const [monthlySalary, setMonthlySalary] = useState(3500000);
  const [monthlyBonus, setMonthlyBonus] = useState(0);
  const [monthsServed, setMonthsServed] = useState(36);

  const result = useMemo(
    () => calc(monthlySalary, monthlyBonus, monthsServed),
    [monthlySalary, monthlyBonus, monthsServed],
  );

  return (
    <div className="calc">
      <div className="calc-controls">
        <div className="field">
          <label htmlFor="ms">최근 3개월 평균 월급여 (원)</label>
          <input
            id="ms"
            type="number"
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(Math.max(0, Number(e.target.value) || 0))}
            step={100000}
            min={0}
          />
        </div>
        <div className="field">
          <label htmlFor="mb">월 평균 상여·수당 (원)</label>
          <input
            id="mb"
            type="number"
            value={monthlyBonus}
            onChange={(e) => setMonthlyBonus(Math.max(0, Number(e.target.value) || 0))}
            step={50000}
            min={0}
          />
        </div>
        <div className="field">
          <label htmlFor="mn">총 근속 개월</label>
          <input
            id="mn"
            type="number"
            value={monthsServed}
            onChange={(e) => setMonthsServed(Math.max(12, Number(e.target.value) || 12))}
            step={1}
            min={12}
          />
          <p className="hint">최소 12개월 이상 근속 시 퇴직금 발생.</p>
        </div>
      </div>

      <div className="result">
        <div className="result-headline">
          <p className="label">예상 퇴직금 (세전)</p>
          <p className="value">
            {fmt(result.totalSeverance)}
            <span>원</span>
          </p>
          <p className="sub">
            평균임금 {fmt(result.averageMonthly)}원/월 · 근속 {result.yearsOfService}년
          </p>
        </div>

        <table className="breakdown">
          <thead>
            <tr><th>항목</th><th>금액</th></tr>
          </thead>
          <tbody>
            <tr><td>1일 평균임금</td><td>{fmt(result.averageDaily)}원</td></tr>
            <tr><td>월 평균임금</td><td>{fmt(result.averageMonthly)}원</td></tr>
            <tr><td>근속 연수</td><td>{result.yearsOfService}년</td></tr>
            <tr className="total"><td>퇴직금 (세전)</td><td>{fmt(result.totalSeverance)}원</td></tr>
            <tr><td>예상 퇴직소득세 (간이)</td><td>−{fmt(result.estimatedTax)}원</td></tr>
            <tr className="net"><td><strong>예상 실수령</strong></td><td><strong>{fmt(result.netSeverance)}원</strong></td></tr>
          </tbody>
        </table>

        <p className="note">
          ※ 본 계산은 근로기준법상 법정 퇴직금(평균임금 × 30일 × 근속연수)을 적용한 <strong>참고용</strong>입니다.
          IRP·DC형 퇴직연금 가입 사업장은 별도 규정을 따르며, 퇴직소득세는 근속연수공제·환산급여공제를 거치므로 실제와 차이날 수 있습니다.
        </p>
      </div>
    </div>
  );
}
