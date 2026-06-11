# docs/10 — 구조화된 데이터 (Schema.org / JSON-LD)

검색 엔진과 AI 답변 엔진이 페이지 내용을 정확히 이해하게 하는 가장 강력한 수단. **모든 페이지에 적절한 스키마 부착**.

---

## 1. 핵심 원칙

- ✅ JSON-LD 형식 (`<script type="application/ld+json">`)
- ✅ 모든 페이지: 최소 `WebSite` + `Organization` + 페이지 유형별 스키마
- ✅ 모든 하위 페이지: `BreadcrumbList`
- ✅ 빌드 후 검증 (Schema Markup Validator + Google Rich Results Test)
- ❌ Microdata, RDFa 형식 (지원되지만 JSON-LD가 표준)

---

## 2. 사이트 전체 1회 (보통 홈페이지)

### 2-1. Organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://example.com/#organization",
  "name": "회사명",
  "url": "https://example.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://example.com/logo.png",
    "width": 600,
    "height": 60
  },
  "sameAs": [
    "https://twitter.com/example",
    "https://www.linkedin.com/company/example",
    "https://github.com/example",
    "https://www.wikidata.org/wiki/Q123456"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+82-2-0000-0000",
    "contactType": "customer service",
    "email": "support@example.com",
    "availableLanguage": ["Korean", "English"]
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "...",
    "addressLocality": "Seoul",
    "postalCode": "00000",
    "addressCountry": "KR"
  }
}
```

### 2-2. WebSite (사이트 내 검색 정의)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://example.com/#website",
  "url": "https://example.com",
  "name": "사이트명",
  "publisher": { "@id": "https://example.com/#organization" },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://example.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  },
  "inLanguage": "ko-KR"
}
```

---

## 3. 페이지 유형별 스키마

### 3-1. Article / BlogPosting / NewsArticle

블로그 글, 뉴스 기사:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "글 제목 (60자 이내)",
  "description": "메타 디스크립션과 동일",
  "image": [
    "https://example.com/article-image-1x1.jpg",
    "https://example.com/article-image-4x3.jpg",
    "https://example.com/article-image-16x9.jpg"
  ],
  "datePublished": "2026-01-15T08:00:00+09:00",
  "dateModified": "2026-01-20T10:00:00+09:00",
  "author": {
    "@type": "Person",
    "name": "저자명",
    "url": "https://example.com/author/author-slug",
    "sameAs": [
      "https://twitter.com/author",
      "https://www.linkedin.com/in/author"
    ]
  },
  "publisher": { "@id": "https://example.com/#organization" },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/blog/article-slug"
  },
  "wordCount": 1500,
  "articleSection": "Technology",
  "keywords": ["키워드1", "키워드2"],
  "inLanguage": "ko-KR"
}
```

**중요**: `dateModified`는 실제 콘텐츠 변경 시에만 갱신. 단순 빌드만으로 갱신하면 스팸으로 분류될 수 있음.

### 3-2. Product (이커머스)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "제품명",
  "image": ["https://example.com/product.jpg"],
  "description": "제품 설명",
  "sku": "SKU-12345",
  "mpn": "MPN-67890",
  "brand": {
    "@type": "Brand",
    "name": "브랜드명"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/product/slug",
    "priceCurrency": "KRW",
    "price": "29900",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition",
    "priceValidUntil": "2026-12-31",
    "seller": { "@id": "https://example.com/#organization" }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "127"
  },
  "review": [
    {
      "@type": "Review",
      "reviewRating": { "@type": "Rating", "ratingValue": "5" },
      "author": { "@type": "Person", "name": "리뷰어명" },
      "datePublished": "2026-01-10",
      "reviewBody": "리뷰 본문"
    }
  ]
}
```

### 3-3. FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "질문 1?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "답변 1 본문 (HTML 허용)"
      }
    },
    {
      "@type": "Question",
      "name": "질문 2?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "답변 2 본문"
      }
    }
  ]
}
```

⚠️ Google은 2023년부터 FAQ rich result 노출을 제한했지만, 스키마는 여전히 AI 답변 엔진 인용에 유용.

**fallback 정책 (2026-06 변경)**: faq frontmatter 부재 시 aiCitationQuestions 기반 description 복제 fallback 은 2026-06 제거 (FAQ rich result 소멸 + 동일 답변 복제의 가이드라인 위반 소지). **faq 보유 글만 FAQPage 출력.**

### 3-4. HowTo

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "방법 제목",
  "description": "전체 설명",
  "totalTime": "PT30M",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "KRW",
    "value": "10000"
  },
  "tool": [{ "@type": "HowToTool", "name": "준비물 1" }],
  "step": [
    {
      "@type": "HowToStep",
      "name": "1단계 제목",
      "text": "1단계 본문",
      "image": "https://example.com/step1.jpg",
      "url": "https://example.com/howto#step1"
    }
  ]
}
```

### 3-5. Event

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "이벤트명",
  "startDate": "2026-05-01T19:00:00+09:00",
  "endDate": "2026-05-01T22:00:00+09:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "장소명",
    "address": { "@type": "PostalAddress", "..." : "..." }
  },
  "organizer": { "@id": "https://example.com/#organization" },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/event/tickets",
    "price": "50000",
    "priceCurrency": "KRW",
    "availability": "https://schema.org/InStock",
    "validFrom": "2026-04-01T00:00:00+09:00"
  }
}
```

### 3-6. LocalBusiness

```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "가게명",
  "image": "https://example.com/restaurant.jpg",
  "address": { "@type": "PostalAddress", "..." : "..." },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.5665,
    "longitude": 126.9780
  },
  "telephone": "+82-2-0000-0000",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "11:00",
      "closes": "22:00"
    }
  ],
  "priceRange": "₩₩",
  "servesCuisine": "한식"
}
```

### 3-7. Recipe

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "레시피명",
  "image": ["https://example.com/recipe.jpg"],
  "author": { "@type": "Person", "name": "요리사" },
  "datePublished": "2026-01-01",
  "description": "...",
  "prepTime": "PT15M",
  "cookTime": "PT30M",
  "totalTime": "PT45M",
  "recipeYield": "4 servings",
  "recipeCategory": "Main Course",
  "recipeCuisine": "Korean",
  "nutrition": {
    "@type": "NutritionInformation",
    "calories": "350 calories"
  },
  "recipeIngredient": ["재료 1", "재료 2"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "1단계" }
  ],
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "42" }
}
```

