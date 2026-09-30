/**
 * naver-pipeline 단위 테스트 — 접미어 채굴·점수·큐 병합 (docs/ops/KEYWORD-PLAN-2026-09-15.md §6-2~6-4)
 * 점수식은 2026-09-17 수동 v0.1 대기열 9건(docs/ops/pipeline-queue.json)과 같은 값이 나와야 한다.
 */
import { describe, it, expect } from 'vitest';
import {
  suffixesOf, mineSuffixes, foldNearDuplicates, roundRobin, kinExactCount,
  exposureOf, autoPickOf, mergeQueue, renderReport, headsOf, templateSuffixes,
  isSisterTopic, regionOf, sisterTopOf, SISTER_README,
} from '../../scripts/audit/naver-pipeline.mjs';

describe('suffixesOf', () => {
  it('헤드 바로 뒤 낱말과 두 낱말을 뽑는다', () => {
    expect(suffixesOf('확정일자', '확정일자 부여현황 열람 방법')).toEqual(['확정일자 부여현황'.split(' ')[1], '부여현황 열람']);
  });
  it('헤드에 붙은 조사는 건너뛴다', () => {
    expect(suffixesOf('전입신고', '전입신고를 필요서류 없이')).toEqual(['필요서류', '필요서류 없이']);
  });
  it('질문 말투·동사형·숫자는 버린다', () => {
    expect(suffixesOf('실업급여', '실업급여 질문 드립니다')).toEqual([]);
    expect(suffixesOf('실업급여', '실업급여 받으려면 어떻게')).toEqual([]);
    expect(suffixesOf('최저임금', '최저임금 2027 인상')).toEqual([]);
  });
  it('낱말 끝 조사를 떼고, 숫자로 시작하는 말은 버린다', () => {
    expect(suffixesOf('권고사직', '권고사직 경영악화로 퇴사')[0]).toBe('경영악화');
    expect(suffixesOf('ISA 만기', 'ISA 만기 10년이상 설정')).toEqual([]);
    expect(suffixesOf('구직급여', '구직급여 계산은 어떻게')[0]).toBe('계산');
    expect(suffixesOf('ISA 만기', 'ISA 만기 질문드립니다 세법')).toEqual([]);
    expect(suffixesOf('연차수당', '연차수당 받을 수 있나요')).toEqual([]);
    expect(suffixesOf('청년도약계좌 해지', '청년도약계좌 해지 안함')).toEqual([]);
  });
  it('헤드 안 띄어쓰기는 무시한다', () => {
    expect(suffixesOf('청약통장 해지', '청약통장해지 불이익 있나요')[0]).toBe('불이익');
  });
});

describe('mineSuffixes', () => {
  it('블로그·지식iN 합산 3회 이상만 남기고 빈도순으로', () => {
    const blog = ['확정일자 부여현황 떼는 법', '확정일자 부여현황 확인', '확정일자 받는법'];
    const kin = ['확정일자 부여현황 어디서', '확정일자 효력 언제부터'];
    const r = mineSuffixes('확정일자', { blogTitles: blog, kinTitles: kin });
    expect(r.map((x) => x.suffix)).toEqual(['부여현황']);
    expect(r[0]).toMatchObject({ blogFreq: 2, kinFreq: 1, freq: 3 });
  });
});

describe('foldNearDuplicates · roundRobin', () => {
  it('"조건"·"가입조건" 은 한 항목으로 합친다', () => {
    const r = foldNearDuplicates([
      { head: '청년도약계좌', suffix: '조건', query: '청년도약계좌 조건', freq: 9 },
      { head: '청년도약계좌', suffix: '가입조건', query: '청년도약계좌 가입조건', freq: 5 },
      { head: '청년도약계좌', suffix: '해지', query: '청년도약계좌 해지', freq: 4 },
    ]);
    expect(r.map((x) => x.query)).toEqual(['청년도약계좌 조건', '청년도약계좌 해지']);
    expect(r[0].altQueries).toEqual(['청년도약계좌 가입조건']);
  });
  it('헤드별로 하나씩 돌아가며 뽑는다', () => {
    expect(roundRobin([['a1', 'a2', 'a3'], ['b1'], ['c1', 'c2']], 5)).toEqual(['a1', 'b1', 'c1', 'a2', 'c2']);
  });
});

