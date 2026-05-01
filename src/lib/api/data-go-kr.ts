/**
 * 공공데이터포털 (data.go.kr) API 래퍼
 *
 * - 빌드 타임 호출 only (런타임 호출 금지 — Rate Limit·키 노출 위험)
 * - Zod 검증 강제
 * - 인증키 미설정 시 mock 데이터 반환 (개발 단계)
 *
 * 사용:
 *   import { fetchYouthHousingSupport } from '@/lib/api/data-go-kr';
 *   const data = await fetchYouthHousingSupport();
 */

import { z } from 'zod';

const BASE_URL = 'https://api.odcloud.kr/api';
const API_KEY = import.meta.env.DATA_GO_KR_KEY;

const RATE_LIMIT_PER_MINUTE = 30;
let lastCallTimes: number[] = [];

async function rateLimitGuard(): Promise<void> {
  const now = Date.now();
  lastCallTimes = lastCallTimes.filter((t) => now - t < 60_000);
  if (lastCallTimes.length >= RATE_LIMIT_PER_MINUTE) {
    const waitMs = 60_000 - (now - lastCallTimes[0]!);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  lastCallTimes.push(Date.now());
}

interface FetchOptions {
  endpoint: string;
  params?: Record<string, string | number>;
  schema: z.ZodTypeAny;
  mockData: unknown;
}

async function fetchWithSchema<T>(opts: FetchOptions): Promise<T> {
  if (!API_KEY) {
    console.warn(
      `[data-go-kr] API key not set — returning mock data for ${opts.endpoint}. Set DATA_GO_KR_KEY in .env to fetch real data.`,
    );
    return opts.schema.parse(opts.mockData) as T;
  }

  await rateLimitGuard();

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    returnType: 'JSON',
    ...Object.fromEntries(Object.entries(opts.params ?? {}).map(([k, v]) => [k, String(v)])),
  });

  const url = `${BASE_URL}${opts.endpoint}?${params}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`[data-go-kr] HTTP ${res.status} for ${opts.endpoint}`);
  }

  const json = await res.json();
  return opts.schema.parse(json) as T;
}

const YouthHousingItemSchema = z.object({
  region: z.string(),
  monthlySupport: z.number(),
  durationMonths: z.number(),
  incomeLimit: z.number(),
  programName: z.string(),
});

const YouthHousingResponseSchema = z.object({
  items: z.array(YouthHousingItemSchema),
  totalCount: z.number(),
  asOfDate: z.string(),
});

export type YouthHousingItem = z.infer<typeof YouthHousingItemSchema>;
export type YouthHousingResponse = z.infer<typeof YouthHousingResponseSchema>;

export async function fetchYouthHousingSupport(): Promise<YouthHousingResponse> {
  return fetchWithSchema<YouthHousingResponse>({
    endpoint: '/15083323/v1/uddi:youth-housing-support',
    schema: YouthHousingResponseSchema,
    mockData: {
      items: [
        { region: '서울', monthlySupport: 200000, durationMonths: 12, incomeLimit: 60000000, programName: '청년월세 한시 특별지원' },
        { region: '경기', monthlySupport: 150000, durationMonths: 12, incomeLimit: 60000000, programName: '경기도 청년 기본주거비 지원' },
        { region: '부산', monthlySupport: 100000, durationMonths: 12, incomeLimit: 50000000, programName: '부산 청년월세 지원' },
      ],
      totalCount: 3,
      asOfDate: '2026-04-01',
    },
  });
}

const KosisIndicatorSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  asOfDate: z.string(),
});

export type KosisIndicator = z.infer<typeof KosisIndicatorSchema>;

export async function fetchEconomicIndicators(): Promise<KosisIndicator[]> {
  return fetchWithSchema<KosisIndicator[]>({
    endpoint: '/15012345/v1/uddi:kosis-key-indicators',
    schema: z.array(KosisIndicatorSchema),
    mockData: [
      { name: '기준금리', value: 3.0, unit: '%', asOfDate: '2026-04-01' },
      { name: '실업률', value: 2.8, unit: '%', asOfDate: '2026-03-01' },
      { name: '소비자물가지수', value: 113.2, unit: '2020=100', asOfDate: '2026-03-01' },
      { name: '청년실업률(15-29세)', value: 6.4, unit: '%', asOfDate: '2026-03-01' },
    ],
  });
}

export const API_HEALTH = {
  hasKey: Boolean(API_KEY),
  message: API_KEY
    ? '인증키가 설정되었습니다. 빌드 시 실제 API를 호출합니다.'
    : '인증키 미설정 — mock 데이터로 동작합니다. data.go.kr에서 운영인증키 발급 후 .env에 DATA_GO_KR_KEY를 설정하세요.',
};
