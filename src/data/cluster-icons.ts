/**
 * 12개 클러스터 단색 라인 아이콘 데이터 (24×24 viewBox)
 *
 * 이모지 대체용. ClusterIcon 컴포넌트와 HeroIllustration 모두 참조.
 * Lucide 풍 stroke 라인 아이콘.
 */

export interface IconData {
  paths: readonly string[];
  circles?: readonly { cx: number; cy: number; r: number }[];
  lines?: readonly { x1: number; y1: number; x2: number; y2: number }[];
}

export type ClusterIconKey =
  | 'gov-support'
  | 'tax'
  | 'realestate'
  | 'unemployment'
  | 'savings'
  | 'insurance-labor'
  | 'auto'
  | 'public-services'
  | 'office-tips'
  | 'credit-loan'
  | 'insurance-personal'
  | 'pension';

export const CLUSTER_ICONS: Record<ClusterIconKey, IconData> = {
  'gov-support': {
    paths: [
      'M20 12v10H4V12',
      'M2 7h20v5H2z',
      'M12 22V7',
      'M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z',
      'M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
    ],
  },
  tax: {
    paths: [
      'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z',
      'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8',
    ],
    lines: [{ x1: 12, y1: 17.5, x2: 12, y2: 6.5 }],
  },
  realestate: {
    paths: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  },
  unemployment: {
    paths: [
      'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
      'M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z',
    ],
  },
  savings: {
    paths: [
      'M21 12V7H5a2 2 0 1 1 0-4h14v4',
      'M3 5v14a2 2 0 0 0 2 2h16v-5',
      'M18 12a2 2 0 0 0 0 4h4v-4z',
    ],
  },
  'insurance-labor': {
    paths: [
      'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
      'M9 12l2 2 4-4',
    ],
  },
  auto: {
    paths: [
      'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.25-1.42-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2',
    ],
    circles: [
      { cx: 6.5, cy: 16.5, r: 2.5 },
      { cx: 16.5, cy: 16.5, r: 2.5 },
    ],
    lines: [{ x1: 9, y1: 17, x2: 14, y2: 17 }],
  },
  'public-services': {
    paths: ['M3 22h18', 'M5 22V11l7-7 7 7v11', 'M9 22V14h6v8'],
  },
  'office-tips': {
    paths: [
      'M9.94 14.34a2 2 0 0 0-1.71 1.71L7 22l-1.23-5.95a2 2 0 0 0-1.71-1.71L0 13l4.06-1.34a2 2 0 0 0 1.71-1.71L7 4l1.23 5.95a2 2 0 0 0 1.71 1.71L14 13z',
      'M20 3v4',
      'M22 5h-4',
      'M19.5 17.5l1.5 1.5',
    ],
  },
  'credit-loan': {
    paths: ['M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M2 10h20'],
  },
  'insurance-personal': {
    paths: [
      'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.7 0-3 .5-4.5 2-1.5-1.5-2.8-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z',
      'M3.22 12H9.5l.5-1 2 4 .5-1h6.78',
    ],
  },
  pension: {
    paths: [
      'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z',
      'M2 21c0-3 1.85-5.36 5.08-6',
    ],
  },
};

export function getClusterIcon(slug: string): IconData {
  return CLUSTER_ICONS[slug as ClusterIconKey] ?? CLUSTER_ICONS['office-tips'];
}
