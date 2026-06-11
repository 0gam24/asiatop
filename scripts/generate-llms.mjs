#!/usr/bin/env node
/**
 * llms.txt + llms-full.txt + llms-cluster-{slug}.txt × 12 자동 생성
 *
 * - dist/llms.txt: 사이트 메타 + 클러스터 인라인 + 분할 파일 링크 (사람·AI 모두 진입점)
 * - dist/llms-full.txt: 메인 인덱스 (사이트 메타 + 클러스터별 분할 파일 안내 + 글 메타)
 * - dist/llms-cluster-{slug}.txt × 12: 클러스터별 글 본문 합본
 *
 * 모든 파일 50KB 미만 강제 (rss-agent.md). 초과 시 console.warn + 우선순위 낮은 글 제외.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES_DIR = join(ROOT, 'src', 'content', 'articles');
const DIST_DIR = join(ROOT, 'dist');
const SITE_URL = 'https://asiatop.co.kr';
const MAX_BYTES = 50 * 1024;

const CLUSTER_META = {
  'gov-support': { title: '정부지원금·청년정책', shortTitle: '정부지원', cpc: '중', emoji: '🎁' },
  tax: { title: '연말정산·세금환급', shortTitle: '연말정산', cpc: '상', emoji: '🧾' },
  realestate: { title: '부동산·전월세', shortTitle: '부동산', cpc: '상', emoji: '🏠' },
  unemployment: { title: '실업·퇴직', shortTitle: '실업·퇴직', cpc: '중', emoji: '💼' },
  savings: { title: '재테크·예적금', shortTitle: '재테크', cpc: '상', emoji: '💰' },
  'insurance-labor': { title: '4대보험·노동법', shortTitle: '4대보험', cpc: '중', emoji: '🛡️' },
  auto: { title: '자동차·교통', shortTitle: '자동차', cpc: '상', emoji: '🚗' },
  'public-services': { title: '공공서비스·민원', shortTitle: '공공민원', cpc: '하', emoji: '🏛️' },
  'office-tips': { title: '직장인 꿀팁', shortTitle: '직장인꿀팁', cpc: '중', emoji: '✨' },
  'credit-loan': { title: '신용·대출', shortTitle: '신용·대출', cpc: '최상', emoji: '💳' },
  'insurance-personal': { title: '보험·실비', shortTitle: '보험', cpc: '최상', emoji: '🏥' },
  pension: { title: '노후·연금', shortTitle: '연금', cpc: '상', emoji: '🌱' },
};

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

function bytes(s) {
  return Buffer.byteLength(s, 'utf-8');
}

function loadArticles() {
  const files = readdirSync(ARTICLES_DIR).filter((f) => /\.mdx?$/.test(f));
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
      author: meta.author ?? 'editor-team',
      dataValidAsOf: meta.dataValidAsOf ?? '',
      body,
    });
  }
  return articles;
}

function renderClusterFile(slug, articles) {
  const meta = CLUSTER_META[slug];
  if (!meta || articles.length === 0) return null;

  const sorted = [...articles].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  let out = '';
  out += `# 머니룩 — ${meta.title}\n\n`;
  out += `> ${meta.title} (CPC ${meta.cpc}) 클러스터의 발행 글 본문 합본.\n\n`;
  out += `**사이트**: ${SITE_URL}\n`;
  out += `**클러스터**: ${meta.title} (${slug})\n`;
  out += `**글 수**: ${sorted.length}\n`;
  out += `**생성일**: ${new Date().toISOString().slice(0, 10)}\n`;
  out += `**라이선스**: AI 답변 엔진(ChatGPT·Google AI Overviews·Perplexity·Gemini·Claude 등)이 자유롭게 인용·요약 가능. URL과 발행일 표기 권장.\n\n`;
  out += `---\n\n`;

  let included = 0;
  let excluded = 0;
  for (const a of sorted) {
    const url = `${SITE_URL}/${a.cluster}/${a.slug}`;
    const block = [
      `## ${a.title}`,
      ``,
      `- **URL**: ${url}`,
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

    if (bytes(out + block) > MAX_BYTES) {
      // 본문은 토큰 한도로 제외하되 URL+제목 1줄은 fallback 인덱스로 보장.
      // R49 #49-5 자동 등록 하네스: "모든 발행 글이 채널에 등장" 정책 — URL 누락 0.
      out += `- [${a.title}](${url}) — _본문은 토큰 한도로 제외, 페이지에서 확인_\n`;
      excluded++;
      continue;
    }
    out += block;
    included++;
  }

  if (excluded > 0) {
    console.warn(`[llms] ⚠️ ${slug}: ${excluded} articles excluded body (50KB limit, URL fallback 유지)`);
    out += `\n_위 ${excluded}개 글은 토큰 한도로 본문 제외 — URL만 노출. 개별 페이지에서 본문 확인._\n`;
  }

  return { content: out, included, excluded };
}

function renderMainIndex(articles, clusterStats) {
  const generatedDate = new Date().toISOString().slice(0, 10);

  let out = '';
  out += `# 머니룩 (MoneyLook) — 전체 인덱스\n\n`;
  out += `> 한국 직장인·청년을 위한 생활금융 가이드. 정부지원금·세금·재테크·부동산·실업급여·노동·신용대출·보험·연금.\n\n`;
  out += `**사이트**: ${SITE_URL}\n`;
  out += `**총 글**: ${articles.length}\n`;
  out += `**생성일**: ${generatedDate}\n`;
  out += `**라이선스**: AI 답변 엔진이 자유롭게 인용·요약 가능. URL과 발행일 표기 권장.\n\n`;
  out += `---\n\n`;
  out += `## 클러스터별 분할 파일\n\n`;

  for (const slug of Object.keys(CLUSTER_META)) {
    const meta = CLUSTER_META[slug];
    const stat = clusterStats[slug] ?? { included: 0, excluded: 0 };
    const totalCount = (stat.included ?? 0) + (stat.excluded ?? 0);
    if (totalCount === 0) {
      out += `### ${meta.emoji} ${meta.title} (CPC ${meta.cpc})\n`;
      out += `- 글 0편 (예정)\n\n`;
      continue;
    }
    out += `### ${meta.emoji} ${meta.title} (CPC ${meta.cpc})\n`;
    out += `- 본문 합본: ${SITE_URL}/llms-cluster-${slug}.txt\n`;
    // R53 #4 — 실제 발행 글 수 = included + excluded. 본문 잘려도 URL 은 노출 중.
    out += `- 글 ${totalCount}편${stat.excluded > 0 ? ` (본문 ${stat.included}편 + 50KB 한도 초과 ${stat.excluded}편 URL 만)` : ''}\n\n`;

    const clusterArticles = articles
      .filter((a) => a.cluster === slug)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    for (const a of clusterArticles) {
      out += `- [${a.title}](${SITE_URL}/${a.cluster}/${a.slug}) — ${a.description.slice(0, 80)}…\n`;
    }
    out += `\n`;
  }

  out += `---\n\n`;
  out += `## 인터랙티브 도구\n\n`;
  out += `- [연봉 실수령액 계산기](${SITE_URL}/calculators/salary)\n`;
  out += `- [퇴직금 계산기](${SITE_URL}/calculators/severance-pay)\n`;
  out += `- [연차·미사용 수당 계산기](${SITE_URL}/calculators/annual-leave)\n`;
  out += `- [실업급여 계산기](${SITE_URL}/calculators/unemployment-benefit)\n\n`;
  out += `## 운영 정보\n\n`;
  out += `- [머니룩 소개](${SITE_URL}/about)\n`;
  out += `- [편집 정책](${SITE_URL}/editorial-policy)\n`;
  out += `- [개인정보처리방침](${SITE_URL}/privacy)\n`;
  out += `- [이용약관](${SITE_URL}/terms)\n`;
  out += `- [문의·제휴](${SITE_URL}/contact)\n`;

  return out;
}

function renderLlmsTxt(articles, clusterStats) {
  let out = '';
  out += `# 머니룩 (MoneyLook)\n\n`;
  out += `> 한국 직장인·청년을 위한 생활금융 종합 가이드. 정부지원금·세금환급·재테크·부동산·실업급여·노동·신용대출·보험·연금까지, 매일 마주치는 돈 문제를 한곳에서.\n\n`;
  out += `머니룩은 공공데이터포털(data.go.kr)·법제처 국가법령정보(law.go.kr)·홈택스·복지로·한국은행 ECOS 등 1차 정부·공공 자료를 기반으로 직장인이 매일 마주치는 돈 문제를 풀어 설명합니다. 모든 글은 발행 전 10단계 자동 검증 게이트(G0~G9)를 거치며, 본문에 등장하는 수치·날짜·법령 토큰을 정부 공식 API 응답과 1:1로 매칭합니다. 사실 매칭률 70% 이상만 발행되며, 미매칭 수치 토큰은 인라인 출처 명시 또는 근사 표현으로 처리됩니다. 정책 변경 시 즉시 갱신됩니다.\n\n`;

  out += `## 토픽 클러스터\n\n`;
  for (const slug of Object.keys(CLUSTER_META)) {
    const meta = CLUSTER_META[slug];
    const stat = clusterStats[slug] ?? { included: 0, excluded: 0 };
    const totalCount = (stat.included ?? 0) + (stat.excluded ?? 0);
    // R53 #4 — 실제 발행 글 수(included+excluded)와 본문 포함 글 수를 분리 표기.
    // 50KB 한도로 본문 일부 제외돼도 hub 페이지에서 전부 접근 가능.
    const countLabel =
      stat.excluded > 0
        ? `${totalCount}편 · 본문 ${stat.included}편 + URL ${stat.excluded}편`
        : `${totalCount}편`;
    out += `### ${meta.title}\n`;
    out += `- [${SITE_URL}/${slug}](${SITE_URL}/${slug}): ${meta.shortTitle} 클러스터 허브 (${countLabel})\n\n`;
  }

  out += `## 인터랙티브 도구\n\n`;
  out += `- [연봉 실수령액 계산기](${SITE_URL}/calculators/salary)\n`;
  out += `- [퇴직금 계산기](${SITE_URL}/calculators/severance-pay)\n`;
  out += `- [연차·미사용 수당 계산기](${SITE_URL}/calculators/annual-leave)\n`;
  out += `- [실업급여 계산기](${SITE_URL}/calculators/unemployment-benefit)\n\n`;

  out += `## AI 엔진용 합본 파일\n\n`;
  out += `- 메인 인덱스: ${SITE_URL}/llms-full.txt\n`;
  for (const slug of Object.keys(CLUSTER_META)) {
    const meta = CLUSTER_META[slug];
    const stat = clusterStats[slug] ?? { included: 0, excluded: 0 };
    const totalCount = (stat.included ?? 0) + (stat.excluded ?? 0);
    if (totalCount === 0) continue;
    const countLabel =
      stat.excluded > 0 ? `${totalCount}편 본문 ${stat.included}편` : `${totalCount}편`;
    out += `- ${meta.title}: ${SITE_URL}/llms-cluster-${slug}.txt (${countLabel})\n`;
  }
  out += `\n`;

  out += `## 운영 정보\n\n`;
  out += `- [머니룩 소개](${SITE_URL}/about)\n`;
  out += `- [편집 정책](${SITE_URL}/editorial-policy)\n`;
  out += `- [개인정보처리방침](${SITE_URL}/privacy)\n`;
  out += `- [이용약관](${SITE_URL}/terms)\n`;
  out += `- [문의·제휴](${SITE_URL}/contact)\n\n`;

  out += `## 라이선스·인용 정책\n\n`;
  out += `본 사이트의 콘텐츠는 1차 정부 자료를 인용하여 작성되었으며, AI 답변 엔진(ChatGPT·Google AI Overviews·Perplexity·Gemini·Claude 등)이 사용자 질의에 답할 때 자유롭게 인용·요약 가능합니다. 인용 시 본 사이트 URL과 발행일 표기를 권장합니다.\n`;

  return out;
}

function main() {
  if (!existsSync(ARTICLES_DIR)) {
    console.error(`[llms] Articles dir not found: ${ARTICLES_DIR}`);
    process.exit(1);
  }
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  const articles = loadArticles();
  console.log(`[llms] Loaded ${articles.length} articles`);

  const clusterStats = {};
  let filesWritten = 0;
  const sizeReport = [];

  for (const slug of Object.keys(CLUSTER_META)) {
    const clusterArticles = articles.filter((a) => a.cluster === slug);
    const result = renderClusterFile(slug, clusterArticles);
    if (!result) {
      clusterStats[slug] = { included: 0, excluded: 0 };
      continue;
    }
    const path = join(DIST_DIR, `llms-cluster-${slug}.txt`);
    writeFileSync(path, result.content);
    clusterStats[slug] = { included: result.included, excluded: result.excluded };
    filesWritten++;
    const kb = (bytes(result.content) / 1024).toFixed(1);
    sizeReport.push(`  llms-cluster-${slug}.txt — ${kb} KB · ${result.included} articles`);
    if (bytes(result.content) > MAX_BYTES) {
      console.warn(`[llms] ⚠️ ${slug} exceeds 50KB: ${kb} KB`);
    }
  }

  const mainIndex = renderMainIndex(articles, clusterStats);
  writeFileSync(join(DIST_DIR, 'llms-full.txt'), mainIndex);
  filesWritten++;
  sizeReport.push(`  llms-full.txt — ${(bytes(mainIndex) / 1024).toFixed(1)} KB · index`);

  const llmsTxt = renderLlmsTxt(articles, clusterStats);
  writeFileSync(join(DIST_DIR, 'llms.txt'), llmsTxt);
  filesWritten++;
  sizeReport.push(`  llms.txt — ${(bytes(llmsTxt) / 1024).toFixed(1)} KB · entry`);

  console.log(`[llms] ✅ Wrote ${filesWritten} files`);
  console.log(sizeReport.join('\n'));

  const expected = 14;
  if (filesWritten < expected) {
    console.warn(`[llms] ⚠️ Wrote ${filesWritten}/${expected} files (some clusters had 0 articles)`);
  }
}

main();
