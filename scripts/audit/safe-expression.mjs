#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// safe-expression.mjs — 금융 광고 규제·애드센스 정책 위반 소지 표현 가드 (LLM 0)
// docs/25-growth-plan-2026-09.md §6, 근거 docs/research/2026-09-07-adsense-topic-value.md §3
//   · 금융소비자보호법 22조 (비판매업자 광고 금지, 보장성·투자성 오인 표현)
//   · 애드센스 게시자 정책 (허위 진술·사기 행위·유해 주장)
//   · 금감원 불법사금융 광고 유형 ("무조건 승인", "당일 입금", "무직자 가능")
//
// 대상: publishedAt 또는 updatedAt 이 RULE_DATE(2026-09-07) 이후인 글만 (기존 글 소급 금지 —
//       제목·본문 대량 변경은 docs/24 금지). BLOCK 적중 시 exit 1, WARN 은 출력만.
// 실행: node scripts/audit/safe-expression.mjs [--all] [--quiet]   (pnpm audit:safe)
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ART_DIR = path.join(ROOT, 'src', 'content', 'articles');
const RULE_DATE = '2026-09-07';
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const QUIET = args.includes('--quiet');

// BLOCK: 문맥과 무관하게 금융 정보 사이트 본문에 있어선 안 되는 문구
// (2026-09-07 665편 전수 시험: "확정 수익 아님", 주택연금 "신용점수 무관 가입", 잔금 "당일 대출 실행" 같은
//  설명 문맥 오탐이 있어 단독 어구는 WARN 으로 내리고, 광고 조합형만 BLOCK 에 둔다)
const BLOCK = [
  { re: /무조건\s*(승인|보상)/, why: '불법사금융 광고 문구 / 허위 진술 (금감원 유형)' },
  { re: /무직자(도)?\s*(대출\s*)?가능/, why: '불법사금융 광고 문구' },
  { re: /신용(불량자|불량|도|등급|점수)?\s*(무관|상관\s*없\S*)\s*(대출|승인|입금)/, why: '불법사금융 광고 문구 (신용 무관 + 대출/승인)' },
  { re: /(누구나|모두)\s*(당일|즉시)\s*(입금|대출|승인)/, why: '불법사금융 광고 문구 (누구나 당일 입금)' },
  { re: /(지금|오늘|이번\s*달)\s*(가입|신청)(하지|안)?\s*(않으면|안\s*하면|못\s*하면)\s*(손해|늦|끝)/, why: '절판마케팅 동조 (금소법 22조 오인 유형)' },
  { re: /확정\s*수익(률)?\s*(보장|약속)/, why: '투자성 상품 이익 보장 오인 (금소법 22조)' },
  { re: /손실\s*(없는|없이|제로)\s*(연금|투자|펀드|상품)/, why: '손실 보전 오인 (금소법 22조)' },
  { re: /보장\s*(무제한|한도\s*없)/, why: '보장한도 누락 오인 (금소법 22조)' },
  { re: /(여기서|이곳에서|아래에서)\s*(신청|가입)\s*(하세요|하시면|하면\s*됩니다)/, why: '판매대리·중개 오인 (미등록 모집 리스크)' },
  { re: /재무\s*설계\s*(해\s*드립|해드립|서비스\s*제공)/, why: '금융위 해석상 업무광고 전환 문구' },
  { re: /월\s*\d+\s*만\s*원\s*(벌기|수익\s*내기|버는\s*법)/, why: '애드센스 사기 행위 정책 (단기 고수익)' },
  { re: /(병원비|치료비)\s*걱정\s*끝/, why: '유해한 건강 주장' },
];

// WARN: 문맥에 따라 정당할 수 있어 사람이 확인 (차단 안 함)
const WARN = [
  { re: /원금\s*보장/, why: '예금자보호 설명이면 OK, 연금·펀드·투자 문맥이면 금소법 22조 위반' },
  { re: /확정\s*수익/, why: '"확정 수익 아님" 처럼 부정 문맥이면 OK, 수익 보장 문맥이면 금소법 22조 위반' },
  { re: /무조건\s*(지급|통과|가입)/, why: '의무가입·"무조건 지급되지 않는다" 같은 설명이면 OK, 지원금·승인 단정이면 허위 진술' },
  { re: /당일\s*(입금|대출|승인)/, why: '절차 설명(잔금일 당일 실행)이면 OK, 광고 문맥이면 불법사금융 문구' },
  { re: /신용(도|등급|점수)\s*(무관|상관\s*없)/, why: '주택연금·보험계약대출 설명이면 OK, 대출 광고 문맥이면 불법사금융 문구' },
  { re: /(최고|최저|최상)의\s*(보험|대출|카드|상품)/, why: '근거 없는 비교 우월 (표시광고법)' },
  { re: /\d+위\s*(대출|보험|카드)/, why: '근거 없는 순위 주장' },
  { re: /(이|해당|본)\s*상품(을)?\s*(추천|권합|권장)/, why: '상품 추천 = 판매 권유 오인' },
  { re: /전\s*국민(에게)?\s*(\d+\s*만\s*원|현금)\s*(지급|지원)/, why: '확정 발표된 제도만 (미확정 단정 금지)' },
  { re: /(반드시|꼭)\s*(가입|신청)해야\s*(합니다|해요|한다)/, why: '가입 강요 프레임' },
];

function frontmatter(src) {
  const fm = src.split('---')[1] || '';
  const g = (k) => (fm.match(new RegExp(`^${k}:\\s*"?([0-9]{4}-[0-9]{2}-[0-9]{2})`, 'm')) || [])[1] || '';
  return { publishedAt: g('publishedAt'), updatedAt: g('updatedAt') };
}

let blocks = 0, warns = 0, scanned = 0;
for (const f of readdirSync(ART_DIR).filter((f) => f.endsWith('.mdx')).sort()) {
  const src = readFileSync(path.join(ART_DIR, f), 'utf8');
  const { publishedAt, updatedAt } = frontmatter(src);
  if (!ALL && !(publishedAt >= RULE_DATE || updatedAt >= RULE_DATE)) continue;
  scanned++;
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { re, why } of BLOCK) {
      const m = line.match(re);
      if (m) { blocks++; console.log(`❌ ${f}:${i + 1}  "${m[0]}"  ${why}`); }
    }
    for (const { re, why } of WARN) {
      const m = line.match(re);
      if (m) { warns++; if (!QUIET) console.log(`⚠️  ${f}:${i + 1}  "${m[0]}"  ${why}`); }
    }
  });
}

console.log(`\nsafe-expression: ${scanned}편 검사 (${ALL ? '전체' : `publishedAt/updatedAt ≥ ${RULE_DATE}`}) → 차단 ${blocks}건, 경고 ${warns}건`);
if (blocks > 0) {
  console.error('금융 광고 규제·애드센스 정책 위반 소지 문구가 있습니다. docs/research/2026-09-07-adsense-topic-value.md §3 의 대체 표현으로 고치세요.');
  process.exit(1);
}
