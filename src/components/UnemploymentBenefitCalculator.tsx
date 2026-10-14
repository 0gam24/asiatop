import { useMemo, useState } from 'react';

interface UnemploymentResult {
  averageDaily: number;
  dailyBenefit: number;
  totalDays: number;
  totalAmount: number;
  ageBracket: string;
  insuredYears: number;
}

// 2026년 1월 1일 이후 이직자 기준
// 하한: 최저임금 시간급 10,320원(2026년) × 1일 8시간 × 80% (고용보험법 제45조제4항·제46조)
const DAILY_MIN = 66048;
// 상한: 기초일액 상한 11만3,500원 × 60% (고용보험법 시행령 제68조제1항)
const DAILY_MAX = 68100;
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
          <p className="hint">이직 전 18개월 중 피보험 단위기간(보수를 받은 날) 180일 이상과 비자발적 이직 등 요건을 갖춰야 수급할 수 있습니다.</p>
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
          ※ 2026년 1월 1일 이후 이직자 기준 일 구직급여 상한 68,100원·하한 66,048원(1일 8시간 근무 가정) 적용. 실제 수급 자격은
          <strong> 비자발적 이직</strong>·<strong>이직 전 18개월 중 피보험 단위기간 180일 이상</strong>·
          <strong>적극적 구직활동</strong> 등 요건 충족 필수. 자세한 산정은
          <a href="https://www.work24.go.kr" rel="noopener" target="_blank"> 고용24</a>를 참고하세요.
        </p>
      </div>
    </div>
  );
}
