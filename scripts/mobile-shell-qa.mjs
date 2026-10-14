import { chromium, webkit } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
import { boundFontRequests } from './visual-qa-browser.mjs';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173',out='mobile-shell-qa';
await mkdir(out,{recursive:true});const results=[];
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launcher.launch();
 // Cold start: hold JavaScript so the real initial document can be inspected.
 const cold=await browser.newContext({viewport:{width:430,height:932},isMobile:true});
 await cold.route('**/assets/*.js',r=>r.abort());
 const initial=await cold.newPage();await initial.goto(base,{waitUntil:'domcontentloaded'});
 const boot=await initial.evaluate(()=>({bg:getComputedStyle(document.body).backgroundColor,theme:document.querySelector('meta[name="theme-color"]').content,logo:!!document.querySelector('.lrx-boot img'),fit:document.querySelector('meta[name=viewport]').content.includes('viewport-fit=cover')}));
 if(boot.bg!=='rgb(9, 9, 9)'||boot.theme!=='#090909'||!boot.logo||!boot.fit)throw Error(JSON.stringify(boot));
 await initial.screenshot({path:`${out}/${engine}-cold-load.png`});await cold.close();
 for(const lang of ['ar','en'])for(const width of [320,390,430,768,1024,1440]){
  const context=await browser.newContext({viewport:{width,height:width<768?932:1000},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
  await boundFontRequests(context);
  // A visitor may have an old saved daytime preference; it must always be overridden.
  await context.addInitScript(lang=>{localStorage.setItem('lourex-lang',lang);localStorage.setItem('theme','light');},lang);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('footer').waitFor();await page.evaluate(()=>document.fonts.ready);
  const footer=page.locator('footer');await footer.scrollIntoViewIfNeeded();
  const metrics=await footer.evaluate(el=>({height:el.getBoundingClientRect().height,cols:getComputedStyle(el.querySelector('.lrx-footer-links')).gridTemplateColumns,overflow:document.documentElement.scrollWidth>innerWidth+1,bg:getComputedStyle(document.body).backgroundColor,scheme:getComputedStyle(document.documentElement).colorScheme}));
  if(width<768&&metrics.height>850)errors.push(`Footer too tall: ${metrics.height}`);
  if(metrics.overflow)errors.push('Page overflow');
  if(metrics.bg!=='rgb(9, 9, 9)'||metrics.scheme!=='dark')errors.push('Page chrome not dark');
  if(await footer.locator('a[href="tel:+905392411642"] bdi').textContent()!=='00905392411642')errors.push('Wrong phone display');
  if(await footer.locator('.lrx-footer-links a').count()!==10)errors.push('Secondary links lost');
  if(width===430||width===1440)await footer.screenshot({path:`${out}/${engine}-${lang}-${width}-footer.png`});
  if(width===430){
   await page.goto(`${base}/request`,{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor();
   if(!await page.locator('html').evaluate(el=>el.classList.contains('dark')))errors.push('Dark default not shared by request');
   const guide=page.getByRole('button',{name:lang==='ar'?'افتح الشرح':'Open guide'}).first();await guide.click();
   const dialog=page.getByRole('dialog');await dialog.waitFor();
   await dialog.getByRole('button',{name:lang==='ar'?'إغلاق':'Close'}).last().click();
   await page.screenshot({path:`${out}/${engine}-${lang}-request.png`,fullPage:true});
   // Even if an old client restores a daytime value, route reloads stay dark.
   await page.evaluate(()=>{localStorage.setItem('theme','light');});await page.reload({waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor();
   if(!await page.locator('html').evaluate(el=>el.classList.contains('dark')&&!el.classList.contains('light')))errors.push('Saved daytime preference activated on request');
   if(await page.getByRole('button',{name:lang==='ar'?'تبديل المظهر':'Toggle theme'}).count())errors.push('Removed appearance switch still shown');
   await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('footer').waitFor();
   if(await page.locator('html').evaluate(el=>getComputedStyle(el).colorScheme)!=='dark')errors.push('Homepage chrome not dark');
   await page.goto(`${base}/contact`,{waitUntil:'domcontentloaded'});await page.locator('main a[href="tel:+905392411642"]').first().waitFor();
   const phone=page.locator('main a[href="tel:+905392411642"]').first();
   if(await phone.innerText()!=='00905392411642'||await phone.evaluate(el=>getComputedStyle(el).direction)!=='ltr')errors.push('Contact phone bidi incorrect');
  }
  results.push({engine,lang,width,metrics,errors});console.log(JSON.stringify(results.at(-1)));await context.close();
 }
 await browser.close();
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));if(results.some(r=>r.errors.length))throw Error(JSON.stringify(results.filter(r=>r.errors.length)));
