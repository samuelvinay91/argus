# SEO Checklist for Skopaq Dashboard

## ✅ Implemented

### Technical SEO
- [x] `robots.ts` - Search engine crawling rules
- [x] `sitemap.ts` - Dynamic XML sitemap generation
- [x] Structured data (JSON-LD) - SoftwareApplication & Organization schemas
- [x] Meta tags (title, description, keywords)
- [x] Open Graph tags for social sharing
- [x] Twitter Card metadata
- [x] Canonical URLs
- [x] Mobile viewport configuration
- [x] Security headers (CSP, HSTS, X-Frame-Options)
- [x] PWA manifest
- [x] Skip to content link (accessibility)
- [x] Semantic HTML (`<main>`, proper heading hierarchy)

### Performance
- [x] Vercel Speed Insights integration
- [x] Next.js App Router (automatic code splitting)
- [x] Image optimization (next/image remote patterns)
- [x] Font optimization (next/font with Inter)

### Analytics Ready
- [x] Google Analytics component created (`components/analytics/GoogleAnalytics.tsx`)
- [x] Microsoft Clarity component created
- [ ] Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to `.env`
- [ ] Add `NEXT_PUBLIC_CLARITY_PROJECT_ID` to `.env`
- [ ] Import analytics components in `layout.tsx`

## ⚠️ TODO - Critical for Marketing

### 1. Create Open Graph Image
```bash
# Create a 1200x630px image at dashboard/public/og-image.png
# Should include:
# - Skopaq logo
# - Tagline: "AI-Powered E2E Testing"
# - Key features (test generation, self-healing, bug prediction)
# - Brand colors (#14b8a6 teal)
```

**Current Status:** Referenced in metadata but file may not exist

### 2. Set Up Search Console
- [ ] Add Google Search Console verification
  - Get verification code from https://search.google.com/search-console
  - Add to `metadata.verification.google` in `layout.tsx`
  - Submit sitemap: `https://skopaq.ai/sitemap.xml`

- [ ] Add Bing Webmaster Tools verification
  - Get code from https://www.bing.com/webmasters
  - Add to `metadata.verification.bing` in `layout.tsx`

### 3. Enable Analytics
```typescript
// In dashboard/app/layout.tsx, add:
import { GoogleAnalytics, MSClarity } from '@/components/analytics/GoogleAnalytics';

// In <body>, before </body>:
<GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
<MSClarity CLARITY_PROJECT_ID={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID} />
```

### 4. Add Dynamic Page Metadata
Each page should have custom metadata:

```typescript
// Example: dashboard/app/tests/page.tsx
export const metadata = {
  title: 'Test Library',
  description: 'Browse and manage your AI-generated E2E tests',
  openGraph: {
    title: 'Test Library | Skopaq',
    description: 'Browse and manage your AI-generated E2E tests',
  },
};
```

**Priority pages:**
- [ ] `/tests` - Test Library
- [ ] `/quality` - Quality Dashboard
- [ ] `/intelligence` - Intelligence Dashboard
- [ ] `/projects` - Projects
- [ ] `/sign-up` - Sign Up
- [ ] `/sign-in` - Sign In

### 5. Content Marketing Pages
Create these public-facing pages (currently missing):

```
dashboard/app/(marketing)/
  ├── pricing/page.tsx
  ├── blog/page.tsx
  ├── docs/page.tsx
  ├── features/page.tsx
  ├── integrations/page.tsx
  └── about/page.tsx
```

Each should have:
- Custom metadata
- H1 with target keywords
- Internal linking
- CTA buttons

### 6. Improve Landing Page SEO
File: `dashboard/components/landing/landing-page.tsx`

- [ ] Add proper heading hierarchy (H1 → H2 → H3)
- [ ] Include target keywords naturally:
  - "AI-powered E2E testing"
  - "Automated test generation"
  - "Self-healing tests"
  - "Production error tracking"
- [ ] Add FAQ section (helps with featured snippets)
- [ ] Add customer testimonials with Schema.org markup

### 7. Technical Improvements

#### Add `<link>` tags for preconnect
```typescript
// In layout.tsx <head>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://api.skopaq.ai" />
```

#### Update sitemap with blog/docs
When you add blog/docs, update `sitemap.ts` to dynamically include posts

#### robots.txt for Vercel deployments
Vercel preview deployments should not be indexed:
```typescript
// In robots.ts
if (process.env.VERCEL_ENV !== 'production') {
  return {
    rules: { userAgent: '*', disallow: ['/'] },
  };
}
```

### 8. Social Proof & Trust Signals
Add to landing page:
- [ ] Customer logos (if applicable)
- [ ] GitHub stars count
- [ ] Number of tests generated
- [ ] Uptime percentage
- [ ] Security badges (SOC 2, GDPR compliant, etc.)

### 9. International SEO (Future)
If expanding to non-English markets:
- [ ] Add `hreflang` tags
- [ ] Localized metadata
- [ ] Translated content

## 📊 Monitoring & Maintenance

### Weekly
- [ ] Check Google Search Console for:
  - Indexing errors
  - Mobile usability issues
  - Core Web Vitals
  - Security issues

### Monthly
- [ ] Review top search queries
- [ ] Check for 404 errors
- [ ] Update sitemap if new pages added
- [ ] Refresh Open Graph images for seasonal campaigns

### Quarterly
- [ ] Audit metadata across all pages
- [ ] Update structured data
- [ ] Review and update keywords
- [ ] Competitor SEO analysis

## 🎯 Target Keywords (Primary)
1. "ai powered e2e testing"
2. "automated test generation"
3. "self healing tests"
4. "production error testing"
5. "e2e testing platform"
6. "playwright automation"
7. "ai testing tool"
8. "autonomous testing"

## 📈 Expected SEO Results Timeline

| Month | Goal |
|-------|------|
| 1 | Site indexed, sitemap submitted, 0 impressions → 100 impressions/day |
| 2 | Core pages ranking for brand keywords ("Skopaq testing") |
| 3 | Ranking for long-tail keywords ("how to generate tests from errors") |
| 6 | Page 2-3 for competitive keywords ("e2e testing platform") |
| 12 | Page 1 for 2-3 competitive keywords |

## 🔗 Useful Resources

- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [Schema.org Validator](https://validator.schema.org/)
- [Open Graph Debugger](https://www.opengraph.xyz/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)

## 🚨 Common Pitfalls to Avoid

1. **Don't block dashboard with robots.txt** - Private pages are protected by auth
2. **Don't keyword stuff** - Write naturally for humans
3. **Don't forget alt text** - Every image needs descriptive alt text
4. **Don't ignore mobile** - 60%+ of searches are mobile
5. **Don't duplicate content** - Each page needs unique content
6. **Don't forget internal linking** - Link related pages together
7. **Don't ignore page speed** - Core Web Vitals affect rankings

---

**Last Updated:** January 2026
**Next Review:** February 2026
