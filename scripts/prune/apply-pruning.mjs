#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// apply-pruning.mjs (콘텐츠 프루닝 일괄 처리 — 구글 회복 P3, 2026-08-26)
//
// GSC 실적 기반 프루닝 목록 CSV 를 입력받아 통합·삭제·noindex 를 일괄 처리한다.
//
// CSV 형식 (헤더 행 허용, 쉼표 구분):
//   slug,action,target
//   - action = merge   : 글을 컬렉션에서 제거(src/content/_pruned/ 이동) 후
//                        target 글로 301 리디렉션. target 필수 (실존 slug).
//   - action = delete  : 글 제거 후 소속 클러스터 허브(/{cluster}/)로 301.
//   - action = noindex : 글 유지 + frontmatter noindex: true (robots noindex +
//                        전 사이트맵 제외. 페이지·RSS 유지 — 네이버 영향 없음).
//
// 처리 내용:
//   1. src/content/articles/<slug>.mdx → src/content/_pruned/ 이동 (merge/delete)
//      → 페이지·사이트맵·RSS 자동 이탈 (컬렉션 glob 밖)
//   2. scripts/prune/redirect-map.json (SSoT) 갱신
//   3. public/_redirects 의 관리 블록 재생성 (트레일링 슬래시 유무 2룰/건)
//   4. noindex 는 frontmatter 에 플래그 삽입 (다른 필드·날짜 불변)
//   5. docs/audits/pruning-<date>.json audit 로그
//
// CLAUDE.md 대규모 일괄 변경 패턴 준수: DRY_RUN=1 기본.
//   검증: node scripts/prune/apply-pruning.mjs <목록.csv>
//   적용: DRY_RUN=0 node scripts/prune/apply-pruning.mjs <목록.csv>
//
// 금지 조항 가드: 리디렉션은 남기고 대량 재발행은 하지 않는다 (docs/24 §2).
// ════════════════════════════════════════════════════════════════════════

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const PRUNED_DIR = join(ROOT, 'src', 'content', '_pruned');
const MAP_PATH = join(ROOT, 'scripts', 'prune', 'redirect-map.json');
const REDIRECTS_PATH = join(ROOT, 'public', '_redirects');
const AUDITS_DIR = join(ROOT, 'docs', 'audits');

const BLOCK_START = '# ── PRUNING REDIRECTS (자동 생성: scripts/prune/apply-pruning.mjs — 수동 편집 금지) ──';
const BLOCK_END = '# ── END PRUNING REDIRECTS ──';
// CF Pages 정적 리디렉션 상한 2,000 — 여유 두고 경고
const REDIRECT_RULE_WARN = 1800;

const DRY_RUN = process.env.DRY_RUN !== '0';
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('사용법: [DRY_RUN=0] node scripts/prune/apply-pruning.mjs <목록.csv>');
  console.error('CSV: slug,action(merge|delete|noindex)[,target]');
  process.exit(1);
}