describe('kinExactCount', () => {
  it('쿼리의 모든 낱말을 담은 제목만 센다(띄어쓰기 무시)', () => {
    expect(kinExactCount('청약통장 비대면 해지', ['청약통장 비대면해지 되나요', '청약통장 해지', '<b>청약통장</b> 해지 비대면으로'])).toBe(2);
  });
});

describe('big-keywords 입력', () => {
  const big = { axes: [{ id: 'A4', clusters: ['realestate'], keywords: [{ keyword: '확정일자', aliases: ['전입신고'] }] }], intentTemplates: { calc: ['얼마', '월급 {n}만원'] } };
  it('키워드와 aliases 가 모두 헤드', () => {
    expect(headsOf(big)).toEqual([{ head: '확정일자', axis: 'A4', cluster: 'realestate' }, { head: '전입신고', axis: 'A4', cluster: 'realestate' }]);
  });
  it('{n} 템플릿은 뺀다', () => { expect(templateSuffixes(big)).toEqual(['얼마']); });
});

// 2026-09-17 수동 v0.1 실측값 → 기대 점수
const V01 = [
  ['확정일자 부여현황', 75, { openSlots: 3, wallTop5: 1, newsWall: 1, fincoAbove: 0 }, { kinExact: 62 }, 0],
  ['청년도약계좌 조건', 70, { openSlots: 4, wallTop5: 2, newsWall: 14, fincoAbove: 3 }, { kinExact: 100 }, 0],
  ['청약통장 비대면 해지', 70, { openSlots: 6, wallTop5: 0, newsWall: 0, fincoAbove: 4 }, { kinExact: 14 }, 0],
  ['연말정산 서류', 70, { openSlots: 7, wallTop5: 2, newsWall: 3, fincoAbove: 0 }, { kinExact: 8 }, 0],
  ['실손보험 청구 서류', 65, { openSlots: 2, wallTop5: 3, newsWall: 15, fincoAbove: 2 }, { kinExact: 22 }, 0],
  ['민생지원금 신청방법', 65, { openSlots: 2, wallTop5: 3, newsWall: 14, fincoAbove: 1 }, { kinExact: 68 }, 0],
  ['버팀목전세자금대출 연장', 55, { openSlots: 1, wallTop5: 2, newsWall: 1, fincoAbove: 4 }, { kinExact: 30 }, 0],
  ['전입신고 필요서류', 55, { openSlots: 2, wallTop5: 3, newsWall: 9, fincoAbove: 0 }, { kinExact: 0 }, 0],
  ['청약통장 종류', 45, { openSlots: 2, wallTop5: 2, newsWall: 4, fincoAbove: 5 }, { kinExact: 54 }, 1],
];

describe('exposureOf', () => {
  it.each(V01)('%s = %i점 (v0.1 과 같다)', (_q, want, serp, demand, adjacent) => {
    const r = exposureOf({ track: 'T2', serp: { rank: null, verdictT1: 'open', verdictT2: 'open', ...serp }, demand, ledger: { adjacent } });
    expect(r.score).toBe(want);
    expect(r.open).toBe(true);
  });
  it('자사 1~3위는 0점, 갱신으로', () => {
    expect(exposureOf({ serp: { rank: 2, verdictT2: 'closed' } })).toMatchObject({ score: 0, label: '갱신', open: false });
  });
  it('실유입과 지식iN 은 큰 쪽 한 번만 더한다', () => {
    const base = { track: 'T2', serp: { verdictT2: 'open', openSlots: 0, wallTop5: 5 } };
    expect(exposureOf({ ...base, demand: { kinExact: 50, inbound7d: 200 } }).score).toBe(50);
  });
  it('T1·NEW 는 verdictT1 을 본다', () => {
    expect(exposureOf({ track: 'NEW', serp: { verdictT1: 'open', verdictT2: 'closed' }, unverified: true }).open).toBe(true);
  });
  it('라벨 경계: 70 높음 · 45 중간', () => {
    expect(exposureOf({ track: 'T2', serp: { verdictT2: 'open', openSlots: 4, wallTop5: 1, newsWall: 3 } }).label).toBe('높음');
    expect(exposureOf({ track: 'T2', serp: { verdictT2: 'open', openSlots: 1, wallTop5: 3 } }).label).toBe('중간');
  });
});

