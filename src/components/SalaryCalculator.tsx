import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TABLE_MAX_FAMILY,
  TABLE_MIN_SALARY,
  localIncomeTax,
  withholdingIncomeTax,
  type WithholdingTable,
} from '../lib/income-tax-withholding';

interface CalcResult {
  monthlyGross: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  /** 간이세액표를 아직 불러오지 못했으면 null */
  incomeTax: number | null;
  localTax: number | null;
  totalDeduction: number | null;
  netMonthly: number | null;
  effectiveRate: number | null;
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

/** 첫 화면 입력값. 페이지(salary.astro)가 이 값의 근로소득세를 빌드할 때 계산해 initialIncomeTax 로 넘긴다. */
export const SALARY_DEFAULTS = { annualGross: 40000000, family: 1, children: 0 } as const;
const FAMILY_INPUT_MAX = 20;

/**
 * 월 실수령액 계산. 근로소득세(incomeTax)는 간이세액표로 따로 구해 넘긴다(null 이면 세금·실수령은 null).
 * 월급여액은 연봉 ÷ 12 이고 비과세 급여는 0원으로 본다.
 */
export function calc(annualGross: number, incomeTax: number | null): CalcResult {
  const monthlyGross = annualGross / 12;
  const npBase = Math.floor(Math.min(monthlyGross, NP_CEILING) / 1000) * 1000;
  const np = npBase * NP_RATE;
  const hi = monthlyGross * HI_RATE;
  const ltc = hi * LTC_OF_HI;
  const ei = monthlyGross * EI_RATE;
  const localTax = incomeTax === null ? null : localIncomeTax(incomeTax);
  const total = incomeTax === null || localTax === null ? null : np + hi + ltc + ei + incomeTax + localTax;
  return {
    monthlyGross: Math.round(monthlyGross),
    nationalPension: Math.round(np),
    healthInsurance: Math.round(hi),
    longTermCare: Math.round(ltc),
    employmentInsurance: Math.round(ei),
    incomeTax,
    localTax,
    totalDeduction: total === null ? null : Math.round(total),
    netMonthly: total === null ? null : Math.round(monthlyGross - total),
    effectiveRate: total === null ? null : monthlyGross > 0 ? total / monthlyGross : 0,
  };
}

// 간이세액표(646행, 약 44KB)는 계산에 필요할 때 동적 import 로 불러온다. 첫 화면 번들에 넣지 않기 위함.
// 첫 화면(기본 입력값)의 근로소득세는 페이지가 빌드할 때 계산해 initialIncomeTax 로 넘긴다.
let tablePromise: Promise<WithholdingTable> | null = null;
function loadTable(): Promise<WithholdingTable> {
  tablePromise ??= import('../data/income-tax-withholding-table.json').then(
    (m) => m.default as WithholdingTable,
    (err: unknown) => {
      tablePromise = null;
      throw err;
    },
  );
  return tablePromise;
}

const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const show = (n: number | null) => (n === null ? '…' : fmt(n));

interface Props {
  /** SALARY_DEFAULTS 입력의 근로소득세(간이세액표 100%). 표를 불러오기 전 첫 화면에 쓴다. */
  initialIncomeTax: number;
}

export default function SalaryCalculator({ initialIncomeTax }: Props) {
  const [annualGross, setAnnualGross] = useState<number>(SALARY_DEFAULTS.annualGross);
  const [family, setFamily] = useState<number>(SALARY_DEFAULTS.family);
  const [children, setChildren] = useState<number>(SALARY_DEFAULTS.children);
  const [table, setTable] = useState<WithholdingTable | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const isDefault =
    annualGross === SALARY_DEFAULTS.annualGross &&
    family === SALARY_DEFAULTS.family &&
    children === SALARY_DEFAULTS.children;

  const requestTable = useCallback(() => {
    loadTable().then(
      (t) => {
        setTable(t);
        setLoadFailed(false);
      },
      () => setLoadFailed(true),
    );
  }, []);

  useEffect(() => {
    if (!isDefault && !table) requestTable();
  }, [isDefault, table, requestTable]);

  const incomeTax = table
    ? withholdingIncomeTax(table, annualGross / 12, family, children)
    : isDefault
      ? initialIncomeTax
      : null;
  const result = useMemo(() => calc(annualGross, incomeTax), [annualGross, incomeTax]);
  const monthly = annualGross / 12;

  const presets = [30000000, 40000000, 50000000, 60000000, 80000000];

  const onFamily = (raw: string) => {
    const v = Math.min(FAMILY_INPUT_MAX, Math.max(1, Math.floor(Number(raw)) || 1));
    setFamily(v);
    setChildren((c) => Math.min(c, v - 1));
  };
  const onChildren = (raw: string) => {
    setChildren(Math.min(family - 1, Math.max(0, Math.floor(Number(raw)) || 0)));
  };

  return (
    <div className="calc">
      {/* 입력칸에 손이 가면 표를 미리 불러와 값이 바뀌는 순간의 빈 칸(…)을 줄인다 */}
      <div
        className="calc-controls"
        onFocus={() => !table && requestTable()}
        onPointerDown={() => !table && requestTable()}
      >
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
        <div className="field-group">
          <div className="field">
            <label htmlFor="family">공제대상가족 수 (본인 포함)</label>
            <input
              id="family"
              type="number"
              value={family}
              onChange={(e) => onFamily(e.target.value)}
              min={1}
              max={FAMILY_INPUT_MAX}
              aria-describedby="family-hint"
            />
            <p className="hint" id="family-hint">본인과 배우자도 각각 1명으로 셉니다.</p>
          </div>
          <div className="field">
            <label htmlFor="children">그중 8세 이상 20세 이하 자녀 수</label>
            <input
              id="children"
              type="number"
              value={children}
              onChange={(e) => onChildren(e.target.value)}
              min={0}
              max={family - 1}
              aria-describedby="children-hint"
            />
            <p className="hint" id="children-hint">본인을 뺀 공제대상가족 수까지 넣을 수 있습니다.</p>
          </div>
        </div>
      </div>

      <div className="result" aria-busy={result.incomeTax === null && !loadFailed}>
        <div className="result-headline">
          <p className="label">월 실수령액 (예상)</p>
          <p className="value">{show(result.netMonthly)}<span>원</span></p>
          <p className="sub">
            월 세전 {fmt(result.monthlyGross)}원 · 공제율 {result.effectiveRate === null ? '…' : fmtPct(result.effectiveRate)}
          </p>
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
            <tr><td>근로소득세 (간이세액표)</td><td>−{show(result.incomeTax)}</td></tr>
            <tr><td>지방소득세 (소득세의 10%)</td><td>−{show(result.localTax)}</td></tr>
            <tr className="total"><td>총 공제</td><td>−{show(result.totalDeduction)}</td></tr>
            <tr className="net"><td><strong>월 실수령</strong></td><td><strong>{show(result.netMonthly)}</strong></td></tr>
          </tbody>
        </table>

        {loadFailed && result.incomeTax === null && (
          <p className="note" role="alert">간이세액표를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p>
        )}
        {family > TABLE_MAX_FAMILY && (
          <p className="note">
            공제대상가족 12명 이상은 간이세액표 비고 4의 계산식(11명 세액에서 10명·11명 세액 차이 × 11명을 넘는 인원을 뺌)으로
            계산합니다. 원문에 결과가 0원보다 작은 경우의 규정은 없어, 이때는 0원으로 표시합니다.
          </p>
        )}
        {monthly > 0 && monthly < TABLE_MIN_SALARY && (
          <p className="note">월급여액 77만 원 미만은 간이세액표에 구간이 없어 근로소득세를 0원으로 표시합니다(표의 77만~106만 원 구간이 모두 0원).</p>
        )}
        <p className="note">
          ※ <strong>참고용</strong>입니다. 근로소득세는 근로소득 간이세액표(소득세법 시행령 별표 2, 2026년 3월 1일 이후 원천징수분)의
          100% 세액이고, 지방소득세는 그 10%(10원 미만 버림)입니다. 월급여액은 연봉 ÷ 12로 보며 비과세 급여(식대 등)는 반영 안 함.
          근로자가 고르는 80%·120% 원천징수와 연말정산 결과도 반영 안 함. 실제 실수령액은 회사 급여명세서를 따르세요.
        </p>
      </div>
    </div>
  );
}
