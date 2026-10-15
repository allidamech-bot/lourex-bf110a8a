import { chromium, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { boundFontRequests } from "./visual-qa-browser.mjs";

const out = "smart-rfq-qa";
await mkdir(out, { recursive: true });
const results = [];
for (const [engine, launcher] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await launcher.launch();
  for (const lang of ["en", "ar"]) {
    for (const width of [390, 1365]) {
      const context = await browser.newContext({
        viewport: { width, height: width < 768 ? 844 : 980 },
        deviceScaleFactor: 1,
        isMobile: width < 768,
        hasTouch: width < 768,
        reducedMotion: "reduce",
      });
      await boundFontRequests(context);
      await context.addInitScript(selected => localStorage.setItem("lourex-lang", selected), lang);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      try {
        await page.goto("http://127.0.0.1:4173/smart-rfq", { waitUntil: "domcontentloaded" });
        await page.locator("#rfq-items-heading").waitFor({ timeout: 15000 });
        if (!await page.getByText("LOUREX / THE LIVING TRADE / SMART RFQ").count()) errors.push("Missing brand identity");
        const add = page.getByRole("button", { name: lang === "ar" ? "منتج غير موجود" : "Custom product" });
        await add.click();
        const nameInput = page.locator('input[id^="rfq-name-"]');
        const expected = lang === "ar" ? "بسكويت حسب الطلب" : "Custom biscuits";
        await nameInput.fill(expected);
        await page.locator('input[id^="rfq-qty-"]').fill("150");
        await page.locator("#rfq-destination").fill(lang === "ar" ? "جدة، السعودية" : "Jeddah, Saudi Arabia");
        if (await nameInput.inputValue() !== expected) errors.push("Custom product input not persisted");
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)) errors.push("Horizontal page overflow");
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: out + "/" + engine + "-" + lang + "-" + width + ".png", fullPage: true });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
      results.push({ engine, lang, width, errors });
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
  }
  await browser.close();
}
await writeFile(out + "/results.json", JSON.stringify(results, null, 2));
if (results.some(entry => entry.errors.length > 0)) {
  throw new Error(JSON.stringify(results.filter(entry => entry.errors.length > 0)));
}
