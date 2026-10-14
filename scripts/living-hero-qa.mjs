import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { boundFontRequests } from './visual-qa-browser.mjs';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173',out='living-hero-qa',results=[];
await mkdir(out,{recursive:true});
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launcher.launch();
 for(const lang of ['ar','en'])for(const width of [320,390,430,768,1024,1440]){
  const context=await browser.newContext({viewport:{width,height:width<768?932:1000},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
  await boundFontRequests(context);await context.addInitScript(lang=>localStorage.setItem('lourex-lang',lang),lang);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#lourex-hero-title').waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.locator('.lrx-emblem-mount img').evaluate(img=>img.decode());
  const metrics=await page.evaluate(()=>{
   const hero=document.querySelector('#lourex-hero'),title=hero.querySelector('h1'),cta=hero.querySelector('a[href="/request"]');
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,heroHeight:hero.getBoundingClientRect().height,titleWidth:title.getBoundingClientRect().width,ctaBottom:cta.getBoundingClientRect().bottom,motion:hero.dataset.motion,packetAnimation:getComputedStyle(hero.querySelector('.lrx-field-packet')).animationName,logo:hero.querySelector('img').getAttribute('src'),direction:document.documentElement.dir};
  });
  if(metrics.overflow)errors.push('Horizontal overflow');
  if(metrics.logo!=='/lourex-official.jpeg')errors.push('Official logo changed');
  if(metrics.motion!=='paused'||metrics.packetAnimation!=='none')errors.push('Reduced motion ignored');
  if(metrics.direction!==(lang==='ar'?'rtl':'ltr'))errors.push('Wrong direction');
  if(await page.locator('.lrx-living-actions a[href="/products"]').count()!==1)errors.push('Catalog link missing');
  await page.waitForTimeout(200);
  if(width===430||width===1440)await page.screenshot({path:`${out}/${engine}-${lang}-${width}-hero.png`});
  const steps=page.locator('.lrx-milestone');
  for(let i=0;i<5;i++){await steps.nth(i).click();if(await steps.nth(i).getAttribute('aria-pressed')!=='true'||!await page.locator('#lrx-journey-detail svg').count())errors.push(`Journey step ${i+1} broken`);}
  if(width===430&&lang==='ar')await page.locator('#explore').screenshot({path:`${out}/${engine}-ar-430-journey.png`});
  if(width===1440&&lang==='ar')await page.locator('#sourcing').screenshot({path:`${out}/${engine}-ar-1440-sourcing.png`});
  await page.locator('.lrx-living-actions a[href="/request"]').click();await page.waitForURL('**/request');await page.locator('h1').first().waitFor();
  results.push({engine,lang,width,metrics,errors});console.log(JSON.stringify(results.at(-1)));await context.close();
 }
 const width=engine==='webkit'?430:1440,lang=engine==='webkit'?'ar':'en';
 const context=await browser.newContext({viewport:{width,height:932},isMobile:width<768,reducedMotion:'no-preference',recordVideo:{dir:out,size:{width,height:932}}});
 await boundFontRequests(context);await context.addInitScript(lang=>localStorage.setItem('lourex-lang',lang),lang);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#lourex-hero-title').waitFor();await page.evaluate(()=>document.fonts.ready);
 const hero=page.locator('#lourex-hero'),packet=page.locator('.lrx-field-packet').first(),offset=()=>packet.evaluate(el=>getComputedStyle(el).strokeDashoffset);
 await page.waitForFunction(()=>document.querySelector('#lourex-hero')?.dataset.motion==='running');
 const before=await offset();await page.waitForTimeout(1200);const after=await offset();if(before===after)errors.push('No actual route animation');
 await page.getByRole('button',{name:lang==='ar'?'إيقاف الحركة':'Pause motion',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lourex-hero')?.dataset.motion==='paused'&&getComputedStyle(document.querySelector('.lrx-field-packet')).animationPlayState==='paused');
 // WebKit commits the CSS pause on the next render frame. Sample after it settles.
 await page.waitForTimeout(100);const frozen=await offset();await page.waitForTimeout(500);const frozenAfter=await offset();if(frozenAfter!==frozen)errors.push(`Pause does not freeze routes: ${frozen} -> ${frozenAfter}`);
 await page.getByRole('button',{name:lang==='ar'?'تشغيل الحركة':'Play motion',exact:true}).click();await page.waitForTimeout(600);
 if(await offset()===frozen)errors.push('Resume does not animate');
 await page.locator('#network').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#lourex-hero')?.dataset.motion==='paused');
 await hero.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#lourex-hero')?.dataset.motion==='running');await page.waitForTimeout(2200);
 await page.screenshot({path:`${out}/${engine}-${lang}-motion.png`});
 const video=page.video();await context.close();await rename(await video.path(),`${out}/${engine}-hero-motion.webm`);
 results.push({engine,width,lang,motionVerified:before!==after,freeze:{frozen,frozenAfter},errors});console.log(JSON.stringify(results.at(-1)));await browser.close();
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));if(results.some(r=>r.errors.length))throw Error(JSON.stringify(results.filter(r=>r.errors.length)));
