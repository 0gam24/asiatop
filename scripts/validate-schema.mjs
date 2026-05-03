/**
 * Schema.org Rich Results 검증
 *
 * 빌드 산출물(`dist/`)의 모든 JSON-LD를 Google Rich Results Test 수준의
 * 필드 규칙으로 검증한다. (Google 공식 문서 기준)
 *
 * 검증 @type:
 *   - Article / NewsArticle  https://developers.google.com/search/docs/appearance/structured-data/article
 *   - BreadcrumbList         https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 *   - FAQPage                https://developers.google.com/search/docs/appearance/structured-data/faqpage
 *   - Organization           https://developers.google.com/search/docs/appearance/structured-data/organization
 *   - WebSite                https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox
 *   - Person                 https://schema.org/Person
 *   - CollectionPage         https://schema.org/CollectionPage
 *   - AboutPage / ContactPage (필수 필드 최소 검증)
 *
 * 종료 코드: 실패 1건 이상 → 1, 아니면 0.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

const errors = [];
const warnings = [];
let typeCounts = new Map();

const fail = (page, type, msg) => errors.push({ page, type, msg });
const warn = (page, type, msg) => warnings.push({ page, type, msg });

function* walkHtml(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function isUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isIsoDate(value) {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.valueOf());
}

function asArray(v) {
  return Array.isArray(v) ? v : [v];
}

// ---- @type별 검증기 ----------------------------------------------------

function checkArticle(page, obj) {
  // headline (Google: 110자 이하 권장)
  if (!obj.headline || typeof obj.headline !== 'string') {
    fail(page, obj['@type'], 'headline 누락 또는 비문자열');
  } else if (obj.headline.length > 110) {
    warn(page, obj['@type'], `headline ${obj.headline.length}자 (Google 권장 ≤110자)`);
  }

  // image — URL 또는 ImageObject 또는 배열
  if (!obj.image) {
    fail(page, obj['@type'], 'image 누락');
  } else {
    const images = asArray(obj.image);
    for (const img of images) {
      const url = typeof img === 'string' ? img : img?.url;
      if (!isUrl(url)) {
        fail(page, obj['@type'], `image URL 형식 오류: ${JSON.stringify(img).slice(0, 60)}`);
      }
    }
  }

  // datePublished — ISO 8601
  if (!obj.datePublished) fail(page, obj['@type'], 'datePublished 누락');
  else if (!isIsoDate(obj.datePublished)) fail(page, obj['@type'], `datePublished ISO 형식 아님: ${obj.datePublished}`);

  // dateModified (선택, 권장)
  if (obj.dateModified && !isIsoDate(obj.dateModified)) {
    fail(page, obj['@type'], `dateModified ISO 형식 아님: ${obj.dateModified}`);
  }

  // author — name 필수
  if (!obj.author) {
    fail(page, obj['@type'], 'author 누락');
  } else {
    const authors = asArray(obj.author);
    for (const a of authors) {
      if (typeof a === 'string') continue; // 이름 문자열만 있는 경우
      if (!a || typeof a !== 'object') {
        fail(page, obj['@type'], `author 형식 오류`);
        continue;
      }
      if (!a.name) fail(page, obj['@type'], 'author.name 누락');
      if (a['@type'] && !['Person', 'Organization'].includes(a['@type'])) {
        warn(page, obj['@type'], `author.@type=${a['@type']} (Person/Organization 권장)`);
      }
    }
  }

  // publisher — name + logo (URL 또는 ImageObject)
  if (!obj.publisher) {
    fail(page, obj['@type'], 'publisher 누락');
  } else {
    if (!obj.publisher.name && !obj.publisher['@id']) {
      fail(page, obj['@type'], 'publisher.name 또는 @id 필요');
    }
    if (obj.publisher.logo) {
      const logo = obj.publisher.logo;
      const logoUrl = typeof logo === 'string' ? logo : logo?.url;
      if (!isUrl(logoUrl)) {
        fail(page, obj['@type'], `publisher.logo URL 형식 오류`);
      }
    }
  }

  // mainEntityOfPage (선택, 권장)
  if (obj.mainEntityOfPage && typeof obj.mainEntityOfPage === 'string' && !isUrl(obj.mainEntityOfPage)) {
    warn(page, obj['@type'], `mainEntityOfPage URL 권장`);
  }
}

function checkBreadcrumbList(page, obj) {
  if (!obj.itemListElement) {
    fail(page, 'BreadcrumbList', 'itemListElement 누락');
    return;
  }
  if (!Array.isArray(obj.itemListElement)) {
    fail(page, 'BreadcrumbList', 'itemListElement는 배열이어야 함');
    return;
  }
  if (obj.itemListElement.length < 1) {
    fail(page, 'BreadcrumbList', 'itemListElement 비어 있음');
    return;
  }
  obj.itemListElement.forEach((item, i) => {
    if (item['@type'] !== 'ListItem') fail(page, 'BreadcrumbList', `[${i}] @type≠ListItem`);
    if (typeof item.position !== 'number') fail(page, 'BreadcrumbList', `[${i}] position 숫자 아님`);
    if (!item.name || typeof item.name !== 'string') fail(page, 'BreadcrumbList', `[${i}] name 누락`);
    // item.item — 마지막은 생략 가능, 중간은 URL 필수
    const isLast = i === obj.itemListElement.length - 1;
    if (!isLast && !isUrl(item.item)) {
      fail(page, 'BreadcrumbList', `[${i}] item URL 필요 (현재 위치 외 모든 단계)`);
    }
    if (item.item && typeof item.item === 'string' && !isUrl(item.item)) {
      fail(page, 'BreadcrumbList', `[${i}] item URL 형식 오류: ${item.item}`);
    }
  });
}

function checkFaqPage(page, obj) {
  if (!obj.mainEntity || !Array.isArray(obj.mainEntity) || obj.mainEntity.length < 1) {
    fail(page, 'FAQPage', 'mainEntity 배열(≥1) 필요');
    return;
  }
  obj.mainEntity.forEach((q, i) => {
    if (q['@type'] !== 'Question') fail(page, 'FAQPage', `[${i}] @type≠Question`);
    if (!q.name || typeof q.name !== 'string') fail(page, 'FAQPage', `[${i}] Question.name 누락`);
    if (!q.acceptedAnswer) {
      fail(page, 'FAQPage', `[${i}] acceptedAnswer 누락`);
    } else {
      if (q.acceptedAnswer['@type'] !== 'Answer') fail(page, 'FAQPage', `[${i}] acceptedAnswer.@type≠Answer`);
      if (!q.acceptedAnswer.text || typeof q.acceptedAnswer.text !== 'string') {
        fail(page, 'FAQPage', `[${i}] acceptedAnswer.text 누락`);
      }
    }
  });
}

function checkOrganization(page, obj) {
  if (!obj.name) fail(page, 'Organization', 'name 누락');
  if (!obj.url) fail(page, 'Organization', 'url 누락');
  else if (!isUrl(obj.url)) fail(page, 'Organization', `url 형식 오류: ${obj.url}`);
  if (obj.logo) {
    const logoUrl = typeof obj.logo === 'string' ? obj.logo : obj.logo.url;
    if (!isUrl(logoUrl)) fail(page, 'Organization', `logo URL 형식 오류`);
  }
  if (obj.sameAs) {
    const urls = asArray(obj.sameAs);
    for (const u of urls) {
      if (!isUrl(u)) fail(page, 'Organization', `sameAs URL 형식 오류: ${u}`);
    }
  }
}

function checkWebSite(page, obj) {
  if (!obj.name) fail(page, 'WebSite', 'name 누락');
  if (!obj.url) fail(page, 'WebSite', 'url 누락');
  else if (!isUrl(obj.url)) fail(page, 'WebSite', `url 형식 오류`);
  // potentialAction (Sitelinks Searchbox) 검증
  if (obj.potentialAction) {
    const pa = obj.potentialAction;
    if (pa['@type'] !== 'SearchAction') warn(page, 'WebSite', `potentialAction.@type=${pa['@type']} (SearchAction 권장)`);
    if (!pa.target) fail(page, 'WebSite', 'potentialAction.target 누락');
    if (!pa['query-input']) fail(page, 'WebSite', 'potentialAction.query-input 누락');
  }
}

function checkPerson(page, obj) {
  if (!obj.name) fail(page, 'Person', 'name 누락');
  if (obj.url && !isUrl(obj.url)) fail(page, 'Person', `url 형식 오류`);
  if (obj.sameAs) {
    const urls = asArray(obj.sameAs);
    for (const u of urls) {
      if (!isUrl(u)) fail(page, 'Person', `sameAs URL 형식 오류: ${u}`);
    }
  }
}

function checkCollectionPage(page, obj) {
  if (!obj.name) fail(page, 'CollectionPage', 'name 누락');
  if (!obj.url) fail(page, 'CollectionPage', 'url 누락');
  else if (!isUrl(obj.url)) fail(page, 'CollectionPage', `url 형식 오류`);
}

function checkSiteNavigationElement(page, obj) {
  if (!obj.name) fail(page, 'SiteNavigationElement', 'name 누락');
  if (!obj.url) fail(page, 'SiteNavigationElement', 'url 누락');
  else if (!isUrl(obj.url)) fail(page, 'SiteNavigationElement', `url 형식 오류`);
  if (typeof obj.position !== 'number') warn(page, 'SiteNavigationElement', 'position 권장');
}

function checkHowTo(page, obj) {
  if (!obj.name) fail(page, 'HowTo', 'name 누락');
  if (!obj.step || !Array.isArray(obj.step) || obj.step.length < 1) {
    fail(page, 'HowTo', 'step 배열(≥1) 필요');
    return;
  }
  obj.step.forEach((s, i) => {
    if (s['@type'] !== 'HowToStep') fail(page, 'HowTo', `[${i}] @type≠HowToStep`);
    if (!s.name) fail(page, 'HowTo', `[${i}] name 누락`);
    if (!s.text) fail(page, 'HowTo', `[${i}] text 누락`);
    if (typeof s.position !== 'number') warn(page, 'HowTo', `[${i}] position 숫자 권장`);
  });
}

function checkWebApplication(page, obj) {
  if (!obj.name) fail(page, 'WebApplication', 'name 누락');
  if (!obj.url) fail(page, 'WebApplication', 'url 누락');
  else if (!isUrl(obj.url)) fail(page, 'WebApplication', `url 형식 오류`);
  if (!obj.applicationCategory) warn(page, 'WebApplication', 'applicationCategory 권장');
  if (!obj.operatingSystem) warn(page, 'WebApplication', 'operatingSystem 권장');
  if (!obj.offers) {
    warn(page, 'WebApplication', 'offers 권장 (무료라도 price=0/Offer 명시)');
  } else {
    const offers = asArray(obj.offers);
    for (const o of offers) {
      if (o['@type'] !== 'Offer') warn(page, 'WebApplication', `offers.@type=${o['@type']} (Offer 권장)`);
      if (o.price === undefined || o.price === null) fail(page, 'WebApplication', 'Offer.price 누락');
      if (!o.priceCurrency) fail(page, 'WebApplication', 'Offer.priceCurrency 누락');
    }
  }
}

function checkPageType(page, obj, expectedType) {
  if (!obj.url) fail(page, expectedType, 'url 누락');
  else if (!isUrl(obj.url)) fail(page, expectedType, `url 형식 오류`);
  if (!obj.name && !obj.headline) {
    warn(page, expectedType, 'name 권장');
  }
}

// QAPage — 자동 발행 글의 source_question 시그널.
// https://schema.org/QAPage / https://developers.google.com/search/docs/appearance/structured-data/qapage
function checkQAPage(page, obj) {
  if (!obj.mainEntity) {
    fail(page, 'QAPage', 'mainEntity 누락 (Question 객체)');
    return;
  }
  const me = obj.mainEntity;
  if (me['@type'] !== 'Question') fail(page, 'QAPage', `mainEntity.@type=${me['@type']} (Question 필요)`);
  if (!me.name && !me.text) fail(page, 'QAPage', 'mainEntity.name 또는 text 필요');
  if (!me.acceptedAnswer && !me.suggestedAnswer) {
    fail(page, 'QAPage', 'mainEntity.acceptedAnswer 또는 suggestedAnswer 필요');
    return;
  }
  const ans = me.acceptedAnswer ?? asArray(me.suggestedAnswer)[0];
  if (ans['@type'] !== 'Answer') fail(page, 'QAPage', `Answer.@type=${ans['@type']} (Answer 필요)`);
  if (!ans.text || typeof ans.text !== 'string') fail(page, 'QAPage', 'Answer.text 누락');
  if (ans.author && typeof ans.author === 'object' && !ans.author['@id'] && !ans.author.name) {
    fail(page, 'QAPage', 'Answer.author 객체에 @id 또는 name 필요');
  }
}

// ClaimReview — 자동 발행 글의 사실 검증 시그널.
// https://schema.org/ClaimReview / https://developers.google.com/search/docs/appearance/structured-data/factcheck
function checkClaimReview(page, obj) {
  if (!obj.url) fail(page, 'ClaimReview', 'url 누락');
  else if (!isUrl(obj.url)) fail(page, 'ClaimReview', `url 형식 오류: ${obj.url}`);
  if (!obj.datePublished) fail(page, 'ClaimReview', 'datePublished 누락');
  else if (!isIsoDate(obj.datePublished)) fail(page, 'ClaimReview', `datePublished ISO 형식 아님: ${obj.datePublished}`);
  if (!obj.author) fail(page, 'ClaimReview', 'author 누락');
  if (!obj.claimReviewed || typeof obj.claimReviewed !== 'string') {
    fail(page, 'ClaimReview', 'claimReviewed 문자열 필요');
  }
  if (!obj.itemReviewed) {
    fail(page, 'ClaimReview', 'itemReviewed 누락 (Claim 객체)');
  } else {
    const ir = obj.itemReviewed;
    if (ir['@type'] !== 'Claim') fail(page, 'ClaimReview', `itemReviewed.@type=${ir['@type']} (Claim 필요)`);
    if (ir.appearance) {
      const apps = asArray(ir.appearance);
      apps.forEach((a, i) => {
        if (!a.url) fail(page, 'ClaimReview', `itemReviewed.appearance[${i}].url 누락`);
        else if (!isUrl(a.url)) fail(page, 'ClaimReview', `itemReviewed.appearance[${i}].url 형식 오류`);
      });
    }
  }
  if (!obj.reviewRating) {
    fail(page, 'ClaimReview', 'reviewRating 누락');
  } else {
    const rr = obj.reviewRating;
    if (rr['@type'] !== 'Rating') warn(page, 'ClaimReview', `reviewRating.@type=${rr['@type']} (Rating 권장)`);
    if (rr.ratingValue === undefined) fail(page, 'ClaimReview', 'reviewRating.ratingValue 누락');
    if (rr.bestRating === undefined) warn(page, 'ClaimReview', 'reviewRating.bestRating 권장');
  }
}

// NewsMediaOrganization — Organization 확장. R48 #48-2.
// Google News·Discover 자격 핵심 필드(publishingPrinciples·verificationFactCheckingPolicy·
// correctionsPolicy·ownershipFundingInfo) 추가 검증.
function checkNewsMediaOrganization(page, obj) {
  // Organization 기본 필드 먼저
  checkOrganization(page, obj);
  // E-E-A-T 정책 URL 4종 — Google News 진입 자격 핵심 시그널.
  const requiredPolicies = [
    'publishingPrinciples',
    'verificationFactCheckingPolicy',
    'correctionsPolicy',
    'ownershipFundingInfo',
  ];
  for (const field of requiredPolicies) {
    if (!obj[field]) {
      warn(page, 'NewsMediaOrganization', `${field} 권장 (Google News 자격)`);
    } else if (typeof obj[field] === 'string' && !isUrl(obj[field])) {
      fail(page, 'NewsMediaOrganization', `${field} URL 형식 오류`);
    }
  }
}

export const VALIDATORS = {
  Article: checkArticle,
  NewsArticle: checkArticle,
  BreadcrumbList: checkBreadcrumbList,
  FAQPage: checkFaqPage,
  QAPage: checkQAPage,
  ClaimReview: checkClaimReview,
  Organization: checkOrganization,
  NewsMediaOrganization: checkNewsMediaOrganization,
  WebSite: checkWebSite,
  Person: checkPerson,
  CollectionPage: checkCollectionPage,
  WebApplication: checkWebApplication,
  HowTo: checkHowTo,
  SiteNavigationElement: checkSiteNavigationElement,
  AboutPage: (p, o) => checkPageType(p, o, 'AboutPage'),
  ContactPage: (p, o) => checkPageType(p, o, 'ContactPage'),
};

/**
 * 단일 엔티티에 적합한 validator를 적용해 누적된 errors/warnings 배열을 반환.
 * 단위 테스트용 — main()의 전역 errors/warnings를 우회해 격리 검증.
 */
