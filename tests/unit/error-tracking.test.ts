import { describe, it, expect } from 'vitest';
import { scrubUrl, scrubEvent } from '../../src/lib/error-tracking';

describe('scrubUrl', () => {
  it('절대 URL의 query string·fragment를 제거한다', () => {
    expect(scrubUrl('https://example.com/path?q=secret&utm=x#frag')).toBe(
      'https://example.com/path',
    );
  });

  it('자기 도메인은 origin을 생략한다', () => {
    expect(scrubUrl('https://asiatop.co.kr/tax/article?q=test')).toBe('/tax/article');
  });

  it('상대 경로의 query·fragment를 제거한다', () => {
    expect(scrubUrl('/search?q=청년월세지원#top')).toBe('/search');
  });

  it('mailto·tel은 변경하지 않는다', () => {
    expect(scrubUrl('mailto:editor@asiatop.co.kr')).toBe('mailto:editor@asiatop.co.kr');
    expect(scrubUrl('tel:+82-10-1234-5678')).toBe('tel:+82-10-1234-5678');
  });

  it('null/undefined 안전 처리', () => {
    expect(scrubUrl(undefined)).toBeUndefined();
    expect(scrubUrl(null)).toBeUndefined();
  });
});

describe('scrubEvent (Sentry beforeSend)', () => {
  it('request.url scrub + query_string 제거', () => {
    const result = scrubEvent({
      request: {
        url: 'https://asiatop.co.kr/tax/yearend?q=salary&token=secret',
        query_string: 'q=salary&token=secret',
      },
    });
    expect(result.request?.url).toBe('/tax/yearend');
    expect(result.request).not.toHaveProperty('query_string');
  });

  it('PII 헤더(authorization·cookie 등) 제거', () => {
    const result = scrubEvent({
      request: {
        url: 'https://example.com/x',
        headers: {
          'Authorization': 'Bearer xxx',
          'Cookie': 'session=abc',
          'X-API-Key': 'k123',
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
        },
      },
    });
    expect(result.request?.headers).not.toHaveProperty('Authorization');
    expect(result.request?.headers).not.toHaveProperty('Cookie');
    expect(result.request?.headers).not.toHaveProperty('X-API-Key');
    expect(result.request?.headers).toHaveProperty('User-Agent');
    expect(result.request?.headers).toHaveProperty('Accept');
  });

  it('user.ip_address·email 제거', () => {
    const result = scrubEvent({
      user: { id: 'anon', ip_address: '203.0.113.10', email: 'a@b.com' },
    });
    expect(result.user).not.toHaveProperty('ip_address');
    expect(result.user).not.toHaveProperty('email');
    expect(result.user).toHaveProperty('id');
  });

  it('request·user 없는 이벤트도 안전하게 처리', () => {
    const event = { message: 'test', level: 'error' };
    expect(() => scrubEvent(event)).not.toThrow();
  });
});
