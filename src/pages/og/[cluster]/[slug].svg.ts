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

/**
 * 타이틀 = 히어로 (R66, 2026-07-08).
 * 이전: keywords[0] 를 초대형 후크로 노출 → 타이틀 첫 어절과 중복 + 정사각 크롭 시
 *       앞부분 잘려 "…카드" 같은 조각만 남는 문제. 후크 제거하고 타이틀을 주인공으로.
 * 마지막 줄이 잘리면 … 표기.
 */
function wrapTitle(title: string, maxPerLine: number, maxLines: number): string[] {
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
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s·,]+$/, '') + '…';
    return kept;
  }
  return lines;
}

export async function GET(context: APIContext) {
  const { article } = context.props as { article: ArticleProp };
  const cluster = findCluster(article.data.cluster);
  const accent = cluster?.accent === '#0F1B2D' ? '#5B8DEF' : (cluster?.accent ?? '#00C896');
  const clusterTitle = cluster?.shortTitle ?? '';
  const icon = getClusterIcon(article.data.cluster);

  const titleLinesArr = wrapTitle(article.data.title, 18, 3);
  // 줄 수에 따라 블록을 수직 중앙 근처에 배치 (브랜드 아래 ~ 배지 위)
  const lineGap = 74;
  const blockTop = 300 - ((titleLinesArr.length - 1) * lineGap) / 2;
  const titleLines = titleLinesArr
    .map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : lineGap}">${escapeXml(line)}</tspan>`)
    .join('');

  const refDate = article.data.updatedAt ?? article.data.publishedAt;
  const dateStr = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(refDate);

  // 우하단 데이터 갱신일 — YMYL 신선도 신호 + CTR 가산
  const validAsOf = article.data.dataValidAsOf
    ? `${article.data.dataValidAsOf} 기준`
    : `${dateStr} 기준`;

  const iconSize = 36;
  const iconScale = iconSize / 24;
  const iconStrokePx = 1.6;
  const iconStrokeNorm = iconStrokePx / iconScale;
  const iconParts = [
    ...icon.paths.map((d) => `<path d="${d}"/>`),
    ...(icon.circles ?? []).map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`),
    ...(icon.lines ?? []).map((l) => `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`),
  ].join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
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

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- 좌측 액센트 바 (CTR 시각 후크) -->
  <rect x="0" y="0" width="16" height="630" fill="url(#accentGlow)"/>

  <!-- 우상단 액센트 블롭 (시선 분산 + 시각 임팩트) -->
  <circle cx="1080" cy="100" r="160" fill="${accent}" opacity="0.18"/>
  <circle cx="1140" cy="50" r="80" fill="${accent}" opacity="0.25"/>

  <!-- Brand mark + 클러스터 태그 (좌상) -->
  <g transform="translate(80, 80)">
    <text x="0" y="32" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" letter-spacing="-1">머니룩</text>
    <circle cx="92" cy="22" r="6" fill="#00C896"/>
    <text x="116" y="32" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="600" fill="${accent}" letter-spacing="-0.3">${escapeXml(clusterTitle)}</text>
  </g>

  <!-- 타이틀 = 히어로 (최대 3줄, 수직 중앙 근처) -->
  <text x="80" y="${blockTop}" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="56" font-weight="800" fill="#FFFFFF" letter-spacing="-2">${titleLines}</text>

  <!-- 카테고리 아이콘 (우하단, 보조 시각 요소) -->
  <g transform="translate(1040, 500) scale(${iconScale})" fill="none" stroke="${accent}" stroke-width="${iconStrokeNorm}" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">${iconParts}</g>

  <!-- 우하단 데이터 갱신일 (YMYL 신선도 + CTR 가산) -->
  <g transform="translate(80, 550)">
    <rect x="0" y="0" width="220" height="36" rx="18" fill="rgba(255,255,255,0.08)" stroke="${accent}" stroke-width="1"/>
    <text x="110" y="23" text-anchor="middle" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="600" fill="#FFFFFF">${escapeXml(validAsOf)}</text>
  </g>

  <!-- Footer 도메인 -->
  <text x="1120" y="572" text-anchor="end" font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="500" fill="#6B7785">asiatop.co.kr</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
