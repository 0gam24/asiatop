import { useMemo, useState } from 'react';

interface LeaveResult {
  yearsOfService: number;
  baseDays: number;
  bonusDays: number;
  totalDays: number;
  monthlyAccruedDays: number;
  cashValue: number;
}

function calc(monthsServed: number, monthlySalary: number, weeklyHours: number): LeaveResult {
  const yearsOfService = monthsServed / 12;
  let totalDays = 0;
  if (monthsServed < 12) {
    totalDays = Math.min(11, monthsServed);
  } else {
    let baseDays = 15;
    const bonusYears = Math.floor((yearsOfService - 1) / 2);
    const bonus = Math.min(bonusYears, 10);
    baseDays += bonus;
    totalDays = baseDays;
  }
  const baseDays = monthsServed >= 12 ? 15 : 0;
  const bonusDays = totalDays - baseDays;
  const monthlyAccruedDays = monthsServed < 12 ? Math.min(monthsServed, 11) : 0;
  const dailyWage = (monthlySalary / (weeklyHours * 4.345)) * 8;
  const cashValue = totalDays * dailyWage;
  return {
    yearsOfService: Math.round(yearsOfService * 10) / 10,
    baseDays,
    bonusDays,
    totalDays,
    monthlyAccruedDays,
    cashValue: Math.round(cashValue),
  };
}

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

export default function AnnualLeaveCalculator() {
  const [monthsServed, setMonthsServed] = useState(36);
  const [monthlySalary, setMonthlySalary] = useState(3500000);
  const [weeklyHours] = useState(40);

  const result = useMemo(() => calc(monthsServed, monthlySalary, weeklyHours), [monthsServed, monthlySalary, weeklyHours]);

  return (
    <div className="calc">
      <div className="calc-controls">
        <div className="field">
          <label htmlFor="al-months">총 근속 개월</label>
          <input
            id="al-months"
            type="number"
            value={monthsServed}
            onChange={(e) => setMonthsServed(Math.max(0, Number(e.target.value) || 0))}
            step={1}
            min={0}
          />
        </div>
        <div className="field">
          <label htmlFor="al-salary">월 통상임금 (원)</label>
          <input
            id="al-salary"
            type="number"
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(Math.max(0, Number(e.target.value) || 0))}
            step={100000}
            min={0}
          />
          <p className="hint">기본급 + 고정수당 합계. 변동 상여 제외.</p>
        </div>
      </div>

      <div className="result">
        <div className="result-headline">
          <p className="label">발생 연차</p>
          <p className="value">
            {result.totalDays}
            <span>일</span>
          </p>
          <p className="sub">
            {monthsServed < 12
              ? `1년 미만 — 월 1일씩, 현재 ${result.monthlyAccruedDays}일 발생`
              : `근속 ${result.yearsOfService}년 — 기본 ${result.baseDays}일 + 가산 ${result.bonusDays}일`}
          </p>
        </div>

        <table className="breakdown">
          <thead>
            <tr><th>항목</th><th>값</th></tr>
          </thead>
          <tbody>
            <tr><td>근속 연수</td><td>{result.yearsOfService}년</td></tr>
            <tr><td>기본 연차</td><td>{result.baseDays}일</td></tr>
            <tr><td>가산 연차 (3년부터 2년마다 +1일, 최대 +10일)</td><td>+{result.bonusDays}일</td></tr>
            <tr className="total"><td>총 발생 연차</td><td>{result.totalDays}일</td></tr>
            <tr className="net"><td><strong>미사용 시 수당 (예상)</strong></td><td><strong>{fmt(result.cashValue)}원</strong></td></tr>
          </tbody>
        </table>

        <p className="note">
          ※ 근로기준법 제60조 기준. 1년 미만 근로자는 월 만근 시 1일씩 최대 11일이 발생합니다.
          1년 이상 근로자는 기본 15일 + 3년차부터 2년마다 1일씩 가산되어 최대 25일까지 발생합니다.
          미사용 연차수당은 통상임금 기준 1일분 × 잔여 일수로 계산되며, 회사 단체협약·취업규칙에 따라 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
}
