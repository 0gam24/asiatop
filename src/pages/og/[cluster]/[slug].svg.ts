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
  };
}

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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
  const accent = cluster?.accent ?? '#00C896';
  const clusterTitle = cluster?.shortTitle ?? '';
  const icon = getClusterIcon(article.data.cluster);

  const iconSize = 56;
  const iconScale = iconSize / 24;
  const iconStrokePx = 1.4;
  const iconStrokeNorm = iconStrokePx / iconScale;
  const iconParts = [
    ...icon.paths.map((d) => `<path d="${d}"/>`),
    ...(icon.circles ?? []).map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`),
    ...(icon.lines ?? []).map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`),
  ].join('');

  const lines = wrapTitle(article.data.title);
  const dateStr = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(article.data.publishedAt);

  const titleLines = lines
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 76}">${escapeXml(line)}</tspan>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F1B2D"/>
      <stop offset="100%" stop-color="#1A2940"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect x="0" y="0" width="8" height="630" fill="${accent}"/>

  <!-- Brand mark -->
  <g transform="translate(80, 70)">
    <text x="0" y="42" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="32" font-weight="800" fill="#FFFFFF" letter-spacing="-1">머니룩</text>
    <circle cx="106" cy="30" r="7" fill="#00C896"/>
  </g>

  <!-- Cluster tag + icon -->
  <g transform="translate(80, 160)">
    <g transform="translate(0, 0) scale(${iconScale})" fill="none" stroke="${accent}" stroke-width="${iconStrokeNorm}" stroke-linecap="round" stroke-linejoin="round">${iconParts}</g>
    <g transform="translate(${iconSize + 16}, 8)">
      <rect x="0" y="0" width="${clusterTitle.length * 24 + 28}" height="40" rx="20" fill="rgba(255,255,255,0.08)" stroke="${accent}" stroke-width="1.5"/>
      <text x="${(clusterTitle.length * 24 + 28) / 2}" y="26" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="700" fill="${accent}">${escapeXml(clusterTitle)}</text>
    </g>
  </g>

  <!-- Title -->
  <text x="80" y="300" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="56" font-weight="800" fill="#FFFFFF" letter-spacing="-2.5">${titleLines}</text>

  <!-- Footer -->
  <g transform="translate(80, 540)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="500" fill="#6B7785">${escapeXml(dateStr)} · asiatop.co.kr</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
