#!/usr/bin/env node
/**
 * R96 — 2026-06 법정 수치 정정 검증 (verification-only, 수정 없음).
 *
 * 배경:
 *   2026-06-11 일괄 정정 — 연금계좌 세액공제(연금저축 600만/합산 900만, 50세 특례 폐지),
 *   자녀세액공제(2025년 귀속: 1명 25만/2명 55만/3명+ 40만 추가),
 *   노란우산공제(세액공제 X → 소득공제, 4구간 600/500/400/200만).
 *
 * 역할:
 *   정정 후 남아 있으면 안 되는 stale 패턴을 grep 하고 발견 시 exit 1.
 *   CI/수동 재검증용 — 파일을 절대 수정하지 않음.
 *
 * 사용:
 *   node scripts/audit/fix-legal-amounts-2026.mjs
 *
 * 화이트리스트 (정상 용례 — 검출 제외):
 *   - "2024년 귀속" 을 포함한 줄: 직전 귀속연도 구(舊) 자녀세액공제 수치 병기 (역사적 서술)
 *   - 노란우산 줄에 "소득공제" 가 함께 있으면 통과: "세액공제가 아니라 소득공제" 류 정정 서술
 *   - 연금소득공제 1,200만/700만 (pension-income-deduction-1200-vs-700): 연금계좌 세액공제와
 *     무관한 별도 제도 서술 — 패턴을 연금저축/IRP 토큰으로 한정해 자연 제외
 *   - 새 노란우산 4구간 표의 "4천만~6천만 500만" 은 "이하" 토큰 요구로 자연 제외
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');

function* walkMdx(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMdx(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

/**
 * 각 rule: { id, desc, test(line) → boolean (true = 위반) }
 */
const RULES = [
  {
    id: 'pension-savings-400',
    desc: '연금저축 400만 한도 (구 체계) — 현행 600만',
    test: (l) => /연금저축[^\n]{0,30}400만|400만[^\n]{0,30}연금저축/.test(l),
  },
  {
    id: 'pension-account-700',
    desc: '연금저축/IRP 700만 한도 (구 체계) — 현행 합산 900만',
    test: (l) =>
      /(?:IRP|연금저축)[^\n]{0,40}700만|700만[^\n]{0,40}(?:IRP|연금저축)/.test(l),
  },
  {
    id: 'pension-union-700',
    desc: '통합/합산 한도 700만 표기 (구 체계) — 현행 900만',
    // 화이트리스트: 의료비 세액공제의 "본인·부양가족 합산 700만원 한도" 는 정상 (무관 제도)
    test: (l) => !/의료비|부양가족/.test(l) && /(?:통합|합산)\s*(?:한도)?\s*700만/.test(l),
  },
  {
    id: 'age50-extra-limit',
    desc: '만 50세 추가 한도 수치 (2023년 폐지) — 1,000만/800만/"만 50+" 잔존',
    // "50세+ 최대 270일" (실업급여 수급기간) 같은 무관 용례 제외 — 금액(N만) 결합만 검출
    test: (l) =>
      /(?:만 50|50세)\+?[^\n]{0,25}(?:1,000만|1000만|800만)/.test(l) ||
      /만 50\+/.test(l) ||
      /50세\+[^\n]{0,15}[\d,]+만/.test(l),
  },
  {
    id: 'child-credit-old-amounts',
    desc: '자녀세액공제 구 수치 (1명 15만/2명 30·35만/3명 60·65만) — 2025년 귀속 25/55/95만',
    test: (l) => {
      if (/2024년 귀속/.test(l)) return false; // 직전 귀속 병기 서술 허용
      if (!/자녀세액공제|자녀공제|자녀 수/.test(l)) return false;
      return (
        /(?:1명|1자녀)[^\n]{0,12}15만/.test(l) ||
        /(?:2명|2자녀)[^\n]{0,12}3[05]만/.test(l) ||
        /(?:3명|3자녀)[^\n]{0,14}6[05]만/.test(l)
      );
    },
  },
  {
    id: 'noranusan-as-tax-credit',
    desc: '노란우산 + 세액공제 동일 줄 (범주 오류) — 소득공제 병기 없으면 위반',
    test: (l) => {
      if (!/노란우산/.test(l)) return false;
      // "자녀세액공제" 는 별도 제도 — 노란우산 범주 판정에서 제외
      const stripped = l.replaceAll('자녀세액공제', '');
      if (!/세액공제/.test(stripped)) return false;
      return !/소득공제/.test(stripped);
    },
  },
  {
    id: 'noranusan-old-tiers',
    desc: '노란우산 구 3구간 한도 (500/300/200) — 현행 4구간 600/500/400/200',
    test: (l) => {
      if (!/노란우산|사업소득|공제/.test(l)) return false;
      return (
        /(?:4천만|4,000만)(?:원)?\s*이하[^\n]{0,10}500만/.test(l) ||
        /(?:4천만|4,000만)[^\n]{0,6}~[^\n]{0,6}1억[^\n]{0,10}300만/.test(l) ||
        /1억[^\n]{0,10}300만/.test(l) ||
        /200~500만/.test(l) ||
        /500만\/300만\/200만/.test(l) ||
        /500\/300\/200/.test(l)
      );
    },
  },
];

function main() {
  const violations = [];
  let fileCount = 0;
  for (const file of walkMdx(ARTICLES_DIR)) {
    fileCount++;
    const rel = file.slice(ROOT.length + 1).replaceAll('\\', '/');
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const rule of RULES) {
        if (rule.test(line)) {
          violations.push({ rel, line: i + 1, rule: rule.id, text: line.trim().slice(0, 140) });
        }
      }
    });
  }

  console.log(`[fix-legal-amounts-2026] scanned ${fileCount} articles, rules=${RULES.length}`);
  if (violations.length === 0) {
    console.log('[fix-legal-amounts-2026] PASS — stale legal-amount pattern 0건');
    process.exit(0);
  }
  console.error(`[fix-legal-amounts-2026] FAIL — stale pattern ${violations.length}건:`);
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line} [${v.rule}] ${v.text}`);
  }
  process.exit(1);
}

main();
