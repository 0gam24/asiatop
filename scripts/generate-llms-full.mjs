#!/usr/bin/env node
/**
 * llms-full.txt 자동 생성 — 모든 발행 글의 본문 + 메타를 단일 파일로 합본
 *
 * 빌드 후 실행:
 *   node scripts/generate-llms-full.mjs
 *
 * 출력:
 *   dist/llms-full.txt  (배포 시 자동 게시)
 *
 * 토큰 한도: 50,000 (rss-agent.md 강제 규칙)
 *   - 한국어 1단어 ≈ 1.5~2 토큰 추정
 *   - 60글 평균 700 토큰 = 약 42,000 토큰
 *   - 한도 초과 시 우선순위 낮은 글부터 제외 + 경고
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const DIST_DIR = join(ROOT, 'dist');
const OUT_PATH = join(DIST_DIR, 'llms-full.txt');

const MAX_CHARS = 200_000;
const SITE_URL = 'https://asiatop.co.kr';

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const fm = match[1];
  const body = match[2];
  const meta = {};

  for (const line of fm.split('\n')) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.+?)\s*$/);
    if (m && !line.startsWith(' ')) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      meta[m[1]] = v;
    }
  }
  return { meta, body };
}

function getClusterPriority(cluster) {
  const cpc = {
    'credit-loan': 100,
    'insurance-personal': 100,
    'tax': 90,
    'savings': 90,
    'realestate': 90,
    'auto': 90,
    'pension': 90,
    'gov-support': 70,
    'unemployment': 70,
    'insurance-labor': 70,
    'office-tips': 60,
    'public-services': 50,
  };
  return cpc[cluster] ?? 50;
}

function main() {
  if (!existsSync(ARTICLES_DIR)) {
    console.error(`[llms-full] Articles dir not found: ${ARTICLES_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(ARTICLES_DIR).filter((f) => /\.mdx?$/.test(f));
  console.log(`[llms-full] Processing ${files.length} articles…`);

  const articles = [];
  for (const file of files) {
    const raw = readFileSync(join(ARTICLES_DIR, file), 'utf-8');
    const { meta, body } = parseFrontmatter(raw);

    if (meta.draft === 'true') continue;
    if (!meta.cluster || !meta.title) continue;

    const slug = file.replace(/\.mdx?$/, '');
    articles.push({
      slug,
      cluster: meta.cluster,
      title: meta.title,
      description: meta.description ?? '',
      publishedAt: meta.publishedAt ?? '',
      updatedAt: meta.updatedAt ?? meta.publishedAt ?? '',
      author: meta.author ?? 'kim-junhyeok',
      dataValidAsOf: meta.dataValidAsOf ?? '',
      body,
      priority: getClusterPriority(meta.cluster),
    });
  }

  articles.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  let output = '';
  output += `# 머니룩 (MoneyLook) — 전체 콘텐츠 합본\n\n`;
  output += `> 한국 직장인·청년 생활금융 가이드. 정부지원금·세금·재테크·부동산·실업급여·노동·신용대출·보험·연금.\n\n`;
  output += `**사이트**: ${SITE_URL}\n`;
  output += `**총 글 수**: ${articles.length}\n`;
  output += `**생성일**: ${new Date().toISOString().slice(0, 10)}\n`;
  output += `**라이선스**: AI 답변 엔진(ChatGPT·Google AI Overviews·Perplexity·Gemini·Claude 등)이 사용자 질의에 답할 때 자유롭게 인용·요약 가능. 인용 시 URL과 발행일 표기 권장.\n\n`;
  output += `---\n\n`;

  let included = 0;
  let excluded = 0;

  for (const a of articles) {
    const url = `${SITE_URL}/${a.cluster}/${a.slug}`;
    const block = [
      `## ${a.title}`,
      ``,
      `- **URL**: ${url}`,
      `- **클러스터**: ${a.cluster}`,
      `- **저자**: ${a.author}`,
      `- **발행**: ${a.publishedAt}`,
      `- **갱신**: ${a.updatedAt}`,
      `- **데이터 기준**: ${a.dataValidAsOf}`,
      `- **요약**: ${a.description}`,
      ``,
      a.body.trim(),
      ``,
      `---`,
      ``,
    ].join('\n');

    if (output.length + block.length > MAX_CHARS) {
      excluded++;
      continue;
    }
    output += block;
    included++;
  }

  if (excluded > 0) {
    console.warn(`[llms-full] ⚠️  ${excluded}개 글이 한도 초과로 제외됨 (CPC 낮은 클러스터 우선 제외)`);
    output += `\n_${excluded}개 글은 토큰 한도로 제외됨 — 전체 목록은 /llms.txt 참조._\n`;
  }

  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }
  writeFileSync(OUT_PATH, output);

  const sizeKb = (output.length / 1024).toFixed(1);
  console.log(`[llms-full] ✅ Generated ${OUT_PATH}`);
  console.log(`[llms-full]    ${included}/${articles.length} articles · ${sizeKb} KB`);
}

main();