describe('autoPickOf', () => {
  const ok = { score: 60, track: 'T2', query: '연말정산 서류', unverified: false, ledgerVerdict: 'PASS' };
  it('55점 이상·PASS 면 자동', () => { expect(autoPickOf(ok)).toBe(true); expect(autoPickOf({ ...ok, score: 50 })).toBe(false); });
  it('지원금 류·뉴스 신생어·FIX 는 운영자 지정', () => {
    expect(autoPickOf({ ...ok, query: '민생지원금 신청방법' })).toBe(false);
    expect(autoPickOf({ ...ok, track: 'NEW', unverified: true })).toBe(false);
    expect(autoPickOf({ ...ok, ledgerVerdict: 'FIX' })).toBe(false);
  });
  it('수요 신호가 하나도 없으면 운영자 지정', () => {
    expect(autoPickOf({ ...ok, demand: { kinExact: 0, blogFreq: 0, rel30: 0 } })).toBe(false);
    expect(autoPickOf({ ...ok, demand: { kinExact: 0, rel30: 14.8 } })).toBe(true);
  });
  it('민간 대출은 운영자 지정, 정책 대출은 자동', () => {
    expect(autoPickOf({ ...ok, query: '퇴직금 담보대출' })).toBe(false);
    expect(autoPickOf({ ...ok, query: '버팀목전세자금대출 연장' })).toBe(true);
  });
});

const scout = (over = {}) => ({ rank: null, openSlots: 4, wallTop5: 1, mainGovAbove: 1, publicAbove: 0, toolAbove: 0, fincoAbove: 0, naverAbove: 0, newsWall: 2, verdictT1: 'open', verdictT2: 'open', reason: [], warn: [], above: [{ kind: 'ugc', host: 'blog.naver.com' }], ...over });
const ledger = (over = {}) => ({ verdict: 'PASS', program: '확정일자', adjacent: 0, sameProgram: 2, relatedSlugs: ['a'], ...over });
const meas = (query, over = {}) => ({ query, track: 'T2', cluster: 'realestate', altQueries: [], scout: scout(over.scout), ledger: ledger(over.ledger), demand: { kinExact: 30, ...(over.demand || {}) }, ...over.top });

