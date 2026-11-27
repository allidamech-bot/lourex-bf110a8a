# LOUREX TRADING AND SOURCING — search discovery baseline
Date: 2026-11-27. Base: 6d114f016714c91e600344bc3818eee900b2673c. Scope: trading site only; no deployment authorized.

## Verified source findings
- index.html: boot logo only in initial root; all deep routes initially share homepage metadata.
- main.tsx / App.tsx: React CSR and lazy routes. Public page content depends on JS.
- SEO.tsx: effect-only canonical/metadata; default URL included query and fragment.
- vercel.json: catch-all index fallback, potential soft 404 (live status not verified); Git deployments disabled.
- i18n.tsx: EN/AR only, same URL, localStorage. No crawlable Turkish language or hreflang.
- robots.txt: OAI-SearchBot allowed; customer-portal/profile missing from explicit disallows. GPTBot policy unchanged; robots is not access control.
- Sitemap: 17 static URLs, no dynamic product detail URLs. Tracking is a utility, removed from sitemap in this batch.
- Existing 6 AEO pages share common wording and are short; substantive category enrichment needed after evidence review.
- Existing Organization JSON-LD and verification file documented; Google ownership not established.
- Vercel project prj_KgRgeJKQKIu2F2ElkrbfEEXDUtA3 initially returned latest deployment canceled and official domain absent from its abbreviated project listing. Follow-up domain and alias API checks confirmed www.lou-rex.com is verified and assigned to this project, active deployment dpl_CB9beCyz9Vdr3mwRRXy4sWrE7GEj (READY, production), Git commit 6d114f016714c91e600344bc3818eee900b2673c. Actual live HTTP/WAF checks still required.
- Public retrieval on 2026-11-27 returned logo-only homepage; robots/sitemap and food/turkish page retrieval failed in search tool, not an HTTP status measurement. Direct curl unavailable due to environment DNS. WAF, headers and CWV unverified.

## Qualitative search sample (not Google rank tracking)
Queries: FMCG sourcing company Turkey wholesale food non food export international procurement; شركة توريد منتجات غذائية من تركيا تصدير مواد غذائية بالجملة FMCG; Türkiye FMCG ihracat tedarik firması gıda gıda dışı.
Observed candidates: https://moisglobal.com/ (category and brand-led content); https://www.optimumtrade.com.tr/en/company.html (coordination positioning); https://www.m195.com/ (wholesale categories and exhibitions); https://primelineint.com/ (buyer and service intent); https://trexpor.com/ar/sourcing/food-products/ (Arabic dedicated category); https://fmcgturkey.com/ar/resources/bay-mawadd-ghithaiyya-bil-jumla-min-turkia-2026 (commercial editorial landing).
LOUREX returned in site-qualified search; not observed in sampled nonbrand results. This is not proof of Google ranking, zero indexing, or ChatGPT recommendation rate. Free Ahrefs Domain Rating sample (2026-11-27; zero API units): lou-rex.com 0.0, moisglobal.com 26.0, optimumtrade.com.tr 0.0, m195.com 1.3, primelineint.com 0.0, trexpor.com 0.0, fmcgturkey.com 0.0. DR measures relative backlink strength, not Google rank or total backlinks. Backlink/referring-domain counts, SERP country ranks, GSC/Bing, conversions and field CWV: unknown, not zero.

## Batch 1
Shared existing English/Arabic AEO data and build-time static English HTML for six existing routes. Same output for humans and bots; no crawler-specific content. SPA replaces initial HTML normally. No new capability claims. Improve brand metadata with owner-supplied name, normalize canonical paths and social image URLs, exclude tracking from sitemap, add rendered noindex for track and NotFound, private crawl rules. Existing language behavior and auth retained. Remaining routes still CSR; this is not complete SSR. Test: npm run test:seo; npm run typecheck; npm run build; npm test. Verify actual deployed routes, raw HTML, same content after JS, mobile transition, redirect/status and headers before merge/release.

## Remaining batches
1. Authoritative hosting/domain verification and real HTTP/crawler checks including published OAI-SearchBot IP ranges. Public static homepage and other commercial routes; real 404/410, noindex strategy for utility/private routes, canonical redirects, dynamic catalog snapshots from public-only approved data.
2. EN/AR/TR independent stable URLs, reciprocal hreflang and x-default, sitemap variants; maintain legacy redirects and locale routing.
3. Verified commercial service/category content with owner-approved capability inventory; prioritize FMCG/food/Türkiye/chocolate/biscuits. No non-food, private label, brands, registration, countries, certifications or partner claims without evidence. Buyer-specific specs, order process, RFQ and internal links.
4. GSC domain DNS TXT verification (owner), Bing import, sitemap and inspection; GA4 with consent and no PII, successful inquiry events, ChatGPT utm_source=chatgpt.com. IndexNow only after key ownership verification.
5. Legitimate directories, chamber membership if eligible, exhibitions and real references; no purchased links. Track monthly indexed URLs, impressions/clicks, country/language ranks, qualified inquiries and neutral independent AI searches.

References:
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- https://developers.openai.com/api/docs/bots
- https://help.openai.com/en/articles/12627856-publishers-and-developers-faq

## Re-audit and second implementation pass
- Extended raw HTML to homepage, catalog and six sourcing topics in English, Arabic and Turkish (20 generated pages). No demo or private products published.
- Deterministic locale routes with self-canonicals and reciprocal hreflang; Arabic entry links on homepage/footer. Turkish is restricted to six landing pages; transactional application remains EN/AR.
- SPA fallback canonical removed; explicit private noindex headers and unknown top-level 404 routing. Unknown dynamic product slugs still need server-backed HTTP 404 verification.
- Direct generator execution: 20/20 rendered page assertions passed before browser acceptance. Browser acceptance covers Chromium/WebKit with JS enabled/disabled; release requires CI plus HTTP checks against actual hosting.
- Search Console ownership, Bing Webmaster, analytics, actual product sitemap, ranking and field CWV remain unverified. No paid service, database changes, merge or production release authorized.

### Repeat competitive search sample (2026-11-27)
Queries: `food FMCG sourcing company Turkey wholesale importers`, `شركة توريد مواد غذائية وسلع استهلاكية من تركيا بالجملة`, `Türkiye gıda ve hızlı tüketim ürünleri ihracat tedarik şirketi`. LOUREX was not observed in the returned sample. Relevant public competitor pages: https://www.optimumtrade.com.tr/en/company.html (category-specific procurement and coordination); https://www.m195.com/ (wholesale category discovery); https://moisglobal.com/tr (Turkish-language branded categories); https://trexpor.com/ar/sourcing/food-products/ (Arabic buyer-intent pages); https://www.safiratrade.com.tr/ar (product categories and RFQ); https://nimethan.com/ar/export (Arabic wholesale export landing); https://fmcgturkey.com/ar/resources/bay-mawadd-ghithaiyya-bil-jumla-min-turkia-2026 (editorial buyer intent). These are observed search examples, not measured Google rank or verified competitor claims. Repeat public retrieval of homepage returned no readable lines; robots/sitemap could not be fetched by the external search tool. This is a retrieval limitation, not evidence of server failure.