### 3-8. VideoObject

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "영상 제목",
  "description": "영상 설명",
  "thumbnailUrl": ["https://example.com/thumbnail.jpg"],
  "uploadDate": "2026-01-15T08:00:00+09:00",
  "duration": "PT1M30S",
  "contentUrl": "https://example.com/video.mp4",
  "embedUrl": "https://www.youtube.com/embed/VIDEO_ID"
}
```

### 3-9. Person (저자 페이지)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "저자명",
  "jobTitle": "직함",
  "image": "https://example.com/author.jpg",
  "url": "https://example.com/author/slug",
  "sameAs": [
    "https://twitter.com/...",
    "https://www.linkedin.com/in/...",
    "https://github.com/..."
  ],
  "worksFor": { "@id": "https://example.com/#organization" },
  "knowsAbout": ["주제 1", "주제 2", "주제 3"],
  "alumniOf": {
    "@type": "EducationalOrganization",
    "name": "대학명"
  }
}
```

E-E-A-T(저자 신뢰성) 강화에 필수.

---

## 4. BreadcrumbList (모든 하위 페이지)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "홈",
      "item": "https://example.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "블로그",
      "item": "https://example.com/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "현재 글 제목"
    }
  ]
}
```

마지막 항목은 `item` 생략 (현재 페이지).

---

## 5. Astro 컴포넌트 패턴

### 5-1. 재사용 가능한 JSON-LD 컴포넌트

```astro
---
// src/components/JsonLd.astro
interface Props {
  data: Record<string, unknown> | Record<string, unknown>[];
}
const { data } = Astro.props;
---
<script type="application/ld+json" set:html={JSON.stringify(data)} />
```

### 5-2. 사용 예

```astro
---
import JsonLd from '../components/JsonLd.astro';

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  // ...
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [...],
};
---
<JsonLd data={[articleSchema, breadcrumbSchema]} />
```

또는 `@graph`로 묶기:

```ts
const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', ... },
    { '@type': 'WebSite', ... },
    { '@type': 'BreadcrumbList', ... },
    { '@type': 'BlogPosting', ... },
  ],
};
```

---

## 6. 일관성 규칙

### 6-1. ID 참조

스키마끼리 참조할 때 `@id`로:

```json
{ "@id": "https://example.com/#organization" }
```

같은 페이지/사이트에서 동일 엔티티는 한 번 정의하고 `@id`로 재참조.

### 6-2. NAP 일관성

Name, Address, Phone — 사이트 전체와 외부 디렉토리(네이버 플레이스, 카카오맵, 구글 비즈니스)에서 **완전히 동일**해야 함. 표기 차이 하나도 신뢰도 약화.

### 6-3. 필수 필드 vs 권장 필드

Google Rich Results Test가 요구하는 **필수 필드**는 반드시. 권장 필드는 가능하면 다 채울수록 좋음.

---

## 7. 검증

### 7-1. Schema Markup Validator

https://validator.schema.org/

JSON-LD 붙여넣고 검증. 에러 0건 목표.

### 7-2. Google Rich Results Test

https://search.google.com/test/rich-results

라이브 URL 또는 코드 직접 검증. Rich Result 자격 여부 확인.

### 7-3. Search Console Enhancements

배포 후 Search Console → 페이지 → Enhancements 리포트에서 모든 스키마 유형의 valid/error 항목 확인. 주간 모니터링.

### 7-4. 빌드 타임 자동 검증

```bash
# schema-dts로 타입 체크 (TypeScript)
pnpm add -D schema-dts

# 또는 structured-data-testing-tool
pnpm dlx structured-data-testing-tool --url https://localhost:4321
```

---

## 8. 절대 금지 (Manual Action 위험)

- ❌ 사용자에게 보이지 않는 콘텐츠를 스키마에 넣기 (cloaking)
- ❌ 가짜 리뷰/평점
- ❌ 관련 없는 콘텐츠에 잘못된 스키마 (예: 일반 글에 Recipe)
- ❌ 미래 일정만 있는 Event를 과거에 작성한 것처럼 표기
- ❌ priceValidUntil이 만료됐는데 그대로 두기

---

## 9. 검증 체크리스트

- [ ] 홈에 `Organization` + `WebSite` 스키마
- [ ] 모든 하위 페이지에 `BreadcrumbList`
- [ ] 페이지 유형별 스키마 (Article/Product/FAQ/HowTo/Event 등)
- [ ] 저자 페이지에 `Person` 스키마
- [ ] 모든 스키마 Schema Markup Validator 통과
- [ ] 모든 스키마 Google Rich Results Test 통과
- [ ] Search Console Enhancements 에러 0건
- [ ] NAP 일관성 (사이트 전체 + 외부 디렉토리)
- [ ] `dateModified`는 실제 변경 시에만 갱신

---

**다음 작업**: `docs/11-metadata-seo.md` — robots.txt / sitemap.xml / llms.txt / OG / Twitter Card.
