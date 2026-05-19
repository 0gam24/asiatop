#!/usr/bin/env node
/**
 * R95-10 — Stage 3 pillar 묶음 (cluster_questions).
 *
 * 단편 질문 1개 = 글 1개 양산 방지. 유사 질문 3~5건을 묶어 1 pillar 토픽으로.
 *
 * 입력: briefs/_pool/_pending/*.txt (collector 적재본)
 * 출력: data/topics/<topic_id>.json (pillar 묶음)
 *
 * 알고리즘 (단순·결정론적, 임베딩 라이브러리 X):
 *   1. 각 질문 title 에서 핵심 명사·동사 추출 (cluster-keywords 활용)
 *   2. cluster 별로 그룹핑
 *   3. 같은 cluster 안에서 키워드 overlap >= 임계 (예: 3 단어) 질문끼리 묶음
 *   4. 묶음 크기 3~5 면 pillar 채택, < 3 이면 pending 보존 (다음날 신규와 재그룹핑)
 *
 * 사용:
 *   node scripts/cluster-questions.mjs                # dry-run, 통계만
 *   DRY_RUN=0 node scripts/cluster-questions.mjs      # 실제 topic 파일 생성
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { mapCluster } from './gates/g2-cluster-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POOL_PENDING = join(ROOT, 'briefs', '_pool', '_pending');
const TOPICS_DIR = join(ROOT, 'data', 'topics');

const DRY_RUN = process.env.DRY_RUN !== '0';
const MIN_GROUP = 3;
const MAX_GROUP = 5;
const KEYWORD_OVERLAP_MIN = 2; // 그룹 후보 간 최소 공통 키워드 수

function loadPendingQuestions() {
  if (!existsSync(POOL_PENDING)) return [];
  const files = readdirSync(POOL_PENDING).filter((f) => f.endsWith('.txt'));
  return files.map((f) => {
    const raw = readFileSync(join(POOL_PENDING, f), 'utf-8');
    const lines = raw.split(/\r?\n/);
    const title = lines[0] || '';
    const meta = {};
    for (const line of lines.slice(1)) {
      const m = line.match(/^#\s*([a-z_]+):\s*(.+)$/i);
      if (m) meta[m[1]] = m[2].trim();
    }
    return { file: f, title, meta };
  });
}

function extractTokens(title) {
  // 한글 단어 단위 분리 (공백·구두점 기준) + 길이 >= 2
  return new Set(
    title
      .split(/[\s,.!?·\(\)\[\]"']/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2),
  );
}

function overlap(a, b) {
  let count = 0;
  for (const t of a) if (b.has(t)) count++;
  return count;
}

function hash(s) {
  return createHash('sha1').update(s).digest('hex').slice(0, 12);
}

function groupByCluster(questions) {
  const byCluster = new Map();
  for (const q of questions) {
    const g2 = mapCluster(q.title);
    const cluster = g2.pass ? g2.cluster : q.meta.cluster || 'unknown';
    if (!byCluster.has(cluster)) byCluster.set(cluster, []);
    byCluster.get(cluster).push({ ...q, cluster, tokens: extractTokens(q.title) });
  }
  return byCluster;
}

function groupSimilar(items) {
  // greedy: 각 미할당 item 을 head 로, 이후 item 들의 overlap >= 임계 면 합류
  const used = new Set();
  const groups = [];
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const head = items[i];
    const group = [head];
    used.add(i);
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      if (group.length >= MAX_GROUP) break;
      const o = overlap(head.tokens, items[j].tokens);
      if (o >= KEYWORD_OVERLAP_MIN) {
        group.push(items[j]);
        used.add(j);
      }
    }
    groups.push(group);
  }
  return groups;
}

function pickPrimaryKeyword(group) {
  // 그룹 내 모든 토큰 빈도 계산, 최빈 token 1~3개
  const freq = new Map();
  for (const q of group) {
    for (const t of q.tokens) freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
}

function main() {
  const questions = loadPendingQuestions();
  console.log(`[cluster-questions] pending 큐 ${questions.length}건 로드`);
  if (questions.length === 0) {
    console.log('[cluster-questions] 큐 비어있음 — skip');
    return;
  }

  const byCluster = groupByCluster(questions);
  console.log(`[cluster-questions] cluster ${byCluster.size}개로 분류`);

  const topics = [];
  const pending = []; // 3건 미만 그룹

  for (const [cluster, items] of byCluster) {
    if (items.length < MIN_GROUP) {
      pending.push(...items);
      continue;
    }
    const groups = groupSimilar(items);
    for (const g of groups) {
      if (g.length < MIN_GROUP) {
        pending.push(...g);
        continue;
      }
      const primary = pickPrimaryKeyword(g);
      const topicId = hash(cluster + ':' + g.map((q) => q.title).join('|'));
      topics.push({
        topic_id: topicId,
        cluster,
        primary_keywords: primary,
        size: g.length,
        questions: g.map((q) => ({
          title: q.title,
          source: q.meta.source ?? null,
          file: q.file,
        })),
      });
    }
  }

  console.log('');
  console.log(`[cluster-questions] 결과:`);
  console.log(`  📦 pillar 토픽: ${topics.length}개 (3+ 묶음)`);
  console.log(`  ⏳ pending 이월: ${pending.length}건 (3건 미만 그룹)`);

  for (const t of topics) {
    console.log(`\n  📌 ${t.topic_id} · ${t.cluster} · ${t.size}건`);
    console.log(`     keywords: ${t.primary_keywords.join(', ')}`);
    for (const q of t.questions) console.log(`     - ${q.title}`);
  }

  if (!DRY_RUN && topics.length > 0) {
    if (!existsSync(TOPICS_DIR)) mkdirSync(TOPICS_DIR, { recursive: true });
    for (const t of topics) {
      const path = join(TOPICS_DIR, `${t.topic_id}.json`);
      writeFileSync(path, JSON.stringify(t, null, 2), 'utf-8');
    }
    console.log(`\n[cluster-questions] ✅ ${topics.length}개 topic 파일 저장: data/topics/`);
  }

  if (DRY_RUN) {
    console.log(`\n[cluster-questions] dry-run — 실제 저장: DRY_RUN=0 node scripts/cluster-questions.mjs`);
  }
}

main();