// ── 현재 글 인덱스 (slug → {file, cluster, noindexed}) ──
function indexArticles() {
  const map = new Map();
  for (const name of readdirSync(ARTICLES_DIR)) {
    if (!/\.mdx?$/.test(name)) continue;
    const text = readFileSync(join(ARTICLES_DIR, name), 'utf8');
    const cluster = text.match(/^cluster:\s*["']?([a-z0-9-]+)["']?\s*$/m)?.[1];
    map.set(name.replace(/\.mdx?$/, ''), {
      file: name,
      cluster,
      noindexed: /^noindex:\s*true\s*$/m.test(text),
    });
  }
  return map;
}

// ── CSV 파싱 ──
function parseCsv(path) {
  const rows = [];
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [slug, action, target] = line.split(',').map((s) => s?.trim());
    if (i === 0 && /^slug$/i.test(slug)) continue; // 헤더 행
    rows.push({ line: i + 1, slug, action: action?.toLowerCase(), target: target || null });
  }
  return rows;
}

const articles = indexArticles();
const rows = parseCsv(csvPath);
const existingMap = existsSync(MAP_PATH)
  ? JSON.parse(readFileSync(MAP_PATH, 'utf8'))
  : { redirects: [] };
const alreadyPruned = new Set(existingMap.redirects.map((r) => r.slug));
const batchPrunedSlugs = new Set(
  rows.filter((r) => r.action === 'merge' || r.action === 'delete').map((r) => r.slug),
);

// ── 검증 ──
const errors = [];
const plan = []; // {slug, action, from, to, file, cluster}
const skips = [];

for (const r of rows) {
  if (!r.slug || !['merge', 'delete', 'noindex'].includes(r.action ?? '')) {
    errors.push(`행 ${r.line}: 형식 오류 — "slug,action(merge|delete|noindex)[,target]" (${r.slug ?? ''})`);
    continue;
  }
  const art = articles.get(r.slug);
  if (!art) {
    if (alreadyPruned.has(r.slug)) {
      skips.push(`${r.slug}: 이미 프루닝됨 (redirect-map 에 존재) — 스킵`);
    } else {
      errors.push(`행 ${r.line}: slug 미존재 — ${r.slug}`);
    }
    continue;
  }
  if (!art.cluster) {
    errors.push(`행 ${r.line}: cluster frontmatter 파싱 실패 — ${r.slug}`);
    continue;
  }

  if (r.action === 'merge') {
    if (!r.target) {
      errors.push(`행 ${r.line}: merge 는 target 필수 — ${r.slug}`);
      continue;
    }
    const target = articles.get(r.target);
    if (!target || !target.cluster) {
      errors.push(`행 ${r.line}: target 미존재 — ${r.target} (${r.slug})`);
      continue;
    }
    if (batchPrunedSlugs.has(r.target)) {
      errors.push(`행 ${r.line}: target 이 같은 배치에서 프루닝 대상 — ${r.target} (${r.slug})`);
      continue;
    }
    plan.push({
      slug: r.slug,
      action: 'merge',
      file: art.file,
      cluster: art.cluster,
      from: `/${art.cluster}/${r.slug}/`,
      to: `/${target.cluster}/${r.target}/`,
    });
  } else if (r.action === 'delete') {
    plan.push({
      slug: r.slug,
      action: 'delete',
      file: art.file,
      cluster: art.cluster,
      from: `/${art.cluster}/${r.slug}/`,
      to: `/${art.cluster}/`,
    });
  } else {
    if (art.noindexed) {
      skips.push(`${r.slug}: 이미 noindex — 스킵`);
      continue;
    }
    plan.push({ slug: r.slug, action: 'noindex', file: art.file, cluster: art.cluster });
  }
}

if (errors.length > 0) {
  console.error(`❌ [prune] 검증 실패 ${errors.length}건 — 아무것도 적용하지 않음`);
  for (const e of errors) console.error(`   ${e}`);
  process.exit(1);
}

// ── 계획 출력 ──
const byAction = { merge: 0, delete: 0, noindex: 0 };
for (const p of plan) byAction[p.action]++;
console.log(
  `${DRY_RUN ? '🔍 [DRY_RUN]' : '⚙️  [적용]'} 프루닝 계획: merge ${byAction.merge} · delete ${byAction.delete} · noindex ${byAction.noindex} (스킵 ${skips.length})`,
);
for (const p of plan) {
  console.log(
    p.action === 'noindex'
      ? `   noindex  ${p.slug}`
      : `   ${p.action.padEnd(8)} ${p.from} → ${p.to}`,
  );
}
for (const s of skips) console.log(`   ⏭️  ${s}`);

if (DRY_RUN) {
  console.log('\n적용: DRY_RUN=0 node scripts/prune/apply-pruning.mjs ' + csvPath);
  process.exit(0);
}

// ── 적용 ──
mkdirSync(PRUNED_DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

for (const p of plan) {
  const src = join(ARTICLES_DIR, p.file);
  if (p.action === 'noindex') {
    const text = readFileSync(src, 'utf8');
    // frontmatter 블록 끝(---) 직전에 플래그 삽입 — 다른 필드·날짜 불변. CRLF 대응.
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const next = text.replace(
      /^---\r?\n([\s\S]*?)\r?\n---/,
      (m, fm) => `---${eol}${fm}${eol}noindex: true${eol}---`,
    );
    if (next === text) {
      console.error(`❌ ${p.slug}: frontmatter 블록 매칭 실패 — noindex 미삽입. 수동 확인 필요.`);
      process.exit(1);
    }
    writeFileSync(src, next, 'utf8');
  } else {
    renameSync(src, join(PRUNED_DIR, p.file));
    existingMap.redirects.push({
      slug: p.slug,
      from: p.from,
      to: p.to,
      action: p.action,
      date: today,
    });
  }
}

// ── redirect-map.json + public/_redirects 관리 블록 재생성 ──
writeFileSync(MAP_PATH, JSON.stringify(existingMap, null, 2) + '\n', 'utf8');

const rules = [];
for (const r of existingMap.redirects) {
  const fromNoSlash = r.from.replace(/\/$/, '');
  rules.push(`${r.from}  ${r.to}  301`);
  rules.push(`${fromNoSlash}  ${r.to}  301`);
}
if (rules.length > REDIRECT_RULE_WARN) {
  console.warn(`⚠️  리디렉션 룰 ${rules.length}건 — CF Pages 상한(2,000) 근접. 통합 필요.`);
}

let redirectsText = readFileSync(REDIRECTS_PATH, 'utf8');
const block = `${BLOCK_START}\n${rules.join('\n')}\n${BLOCK_END}`;
if (redirectsText.includes(BLOCK_START)) {
  redirectsText = redirectsText.replace(
    new RegExp(`${BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    block,
  );
} else {
  redirectsText = redirectsText.trimEnd() + '\n\n' + block + '\n';
}
writeFileSync(REDIRECTS_PATH, redirectsText, 'utf8');

// ── audit 로그 ──
mkdirSync(AUDITS_DIR, { recursive: true });
const logPath = join(AUDITS_DIR, `pruning-${today}.json`);
const prevLog = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : { batches: [] };
prevLog.batches.push({
  ranAt: new Date().toISOString(),
  csv: csvPath,
  applied: plan,
  skipped: skips,
});
writeFileSync(logPath, JSON.stringify(prevLog, null, 2) + '\n', 'utf8');

console.log(`\n✅ 적용 완료 — redirect-map ${existingMap.redirects.length}건, audit: ${logPath}`);
console.log('   다음: 빌드 검증(pnpm build) → PR → 운영자 merge-approved 라벨 승인');
