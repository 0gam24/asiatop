/**
 * A/B 테스트 인프라 (클라이언트 사이드, 캐시 친화적)
 *
 * 사용:
 *   import { Experiment } from '@/components/Experiment.astro';
 *   <Experiment id="hero_cta" variants={['A', 'B']}>
 *     <Fragment slot="A">기본 버전</Fragment>
 *     <Fragment slot="B">실험 버전</Fragment>
 *   </Experiment>
 *
 * - 첫 방문 시 variant 무작위 할당 → localStorage 저장 (Sticky)
 * - 후속 방문 시 같은 variant 노출 (일관 경험)
 * - GA4 이벤트로 노출·클릭 추적
 * - SSG 캐시 깨지 않음 (모든 variant HTML이 함께 빌드됨)
 */

export interface ExperimentConfig {
  id: string;
  variants: string[];
  weights?: number[];
}

export const experiments: Record<string, ExperimentConfig> = {
  hero_cta: {
    id: 'hero_cta',
    variants: ['baseline', 'urgent', 'specific'],
  },
  ad_position: {
    id: 'ad_position',
    variants: ['top', 'middle'],
  },
};