describe('mergeQueue', () => {
  const today = '2026-09-18';
  it('열린 새 후보를 proposed 로 올린다', () => {
    const { queue, log } = mergeQueue({ items: [] }, [meas('확정일자 효력')], { today });
    expect(log.added).toEqual(['확정일자 효력']);
    expect(queue.items[0]).toMatchObject({ id: 'gap:2026-09-18:확정일자-효력', status: 'proposed', autoPick: true, score: 80, measuredAt: today, family: 'A' });
    expect(queue.items[0].serp.top10).toEqual(['ugc:blog.naver.com']);
    expect(queue.items[0].condition).toContain('기존 확정일자 글 2편');
  });
  it('닫힘·VETO·낮은 점수·자사 순위 있는 쿼리는 올리지 않는다', () => {
    const { queue, log } = mergeQueue({ items: [] }, [
      meas('a b', { scout: { verdictT2: 'closed', reason: ['도구 3'] } }),
      meas('c d', { ledger: { verdict: 'VETO' } }),
      meas('e f', { scout: { openSlots: 0, wallTop5: 3, newsWall: 20, verdictT2: 'open' }, demand: { kinExact: 0 } }),
      meas('g h', { scout: { rank: 7, ourUrl: 'https://asiatop.co.kr/x/' } }),
    ], { today });
    expect(queue.items).toEqual([]);
    expect(log.refresh.map((r) => r.query)).toEqual(['g h']);
  });
  it('proposed 가 재측정에서 닫히면 먼저 hold, 다음에도 닫혀 있으면 rejected, 다시 열리면 proposed', () => {
    const items = [{ id: 'a', query: 'x y', track: 'T2', status: 'proposed', autoPick: true, measuredAt: '2026-09-17' }];
    const closed = { scout: { verdictT2: 'closed', reason: ['7일 기사 16'] } };
    const first = mergeQueue({ items }, [meas('x y', closed)], { today }).queue;
    expect(first.items[0]).toMatchObject({ status: 'hold', holdBy: 'pipeline' });
    const second = mergeQueue(first, [meas('x y', closed)], { today: '2026-09-19' }).queue;
    expect(second.items[0]).toMatchObject({ status: 'rejected', rejectedBy: 'pipeline' });
    expect(second.items[0].holdBy).toBeUndefined();
    const back = mergeQueue(first, [meas('x y')], { today: '2026-09-19' }).queue;
    expect(back.items[0]).toMatchObject({ status: 'proposed', autoPick: true });
    expect(back.items[0].holdReason).toBeUndefined();
  });
  it('운영자가 건 hold 는 재측정해도 그대로다', () => {
    const items = [{ id: 'a', query: 'x y', track: 'T2', status: 'hold', holdReason: '운영자 보류', measuredAt: '2026-09-17' }];
    expect(mergeQueue({ items }, [meas('x y')], { today }).queue.items[0]).toEqual(items[0]);
  });
  it('닫힌 항목은 사유를 남기고, 사람이 넣은 항목은 두 번 닫혀도 hold', () => {
    const items = [
      { id: 'gap:2026-09-17:x-y', query: 'x y', track: 'T2', status: 'proposed', autoPick: true, measuredAt: '2026-09-17', condition: '손으로 쓴 조건', serp: { eyeOffset: 2 }, demand: { blogFreq: 3 } },
      { id: '빈틈:z', query: 'z w', track: 'T2', status: 'proposed', autoPick: true, measuredAt: '2026-09-17' },
    ];
    const closed = { scout: { verdictT2: 'closed', reason: ['도구 3'] } };
    const r1 = mergeQueue({ items }, [meas('x y', closed), meas('z w', closed)], { today });
    const { queue, log } = mergeQueue(r1.queue, [meas('x y', closed), meas('z w', closed)], { today: '2026-09-19' });
    const x = queue.items.find((i) => i.query === 'x y');
    expect(x).toMatchObject({ status: 'rejected', rejectedBy: 'pipeline', condition: '손으로 쓴 조건' });
    expect(x.rejectedReason).toContain('도구 3');
    expect(queue.items.find((i) => i.query === 'z w').status).toBe('hold');
    expect(log.closed).toHaveLength(2);
  });
  it('재측정은 조건·eyeOffset·autoPick=false 를 지키고 approved 상태는 바꾸지 않는다', () => {
    const items = [
      { id: 'a', query: 'x y', track: 'T2', status: 'proposed', autoPick: false, measuredAt: '2026-09-10', condition: '운영자 지정 필요', serp: { eyeOffset: 1 }, demand: { blogFreq: 6 } },
      { id: 'b', query: 'p q', track: 'T2', status: 'approved', autoPick: true, measuredAt: '2026-09-10' },
    ];
    const { queue } = mergeQueue({ items }, [meas('x y'), meas('p q', { scout: { verdictT2: 'closed', reason: ['빈자리 0'] } })], { today });
    const x = queue.items.find((i) => i.id === 'a');
    expect(x).toMatchObject({ autoPick: false, condition: '운영자 지정 필요', measuredAt: today, score: 90 });
    expect(x.serp.eyeOffset).toBe(1);
    expect(x.demand).toMatchObject({ blogFreq: 6, kinExact: 30 });
    const p = queue.items.find((i) => i.id === 'b');
    expect(p.status).toBe('approved');
    expect(p.remeasureWarn).toContain('빈자리 0');
  });
  it('측정 실패한 항목은 그대로 둔다', () => {
    const items = [{ id: 'a', query: 'x y', track: 'T2', status: 'proposed', score: 70, measuredAt: '2026-09-17' }];
    const { queue } = mergeQueue({ items }, [{ ...meas('x y'), scout: { error: 'timeout' } }], { today });
    expect(queue.items[0]).toEqual(items[0]);
  });
  it('글의 targetQuery 가 같으면 published, altQueries 로도 잡는다', () => {
    const items = [{ id: 'a', query: 'x y', altQueries: ['x  yy'], track: 'T2', status: 'proposed', measuredAt: '2026-09-17' }];
    const { queue, log } = mergeQueue({ items }, [], { today, published: new Map([['xyy', 'some-slug']]) });
    expect(queue.items[0]).toMatchObject({ status: 'published', slug: 'some-slug', publishedAt: today });
    expect(log.published).toEqual(['x y']);
  });
  it('이미 큐에 있는 쿼리(거절 포함)는 다시 올리지 않고, 기한 지난 rejected 는 지운다', () => {
    const items = [
      { id: 'a', query: 'x y', status: 'rejected', measuredAt: '2026-09-10' },
      { id: 'b', query: 'old', status: 'rejected', measuredAt: '2026-08-01' },
      { id: 'c', query: 'pub', status: 'published', publishedAt: '2026-09-01', measuredAt: '2026-08-01' },
    ];
    const { queue, log } = mergeQueue({ items }, [meas('x y')], { today });
    expect(queue.items.map((i) => i.id)).toEqual(['c', 'a']);
    expect(log.added).toEqual([]);
    expect(log.dropped).toEqual(['old']);
  });
  it('proposed 는 25건을 넘기지 않는다', () => {
    const many = Array.from({ length: 30 }, (_, n) => meas(`헤드${n} 꼬리`));
    expect(mergeQueue({ items: [] }, many, { today }).queue.items).toHaveLength(25);
  });
  it('승인 → 제안 → 보류 → 발행 → 거절 순, 같은 상태는 점수순', () => {
    const items = [{ id: 'p', query: 'pub', status: 'published', publishedAt: today }, { id: 'a', query: 'app', status: 'approved', score: 50, measuredAt: today }];
    const { queue } = mergeQueue({ items }, [meas('n1', { demand: { kinExact: 0 } }), meas('n2')], { today });
    expect(queue.items.map((i) => i.query)).toEqual(['app', 'n2', 'n1', 'pub']);
  });
});

