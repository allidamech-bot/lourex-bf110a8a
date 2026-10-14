import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = process.env.QA_OUTPUT || 'homepage-qa';
await mkdir(output, {recursive:true});
const results=[];
for (const [engine, launcher] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await launcher.launch();
 for (const lang of ['en','ar']) {
  for (const width of [320,390,430,768,1024,1440]) {
   const context=await browser.newContext({viewport:{width,height:width<768?844:1000},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
   await context.addInitScript(l=>localStorage.setItem('lourex-lang',l),lang);
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
   await page.locator('#lourex-hero-title').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   if(overflow)errors.push('Horizontal page overflow');
   const stages=page.locator('.lrx-milestone');
   if(await stages.count()!==5)errors.push('Missing journey milestones');
   for(let i=0;i<5;i++){
    await stages.nth(i).click();
    await page.waitForTimeout(50);
    if(await stages.nth(i).getAttribute('aria-pressed')!=='true')errors.push(`Stage ${i+1} did not activate`);
    if(!await page.locator('#lrx-journey-detail h3').textContent())errors.push('Missing stage content');
   }
   await stages.first().click();
   for(const img of await page.locator('img').all()){
    if(!await img.evaluate(i=>i.complete&&i.naturalWidth>0))errors.push(`Unloaded image ${await img.getAttribute('src')}`);
   }
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`${output}/${engine}-${lang}-${width}.png`,fullPage:true});
   await page.locator('#explore').screenshot({path:`${output}/${engine}-${lang}-${width}-journey.png`});
   results.push({engine,lang,width,errors});await context.close();
  }
 }
 await browser.close();
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length))throw new Error(JSON.stringify(results.filter(r=>r.errors.length)));
