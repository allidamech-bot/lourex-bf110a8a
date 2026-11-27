# LOUREX — Search discovery acceptance and ongoing operations

Status: staging code only. Do not merge, promote, submit URLs or activate analytics until approved and validated on exact deployed commit.

## Ownership and submission
- Google Search Console: https://search.google.com/search-console — verify the domain property `lou-rex.com` via DNS TXT in the authoritative DNS dashboard. Existing HTML verification file is not proof of current ownership. Preserve it.
- Bing Webmaster Tools: https://www.bing.com/webmasters — verify ownership or import an already verified Search Console property. No claim of existing ownership.
- After actual HTTP acceptance, submit https://www.lou-rex.com/sitemap.xml and https://www.lou-rex.com/sitemap-products.xml (the latter may be empty until active products exist; submit when populated).
- Inspect homepage and representative EN/AR/TR pages; verify canonical, crawl permissions, indexing status and mobile rendering. Do not use Google's restricted Indexing API for ordinary commerce URLs.
- IndexNow: configure an owner-controlled valid key, rebuild, confirm public key file is served; run npm run search:indexnow -- --dry-run / /turkish-products. Only after explicit approval set INDEXNOW_SUBMISSION_APPROVED=true and run npm run search:indexnow -- --submit / /turkish-products. For additions/updates/deletions submit changed canonical public URLs only, never customer data. An HTTP 200/202 is submission acceptance, not indexing. No automatic external pings are enabled.
- OAI-SearchBot: inspect current robots and CDN/WAF rules against published IP ranges. User-agent spoof tests do not prove genuine crawler access.

## Optional measurement
- Create or confirm an owner-controlled GA4 property and web stream at https://analytics.google.com/; use only public measurement ID.
- Before enabling, disable Enhanced Measurement (including history-based page changes), advertising signals, user-provided data and cross-domain collection in the property. Review the privacy notice and consent requirements with owner. Verify network behavior before and after refusal, consent, withdrawal and private-route navigation; no account IDs, request numbers, tracking codes, emails, phone numbers, form content or full query strings may leave the app. Existing operational analytics events are separate from the dedicated measurement queue.
- Set VITE_GA4_MEASUREMENT_ID and VITE_SEARCH_ANALYTICS_ENABLED=true only on approved build. Defaults are disabled. The dedicated tag uses basic consent mode and explicit page_view/generate_lead events, no advertising consent.
- Mark generate_lead a key event; use lead_type (purchase_request / smart_rfq / contact) and traffic_source as custom event dimensions. The client event is not a financial or unique lead ledger; validate duplicates and reconcile against actual submissions.
- ChatGPT referrals: source chatgpt.com (OpenAI documents utm_source=chatgpt.com); AI referral traffic cannot measure all unclicked citations. Use attribution with consent, never assume impressions or rank.

## Release checks
1. Existing application CI, SEO tests and Chromium/WebKit browser acceptance.
2. Authorized exact-commit Vercel preview: function bundle contains dist/spa.html; no service-role credentials used in search; verify actual HTTP 200, 404, 503 behavior and correct canonical/locale. Verify existing email APIs and auth routes still work.
3. Run node scripts/verify-search-http.mjs <preview HTTPS origin> then against production after owner-authorized release. Check CDN responses for crawler agents, robots and both sitemaps; check product sitemap against the active database and missing slug HTTP 404.
4. PageSpeed Insights mobile: https://pagespeed.web.dev/ — report lab and CrUX field metrics separately; track LCP, INP, CLS by device and route. If field sample unavailable, record unavailable, not zero.
5. Release only after blockers are closed. Do not infer search visibility from passing CI.

## Evidence cadence
Weekly: Search Console impressions, clicks, CTR and position by country/query/page/device; Bing indexed URLs and clicks; GA4 consented organic/AI visits and successful leads by source. Monthly: independent non-personalized EN/AR/TR query samples in Türkiye, Saudi Arabia, UAE and Iraq (record location, date, engine, query and observed rank; absent means not observed, not zero). Repeat independent AI queries without brand name, preserve actual cited URLs and count citations / prompts tested. Separate brand queries from nonbrand. Record new referring domains and genuine external mentions, not purchased links or fabricated profiles.

Sources: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap ; https://www.indexnow.org/documentation ; https://developers.google.com/tag-platform/security/concepts/consent-mode ; https://help.openai.com/en/articles/12627856-publishers-and-developers-faq

Current account access/verified data: Google Search Console, Bing and GA4 ownership and metrics are unverified. No external submissions were made. No paid services enabled.

## Final engineering audit notes
- Production domain alias remains on dpl_CB9beCyz9Vdr3mwRRXy4sWrE7GEj. No deployment record exists for feat/global-search-discovery-batch-1 at audit time. Automatic Git deployments are disabled in versioned Vercel configuration. Exact-commit authorized preview is a hard gate; do not infer Vercel function bundling from local preview.
- Active catalog rows lacking public metadata are excluded from sitemap and produce retryable 503 rather than erroneous 404. The public search function never uses privileged credentials. Verify actual function response against the empty catalog and a synthetic nonproduction product before publishing.
- Combined duplicate font stylesheets into the existing HTML request, retaining all original families and weights. Field performance remains unmeasured.
- Google tag queue uses documented arguments-object semantics; measurement remains off. Real tag/network validation, including withdrawal, is required before activation.
- robots.txt is crawl control, not confidentiality or guaranteed removal. Private content remains protected by authentication/RLS; server noindex is an additional defense. Do not weaken access control for indexing.

### Isolated preview build exception
The first manual preview was canceled by the existing ignored-build command `exit 0` before compilation. A versioned `ignoreCommand` permits building only when VERCEL_ENV=preview and the exact search-discovery branch is selected; other Git builds retain the existing ignore behavior. No project-wide setting, production domain alias or automatic production deployment was changed. Remove this branch-specific exception before final merge if no longer required.