describe('renderReport', () => {
  it('자동 선택 가능한 항목이 없으면 신규 0편 경고를 낸다', () => {
    const md = renderReport({ queue: { items: [{ query: '민생지원금 신청방법', status: 'proposed', autoPick: false, score: 65, label: '중간', reasons: [], condition: 'a|b' }] }, log: { added: [], updated: [], closed: [], published: [], dropped: [], refresh: [] }, today: '2026-09-18' });
    expect(md).toContain('신규 0편');
    expect(md).toContain('지정 필요');
    expect(md).toContain('a/b');
  });
  it('자매 겹침 제외·해제 건수를 한 줄로 낸다', () => {
    const log = { added: [], updated: [], closed: [], published: [], dropped: [], refresh: [], sisterHold: ['x'], sisterSkipped: [], sisterTop: ['y', 'z'] };
    const items = [{ query: 'y', status: 'proposed', sisterTop: 2 }, { query: 'z', status: 'proposed', sisterTop: 1 }, { query: 'w', status: 'proposed', sisterTop: 3 }, { query: 'v', status: 'hold', holdBy: 'sister' }];
    const md = renderReport({ queue: { items }, log, today: '2026-09-30', stats: { heads: 1, scouted: 0, open: 0, veto: 0, calls: 2, sisterSkipped: 4, sisterHeads: 3 } });
    expect(md).toContain('주제라 재지 않고 뺀 후보 4건(헤드 3개 포함) · 큐에서 보류로 돌림 1건 · 자매 상위 3 이라 이번에 자동 선택을 끈 항목 2건(지금 꺼져 있는 항목 3건)');
  });
});

