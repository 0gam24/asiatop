#!/usr/bin/env node
/**
 * linkify-plain-references.mjs
 *
 * 평문 내부 참조("자세히는 머니룩의 \"X\" 가이드 참고")를 실제 마크다운
 * 내부 링크 [anchor](/{cluster}/{slug}/) 로 변환하는 일회성 audit 스크립트.
 *
 * - DRY_RUN=1 (기본): 변경 계획만 출력, 파일 미수정
 * - DRY_RUN=0: 실 적용
 * - --verify: 변경 대상 파일의 모든 ](/...) 내부 링크가
 *     (a) 실존 article(.mdx) 로 해석되고
 *     (b) URL cluster 세그먼트 == 대상 frontmatter cluster
 *   인지 검증. 불일치 시 exit 1.
 *
 * 링크 형식: 2세그먼트 + trailing slash (src/lib/related-articles.ts L98
 * extractMentions 정규식과 호환 → explicitMention +3 boost 적용).
 *
 * 변환 제외 (이미 실링크):
 * - annual-leave-cash-claim.mdx L68 (/calculators/annual-leave 링크 기존재)
 * - unemployment-benefit-application.mdx L83 (/calculators/unemployment-benefit 링크 기존재)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', '..', 'src', 'content', 'articles');

const DRY_RUN = process.env.DRY_RUN !== '0';
const VERIFY = process.argv.includes('--verify');

/**
 * 명시적 매핑 테이블 (재현 가능성을 위해 하드코딩).
 * search 는 해당 파일 내에서 정확히 1회 등장해야 함 (0회/2회+ 면 abort).
 * 주의: 일부 본문은 따옴표가 리터럴 \" (backslash-quote) 로 저장돼 있음.
 */
