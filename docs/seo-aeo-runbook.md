# LOUREX SEO / AEO Runbook

## Current implemented foundations

### Metadata
- All public pages use the shared `SEO` component (`src/components/seo/SEO.tsx`).
- `SEO` manages `<title>`, `<meta name="description">`, OpenGraph, Twitter Card, and canonical link.
- `index.html` provides base Organization JSON-LD and default OG/Twitter tags.
- Public pages with explicit SEO: `HomePage`, `AboutPage`, `AeoPage`, `FaqPage`, `ProductsPage`, `ProductDetailPage`, `RequestPage`, `TrackPage`, `TermsPage`, `PrivacyPage`, `WhyLourexPage`, `ContactPage`.

### Structured data
- `Organization` JSON-LD is embedded in `public/index.html`.
- `FAQPage` JSON-LD is generated client-side in `FaqPage.tsx`.
- No `Product` structured data is added because prices, ratings, and reviews are not stored in the product catalog.

### Crawlability
- `public/robots.txt` allows all major crawlers (Google, Bing, OpenAI, Twitter, Facebook) on public routes and disallows private dashboard/admin paths.
- `public/sitemap.xml` lists all known public routes under `https://www.lou-rex.com`.
- Google site verification file is present: `public/google520c4bf2aa2c61a6.html`.

## Public routes covered

| Route | Page | SEO title source | Notes |
|-------|------|------------------|-------|
| `/` | HomePage | inline EN/AR | Also serves organization landing |
| `/about` | AboutPage | `t("nav.about")` variant | |
| `/about-lourex` | AeoPage | page H1 | AI-answer-optimized entity page |
| `/chocolate-sourcing` | AeoPage | page H1 | |
| `/biscuits-sourcing` | AeoPage | page H1 | |
| `/food-products-sourcing` | AeoPage | page H1 | |
| `/turkish-products` | AeoPage | page H1 | |
| `/syrian-products` | AeoPage | page H1 | |
| `/faq` | FaqPage | `LOUREX FAQ` | Includes FAQ JSON-LD |
| `/products` | ProductsPage | `t("products.listing.seoTitle")` | |
| `/products/:slug` | ProductDetailPage | product name | |
| `/request` | RequestPage | `t("requestPage.seoTitle")` | |
| `/track` | TrackPage | `t("publicTracking.title")` | |
| `/why-lourex` | WhyLourexPage | `t("nav.whyLourex")` | |
| `/contact` | ContactPage | `t("nav.contact")` | |
| `/terms` | TermsPage | `t("consent.tosTitle")` | |
| `/guidelines` | TermsPage | `t("consent.tosTitle")` | Alias for terms |
| `/privacy` | PrivacyPage | `t("consent.privacyTitle")` | |

## Recommended future content pages

- `/suppliers` — Supplier program / verification process page (no fake factory counts or guarantees).
- `/logistics` — Shipping and delivery process page.
- `/industries` — Industry focus pages (food, sweets, FMCG).
- `/case-studies` — Real case narratives only if backed by actual operational data; otherwise mark as "coming soon" or omit.
- `/blog` or `/insights` — Editorial content about import/export, sourcing best practices, supplier coordination.

## Rules for truthful claims

- Do not claim "largest", "official distributor", "guaranteed lowest price", or any unverifiable superlative.
- Do not invent live user counts, factory counts, shipment volumes, or regulatory approvals.
- Use verified positioning only: "trade intermediary", "sourcing coordination", "purchase request management", "supplier coordination", "deal follow-up", "delivery tracking".
- Product pages must reflect actual catalog data (name, description, origin, category). Do not invent prices, stock levels, ratings, or reviews.
- Privacy and terms pages must accurately describe actual platform practices. Avoid encryption or security claims not confirmed in engineering.

## How to add future sitemap entries

1. Confirm the route is public (unauthenticated) and stable.
2. Add the URL to `public/sitemap.xml` inside the existing `<urlset>`.
3. If the page has dynamic SEO, ensure the `SEO` component renders a stable `<title>` and `<meta name="description">`.
4. Validate with `npm run typecheck` and `npm run build`.
5. If the route is added in `src/App.tsx`, ensure `robots.txt` `Allow` rule covers it.

## How to validate build / typecheck

```bash
npm run typecheck
npm run build
```

- `typecheck` validates TypeScript interfaces and imports.
- `build` ensures Vite/esbuild can parse all JSX and produce production assets.
- If `build` fails due to JSX syntax, inspect the reported file and line; fix only the syntax boundary, do not refactor behavior.

## Notes for AI answer engines (AEO)

- Keep business description consistent across Organization JSON-LD, page copy, and meta descriptions.
- Use clear entity naming: "LOUREX" (brand), "Lourex" (alternate), "lou-rex.com" (domain).
- FAQPage JSON-LD is already implemented on `/faq`; expand only with real questions and concise answers.
- Avoid keyword stuffing. Natural focus terms: trade intermediary, sourcing coordination, supplier coordination, purchase request management, deal follow-up, delivery tracking, chocolate sourcing, biscuits sourcing, food products, Turkish products, Syrian products.
- AEO pages (`/about-lourex`, `/chocolate-sourcing`, etc.) already provide crawlable, structured answers. Keep tone factual and descriptive.
