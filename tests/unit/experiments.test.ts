import { describe, it, expect } from 'vitest';
import { experiments } from '../../src/lib/experiments';

describe('experiments registry', () => {
  it('모든 실험은 id가 키와 일치한다', () => {
    for (const [key, cfg] of Object.entries(experiments)) {
      expect(cfg.id).toBe(key);
    }
  });

  it('모든 실험은 variants 2개 이상을 가진다', () => {
    for (const cfg of Object.values(experiments)) {
      expect(cfg.variants.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('weights가 있다면 variants와 길이가 같다', () => {
    for (const cfg of Object.values(experiments)) {
      if (cfg.weights) expect(cfg.weights.length).toBe(cfg.variants.length);
    }
  });
});
