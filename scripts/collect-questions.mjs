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
import { sanitizeQuestion } from './gates/g1-question-sanitize.mjs';
import { mapCluster } from './gates/g2-cluster-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POOL_PENDING = join(ROOT, 'briefs', '_pool', '_pending');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const KEYWORDS_PATH = join(ROOT, 'data', 'cluster-keywords.json');

const argv = process.argv.slice(2);
const LIMIT = Number(argv[argv.indexOf('--limit') + 1] || 2);
const DRY_RUN = process.env.DRY_RUN === '1';

// R95-4 — 상업 의도/낚시 키워드 거부 (광고성 질문 차단).
// 발견 사례: "퇴직연금 DC 전환 운용사 추천", "어디서 사야 하나요", "할인 코드 있나요"
const COMMERCIAL_INTENT = [
  '운용사 추천', '회사 추천', '브랜드 추천', '제품 추천', '상품 추천',
  '어디 살', '어디 사', '어디서 사', '어디서 구매',
  '할인 코드', '쿠폰', '프로모션',
  '광고', '협찬',
];

// R95-4 — off-topic 키워드 (금융 사이트 외 도메인).
// Naver kin 응답에 우연히 매칭되는 경우 차단.
const OFF_TOPIC = [
  '돌잔치', '결혼식', '장례식', '제사', '명절 선물',
  '게임', '아이돌', '연예인', '드라마', '영화',
  '맛집', '레시피', '요리법', '다이어트',
  '여행', '항공권', '호텔',
  '병원 추천', '의사 추천',
];

function hasAny(text, list) {
  const t = text.toLowerCase();
  return list.some((kw) => t.includes(kw.toLowerCase()));
}
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
  const seenTitles = new Set(); // R95-5 — 후보 자체 중복 dedup (다른 cluster·keyword 에서 동일 질문 매칭 회피)
  const useMock = !process.env.NAVER_CLIENT_ID;
  const stats = { raw: 0, tooShort: 0, similar: 0, commercial: 0, offTopic: 0, g1Fail: 0, g2Fail: 0, dupCandidate: 0, passed: 0 };

  for (const [cluster, kwList] of Object.entries(keywords)) {
    if (cluster.startsWith('_')) continue;
    if (!Array.isArray(kwList) || kwList.length === 0) continue;
    // cluster 당 키워드 2~3개 sample (random) — 후보 풀 확장
    const samples = [];
    const pool = kwList.slice();
    for (let i = 0; i < Math.min(2, pool.length); i++) {
      const idx = Math.floor(Math.random() * pool.length);
      samples.push(pool[idx]);
      pool.splice(idx, 1);
    }

    for (const kw of samples) {
      try {
        const items = await searchKin(kw, { display: 10, sort: 'date', mock: useMock });
        for (const item of items) {
          stats.raw++;
          if (!item.title || item.title.length < 15) { stats.tooShort++; continue; }
          if (isSimilar(item.title, existingTitles)) { stats.similar++; continue; }
          if (hasAny(item.title, COMMERCIAL_INTENT)) { stats.commercial++; continue; }
          if (hasAny(item.title, OFF_TOPIC)) { stats.offTopic++; continue; }

          // R95-4 — G1 sanitize simulation (PII·욕설·정치 차단)
          const g1 = sanitizeQuestion(item.title);
          if (!g1.pass) { stats.g1Fail++; continue; }

          // R95-4 — G2 cluster mapping simulation (모호 reject 사전 차단)
          const g2 = mapCluster(item.title);
          if (!g2.pass) { stats.g2Fail++; continue; }

          // R95-5 — 후보 풀 내 중복 dedup (정규화된 title 키)
          const normTitle = item.title.toLowerCase().replace(/\s+/g, '');
          if (seenTitles.has(normTitle)) { stats.dupCandidate++; continue; }
          seenTitles.add(normTitle);

          stats.passed++;
          const sig = extractSourceSignal(item);
          candidates.push({ cluster: g2.cluster, kw, g2_score: g2.score, ...item, ...sig });
        }
      } catch (e) {
        console.warn(`[collect] cluster=${cluster} kw=${kw} 실패: ${e.message}`);
      }
    }
  }

  console.log(`[collect] 필터 통계: raw ${stats.raw} → tooShort ${stats.tooShort} · similar ${stats.similar} · commercial ${stats.commercial} · offTopic ${stats.offTopic} · g1Fail ${stats.g1Fail} · g2Fail ${stats.g2Fail} · dupCandidate ${stats.dupCandidate} → PASS ${stats.passed}`);

  if (candidates.length === 0) {
    console.log('[collect] G1·G2 통과 후보 0건 — skip (큐 적재 없음)');
    return;
  }

  // R95-4 — G2 score 높은 순 + 답변 부족 시그널 + 최신순 (다중 키 정렬)
  candidates.sort((a, b) => {
    if (b.g2_score !== a.g2_score) return b.g2_score - a.g2_score;
    if (b.unmet_market_score !== a.unmet_market_score) return b.unmet_market_score - a.unmet_market_score;
    return b.collected_at.localeCompare(a.collected_at);
  });
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
