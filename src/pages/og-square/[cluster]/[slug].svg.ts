/**
 * R65 — 1:1 OG variant (1200×1200)
 *
 * 16:9 OG 카드와 별개로 정사각형 카드 생성.
 * 이유:
 *   - Google Discover 모바일 피드: 정사각형 카드 CTR 30~50% 우위
 *   - Perplexity 답변 카드 우측 썸네일: 1:1 가장 잘 잡힘
 *   - X·Threads·LinkedIn 모바일: 1:1 노출 우위
 *
 * JSON-LD Article.image 배열에 16:9 + 1:1 동시 노출 → Google 권장.
 */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { findCluster } from '../../../data/clusters';
import { getClusterIcon } from '../../../data/cluster-icons';

export async function getStaticPaths() {
  let articles: Awaited<ReturnType<typeof getCollection>> = [];
  try {
    articles = await getCollection('articles', ({ data }) => !data.draft);
  } catch {
    return [];
  }
  return articles.map((article) => ({
    params: {
      cluster: article.data.cluster,
      slug: article.id.replace(/\.mdx?$/, ''),
    },
    props: { article },
  }));
}

interface ArticleProp {
  data: {
    title: string;
    cluster: string;
    publishedAt: Date;
    updatedAt?: Date;
    keywords?: string[];
    dataValidAsOf?: string;
  };
}

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function pickHook(article: ArticleProp): string {
  const kw = article.data.keywords?.[0];
  if (kw && kw.length <= 18) return kw;
  const firstWord = article.data.title.split(/[\s—\-·,]/)[0];
  return firstWord.slice(0, 14);
}

function wrapTitle(title: string, maxPerLine: number = 16): string[] {
  const lines: string[] = [];
  let current = '';
  for (const ch of title) {
    if (current.length >= maxPerLine && /[\s,·—-]/.test(ch)) {
      lines.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

export async function GET(context: APIContext) {
  const { article } = context.props as { article: ArticleProp };
  const cluster = findCluster(article.data.cluster);
  const accent = cluster?.accent === '#0F1B2D' ? '#5B8DEF' : (cluster?.accent ?? '#00C896');
  const clusterTitle = cluster?.shortTitle ?? '';
  const icon = getClusterIcon(article.data.cluster);

  const hook = pickHook(article);
  const titleLinesArr = wrapTitle(article.data.title, 16);
  const titleLines = titleLinesArr
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : 48}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  const refDate = article.data.updatedAt ?? article.data.publishedAt;
  const dateStr = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(refDate);
  const validAsOf = article.data.dataValidAsOf
    ? `${article.data.dataValidAsOf} 기준`
    : `${dateStr} 기준`;

  const iconSize = 48;
  const iconScale = iconSize / 24;
  const iconStrokePx = 1.6;
  const iconStrokeNorm = iconStrokePx / iconScale;
  const iconParts = [
    ...icon.paths.map((d) => `<path d="${d}"/>`),
    ...(icon.circles ?? []).map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`),
    ...(icon.lines ?? []).map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`),
  ].join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F1B2D"/>
      <stop offset="100%" stop-color="#1A2940"/>
    </linearGradient>
    <linearGradient id="accentGlow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="1200" fill="url(#bg)"/>
  <rect width="1200" height="1200" fill="url(#grid)"/>

  <!-- 액센트 바 (좌) -->
  <rect x="0" y="0" width="16" height="1200" fill="url(#accentGlow)"/>

  <!-- 우상단 블롭 -->
  <circle cx="1080" cy="120" r="200" fill="${accent}" opacity="0.18"/>
  <circle cx="1140" cy="60" r="100" fill="${accent}" opacity="0.25"/>

  <!-- Brand + 클러스터 태그 (좌상) -->
  <g transform="translate(80, 100)">
    <text x="0" y="40" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="36" font-weight="800" fill="#FFFFFF" letter-spacing="-1.2">머니룩</text>
    <circle cx="118" cy="28" r="8" fill="#00C896"/>
    <text x="146" y="40" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="600" fill="${accent}" letter-spacing="-0.4">${escapeXml(clusterTitle)}</text>
  </g>

  <!-- 짧은 niche 후크 — 가운데 큰 폰트 (1:1 가독성 핵심) -->
  <text x="80" y="540" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="120" font-weight="900" fill="${accent}" letter-spacing="-5">${escapeXml(hook)}</text>

  <!-- 풀 타이틀 (3줄 컷) -->
  <text x="80" y="690" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="42" font-weight="700" fill="#FFFFFF" letter-spacing="-1.4">${titleLines}</text>

  <!-- 카테고리 아이콘 (우하단) -->
  <g transform="translate(1020, 1020) scale(${iconScale})" fill="none" stroke="${accent}" stroke-width="${iconStrokeNorm}" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">${iconParts}</g>

  <!-- 데이터 갱신일 (좌하단) -->
  <g transform="translate(80, 1080)">
    <rect x="0" y="0" width="260" height="44" rx="22" fill="rgba(255,255,255,0.08)" stroke="${accent}" stroke-width="1.2"/>
    <text x="130" y="29" text-anchor="middle" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="17" font-weight="600" fill="#FFFFFF">${escapeXml(validAsOf)}</text>
  </g>

  <!-- 도메인 (우하단) -->
  <text x="1120" y="1108" text-anchor="end" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="500" fill="#6B7785">asiatop.co.kr</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
