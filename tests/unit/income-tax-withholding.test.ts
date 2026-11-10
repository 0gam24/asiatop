/**
 * 근로소득 간이세액표(소득세법 시행령 [별표 2], 2026. 2. 27. 개정) 데이터·계산 테스트.
 *
 * "원문 대조 행"은 국가법령정보센터 별표 2 PDF(flSeq=169798151)를 렌더링한 화면에서 눈으로 읽은 값이다
 * (2026-10-14). 표 데이터(src/data/income-tax-withholding-table.json)를 손으로 고치거나 다시 뽑을 때
 * 원문과 어긋나면 여기서 걸린다.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import table from '../../src/data/income-tax-withholding-table.json';
import {
  childDeduction,
  localIncomeTax,
  withholdingIncomeTax,
  type WithholdingTable,
} from '../../src/lib/income-tax-withholding';
import SalaryCalculator, { SALARY_DEFAULTS, calc } from '../../src/components/SalaryCalculator';

const T: WithholdingTable = table;
const rowAt = (lo: number) => {
  const row = T.rows.find((r) => r[0] === lo);
  if (!row) throw new Error(`row ${lo} not found`);
  return row;
};

describe('간이세액표 데이터 구조', () => {
  it('원문 정보: 2026. 2. 27. 개정, 2026. 3. 1. 이후 원천징수분 적용', () => {
    expect(table.source.amended).toBe('2026-02-27');
    expect(table.source.appliesFrom).toBe('2026-03-01');
    expect(table.source.decree).toBe('대통령령 제36129호');
  });

  it('770천원~10,000천원 646행이 끊김 없이 이어지고 구간 폭이 5·10·20천원', () => {
    expect(T.rows).toHaveLength(646);
    expect(T.rows[0]!.slice(0, 2)).toEqual([770, 775]);
    expect(T.rows.at(-1)!.slice(0, 2)).toEqual([9980, 10000]);
    T.rows.forEach((r, i) => {
      expect(r).toHaveLength(13);
      const [lo, hi] = r as [number, number];
      expect(hi - lo).toBe(lo < 1500 ? 5 : lo < 3000 ? 10 : 20);
      if (i > 0) expect(lo).toBe(T.rows[i - 1]![1]);
    });
  });

  it('세액은 10원 단위, 월급여액이 오르면 줄지 않고 가족 수가 늘면 늘지 않는다', () => {
    T.rows.forEach((r, i) => {
      for (let c = 2; c < 13; c++) {
        expect(r[c]! % 10).toBe(0);
        if (c > 2) expect(r[c]!).toBeLessThanOrEqual(r[c - 1]!);
        if (i > 0) expect(r[c]!).toBeGreaterThanOrEqual(T.rows[i - 1]![c]!);
      }
    });
  });
});

describe('원문 PDF 대조 행 (공제대상가족 1~11명)', () => {
  // [이상, 미만, 1명 … 11명]  PDF 쪽수: 4·5·7·9·10·11·13·14·14·15·17·20·22·23·25·27
  const verified: number[][] = [
    [1060, 1065, 1040, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1200, 1205, 2990, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1500, 1510, 8920, 4420, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2000, 2010, 19520, 14750, 6600, 3220, 0, 0, 0, 0, 0, 0, 0],
    [2250, 2260, 27560, 20560, 11560, 8180, 4810, 1430, 0, 0, 0, 0, 0],
    [2500, 2510, 35600, 28600, 16530, 13150, 9780, 6400, 3030, 0, 0, 0, 0],
    [3000, 3020, 74350, 56850, 31940, 26690, 21440, 17100, 13730, 10350, 6980, 3600, 0],
    [3320, 3340, 105210, 84230, 48370, 37240, 31990, 26740, 21490, 17140, 13760, 10390, 7010],
    [3640, 3660, 144330, 119330, 73410, 60290, 47160, 36760, 31510, 26260, 21010, 16830, 13450],
    [4160, 4180, 217320, 189190, 129150, 110400, 92240, 79110, 65990, 52860, 39740, 33790, 28540],
    [5000, 5020, 335470, 306710, 237850, 219100, 200350, 181600, 162850, 144100, 125350, 106600, 87850],
    [6660, 6680, 655590, 607590, 485540, 464090, 445340, 426590, 407840, 389090, 370340, 351590, 332840],
    [7500, 7520, 846100, 797090, 662950, 632950, 602950, 572950, 542950, 512950, 482950, 462470, 443720],
    [8320, 8340, 1032080, 982080, 836130, 806130, 776130, 746130, 716130, 686130, 656130, 626130, 596130],
    [9220, 9240, 1244640, 1191580, 1032670, 1002670, 972670, 942670, 912670, 882670, 852670, 822670, 792670],
    [9980, 10000, 1503990, 1428170, 1198650, 1168650, 1138650, 1108650, 1078650, 1048650, 1018650, 988650, 958650],
  ];

  it.each(verified.map((r) => [r[0]!, r] as const))('%i천원 행', (lo, expected) => {
    expect(rowAt(lo)).toEqual(expected);
  });

  it('10,000천원 행', () => {
    expect(T.top).toEqual([
      1507400, 1431570, 1200840, 1170840, 1140840, 1110840, 1080840, 1050840, 1020840, 990840, 960840,
    ]);
  });
});

describe('withholdingIncomeTax: 표 조회', () => {
  it('연봉 4,000만원(월 3,333,333원)은 3,320~3,340천원 행', () => {
    const monthly = 40000000 / 12;
    expect(withholdingIncomeTax(T, monthly, 1)).toBe(105210);
    expect(withholdingIncomeTax(T, monthly, 2)).toBe(84230);
    expect(withholdingIncomeTax(T, monthly, 11)).toBe(7010);
  });

  it('행 경계는 이상·미만', () => {
    expect(withholdingIncomeTax(T, 3_320_000, 1)).toBe(105210);
    expect(withholdingIncomeTax(T, 3_319_999, 1)).toBe(rowAt(3300)[2]);
    expect(withholdingIncomeTax(T, 9_999_999, 1)).toBe(1503990);
  });

  it('770천원 미만·0원·숫자가 아닌 값은 0원', () => {
    expect(withholdingIncomeTax(T, 769_999, 1)).toBe(0);
    expect(withholdingIncomeTax(T, 0, 1)).toBe(0);
    expect(withholdingIncomeTax(T, Number.NaN, 1)).toBe(0);
  });

  it('공제대상가족 1명 미만은 1명으로 본다', () => {
    expect(withholdingIncomeTax(T, 3_333_333, 0)).toBe(105210);
  });
});

describe('withholdingIncomeTax: 10,000천원 이상', () => {
  it('정확히 10,000천원은 10,000천원 행', () => {
    expect(withholdingIncomeTax(T, 10_000_000, 1)).toBe(1507400);
    expect(withholdingIncomeTax(T, 10_000_000, 11)).toBe(960840);
  });

  it('10,000천원 초과 14,000천원 이하: + 초과분 × 98% × 35% + 25,000원 (10원 미만 버림)', () => {
    // 123원 × 0.343 = 42.189원 → 40원
    expect(withholdingIncomeTax(T, 10_000_123, 1)).toBe(1507400 + 25000 + 40);
    expect(withholdingIncomeTax(T, 12_500_000, 1)).toBe(1507400 + 857500 + 25000);
    expect(withholdingIncomeTax(T, 12_500_000, 3)).toBe(1200840 + 857500 + 25000);
    expect(withholdingIncomeTax(T, 14_000_000, 1)).toBe(1507400 + 1372000 + 25000);
  });

  it('14,000천원 초과 구간부터의 계산식', () => {
    expect(withholdingIncomeTax(T, 14_000_010, 1)).toBe(1507400 + 1397000); // 10원 × 0.3724 = 3.7원 → 0원
    expect(withholdingIncomeTax(T, 20_000_000, 1)).toBe(1507400 + 1397000 + 2234400);
    expect(withholdingIncomeTax(T, 29_000_000, 1)).toBe(1507400 + 6610600 + 392000);
    expect(withholdingIncomeTax(T, 40_000_000, 1)).toBe(1507400 + 7394600 + 4000000);
    expect(withholdingIncomeTax(T, 50_000_000, 1)).toBe(1507400 + 13394600 + 2100000);
    expect(withholdingIncomeTax(T, 100_000_000, 1)).toBe(1507400 + 31034600 + 5850000);
  });

  it('구간 경계에서 이어진다 (14,000·28,000·30,000·45,000·87,000천원)', () => {
    expect(withholdingIncomeTax(T, 28_000_000, 1)).toBe(1507400 + 6610600);
    expect(withholdingIncomeTax(T, 30_000_000, 1)).toBe(1507400 + 7394600);
    expect(withholdingIncomeTax(T, 45_000_000, 1)).toBe(1507400 + 13394600);
    expect(withholdingIncomeTax(T, 87_000_000, 1)).toBe(1507400 + 31034600);
  });
});

describe('비고 3: 8세 이상 20세 이하 자녀', () => {
  it('자녀 수별 공제액', () => {
    expect([0, 1, 2, 3, 4].map(childDeduction)).toEqual([0, 20830, 45830, 79160, 112490]);
  });

  it('표 세액에서 빼고, 음수면 0원', () => {
    const monthly = 40000000 / 12;
    expect(withholdingIncomeTax(T, monthly, 2, 1)).toBe(84230 - 20830);
    expect(withholdingIncomeTax(T, 5_000_000, 3, 2)).toBe(237850 - 45830);
    expect(withholdingIncomeTax(T, monthly, 4, 2)).toBe(0);
  });

  it('자녀 수는 본인을 뺀 공제대상가족 수를 넘지 못한다', () => {
    expect(withholdingIncomeTax(T, 3_333_333, 1, 1)).toBe(105210);
    expect(withholdingIncomeTax(T, 3_333_333, 2, 5)).toBe(84230 - 20830);
  });
});

describe('비고 4: 공제대상가족 11명 초과', () => {
  it('11명 세액 − (10명 세액 − 11명 세액) × 11명 초과 인원', () => {
    const monthly = 40000000 / 12; // 10명 10,390원, 11명 7,010원
    expect(withholdingIncomeTax(T, monthly, 12)).toBe(7010 - 3380);
    expect(withholdingIncomeTax(T, monthly, 13)).toBe(7010 - 3380 * 2);
    expect(withholdingIncomeTax(T, 10_000_000, 12)).toBe(960840 - 30000);
    expect(withholdingIncomeTax(T, 12_500_000, 12)).toBe(960840 + 857500 + 25000 - 30000);
  });

  it('계산값이 0원보다 작으면 0원 (원문에 규정 없음, 화면 표시용)', () => {
    expect(withholdingIncomeTax(T, 40000000 / 12, 14)).toBe(0);
  });
});

describe('localIncomeTax: 소득세의 10%, 10원 미만 버림', () => {
  it.each([
    [105210, 10520],
    [1040, 100],
    [2389900, 238990],
    [90, 0],
    [0, 0],
  ])('%i원 → %i원', (tax, local) => {
    expect(localIncomeTax(tax)).toBe(local);
  });
});

describe('calc: 월 실수령액', () => {
  it('연봉 4,000만원, 공제대상가족 1명', () => {
    const r = calc(40000000, withholdingIncomeTax(T, 40000000 / 12, 1, 0));
    expect(r).toEqual({
      monthlyGross: 3333333,
      nationalPension: 158318,
      healthInsurance: 119833,
      longTermCare: 15747,
      employmentInsurance: 30000,
      incomeTax: 105210,
      localTax: 10520,
      totalDeduction: 439628,
      netMonthly: 2893706,
      effectiveRate: expect.closeTo(0.1319, 4),
    });
    // 화면 항목 합계와 총 공제가 같다 (FAQ 의 4대보험 금액 = 총 공제 − 근로소득세 − 지방소득세)
    expect(r.nationalPension + r.healthInsurance + r.longTermCare + r.employmentInsurance).toBe(439628 - 105210 - 10520);
  });

  it('연봉 5,000만원 → 6,000만원: 월 세전 833,333원 증가, 실수령 622,363원 증가', () => {
    const r50 = calc(50000000, withholdingIncomeTax(T, 50000000 / 12, 1, 0));
    const r60 = calc(60000000, withholdingIncomeTax(T, 60000000 / 12, 1, 0));
    expect([r50.incomeTax, r50.localTax, r50.netMonthly]).toEqual([217320, 21730, 3522757]);
    expect([r60.incomeTax, r60.localTax, r60.netMonthly]).toEqual([335470, 33540, 4145120]);
    expect(r60.monthlyGross - r50.monthlyGross).toBe(833333);
    expect(r60.netMonthly! - r50.netMonthly!).toBe(622363);
  });

  it('간이세액표를 아직 못 불러왔으면 세금·실수령은 null', () => {
    const r = calc(40000000, null);
    expect([r.incomeTax, r.localTax, r.totalDeduction, r.netMonthly, r.effectiveRate]).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(r.nationalPension).toBe(158318);
  });
});

describe('SalaryCalculator 입력 변경 (happy-dom)', () => {
  const setValue = (input: HTMLInputElement, value: string) => {
    // React 가 추적하는 value 를 우회하려고 네이티브 setter 로 바꾼 뒤 input 이벤트를 보낸다
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('입력이 기본값과 달라지면 간이세액표를 동적 import 로 불러와 다시 계산한다', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(SalaryCalculator, { initialIncomeTax: 105210 }));
    });
    const family = container.querySelector<HTMLInputElement>('#family')!;
    const kids = container.querySelector<HTMLInputElement>('#children')!;

    await act(async () => setValue(family, '2'));
    await vi.waitFor(() => expect(container.textContent).toContain('84,230'));
    expect(container.textContent).toContain('8,420'); // 지방소득세

    await act(async () => setValue(kids, '1'));
    await vi.waitFor(() => expect(container.textContent).toContain('63,400')); // 84,230 − 20,830

    await act(async () => setValue(family, '12'));
    await vi.waitFor(() => expect(container.textContent).toContain('비고 4'));

    await act(async () => root.unmount());
    container.remove();
  });
});

describe('SalaryCalculator 첫 화면(SSR)', () => {
  it('표 없이 initialIncomeTax 로 기본 입력값 결과를 모두 그린다', () => {
    const initialIncomeTax = withholdingIncomeTax(
      T,
      SALARY_DEFAULTS.annualGross / 12,
      SALARY_DEFAULTS.family,
      SALARY_DEFAULTS.children,
    );
    const html = renderToString(createElement(SalaryCalculator, { initialIncomeTax }));
    expect(html).toContain('2,893,706');
    expect(html).toContain('105,210');
    expect(html).toContain('10,520');
    expect(html).toContain('439,628');
    expect(html).toContain('공제대상가족 수 (본인 포함)');
    expect(html).toContain('그중 8세 이상 20세 이하 자녀 수');
    expect(html).not.toContain('…');
  });
});