// 2026-09-30 운영자 결정: 머니룩은 금융 주제, 지자체 지원금(민생지원금·지역화폐·상품권 사용처·반값여행)은 자매 awoo 몫
describe('자매 awoo 주제 제외', () => {
  it.each([
    ['김해 민생지원금 사용처', true],
    ['영천 반값여행', true],
    ['민생지원금 신청방법', true],
    ['지역화폐 지원금', true],
    ['서울사랑상품권 할인', true],
    ['온누리상품권 사용처', true],
    ['경기도 청년기본소득', true],
    ['화성시 출산장려금', true],
    ['마포구 청년 지원금', true],
    ['근로장려금 반기', false],
    ['자녀장려금 지급일', false],
    ['청년 지원금 조건', false],
    ['국민취업지원제도 구직촉진수당', false],
    ['고령 근로자 지원금', false],
    ['예산 지원사업', false],
    ['고향사랑기부제 세액공제', false],
    ['온누리상품권 소득공제', false],
    // 붙여 쓴 지역 이름(리뷰 2026-09-30)
    ['서울청년수당 신청', true],
    ['경기도기본소득 신청', true],
    ['마포구청 지원금', true],
    ['경기 청년 기본소득', true],
    // 지역 이름으로 시작하지만 지역이 아닌 말
    ['고양이 입양 지원금', false],
    ['영주권 지원금', false],
    ['경기 침체 지원금', false],
    ['경기침체 지원금', false],
  ])('%s → 제외 %s', (q, want) => {
    expect(isSisterTopic(q)).toBe(want);
  });
  it('붙여 쓴 꼴은 뒤가 행정 접미어나 지원금 류일 때만 지역', () => {
    expect(regionOf('서울청년수당')).toBe('서울');
    expect(regionOf('부산진구청 지원금')).toBe('부산진');
    expect(regionOf('예산지원금')).toBeNull();
    expect(regionOf('고양이')).toBeNull();
  });
  it('흔한 낱말과 겹치는 지역 이름은 접미어가 붙을 때만 지역으로 본다', () => {
    expect(regionOf('고령 근로자 지원금')).toBeNull();
    expect(regionOf('고령군 지원금')).toBe('고령군');
    expect(regionOf('김해 민생지원금')).toBe('김해');
    expect(regionOf('청년 지원금')).toBeNull();
  });
});

describe('sisterTopOf', () => {
  it('상위 3 안의 자매 사이트 순위를 준다(serp.top10 문자열·scout.above 객체 모두)', () => {
    expect(sisterTopOf(['ugc:namu.wiki', 'gov:korea.kr', 'commercial:awoo.or.kr'])).toEqual({ rank: 3, name: 'awoo' });
    expect(sisterTopOf(['stale-commercial:m.awoo.or.kr'])).toEqual({ rank: 1, name: 'awoo' });
    expect(sisterTopOf([{ host: 'www.awoo.or.kr' }])).toEqual({ rank: 1, name: 'awoo' });
  });
  it('하위 도메인도 이름은 자매 목록 도메인에서 딴다', () => {
    expect(sisterTopOf(['commercial:blog.awoo.or.kr'])).toEqual({ rank: 1, name: 'awoo' });
  });
  it('4위 아래이거나 없으면 null', () => {
    expect(sisterTopOf(['ugc:namu.wiki', 'gov:korea.kr', 'gov:x.go.kr', 'commercial:awoo.or.kr'])).toBeNull();
    expect(sisterTopOf(['commercial:notawoo.or.kr'])).toBeNull();
    expect(sisterTopOf(undefined)).toBeNull();
  });
});

