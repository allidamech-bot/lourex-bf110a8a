// Visual-functional smoke test of all public interior pages. No live data is written.
import { chromium, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { boundFontRequests } from "./visual-qa-browser.mjs";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:4173";
const out = "interior-qa";
await mkdir(out, { recursive: true });

const routes = [
  "/contact", "/request", "/track", "/about", "/about-lourex",
  "/chocolate-sourcing", "/biscuits-sourcing", "/food-products-sourcing",
  "/turkish-products", "/syrian-products", "/faq", "/guidelines",
  "/why-lourex", "/privacy", "/terms",
];
const desktop = new Set(["/contact", "/request", "/about", "/faq", "/guidelines", "/privacy", "/terms"]);
const results = [];
for (const [engine, launch] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await launch.launch();
  for (const lang of ["ar", "en"]) {
    for (const route of routes) {
      for (const width of desktop.has(route) ? [390, 1440] : [390]) {
        const context = await browser.newContext({
          viewport: { width, height: width < 768 ? 844 : 1000 },
          isMobile: width < 768, hasTouch: width < 768, reducedMotion: "reduce",
        });
        await boundFontRequests(context);
        await context.addInitScript(({ lang }) => {
          localStorage.setItem("lourex-lang", lang);
          localStorage.setItem("theme", "light");
        }, { lang });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", err => errors.push("Runtime: " + err.message));
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
        await page.locator("main h1").first().waitFor();
        const layout = await page.evaluate(() => {
          const main = document.querySelector("main");
          const heading = main?.querySelector("h1");
          const root = document.querySelector(".lourex-public");
          const bg = root ? getComputedStyle(root).backgroundColor.match(/[0-9.]+/g)?.slice(0, 3).map(Number) : null;
          return {
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            hasDarkClass: document.documentElement.classList.contains("dark"),
            headingSize: heading ? parseFloat(getComputedStyle(heading).fontSize) : 0,
            background: bg,
            direction: document.documentElement.dir,
            mainWidth: main?.getBoundingClientRect().width || 0,
          };
        });
        if (layout.overflow) errors.push("Horizontal overflow");
        if (!layout.hasDarkClass || !layout.background || Math.max(...layout.background) > 80) errors.push("Day palette leaked");
        if (layout.headingSize < 26) errors.push("Heading too small");
        if (layout.direction !== (lang === "ar" ? "rtl" : "ltr")) errors.push("Direction mismatch");
        if (await page.getByRole("button", { name: lang === "ar" ? "تبديل المظهر" : "Toggle theme" }).count()) errors.push("Obsolete theme toggle");
        if (route === "/guidelines") {
          if (await page.locator("#guidelines-steps-title").count() !== 1) errors.push("Guide route still renders terms");
          if (await page.locator("main article").count() !== 3) errors.push("Guide steps missing");
          if (await page.locator('main a[href="/terms"]').count() !== 1) errors.push("Legal reference missing");
        }
        if (route === "/contact" && width === 390) {
          if (await page.locator('main label[for^="contact-"]').count() !== 5) errors.push("Contact field labels missing");
          await page.locator('main form button[type="submit"]').click();
          if (!await page.locator('main [aria-invalid="true"]').count()) errors.push("Contact validation lost");
        }
        if (route === "/request" && width === 390) {
          const intro = page.locator(".lrx-request-intro");
          if (await intro.count() !== 1) errors.push("Request introduction missing");
          else {
            const h = await intro.evaluate(el => el.getBoundingClientRect().height);
            if (h > 850) errors.push("Request introduction too tall: " + h);
          }
        }
        if (["/guidelines", "/contact", "/request"].includes(route) && width === 390) {
          await page.screenshot({ path: `${out}/${engine}-${lang}-${route.slice(1)}-390.png`, fullPage: true });
        }
        results.push({ engine, lang, route, width, errors });
        console.log(JSON.stringify(results.at(-1)));
        await context.close();
      }
    }
  }
  await browser.close();
}
await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
if (results.some(r => r.errors.length)) throw new Error(JSON.stringify(results.filter(r => r.errors.length)));
