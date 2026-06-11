// AdSense 수동 유닛 lazy-init — 뷰포트 근접 시에만 adsbygoogle push.
// below-fold 슬롯은 PSI lab 측정 중 로드되지 않음 (Google 권장 광고 lazy loading 패턴,
// docs/23-adsense-revenue-ops.md 결정 #11).
// 사중 가드 (§3-1 (5)): ① 단일 등록 ② 요소별 멱등 ③ 숨김 ins push 차단 (무효 노출 방지)
// ④ push 는 IO 콜백에서만 — 소프트 내비게이션 직후 메인스레드(INP 구간)와 분리.

declare global {
  interface Window {
    __adsLazyInit?: boolean;
    adsbygoogle?: object[];
  }
}

function ensureLoader(client: string): void {
  // Auto ads 병행기에는 Base.astro head 로더가 이미 존재 → no-op (docs/23 R3).
  // Auto ads OFF + head 로더 제거 후에는 이 함수가 유일한 로더 주입 경로가 된다.
  if (
    document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    )
  ) {
    return;
  }
  if (!client) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

if (!window.__adsLazyInit) {
  window.__adsLazyInit = true;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        if (el.dataset.adsPushed === '1') continue;
        // 숨김 상태 push = '사용자에게 보이지 않는 광고 게재' 정책 위반 경로 — 원천 차단
        if (el.offsetParent === null) continue;
        el.dataset.adsPushed = '1';
        ensureLoader(el.dataset.adClient ?? '');
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    },
    { rootMargin: '200px' },
  );

  const observe = (): void => {
    document.querySelectorAll<HTMLElement>('ins.adsbygoogle').forEach((el) => {
      if (el.dataset.adsObserved === '1') return;
      el.dataset.adsObserved = '1';
      io.observe(el);
    });
  };

  // astro:page-load 는 최초 로드와 모든 소프트 내비게이션에서 발생.
  // 리스너는 모듈 1회 등록 — ClientRouter swap 누적 없음.
  document.addEventListener('astro:page-load', observe);
  observe();
}

export {};
