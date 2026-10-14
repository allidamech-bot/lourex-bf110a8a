import { boundFontRequests } from "./visual-qa-browser.mjs";
import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output='products-qa';
await mkdir(output,{recursive:true});
const results=[];
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launcher.launch();
 for(const lang of ['en','ar']) for(const width of [320,390,430,768,1024,1440]){
  const context=await browser.newContext({viewport:{width,height:width<768?844:1000},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
  await boundFontRequests(context);
   await context.addInitScript(l=>localStorage.setItem('lourex-lang',l),lang);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/products',{waitUntil:'domcontentloaded'});
  await page.locator('.lrx-catalog-results[aria-busy="false"]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('[role="alert"]').count())errors.push('Catalog load failed');
  const cards=page.locator('[data-product-id]'), initialCount=await cards.count();
  const select=page.locator('.lrx-catalog-select select');
  const sectors=page.locator('.lrx-sector-options button');
  for(let i=0;i<await sectors.count();i++){
   await sectors.nth(i).click();
   if(await sectors.nth(i).getAttribute('aria-pressed')!=='true')errors.push(`Sector ${i} did not activate`);
   if(i===0&&await select.inputValue()!=='all')errors.push('All sectors not synchronized');
  }
  await select.selectOption('all');
  if(await sectors.first().getAttribute('aria-pressed')!=='true')errors.push('Native select not synchronized');
  const search=page.locator('.lrx-catalog-search input');
  await search.fill('lourex-no-match-qa-20261014');
  if(await cards.count())errors.push('Search did not filter');
  await page.locator('.lrx-catalog-search button').click();
  if(await cards.count()!==initialCount)errors.push('Clear search did not restore catalog');
  await select.selectOption('food-fmcg');
  await page.locator('.lrx-catalog-results-bar button').click();
  if(await select.inputValue()!=='all'||await cards.count()!==initialCount)errors.push('Reset did not restore catalog');
  for(const card of await cards.all()){
   const id=await card.getAttribute('data-product-id');
   const href=await card.locator('.lrx-catalog-product-actions .lrx-primary').getAttribute('href');
   if(href!==`/request?source=products&product=${encodeURIComponent(id)}`)errors.push(`Wrong request target for ${id}`);
   if(!await card.locator('.lrx-catalog-details').getAttribute('href'))errors.push('Missing details link');
  }
  await page.evaluate(async()=>{for(const section of document.querySelectorAll('main section')){section.scrollIntoView();await new Promise(r=>setTimeout(r,100));}});
  await page.waitForTimeout(300);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))errors.push('Horizontal page overflow');
  if(await page.locator('#catalog-title').evaluate(e=>e.scrollWidth>e.clientWidth+2))errors.push('Headline overflow');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${output}/${engine}-${lang}-${width}.png`,fullPage:true});
  await page.locator('#catalog-browser').screenshot({path:`${output}/${engine}-${lang}-${width}-catalog.png`});
  results.push({engine,lang,width,productCount:initialCount,errors});
  console.log(JSON.stringify(results.at(-1)));
  await context.close();
 }
 await browser.close();
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length))throw new Error(JSON.stringify(results.filter(r=>r.errors.length)));
