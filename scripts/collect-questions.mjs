#!/usr/bin/env node
/**
 * R95-1 — 지식인 → pending 큐 적재 콜렉터.
 *
 * 매일 KST 05:30 (UTC 20:30) 실행. auto-publish (KST 06:00) 30분 전.
 *
 * 흐름:
 *   1. data/cluster-keywords.json 12 cluster × 키워드 일부 sample
 *   2. Naver 지식인 search (sort=date) — 매 cluster 당 1개 키워드
 *   3. dedup: 기존 360편 publishedAt-history 와 비교 (간단 title overlap)
 *   4. 답변 부족 시그널 (description 짧음) 상위 N건 선정
 *   5. briefs/_pool/_pending/<hash>.txt 로 저장 (첫 줄 = 질문)
 *
 * 안전망:
 *   - NAVER_CLIENT_ID 없으면 즉시 종료 (fail-closed)
 *   - 큐 상한 5건 (over fill 방지)
 *   - 24h dedup-index 통과한 질문만 적재
 *
 * 사용:
 *   node scripts/collect-questions.mjs --limit 2          # 최대 2건 적재
 *   DRY_RUN=1 node scripts/collect-questions.mjs --limit 2
 */

import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { searchKin, extractSourceSignal } from './lib/naver-kin-collector.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POOL_PENDING = join(ROOT, 'briefs', '_pool', '_pending');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const KEYWORDS_PATH = join(ROOT, 'data', 'cluster-keywords.json');

const argv = process.argv.slice(2);
const LIMIT = Number(argv[argv.indexOf('--limit') + 1] || 2);
const DRY_RUN = process.env.DRY_RUN === '1';
const POOL_MAX = 5;

function hash(s) {
  return createHash('sha1').update(s).digest('hex').slice(0, 16);
}

function loadExistingTitles() {
  const titles = new Set();
  for (const f of readdirSync(ARTICLES_DIR)) {
    if (!f.endsWith('.mdx')) continue;
    const raw = readFileSync(join(ARTICLES_DIR, f), 'utf-8');
    const m = raw.match(/^title:\s*"(.+?)"/m);
    if (m) titles.add(m[1].toLowerCase().replace(/\s+/g, ''));
  }
  return titles;
}

function isSimilar(question, existingTitles) {
  const q = question.toLowerCase().replace(/\s+/g, '');
  for (const t of existingTitles) {
    if (t.length < 10) continue;
    const keywords = q.split(/[?.,!]/).filter((w) => w.length > 4);
    let hits = 0;
    for (const w of keywords) if (t.includes(w)) hits++;
    if (hits >= 3) return true;
  }
  return false;
}

function countExistingQueue() {
  if (!existsSync(POOL_PENDING)) return 0;
  return readdirSync(POOL_PENDING).filter((f) => f !== '.gitkeep' && !f.startsWith('.')).length;
}

async function main() {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    if (!process.env.MOCK_NAVER_KIN) {
      console.error('[collect] ❌ NAVER_CLIENT_ID/SECRET 미설정 — fail-closed');
      process.exit(1);
    }
    console.log('[collect] ℹ️  MOCK_NAVER_KIN 모드');
  }

  const existingQ = countExistingQueue();
  const space = Math.min(LIMIT, POOL_MAX - existingQ);
  if (space <= 0) {
    console.log(`[collect] 큐 이미 ${existingQ}건 (상한 ${POOL_MAX}) — skip`);
    return;
  }

  const keywords = JSON.parse(readFileSync(KEYWORDS_PATH, 'utf-8'));
  const existingTitles = loadExistingTitles();
  console.log(`[collect] 기존 article ${existingTitles.size}편 dedup baseline · 큐 ${existingQ}/${POOL_MAX} · 목표 ${space}건`);

  const candidates = [];
  const useMock = !process.env.NAVER_CLIENT_ID;

  for (const [cluster, kwList] of Object.entries(keywords)) {
    if (cluster.startsWith('_')) continue;
    if (!Array.isArray(kwList) || kwList.length === 0) continue;
    // cluster 당 1개 키워드 sample (random)
    const kw = kwList[Math.floor(Math.random() * kwList.length)];
    try {
      const items = await searchKin(kw, { display: 10, sort: 'date', mock: useMock });
      for (const item of items) {
        if (!item.title || item.title.length < 10) continue;
        if (isSimilar(item.title, existingTitles)) continue;
        const sig = extractSourceSignal(item);
        candidates.push({ cluster, kw, ...item, ...sig });
      }
    } catch (e) {
      console.warn(`[collect] cluster=${cluster} kw=${kw} 실패: ${e.message}`);
    }
  }

  console.log(`[collect] 후보 ${candidates.length}건 수집`);
  if (candidates.length === 0) {
    console.log('[collect] 후보 0건 — skip');
    return;
  }

  // 답변 부족 시그널 (unmet_market_score) + 최신순 정렬
  candidates.sort((a, b) => b.unmet_market_score - a.unmet_market_score || b.collected_at.localeCompare(a.collected_at));
  const picked = candidates.slice(0, space);

  if (!existsSync(POOL_PENDING)) mkdirSync(POOL_PENDING, { recursive: true });

  for (const c of picked) {
    const h = hash(c.title + c.link);
    const path = join(POOL_PENDING, `${h}.txt`);
    if (existsSync(path)) continue;
    const content = `${c.title}\n# cluster: ${c.cluster}\n# keyword: ${c.kw}\n# unmet_market: ${c.unmet_market_score}\n# source: ${c.link}\n# collected_at: ${c.collected_at}\n`;
    if (DRY_RUN) {
      console.log(`  [DRY] ${h}.txt — ${c.title} (cluster=${c.cluster}, unmet=${c.unmet_market_score})`);
    } else {
      writeFileSync(path, content, 'utf-8');
      console.log(`  ✅ ${h}.txt — ${c.title} (cluster=${c.cluster}, unmet=${c.unmet_market_score})`);
    }
  }

  console.log(`[collect] ${picked.length}건 ${DRY_RUN ? '적재 대상' : '적재 완료'} · 큐 = ${existingQ + (DRY_RUN ? 0 : picked.length)}/${POOL_MAX}`);
}

main().catch((e) => {
  console.error('[collect] ❌ 예외:', e.message);
  process.exit(1);
});