describe('mergeQueue 자매 규칙', () => {
  const today = '2026-09-30';
  const awooAt = (r) => ({ above: [...Array.from({ length: r - 1 }, () => ({ kind: 'ugc', host: 'blog.naver.com' })), { kind: 'commercial', host: 'awoo.or.kr' }] });

  it('큐의 자매 주제 proposed·파이프라인 hold 는 hold(holdBy:sister), approved·운영자 hold 는 그대로', () => {
    const items = [
      { id: 'a', query: '김해 민생지원금 사용처', track: 'T2', status: 'proposed', autoPick: false, measuredAt: today },
      { id: 'b', query: '지역화폐 지원금', track: 'T2', status: 'hold', holdBy: 'pipeline', holdReason: '재측정', measuredAt: today },
      { id: 'c', query: '영천 반값여행', track: 'T2', status: 'approved', measuredAt: today },
      { id: 'd', query: '민생지원금 신청방법', track: 'T2', status: 'hold', holdReason: '운영자 보류', measuredAt: today },
    ];
    const { queue, log } = mergeQueue({ items }, [meas('지역화폐 지원금')], { today });
    const by = (id) => queue.items.find((i) => i.id === id);
    expect(by('a')).toMatchObject({ status: 'hold', holdBy: 'sister', autoPick: false });
    expect(by('a').holdReason).toContain('awoo');
    expect(by('b')).toMatchObject({ status: 'hold', holdBy: 'sister' }); // 열린 측정값이 와도 proposed 로 되돌리지 않는다
    expect(by('c').status).toBe('approved');
    expect(by('d')).toEqual(items[3]);
    expect(log.sisterHold).toEqual(['김해 민생지원금 사용처', '지역화폐 지원금']);
  });
  it('자매 주제 새 후보는 큐에 올리지 않는다', () => {
    const { queue, log } = mergeQueue({ items: [] }, [meas('김해 민생지원금 사용처'), meas('확정일자 효력')], { today });
    expect(queue.items.map((i) => i.query)).toEqual(['확정일자 효력']);
    expect(log.sisterSkipped).toEqual(['김해 민생지원금 사용처']);
  });
  it('자매가 상위 3 이면 autoPick=false 와 이유, 다음 측정에서 빠지면 다시 자동', () => {
    const first = mergeQueue({ items: [] }, [meas('확정일자 효력', { scout: awooAt(2) })], { today });
    expect(first.queue.items[0]).toMatchObject({ status: 'proposed', autoPick: false, sisterTop: 2 });
    expect(first.queue.items[0].reasons[0]).toBe('자매 사이트 awoo 상위 2위, 같은 계정 자리 중복');
    expect(first.log.sisterTop).toEqual(['확정일자 효력']);
    const back = mergeQueue(first.queue, [meas('확정일자 효력')], { today: '2026-10-01' });
    expect(back.queue.items[0].autoPick).toBe(true);
    expect(back.queue.items[0].sisterTop).toBeUndefined();
    expect(back.queue.items[0].reasons.some((r) => r.startsWith('자매 사이트'))).toBe(false);
    expect(back.log.sisterTop).toEqual([]);
  });
  it('자매가 4위면 건드리지 않는다', () => {
    const { queue } = mergeQueue({ items: [] }, [meas('확정일자 효력', { scout: awooAt(4) })], { today });
    expect(queue.items[0]).toMatchObject({ autoPick: true });
    expect(queue.items[0].sisterTop).toBeUndefined();
  });
  it('재지 못한 항목도 지난 serp 의 자매 상위를 반영한다', () => {
    const items = [{ id: 'a', query: 'x y', track: 'T2', status: 'proposed', autoPick: true, score: 70, reasons: ['자리 열림'], measuredAt: today, serp: { top10: ['commercial:awoo.or.kr', 'gov:korea.kr'] } }];
    const { queue, log } = mergeQueue({ items }, [], { today });
    expect(queue.items[0]).toMatchObject({ autoPick: false, sisterTop: 1, reasons: ['자매 사이트 awoo 상위 1위, 같은 계정 자리 중복', '자리 열림'] });
    expect(log.sisterTop).toEqual(['x y']);
  });
  it('다른 이유로 이미 autoPick=false 면 이유만 붙이고, 자매가 빠져도 false 그대로', () => {
    const items = [{ id: 'a', query: 'x y', track: 'T2', status: 'proposed', autoPick: false, condition: '운영자 지정 필요', measuredAt: '2026-09-29' }];
    const first = mergeQueue({ items }, [meas('x y', { scout: awooAt(1) })], { today });
    expect(first.queue.items[0]).toMatchObject({ autoPick: false });
    expect(first.queue.items[0].sisterTop).toBeUndefined();
    expect(first.queue.items[0].reasons[0]).toContain('자매 사이트 awoo 상위 1위');
    const later = mergeQueue(first.queue, [meas('x y')], { today: '2026-10-01' });
    expect(later.queue.items[0].autoPick).toBe(false);
  });
  it('보고서 건수는 이번에 새로 끈 것만 센다(두 번째 실행은 0, 표시는 그대로)', () => {
    const first = mergeQueue({ items: [] }, [meas('확정일자 효력', { scout: awooAt(2) })], { today });
    const second = mergeQueue(first.queue, [meas('확정일자 효력', { scout: awooAt(1) })], { today: '2026-10-01' });
    expect(second.log.sisterTop).toEqual([]);
    expect(second.queue.items[0]).toMatchObject({ autoPick: false, sisterTop: 1 });
    expect(second.queue.items[0].reasons[0]).toBe('자매 사이트 awoo 상위 1위, 같은 계정 자리 중복');
  });
  it('approved 는 자매가 상위여도 autoPick·sisterTop 을 건드리지 않고 이유만 남긴다', () => {
    const items = [{ id: 'a', query: '확정일자 효력', track: 'T2', status: 'approved', autoPick: true, measuredAt: '2026-09-29' }];
    const { queue, log } = mergeQueue({ items }, [meas('확정일자 효력', { scout: awooAt(1) })], { today });
    expect(queue.items[0]).toMatchObject({ status: 'approved', autoPick: true });
    expect(queue.items[0].sisterTop).toBeUndefined();
    expect(queue.items[0].reasons[0]).toContain('자매 사이트 awoo 상위 1위');
    expect(log.sisterTop).toEqual([]);
  });
  it('approved 인 자매 주제는 상태를 두고 재측정하지 않으며 표시를 한 번만 남긴다', () => {
    const items = [{ id: 'a', query: '영천 반값여행', track: 'T2', status: 'approved', measuredAt: '2026-09-29', score: 60 }];
    const first = mergeQueue({ items }, [meas('영천 반값여행')], { today });
    expect(first.queue.items[0]).toMatchObject({ status: 'approved', measuredAt: '2026-09-29', score: 60 });
    expect(first.queue.items[0].remeasureWarn).toContain('재측정은 멈춘다');
    expect(first.log.updated).toEqual([]);
    const again = mergeQueue(first.queue, [], { today: '2026-10-01' });
    expect(again.queue.items[0].remeasureWarn).toBe(first.queue.items[0].remeasureWarn);
  });
  it('재측정 없이 자매가 빠져도(자매 목록이 줄어든 경우) 저장된 값으로 autoPick 을 다시 계산한다', () => {
    const items = [{ id: 'a', query: 'x y', track: 'T2', status: 'proposed', autoPick: false, sisterTop: 1, score: 70, reasons: ['자매 사이트 awoo 상위 1위, 같은 계정 자리 중복', '자리 열림'], measuredAt: today, demand: { kinExact: 30 }, ledger: { verdict: 'PASS' }, serp: { top10: ['commercial:other.or.kr', 'gov:korea.kr'] } }];
    const { queue } = mergeQueue({ items }, [], { today });
    expect(queue.items[0].autoPick).toBe(true);
    expect(queue.items[0].sisterTop).toBeUndefined();
    expect(queue.items[0].reasons).toEqual(['자리 열림']);
  });
  it('큐 _readme 에 자매 규칙 설명을 한 번만 붙인다', () => {
    const first = mergeQueue({ _readme: ['a'], items: [] }, [], { today });
    expect(first.queue._readme).toEqual(['a', SISTER_README]);
    const again = mergeQueue(first.queue, [], { today });
    expect(again.queue._readme).toEqual(['a', SISTER_README]);
    expect(mergeQueue({ items: [] }, [], { today }).queue._readme).toBeUndefined();
  });
});
