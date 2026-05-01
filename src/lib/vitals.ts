/**
 * Real User Monitoring — Core Web Vitals
 *
 * 발생 흐름:
 *   1. 동의 부여(analytics_storage=granted) 후 ConsentBanner/Analytics가 initVitals()를 호출.
 *   2. web-vitals 라이브러리가 페이지 라이프사이클 동안 LCP/INP/CLS/FCP/TTFB를 측정.
 *   3. 각 메트릭이 확정될 때 GA4(`event`) + dataLayer로 전송.
 *
 * GA4 측정기준 등록 방법:
 *   - 관리 → 이벤트 → 권장 이벤트 위에 커스텀 측정기준 추가:
 *     metric_id (event-scoped, text), metric_value (number), metric_delta (number),
 *     metric_rating (text: good/needs-improvement/poor)
 *   - 보고서: 탐색 → 자유양식 → metric_value 평균/p75 by 차원=metric_id
 *
 * 임계값(2026 통합 CWV, AGENTS.md):
 *   LCP good ≤ 2500 / poor > 4000
 *   INP good ≤ 200 (단, 이 사이트는 150 강화 임계값 사용) / poor > 500
 *   CLS good ≤ 0.1 / poor > 0.25
 *   FCP good ≤ 1800 / poor > 3000
 *   TTFB good ≤ 800 / poor > 1800
 *
 * 한 페이지에서 가시성 변경 시 web-vitals가 메트릭을 다시 emit한다 (delta 누적).
 */

import type { Metric } from 'web-vitals';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __vitalsInit?: boolean;
  }
}

const STRICT_THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 150, poor: 500 }, // 본 사이트는 150ms 강화
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

export function classify(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = STRICT_THRESHOLDS[name];
  if (!t) return 'needs-improvement';
  if (value <= t.good) return 'good';
  if (value > t.poor) return 'poor';
  return 'needs-improvement';
}

function buildPayload(metric: Metric) {
  return {
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: classify(metric.name, metric.value),
    metric_navigation_type: metric.navigationType,
    page_path: typeof location !== 'undefined' ? location.pathname : undefined,
  };
}

function send(metric: Metric) {
  const payload = buildPayload(metric);

  // GA4 — Partytown forwarder가 메인 스레드 호출을 워커로 전달
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      ...payload,
      non_interaction: true,
    });
  }

  // dataLayer 직접 — gtag 미주입 환경(테스트·디버그) 안전망
  if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: `web_vitals_${metric.name}`, ...payload });
  }
}

/**
 * Vitals 측정 시작. 멱등성 보장 — 중복 호출되어도 한 번만 구독.
 */
export async function initVitals(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.__vitalsInit) return;
  window.__vitalsInit = true;

  const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');
  onCLS(send);
  onINP(send);
  onLCP(send);
  onFCP(send);
  onTTFB(send);
}
