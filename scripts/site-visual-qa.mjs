import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output='site-qa';
await mkdir(output,{recursive:true});
const core=['/request','/track','/contact','/products/sample-cleaning-liquid'];
const other=['/','/about','/about-lourex','/chocolate-sourcing','/biscuits-sourcing','/food-products-sourcing','/turkish-products','/syrian-products','/faq','/privacy','/terms','/guidelines','/why-lourex','/auth'];
const results=[];
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launcher.launch();
 for(const lang of ['en','ar']){
  const cases=[...core.flatMap(route=>[320,390,430,768,1024,1440].map(width=>({route,width,theme:'dark'}))),...other.flatMap(route=>[390,1440].map(width=>({route,width,theme:'dark'}))),...core.map(route=>({route,width:390,theme:'light'}))];
  for(const {route,width,theme} of cases){
   const context=await browser.newContext({viewport:{width,height:width<768?844:1000},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
   await context.addInitScript(({lang,theme})=>{localStorage.setItem('lourex-lang',lang);localStorage.setItem('theme',theme);},{lang,theme});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:4173${route}`,{waitUntil:'networkidle'});
   await page.locator('h1').first().waitFor();
   await page.evaluate(()=>document.fonts.ready);
   if(await page.locator('html').getAttribute('dir')!==(lang==='ar'?'rtl':'ltr'))errors.push('Wrong page direction');
   if(route==='/request'){
    for(const detail of await page.locator('.lrx-request-aside details').all()){
     await detail.locator('summary').click();
     if(!await detail.evaluate(e=>e.open))errors.push('Request guide does not expand');
    }
    if(!await page.locator('a[href*="/auth"]').count())errors.push('Anonymous request lost sign-in entry');
   }
   if(route==='/track'){
    await page.locator('main input').fill('invalid');
    await page.locator('main button').first().click();
    await page.locator('#tracking-error[role="alert"]').waitFor();
    await page.locator('main input').fill('');
   }
   if(route==='/contact'){
    await page.locator('main form button[type="submit"]').click();
    if(!await page.locator('main [aria-invalid="true"]').count())errors.push('Empty contact form did not validate');
   }
   if(route.startsWith('/products/')){
    const href=await page.locator('main a[href*="/request?source=products"]').getAttribute('href');
    if(!href?.includes('product='))errors.push('Product request attribution lost');
    if(await page.locator('main img[src="/logo.png"]').count())errors.push('Logo presented as product photograph');
   }
   // Reveal viewport-triggered content before assessing full-page captures.
   await page.evaluate(async()=>{for(const e of document.querySelectorAll('main section')){e.scrollIntoView();await new Promise(r=>setTimeout(r,25));}});
   await page.waitForTimeout(100);
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))errors.push('Horizontal page overflow');
   for(const link of await page.locator('main a').all())if((await link.getAttribute('href'))==='')errors.push('Empty link');
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`${output}/${engine}-${lang}-${width}-${theme}-${route.slice(1).replaceAll('/','-')||'home'}.png`,fullPage:true});
   results.push({engine,lang,width,theme,route,errors});
   console.log(JSON.stringify(results.at(-1)));
   await context.close();
  }
 }
 await browser.close();
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length))throw new Error(JSON.stringify(results.filter(r=>r.errors.length)));
