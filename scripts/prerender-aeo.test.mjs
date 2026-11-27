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

test("all six pages share source data, canonical, metadata and direct crawlable links", () => {
  assert.equal(Object.keys(source.pages).length, 6);
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

test("generated files exist and SPA entry is unchanged", async () => {
  const temp = await mkdtemp(join(tmpdir(), "lourex-seo-"));
  try {
    await writeFile(join(temp, "index.html"), template);
    await generateAeoPages(temp);
    for (const page of Object.values(source.pages)) {
      const html = await readFile(join(temp, page.path.slice(1), "index.html"), "utf8");
      assert.ok(html.includes(page.h1En));
    }
    assert.equal(await readFile(join(temp, "index.html"), "utf8"), template);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("fails closed for a changed template or unsafe route", () => {
  assert.throws(() => renderAeoHtml("<html></html>", "about", source));
  const malformed = structuredClone(source);
  malformed.pages.about.path = "/../private";
  assert.throws(() => renderAeoHtml(template, "about", malformed));
});