export function validateEntity(page, entity) {
  const localErrors = [];
  const localWarnings = [];
  const types = asArray(entity['@type']).filter(Boolean);

  // 임시로 fail/warn 콜백을 로컬 배열로 redirect
  const origErrors = errors.slice();
  const origWarnings = warnings.slice();

  for (const t of types) {
    const validator = VALIDATORS[t];
    if (validator) validator(page, entity);
  }

  // 새로 추가된 항목만 추출 후 전역 배열 복원
  const newErrors = errors.slice(origErrors.length);
  const newWarnings = warnings.slice(origWarnings.length);
  errors.length = origErrors.length;
  warnings.length = origWarnings.length;
  localErrors.push(...newErrors);
  localWarnings.push(...newWarnings);

  return { errors: localErrors, warnings: localWarnings };
}

// ---- 실행 -------------------------------------------------------------

function main() {
  if (!existsSync(DIST)) {
    console.error('❌ dist/ 디렉터리 없음. `pnpm build` 먼저 실행.');
    process.exit(1);
  }

  console.log('🔍 Schema.org Rich Results 검증 시작…\n');

  let pageCount = 0;
  let ldBlockCount = 0;
  let entityCount = 0;
  let parsedFailures = 0;

  for (const file of walkHtml(DIST)) {
    const rel = relative(DIST, file).replace(/\\/g, '/');
    if (rel.startsWith('pagefind/')) continue;
    pageCount++;

    const html = readFileSync(file, 'utf-8');
    const blocks = extractJsonLd(html);
    ldBlockCount += blocks.length;

    for (const block of blocks) {
      let parsed;
      try {
        parsed = JSON.parse(block);
      } catch (e) {
        parsedFailures++;
        fail(rel, 'JSON', `JSON-LD 파싱 실패: ${e.message}`);
        continue;
      }
      const entities = Array.isArray(parsed) ? parsed : [parsed];
      for (const entity of entities) {
        if (!entity || typeof entity !== 'object') continue;
        entityCount++;
        const types = asArray(entity['@type']).filter(Boolean);
        for (const t of types) {
          typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
          const validator = VALIDATORS[t];
          if (validator) validator(rel, entity);
        }
      }
    }
  }

  console.log(`📦 검증 범위`);
  console.log(`   · HTML 페이지: ${pageCount}`);
  console.log(`   · JSON-LD 블록: ${ldBlockCount}`);
  console.log(`   · 엔티티: ${entityCount}`);
  console.log(`   · @type 분포:`);
  const sorted = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [t, n] of sorted) {
    const validated = VALIDATORS[t] ? '✓' : '–';
    console.log(`       ${validated} ${t}: ${n}`);
  }

  console.log(`\n📊 결과`);
  console.log(`   ✅ 통과: ${entityCount - errors.length}건`);
  console.log(`   ⚠️  경고: ${warnings.length}건`);
  console.log(`   ❌ 실패: ${errors.length}건`);

  if (warnings.length > 0) {
    console.log(`\n⚠️  경고 (상위 20):`);
    const grouped = new Map();
    for (const w of warnings) {
      const key = `${w.type}: ${w.msg}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(w.page);
    }
    let shown = 0;
    for (const [key, pages] of grouped) {
      if (shown >= 20) break;
      console.log(`   · ${key} (${pages.length}곳: ${pages.slice(0, 3).join(', ')}${pages.length > 3 ? '…' : ''})`);
      shown++;
    }
  }

  if (errors.length > 0) {
    console.log(`\n❌ 실패:`);
    const grouped = new Map();
    for (const e of errors) {
      const key = `${e.type}: ${e.msg}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(e.page);
    }
    for (const [key, pages] of grouped) {
      console.log(`   · ${key}`);
      for (const p of pages.slice(0, 5)) console.log(`       - ${p}`);
      if (pages.length > 5) console.log(`       - …외 ${pages.length - 5}건`);
    }
    console.log(`\n🚫 Rich Results 게이트 미통과.`);
    process.exit(1);
  }

  console.log(`\n🚀 모든 JSON-LD가 Rich Results 규칙을 통과했습니다.`);
  process.exit(0);
}

// CLI 진입 가드 — 단위 테스트 import 시 main() 자동 실행 방지.
const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedAsScript) main();
