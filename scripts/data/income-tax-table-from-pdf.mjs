#!/usr/bin/env node
/**
 * 근로소득 간이세액표(소득세법 시행령 [별표 2]) 원문 PDF -> src/data/income-tax-withholding-table.json
 *
 * 원문: 국가법령정보센터 소득세법 시행령 [별표 2] PDF 첨부 (SOURCE.pdf).
 *   PDF 첫 줄 "<개정 2026. 2. 27.>", 대통령령 제36129호 부칙 제1조제3호(별표 2 개정규정 2026년 3월 1일 시행),
 *   부칙 제15조(2026년 3월 1일 이후 원천징수하는 경우부터 적용).
 *
 * 사용:
 *   pdftotext -layout -enc UTF-8 <별표2.pdf> byl2.txt
 *   node scripts/data/income-tax-table-from-pdf.mjs byl2.txt           # 검사만
 *   node scripts/data/income-tax-table-from-pdf.mjs byl2.txt --write   # 검사 통과 시 JSON 쓰기
 *
 * 검사: 646행, 행 연속(이상 = 앞 행 미만), 구간 폭(770~1,500천원 5 / ~3,000천원 10 / ~10,000천원 20),
 *       월급여액이 오르면 세액이 줄지 않음, 가족 수가 늘면 세액이 늘지 않음, 세액 10원 단위, "10,000천원" 행 존재.
 * 표가 개정되면 SOURCE 를 새 원문 정보로 바꾸고 다시 돌린 뒤, 원문 PDF 와 행 대조 결과를 PR 에 남긴다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = {
  title: '소득세법 시행령 [별표 2] 근로소득 간이세액표(제189조제1항 관련)',
  amended: '2026-02-27',
  decree: '대통령령 제36129호',
  appliesFrom: '2026-03-01',
  appliesNote: '부칙 제15조: 별표 2의 개정규정은 2026년 3월 1일 이후 원천징수하는 경우부터 적용',
  pdf: 'https://www.law.go.kr/LSW/flDownload.do?gubun=&flSeq=169798151&bylClsCd=110201',
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = resolve(REPO_ROOT, 'src', 'data', 'income-tax-withholding-table.json');

const [, , inPath, flag] = process.argv;
if (!inPath) {
  console.error('사용: node scripts/data/income-tax-table-from-pdf.mjs <pdftotext -layout 출력> [--write]');
  process.exit(2);
}

const num = (s) => (s === '-' ? 0 : Number(s.replace(/,/g, '')));
const TOK = '(?:[\\d,]+|-)';
const rowRe = new RegExp(`^\\s*([\\d,]+)\\s+([\\d,]+)((?:\\s+${TOK}){11})\\s*$`);
const topRe = new RegExp(`^\\s*10,000천원((?:\\s+${TOK}){11})\\s*$`);

const rows = [];
let top = null;
for (const raw of readFileSync(inPath, 'utf8').split(/\r?\n/)) {
  // pdftotext 가 붙어 있는 두 칸의 "-" 를 "--" 한 토큰으로 내는 쪽이 있다(2026. 2. 27. 개정 PDF 의 2,550~2,810천원 쪽,
  // 렌더링한 원문에서 두 칸 모두 "-" 임을 확인). 두 칸으로 되돌린다.
  const line = raw.replace(/(^|\s)--(?=\s|$)/g, '$1- -');
  let m = line.match(rowRe);
  if (m) {
    rows.push([num(m[1]), num(m[2]), ...m[3].trim().split(/\s+/).map(num)]);
    continue;
  }
  m = line.match(topRe);
  if (m) top = m[1].trim().split(/\s+/).map(num);
}

const problems = [];
if (rows.length !== 646) problems.push(`행 수 ${rows.length} (기대 646)`);
if (!top || top.length !== 11) problems.push('"10,000천원" 행을 찾지 못함');
rows.forEach((r, i) => {
  const [lo, hi] = r;
  const width = lo < 1500 ? 5 : lo < 3000 ? 10 : 20;
  if (hi - lo !== width) problems.push(`${lo}: 구간 폭 ${hi - lo} (기대 ${width})`);
  if (i > 0 && lo !== rows[i - 1][1]) problems.push(`${lo}: 앞 행 미만 ${rows[i - 1][1]} 과 이어지지 않음`);
  for (let c = 2; c < 13; c++) {
    if (r[c] % 10 !== 0) problems.push(`${lo}: ${c - 1}명 세액 ${r[c]} 이 10원 단위가 아님`);
    if (c > 2 && r[c] > r[c - 1]) problems.push(`${lo}: ${c - 1}명 세액이 ${c - 2}명보다 큼`);
    if (i > 0 && r[c] < rows[i - 1][c]) problems.push(`${lo}: ${c - 1}명 세액이 앞 행보다 작음`);
  }
});
if (rows[0]?.[0] !== 770 || rows.at(-1)?.[1] !== 10000) problems.push('표 범위가 770~10,000천원이 아님');

console.log(`행 ${rows.length}개 (${rows[0]?.[0]}~${rows.at(-1)?.[1]}천원), 10,000천원 행 ${top ? '있음' : '없음'}`);
if (problems.length > 0) {
  console.error(`검사 실패 ${problems.length}건`);
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`);
  process.exit(1);
}
console.log('검사 통과');

if (flag === '--write') {
  const body = [
    '{',
    `  "source": ${JSON.stringify(SOURCE)},`,
    '  "unit": { "salary": "천원", "tax": "원" },',
    '  "columns": "[월급여액 이상, 미만, 공제대상가족 1명 세액, ..., 11명 세액] (원문의 - 는 0)",',
    '  "rows": [',
    rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
    '  ],',
    `  "top": ${JSON.stringify(top)}`,
    '}',
    '',
  ].join('\n');
  writeFileSync(OUT, body, 'utf8');
  console.log(`썼음: ${OUT}`);
}
