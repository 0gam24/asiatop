/**
 * naver-hosts 단위 테스트 — 네이버 웹문서 호스트 분류·자리 열림 판정 (docs/ops/KEYWORD-PLAN-2026-09-15.md §4-2·§4-4)
 * 사례는 2026-09-15 실측 SERP 에서 가져왔다.
 */
import { describe, it, expect } from 'vitest';
import { classifyHost, classifyItems, isStale, summarize, verdicts } from '../../scripts/audit/lib/naver-hosts.mjs';

describe('classifyHost — 금융·생활 행정 분류표', () => {
  const cases = [
    ['asiatop.co.kr', 'us'],
    ['nts.go.kr', 'gov'],
    ['korea.kr', 'gov'],
    ['easylaw.go.kr', 'gov'], // 정부 운영 법령 안내는 벽
    ['news.seoul.go.kr', 'gov'], // news 패턴보다 go.kr 이 먼저
    ['hometax.go.kr', 'tool'],
    ['si4n.nhis.or.kr', 'tool'], // 공단 하위라도 계산 서비스는 도구
    ['m.4insure.or.kr', 'tool'],
    ['nhis.or.kr', 'public'],
    ['kinfa.or.kr', 'public'],
    ['kdi.re.kr', 'public'],
    ['kdh.or.kr', 'org'], // 병원 .or.kr 은 벽이 아니다
    ['gjworker.org', 'org'],
    ['awoo.or.kr', 'commercial'], // .or.kr 정보 사이트
    ['nodong.kr', 'law'],
    ['yna.co.kr', 'press'],
    ['incheontoday.com', 'press'],
    ['kbsec.com', 'finco'],
    ['obank.kbstar.com', 'finco'],
    ['story.kakaopay.com', 'finco'],
    ['insurance-claim.pay.naver.com', 'naver'],
    ['terms.naver.com', 'naver'],
    ['blog.naver.com', 'ugc'],
    ['kin.naver.com', 'ugc'],
    ['ko.wikipedia.org', 'ugc'], // .org 지만 UGC
    ['findsemusa.com', 'commercial'], // 계산기 페이지가 있어도 호스트 통째로 도구가 아니다
    ['today79.com', 'commercial'],
  ];
  for (const [host, kind] of cases) {
    it(`${host} → ${kind}`, () => expect(classifyHost(host)).toBe(kind));
  }
  it('제목에 계산기가 있으면 정보 사이트라도 도구', () => {
    expect(classifyHost('saramin.co.kr', '퇴직금 계산기 | 사람인')).toBe('tool');
  });
  it('빈 호스트는 commercial', () => expect(classifyHost('')).toBe('commercial'));
});

describe('isStale', () => {
  it('제목 연도가 모두 올해 이전이면 옛 문서', () => expect(isStale('2024년 근로장려금 신청', 2026)).toBe(true));
  it('올해 연도가 하나라도 있으면 아님', () => expect(isStale('2025~2026 비교', 2026)).toBe(false));
  it('연도가 없으면 판단하지 않는다', () => expect(isStale('주휴수당 계산', 2026)).toBe(false));
});

const items = (hosts, titles = []) => classifyItems(hosts.map((h, i) => ({ link: `https://${h}/p`, title: titles[i] || '안내' })), { year: 2026 });

describe('summarize + verdicts', () => {
  it('상업·단체 사이트뿐인 롱테일은 T1·T2 모두 열림 (주휴수당 퇴사하는 주)', () => {
    const s = summarize(items(['findsemusa.com', 'findsemusa.com', 'awoo.or.kr', 'gjworker.org', 'findsemusa.com', 'gjcwc.org', 'findsemusa.com', '1350.moel.go.kr', 'story.kakaopay.com', 'gninnobiz.or.kr']));
    expect(s.openSlots).toBe(8);
    expect(s.wallTop5).toBe(0);
    const v = verdicts(s, { newsWall: 0 });
    expect(v.verdictT1).toBe('open');
    expect(v.verdictT2).toBe('open');
  });

  it('상위 5 에 관공서 4 면 닫힘 (청년미래적금 중도해지)', () => {
    const s = summarize(items(['fsc.go.kr', 'korea.kr', 'korea.kr', 'fsc.go.kr', 'kbthink.com', 'fsc.go.kr', 'awoo.or.kr', 'korea.kr', 'incheontoday.com', 'awoo.or.kr']));
    expect(s.wallTop5).toBe(4);
    const v = verdicts(s, { newsWall: 6 });
    expect(v.verdictT1).toBe('closed');
    expect(v.verdictT2).toBe('closed');
  });

  it('지식백과 상위 3 은 닫지 않고 경고만, 거래형 네이버 서비스는 닫힘', () => {
    const ref = summarize(items(['nhis.or.kr', 'blog.naver.com', 'terms.naver.com', 'kdh.or.kr', 'koa.or.kr']));
    expect(verdicts(ref).verdictT2).toBe('open');
    expect(verdicts(ref).warn.join(' ')).toMatch(/지식백과/);
    const pay = summarize(items(['insurance-claim.pay.naver.com', 'blog.naver.com', 'kdh.or.kr']));
    expect(verdicts(pay).verdictT2).toBe('closed');
  });

  it('도구 3 개 이상이면 닫힘', () => {
    const s = summarize(items(['hometax.go.kr', 'hometax.go.kr', 'gov.kr', 'blog.naver.com', 'tistory.com']));
    expect(s.toolAbove).toBe(3);
    expect(verdicts(s).verdictT2).toBe('closed');
  });

  it('자사 1~3위면 둘 다 닫고 갱신으로 보낸다', () => {
    const s = summarize(items(['nts.go.kr', 'asiatop.co.kr', 'blog.naver.com']));
    expect(s.rank).toBe(2);
    const v = verdicts(s);
    expect(v.verdictT1).toBe('closed');
    expect(v.reason[0]).toMatch(/갱신/);
  });

  it('뉴스 7일 기사 수: T2 는 15 초과 닫힘, T1 은 40 까지 열림(경고)', () => {
    const s = summarize(items(['blog.naver.com', 'tistory.com', 'findsemusa.com']));
    const v = verdicts(s, { newsWall: 31 });
    expect(v.verdictT2).toBe('closed');
    expect(v.verdictT1).toBe('open');
    expect(v.warn.join(' ')).toMatch(/뉴스/);
  });

  it('사람이 "첫 화면 아래"(eyeOffset 3)로 표시하면 닫힘', () => {
    const s = summarize(items(['blog.naver.com', 'tistory.com']));
    expect(verdicts(s, { eyeOffset: 3 }).verdictT1).toBe('closed');
  });

  it('옛 문서는 관공서여도 빈자리로 센다', () => {
    const s = summarize(items(['nhis.or.kr', 'blog.naver.com'], ['2023년 본인부담상한제 환급 안내', '후기']));
    expect(s.openSlots).toBe(2);
  });
});
