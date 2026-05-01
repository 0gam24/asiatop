import { useMemo, useState } from 'react';

interface UnemploymentResult {
  averageDaily: number;
  dailyBenefit: number;
  totalDays: number;
  totalAmount: number;
  ageBracket: string;
  insuredYears: number;
}

const DAILY_MIN = 64192;
const DAILY_MAX = 66000;
const RATE = 0.6;

function calc(monthlyBeforeTax: number, ageYears: number, insuredMonths: number): UnemploymentResult {
  const insuredYears = insuredMonths / 12;
  const dailyAvg = (monthlyBeforeTax * 3) / 90;
  const rawDaily = dailyAvg * RATE;
  const dailyBenefit = Math.min(Math.max(rawDaily, DAILY_MIN), DAILY_MAX);

  let bracket: string;
  let totalDays: number;

  const yrs = insuredYears;
  if (ageYears < 50) {
    bracket = '50세 미만';
    if (yrs < 1) totalDays = 120;
    else if (yrs < 3) totalDays = 150;
    else if (yrs < 5) totalDays = 180;
    else if (yrs < 10) totalDays = 210;
    else totalDays = 240;
  } else {
    bracket = '50세 이상·장애인';
    if (yrs < 1) totalDays = 120;
    else if (yrs < 3) totalDays = 180;
    else if (yrs < 5) totalDays = 210;
    else if (yrs < 10) totalDays = 240;
    else totalDays = 270;
  }

  const totalAmount = dailyBenefit * totalDays;

  return {
    averageDaily: Math.round(dailyAvg),
    dailyBenefit: Math.round(dailyBenefit),
    totalDays,
    totalAmount: Math.round(totalAmount),
    ageBracket: bracket,
    insuredYears: Math.round(insuredYears * 10) / 10,
  };
}

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

export default function UnemploymentBenefitCalculator() {
  const [monthlyBeforeTax, setMonthlyBeforeTax] = useState(3000000);
  const [ageYears, setAgeYears] = useState(30);
  const [insuredMonths, setInsuredMonths] = useState(36);

  const result = useMemo(
    () => calc(monthlyBeforeTax, ageYears, insuredMonths),
    [monthlyBeforeTax, ageYears, insuredMonths],
  );

  return (
    <div className="calc">
      <div className="calc-controls">
        <div className="field">
          <label htmlFor="ub-salary">최근 3개월 평균 월급여 (세전, 원)</label>
          <input
            id="ub-salary"
            type="number"
            value={monthlyBeforeTax}
            onChange={(e) => setMonthlyBeforeTax(Math.max(0, Number(e.target.value) || 0))}
            step={100000}
            min={0}
          />
        </div>
        <div className="field">
          <label htmlFor="ub-age">현재 나이 (만)</label>
          <input
            id="ub-age"
            type="number"
            value={ageYears}
            onChange={(e) => setAgeYears(Math.max(15, Number(e.target.value) || 15))}
            step={1}
            min={15}
            max={70}
          />
        </div>
        <div className="field">
          <label htmlFor="ub-ins">고용보험 가입 개월</label>
          <input
            id="ub-ins"
            type="number"
            value={insuredMonths}
            onChange={(e) => setInsuredMonths(Math.max(0, Number(e.target.value) || 0))}
            step={1}
            min={0}
          />
          <p className="hint">최소 180일(약 6개월) 이상 가입 + 비자발적 이직 시 수급 가능.</p>
        </div>
      </div>

      <div className="result">
        <div className="result-headline">
          <p className="label">총 예상 실업급여</p>
          <p className="value">
            {fmt(result.totalAmount)}
            <span>원</span>
          </p>
          <p className="sub">
            일 {fmt(result.dailyBenefit)}원 × {result.totalDays}일 ({result.ageBracket}, 가입 {result.insuredYears}년)
          </p>
        </div>

        <table className="breakdown">
          <thead>
            <tr><th>항목</th><th>값</th></tr>
          </thead>
          <tbody>
            <tr><td>1일 평균임금 (직전 3개월)</td><td>{fmt(result.averageDaily)}원</td></tr>
            <tr><td>일 구직급여 (60% × 상하한 적용)</td><td>{fmt(result.dailyBenefit)}원</td></tr>
            <tr><td>지급 일수 (소정급여일수)</td><td>{result.totalDays}일</td></tr>
            <tr className="total"><td>지급 기준 연령</td><td>{result.ageBracket}</td></tr>
            <tr className="net"><td><strong>총 예상 수령액</strong></td><td><strong>{fmt(result.totalAmount)}원</strong></td></tr>
          </tbody>
        </table>

        <p className="note">
          ※ 2026년 기준 일 구직급여 상한 66,000원·하한 64,192원(최저시급 80% 적용) 가정. 실제 수급 자격은
          <strong> 비자발적 이직</strong>·<strong>이직 전 18개월 중 180일 이상 피보험 가입</strong>·
          <strong>적극적 구직활동</strong> 등 요건 충족 필수. 자세한 산정은
          <a href="https://www.ei.go.kr" rel="noopener" target="_blank"> 고용보험 홈페이지</a>를 참고하세요.
        </p>
      </div>
    </div>
  );
}