const MAPPINGS = [
  {
    file: 'child-tax-deduction-additional-refund-june-recovery.mdx',
    search: '자세히는 머니룩의 "환급 미입금 진단" 가이드 참고.',
    replace:
      '자세히는 머니룩의 [환급 미입금 진단](/tax/comprehensive-income-tax-refund-not-deposited-diagnosis/) 가이드 참고.',
  },
  {
    file: 'comprehensive-income-tax-5-year-audit-risk.mdx',
    search: String.raw`자세히는 머니룩의 \"마감 후 첫 24시간 대응\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [마감 후 첫 24시간 대응](/tax/comprehensive-income-tax-first-24h-after-deadline/) 가이드 참고.',
  },
  {
    file: 'comprehensive-income-tax-correction-filing-june-error-recovery.mdx',
    search: '자세히는 머니룩의 "기한 후 신고 6월 자진 처리" 가이드 참고.',
    replace:
      '자세히는 머니룩의 [기한 후 신고 6월 자진 처리](/tax/comprehensive-income-tax-late-filing-june-1/) 가이드 참고.',
  },
  {
    file: 'comprehensive-income-tax-d-day-may-31.mdx',
    search: String.raw`자세히는 머니룩의 \"종소세 분납 신청 가이드\" 참고.`,
    replace:
      '자세히는 머니룩의 [종소세 분납 신청 가이드](/tax/comprehensive-income-tax-installment-payment/) 참고.',
  },
  {
    file: 'comprehensive-income-tax-d8-final-week-action-plan.mdx',
    search: String.raw`**자세히는 머니룩의 \"연말정산 누락 5월 환급 가이드\" 참고**.`,
    replace:
      '**자세히는 머니룩의 [연말정산 누락분 5월 환급 가이드](/tax/yearend-missed-deduction-may-refund-procedure/) 참고**.',
  },
  {
    file: 'comprehensive-income-tax-d8-final-week-action-plan.mdx',
    search: String.raw`자세한 결정 기준은 머니룩의 \"단순경비율 vs 기준경비율 결정 가이드\" 참고.`,
    replace:
      '자세한 결정 기준은 머니룩의 [단순경비율 vs 기준경비율 결정 가이드](/tax/simple-vs-standard-expense-rate-selection/) 참고.',
  },
  {
    file: 'comprehensive-income-tax-d8-final-week-action-plan.mdx',
    search: String.raw`자세히는 머니룩의 \"환급 계좌 등록 가이드\" 참고.`,
    replace:
      '자세히는 머니룩의 [환급 계좌 등록·변경 가이드](/tax/comprehensive-income-tax-refund-account-registration/) 참고.',
  },
  {
    file: 'comprehensive-income-tax-first-24h-after-deadline.mdx',
    search: String.raw`자세히는 머니룩의 \"자영업자 4대보험 종소세 신고 후 변동\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [자영업자 4대보험 종소세 신고 후 변동](/tax/self-employed-4-major-insurance-after-tax-filing/) 가이드 참고.',
  },
  {
    file: 'comprehensive-income-tax-payment-methods-comparison.mdx',
    search: String.raw`**자세히는 머니룩의 \"종소세 분납 신청 가이드\" 참고**.`,
    replace:
      '**자세히는 머니룩의 [종합소득세 분납 신청 가이드](/tax/comprehensive-income-tax-installment-payment/) 참고**.',
  },
  {
    file: 'comprehensive-income-tax-refund-first-batch-june.mdx',
    search: String.raw`자세히는 머니룩의 \"종소세 환급금 절세 순환\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [종소세 환급금 절세 순환](/tax/comprehensive-income-tax-refund-recycle-strategy/) 가이드 참고.',
  },
  {
    file: 'comprehensive-property-tax-july-d37-publication-value.mdx',
    search: '자세히는 머니룩의 "부모 자녀 사전 증여 6월 활용" 가이드 참고.',
    replace:
      '자세히는 머니룩의 [부모 자녀 사전 증여 활용](/tax/parent-child-pre-gift-5000man-tax-free-june/) 가이드 참고.',
  },
  {
    file: 'comprehensive-income-tax-refund-not-deposited-diagnosis.mdx',
    search: String.raw`자세히는 머니룩의 \"기한 후 신고 6/1 즉시 처리\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [기한 후 신고 6/1 즉시 처리](/tax/comprehensive-income-tax-late-filing-june-1/) 가이드 참고.',
  },
  {
    file: 'first-time-business-tax-filer-guide-d3.mdx',
    search: String.raw`자세히는 머니룩의 \"자영업자 4대보험 5월 정산\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [자영업자 종소세 신고 후 4대보험료 변동 대비](/tax/self-employed-4-major-insurance-after-tax-filing/) 가이드 참고.',
  },
  {
    file: 'june-first-week-tax-post-deadline-guide.mdx',
    search: String.raw`자세히는 머니룩의 \"부가세 7/25 D-2개월 준비\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [부가세 7/25 D-2개월 준비](/tax/vat-filing-july-25-d2month-preparation/) 가이드 참고.',
  },
  {
    file: 'july-tax-calendar-self-employed.mdx',
    search: String.raw`자세히는 머니룩의 \"부가세 7/25 D-2개월 사전 준비\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [부가가치세 7/25 신고 사전 준비](/tax/vat-filing-july-25-d2month-preparation/) 가이드 참고.',
  },
  {
    file: 'july-tax-calendar-self-employed.mdx',
    search: String.raw`자세히는 머니룩의 \"자영업자 4대보험 종소세 신고 후 변동\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [종소세 신고 후 4대보험료 변동](/tax/self-employed-4-major-insurance-after-tax-filing/) 가이드 참고.',
  },
  {
    file: 'july-tax-calendar-self-employed.mdx',
    search: String.raw`자세히는 머니룩의 \"양도세 8월 신고 5월 매도자\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [양도세 8월 신고 5월 매도자](/realestate/capital-gains-tax-august-filing-after-may-deed/) 가이드 참고.',
  },
  {
    file: 'property-tax-d-day-june-1-confirmation.mdx',
    search: String.raw`자세히는 머니룩의 \"종부세 합산배제 임대주택 등록\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [종부세 합산배제 임대주택 등록](/realestate/property-tax-rental-housing-exclusion-application/) 가이드 참고.',
  },
  {
    file: 'property-tax-d1-june-1-24h-final.mdx',
    search: String.raw`자세히는 머니룩의 \"종부세 5/29 등기 D-1 매도자\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [종부세 5/29 등기 D-1 매도자](/realestate/property-tax-deed-d1-final-checklist/) 가이드 참고.',
  },
  {
    file: 'property-tax-deed-d1-final-checklist.mdx',
    search: String.raw`자세히는 머니룩의 종부세 시리즈 (\"종부세 6/1 D-10\", \"부부 공동명의 vs 단독명의\", \"합산배제 임대주택\") 참고.`,
    replace:
      '자세히는 머니룩의 종부세 시리즈 ([종부세 6/1 기준일 D-10](/realestate/comprehensive-property-tax-june-1-baseline/), [부부 공동명의 vs 단독명의](/realestate/property-tax-joint-vs-single-ownership-spouse/), [합산배제 임대주택](/realestate/property-tax-rental-housing-exclusion-application/)) 참고.',
  },
  {
    file: 'property-tax-june-buyer-june-2-deed-guide.mdx',
    search: String.raw`매도자 입장 가이드는 머니룩의 \"종부세 6월 매도자 양도세\" 가이드 참고.`,
    replace:
      '매도자 입장 가이드는 머니룩의 [6월 매도자 양도세 8/31 사전 점검](/realestate/capital-gains-tax-june-seller-aug-31-prep/) 가이드 참고.',
  },
  {
    file: 'property-tax-nov-dec-payment-simulation.mdx',
    search: String.raw`- 머니룩의 \"종부세 합산배제 임대주택 등록\" 가이드 참고`,
    replace:
      '- 머니룩의 [합산배제 임대주택 등록 D-9 준비](/realestate/property-tax-rental-housing-exclusion-application/) 가이드 참고',
  },
  {
    file: 'property-tax-nov-dec-payment-simulation.mdx',
    search: String.raw`- 머니룩의 \"부부 공동명의 vs 단독명의 12억 특례\" 가이드 참고`,
    replace:
      '- 머니룩의 [부부 공동명의 vs 단독명의 12억 특례](/realestate/property-tax-joint-vs-single-ownership-spouse/) 가이드 참고',
  },
  {
    file: 'self-employed-july-insurance-d29-installment.mdx',
    search: String.raw`자세히는 머니룩의 \"자영업자 4대보험 종소세 신고 후 변동\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [자영업자 4대보험 7월 통보 대비](/tax/self-employed-4-major-insurance-after-tax-filing/) 가이드 참고.',
  },
  {
    file: 'self-employed-voluntary-continued-1year-option.mdx',
    search: String.raw`자세히는 머니룩의 \"자영업자 폐업 vs 휴업 결정\" + \"7월 보험료 분납\" 가이드 참고.`,
    replace:
      '자세히는 머니룩의 [자영업자 폐업 vs 휴업 결정](/tax/self-employed-closure-vs-suspension-decision/) + [7월 보험료 분납 신청](/tax/self-employed-july-insurance-d29-installment/) 가이드 참고.',
  },
  {
    file: 'summer-vacation-bonus-tax-free-limit.mdx',
    search: '자세히는 머니룩의 "7월 건보료 정기조정 시뮬레이션" 가이드 참고.',
    replace:
      '자세히는 머니룩의 [건강보험 7월 정산 시뮬레이션](/insurance-labor/health-insurance-july-settlement-simulation/) 가이드 참고.',
  },
];

// article 이 아닌 내부 페이지 prefix (verify 시 cluster 검증 제외)
const NON_ARTICLE_PREFIXES = new Set(['calculators', 'personas', 'author', 'feeds']);

function countOccurrences(haystack, needle) {
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}

function readCluster(slug) {
  const path = join(ARTICLES_DIR, `${slug}.mdx`);
  if (!existsSync(path)) return null;
  const head = readFileSync(path, 'utf8').slice(0, 2000);
  const m = head.match(/^cluster:\s*["']?([a-z][a-z0-9-]*)["']?\s*$/m);
  return m ? m[1] : null;
}

function verify() {
  const files = [...new Set(MAPPINGS.map((m) => m.file))];
  const linkRe = /\]\(\/([a-z0-9-]+)\/([a-z0-9-]+)\/?(?:#[^)]*)?\)/g;
  let bad = 0;
  let checked = 0;
  for (const file of files) {
    const content = readFileSync(join(ARTICLES_DIR, file), 'utf8');
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const [full, seg1, seg2] = m;
      if (NON_ARTICLE_PREFIXES.has(seg1)) continue;
      checked++;
      const targetPath = join(ARTICLES_DIR, `${seg2}.mdx`);
      if (!existsSync(targetPath)) {
        console.error(`[FAIL] ${file}: ${full} → article 파일 미존재 (${seg2}.mdx)`);
        bad++;
        continue;
      }
      const cluster = readCluster(seg2);
      if (cluster !== seg1) {
        console.error(
          `[FAIL] ${file}: ${full} → cluster 불일치 (URL=${seg1}, frontmatter=${cluster})`,
        );
        bad++;
      }
    }
  }
  console.log(`\n--verify: ${files.length} files, ${checked} article links checked, ${bad} failures`);
  process.exit(bad > 0 ? 1 : 0);
}

function run() {
  let errors = 0;
  let applied = 0;
  // 사전 검증: 모든 search 가 각 파일에 정확히 1회 존재 + 대상 링크 유효
  for (const { file, search, replace } of MAPPINGS) {
    const path = join(ARTICLES_DIR, file);
    if (!existsSync(path)) {
      console.error(`[ERROR] 소스 파일 미존재: ${file}`);
      errors++;
      continue;
    }
    const content = readFileSync(path, 'utf8');
    const n = countOccurrences(content, search);
    if (n !== 1) {
      console.error(`[ERROR] ${file}: search 등장 횟수 ${n} (1이어야 함): ${search.slice(0, 60)}...`);
      errors++;
      continue;
    }
    // replace 안의 링크 대상 사전 검증
    const linkRe = /\]\(\/([a-z0-9-]+)\/([a-z0-9-]+)\/\)/g;
    let lm;
    while ((lm = linkRe.exec(replace)) !== null) {
      const cluster = readCluster(lm[2]);
      if (cluster === null) {
        console.error(`[ERROR] ${file}: 대상 article 미존재 /${lm[1]}/${lm[2]}/`);
        errors++;
      } else if (cluster !== lm[1]) {
        console.error(
          `[ERROR] ${file}: cluster 불일치 /${lm[1]}/${lm[2]}/ (frontmatter=${cluster})`,
        );
        errors++;
      }
    }
  }
  if (errors > 0) {
    console.error(`\n사전 검증 실패 ${errors}건 — 변경 미수행, exit 1`);
    process.exit(1);
  }

  for (const { file, search, replace } of MAPPINGS) {
    const path = join(ARTICLES_DIR, file);
    const content = readFileSync(path, 'utf8');
    const next = content.replace(search, replace);
    const tag = DRY_RUN ? '[DRY-RUN]' : '[APPLY]';
    console.log(`${tag} ${file}`);
    console.log(`  - ${search}`);
    console.log(`  + ${replace}`);
    if (!DRY_RUN) {
      writeFileSync(path, next, 'utf8');
      applied++;
    }
  }

  const files = new Set(MAPPINGS.map((m) => m.file));
  const links = MAPPINGS.reduce(
    (sum, m) => sum + (m.replace.match(/\]\(\//g) ?? []).length,
    0,
  );
  console.log(
    `\n${DRY_RUN ? 'DRY-RUN 계획' : '적용 완료'}: ${MAPPINGS.length} 치환 / ${links} 링크 / ${files.size} 파일${
      DRY_RUN ? ' (DRY_RUN=0 으로 실 적용)' : ''
    }`,
  );
  if (applied > 0) console.log('다음 단계: node scripts/audit/linkify-plain-references.mjs --verify');
}

if (VERIFY) verify();
else run();
