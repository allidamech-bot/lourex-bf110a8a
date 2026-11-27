import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderAeoHtml, generateAeoPages } from "./prerender-aeo.mjs";

const template = await readFile("index.html", "utf8");
const source = JSON.parse(await readFile("src/lib/aeo-content.json", "utf8"));
const config = JSON.parse(await readFile("vercel.json", "utf8"));
const sitemap = await readFile("public/sitemap.xml", "utf8");

test("all sourcing pages share source data, canonical, metadata and direct crawlable links", () => {
  assert.equal(Object.keys(source.pages).length, 12);
  for (const [kind, page] of Object.entries(source.pages)) {
    const html = renderAeoHtml(template, kind, source);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(page.h1En));
    assert.ok(html.includes(page.introEn));
    assert.ok(html.includes(page.focusEn));
    assert.ok(html.includes('href="https://www.lou-rex.com' + page.path + '"'));
    assert.ok(html.includes('href="/faq"'));
    assert.ok(!html.includes('<div class="lrx-boot"'));
    assert.ok(html.includes('<script type="module"'));
    assert.ok(config.routes.some(route => route.src === page.path + "/?" && route.dest === page.path + "/index.html"));
    assert.ok(sitemap.includes("https://www.lou-rex.com" + page.path + "</loc>"));
  }
});

test("generated files exist, home and catalog are crawlable, SPA fallback is canonical-free", async () => {
  const temp = await mkdtemp(join(tmpdir(), "lourex-seo-"));
  try {
    await writeFile(join(temp, "index.html"), template);
    await generateAeoPages(temp);
    for (const page of Object.values(source.pages)) {
      const html = await readFile(join(temp, page.path.slice(1), "index.html"), "utf8");
      assert.ok(html.includes(page.h1En));
    }
    const home = await readFile(join(temp, "index.html"), "utf8");
    const catalog = await readFile(join(temp, "products", "index.html"), "utf8");
    const fallback = await readFile(join(temp, "spa.html"), "utf8");
    const missing = await readFile(join(temp, "404.html"), "utf8");
    assert.match(home, /Trade\. Connected by possibility\./);
    assert.match(home, /href="https:\/\/www\.lou-rex\.com\/"/);
    assert.match(catalog, /Cleaning &amp; Household/);
    assert.match(catalog, /href="https:\/\/www\.lou-rex\.com\/products"/);
    assert.ok(!catalog.includes("turkish-cleaning-liquid-sample"));
    assert.equal((home.match(/<h1\b/g)||[]).length,1);
    assert.equal((catalog.match(/<h1\b/g)||[]).length,1);
    assert.ok(!fallback.includes('rel="canonical"'));
    assert.match(missing,/noindex,follow/);
    assert.equal(config.routes.at(-1).status,404);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("fails closed for a changed template or unsafe route", () => {
  assert.throws(() => renderAeoHtml("<html></html>", "about", source));
  const malformed = structuredClone(source);
  malformed.pages.about.path = "/../private";
  assert.throws(() => renderAeoHtml(template, "about", malformed));
});

 test("private routes have server-side noindex and product detail remains a dynamic route", () => { const privateRule=config.routes.find(r=>r.headers?.["X-Robots-Tag"] && new RegExp("^"+r.src+"$").test("/auth")); assert.ok(privateRule); for(const path of ["/auth","/track","/dashboard/orders","/customer-portal/requests","/profile","/admin"]) assert.ok(new RegExp("^"+privateRule.src+"$").test(path)); assert.ok(config.routes.some(r=>r.src==="/products/([^/]+)/?"&&r.dest==="/api/search-catalog?mode=detail&slug=$1")); });

 test("all Arabic and Turkish AEO URLs have unique canonicals, reciprocal hreflang, and matching route configuration",()=>{for(const [kind,page] of Object.entries(source.pages)){for(const lang of ["en","ar","tr"]){const path=lang==="en"?page.path:"/"+lang+page.path;const html=renderAeoHtml(template,kind,source,lang);assert.ok(html.includes(`lang="${lang}"`));assert.ok(html.includes(`rel="canonical" href="https://www.lou-rex.com${path}"`));assert.equal((html.match(/hreflang=/g)||[]).length,4);for(const other of ["en","ar","tr"])assert.ok(html.includes(`hreflang="${other}" href="https://www.lou-rex.com${other==="en"?"":"/"+other}${page.path}"`));assert.ok(config.routes.some(route=>route.src===path+"/?"&&route.dest===path+"/index.html"));assert.ok(sitemap.includes("https://www.lou-rex.com"+path+"</loc>"));}}});

test("buyer guides provide matching localized substantive sections in raw HTML",()=>{for(const [kind,sections] of Object.entries(source.guides)){for(const lang of ["en","ar","tr"]){const html=renderAeoHtml(template,kind,source,lang);assert.equal(sections.length,4);for(const section of sections){const escape=s=>s.replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\'":"&#39;"})[c]);assert.ok(html.includes(escape(section[lang][0])));assert.ok(html.includes(escape(section[lang][1])));}}}});
