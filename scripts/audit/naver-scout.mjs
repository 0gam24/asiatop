// ════════════════════════════════════════════════════════════════════════
// naver-scout.mjs — 발행 전 정찰: 이 쿼리의 네이버 웹문서 자리가 열려 있나 (공식 API 만, LLM 0)
//
// 계획: docs/ops/KEYWORD-PLAN-2026-09-15.md §4. awoo `naver-rank-check --mode=scout` 의 출력 이름을 맞췄지만
// 통합검색 페이지(search.naver.com)는 받지 않는다(robots Disallow). API 로 못 재는 값은 null 로 두고 대리지표를 붙인다.
//   rank          웹문서 검색 API 30위 안 자사 순위 (null = 30위 밖). 통합검색 첫 화면 순위와 다르다.
//   webDocCount   웹문서 검색 total
//   openSlots     상위 10 중 상업·UGC·옛 문서
//   mainGovAbove  상위 5 관공서 · publicAbove 상위 5 공단 · wallTop5 상위 5 관공서+공단+도구
//   toolAbove · lawAbove · fincoAbove  상위 10 · naverAbove 상위 3 네이버 자사 서비스
//   pressAbove    null (웹문서 API 에 뉴스 블록이 없다) → newsWall = 뉴스 API 최근 7일 기사 수
//   webDocOffset  null (자동 측정 불가) → eyeOffset 은 큐에서 사람이 채운다(§4-3)
//   verdictT1/T2  open|closed, reason[], warn[], above[] {r,host,kind,stale,title}
// 이 이름은 파이프라인·위젯이 그대로 믿는다. 바꾸지 말고 추가만 한다.
//
// 실행:
//   node scripts/audit/naver-scout.mjs --query "주휴수당 퇴사하는 주"
//   node scripts/audit/naver-scout.mjs --file queries.txt [--limit 25] [--out 결과.json] [--no-news]
//     (--file: 한 줄에 쿼리 하나, '#' 줄 무시. JSON 이면 문자열 배열 / {queries:[]} / [{query}])
// 출력: 단건이면 객체, 여러 건이면 배열을 stdout 에 JSON 으로. 저장소에 쓰지 않는다(--out 을 줄 때만).
// 예산: 쿼리당 호출 2회(webkr·news). 검색 API 무료 일 25,000. 수동 실행 상한 기본 25, 파이프라인은 함수로 호출.
// ════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { naverSearch, naverClient, stripTags, cleanLink, sleep, isMain, NaverAuthError, ROOT } from './lib/naver-api.mjs';
import { classifyItems, summarize, verdicts } from './lib/naver-hosts.mjs';

const WEB_DEPTH = 30;
const NEWS_DAYS = 7;

export async function scoutQuery(query, { news = true, year = new Date(Date.now() + 9 * 3600e3).getUTCFullYear(), eyeOffset = null } = {}) {
  const q = String(query || '').trim();
  const measuredAt = new Date().toISOString();
  try {
    const web = await naverSearch('webkr', q, { display: WEB_DEPTH });
    const items = (web.items || []).map((it) => ({ title: stripTags(it.title), link: it.link }));
    const above = classifyItems(items, { year });
    const s = summarize(above);
    let newsWall = null;
    if (news) {
      const nj = await naverSearch('news', q, { display: 100, sort: 'date' });
      const cutoff = Date.now() - NEWS_DAYS * 864e5;
      newsWall = (nj.items || []).filter((x) => new Date(x.pubDate).getTime() >= cutoff).length;
    }
    const v = verdicts(s, { newsWall, eyeOffset });
    const ours = s.rank ? items[s.rank - 1] : null;
    return {
      query: q, measuredAt, api: naverClient().label,
      rank: s.rank, ourUrl: ours ? cleanLink(ours.link) : null,
      webDocCount: web.total ?? null,
      openSlots: s.openSlots, mainGovAbove: s.mainGovAbove, publicAbove: s.publicAbove, wallTop5: s.wallTop5,
      toolAbove: s.toolAbove, lawAbove: s.lawAbove, fincoAbove: s.fincoAbove, naverAbove: s.naverAbove, naverRefAbove: s.naverRefAbove,
      pressAbove: null, newsWall, webDocOffset: null, eyeOffset,
      verdictT1: v.verdictT1, verdictT2: v.verdictT2, reason: v.reason, warn: v.warn,
      kindsTop10: s.kindsTop10,
      above: above.slice(0, 10),
    };
  } catch (e) {
    if (e instanceof NaverAuthError) throw e;
    return { query: q, measuredAt, error: String(e.message || e).slice(0, 120), verdictT1: 'closed', verdictT2: 'closed', reason: ['측정 실패'], warn: [] };
  }
}

export async function scoutMany(queries, { limit = Infinity, delayMs = 150, onProgress, ...opts } = {}) {
  const uniq = [...new Set(queries.map((q) => String(q || '').trim()).filter(Boolean))].slice(0, limit);
  const out = [];
  for (const q of uniq) {
    out.push(await scoutQuery(q, opts));
    onProgress?.(out[out.length - 1]);
    await sleep(delayMs);
  }
  return out;
}

export function readQueryFile(file) {
  const raw = readFileSync(path.resolve(ROOT, file), 'utf8');
  if (/\.json$/i.test(file)) {
    const j = JSON.parse(raw);
    const arr = Array.isArray(j) ? j : (j.queries || j.keywords || []);
    return arr.map((x) => (typeof x === 'string' ? x : x.query || x.keyword)).filter(Boolean);
  }
  return raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes('--help') || (!opt('--query') && !opt('--file'))) {
    console.error('사용: node scripts/audit/naver-scout.mjs --query "쿼리" | --file 파일 [--limit 25] [--out 파일] [--no-news]');
    process.exit(args.includes('--help') ? 0 : 2);
  }
  const limit = Number(opt('--limit') || 25);
  const news = !args.includes('--no-news');
  try {
    let result;
    if (opt('--query')) {
      result = await scoutQuery(opt('--query'), { news });
    } else {
      const qs = readQueryFile(opt('--file'));
      result = await scoutMany(qs, { limit, news, onProgress: (r) => process.stderr.write(r.error ? '!' : r.verdictT2 === 'open' ? 'o' : 'x') });
      process.stderr.write('\n');
    }
    const json = JSON.stringify(result, null, 1);
    if (opt('--out')) { writeFileSync(path.resolve(ROOT, opt('--out')), json + '\n'); console.error(`→ ${opt('--out')}`); } else console.log(json);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}
