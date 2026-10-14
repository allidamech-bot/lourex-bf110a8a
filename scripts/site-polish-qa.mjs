import { chromium,webkit } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
import { boundFontRequests } from './visual-qa-browser.mjs';
const out='polish-qa',results=[];await mkdir(out,{recursive:true});
const routes=['/','/products','/products/sample-cleaning-liquid','/request','/track','/contact','/about','/about-lourex','/why-lourex','/faq','/chocolate-sourcing','/biscuits-sourcing','/food-products-sourcing','/turkish-products','/syrian-products','/privacy','/terms','/auth'];
for(const [engine,launcher,lang,width] of [['webkit',webkit,'ar',430],['chromium',chromium,'en',1440]]){
 const browser=await launcher.launch(),context=await browser.newContext({viewport:{width,height:932},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
 await boundFontRequests(context);
 await context.addInitScript(lang=>{localStorage.setItem('lourex-lang',lang);},lang);
 const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of routes){
  errors=[];await page.goto(`http://127.0.0.1:4173${route}`,{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))errors.push('Horizontal page overflow');
  if(await page.locator('button[aria-label*="LOUREX AI"], [data-lourex-floating-ai]').count())errors.push('Floating assistant still present');
  for(const input of await page.locator('main input,main textarea').all())if(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))<16)errors.push('Input font triggers iOS zoom');
  if(route==='/'){
   const header=page.locator('header').first();
   const metrics=await header.evaluate(el=>{
    const img=el.querySelector('.lrx-header-logo img'),wordmark=el.querySelector('.lrx-header-wordmark');
    return {position:getComputedStyle(el).position,topBackground:getComputedStyle(el).backgroundColor,wordmark:wordmark?.textContent?.replace(/\\s/g,''),logoClip:img?getComputedStyle(img).clipPath:'none',heroTop:document.querySelector('#lourex-hero')?.getBoundingClientRect().top};
   });
   if(metrics.position!=='fixed'||metrics.topBackground!=='rgba(0, 0, 0, 0)')errors.push('Homepage header not transparent overlay');
   if(metrics.wordmark!=='LOUREX|لوريكس')errors.push('Bilingual wordmark missing');
   if(metrics.logoClip==='none')errors.push('Header logo still shows its square image backing');
   if(Math.abs(metrics.heroTop||0)>1)errors.push('Hero does not begin behind header');
   if(width<768){
    await page.locator('header button[aria-expanded]').first().click();
    const dialog=page.getByRole('dialog');await dialog.waitFor();
    const drawerHeight=await dialog.evaluate(el=>el.getBoundingClientRect().height);
    if(drawerHeight<900)errors.push('Mobile drawer does not fill viewport');
    await dialog.getByRole('button',{name:lang==='ar'?'إغلاق':'Close'}).last().click();await dialog.waitFor({state:'hidden'});
   }
   await page.evaluate(()=>scrollTo(0,250));await page.waitForTimeout(450);
   if(await header.evaluate(el=>getComputedStyle(el).backgroundColor)==='rgba(0, 0, 0, 0)')errors.push('Scrolled header lacks readable background');
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(450);
   await page.screenshot({path:`${out}/${engine}-${lang}-${width}-transparent-home.png`});
  }
  if(route==='/contact'){
   const more=page.locator('.lrx-contact-support');if(await more.getAttribute('open')!==null)errors.push('Secondary support expanded by default');
   await more.locator('summary').click();if(await more.getAttribute('open')===null)errors.push('Secondary support cannot expand');
   await more.locator('summary').click();
   await page.locator('main form button[type=submit]').click();
   if(!await page.locator('[aria-invalid=true]').count())errors.push('Contact validation missing');
  }
  if(route==='/request'&&width<768){
   await page.locator('header button[aria-expanded]').first().click();const dialog=page.getByRole('dialog');await dialog.waitFor();
   await dialog.getByRole('button',{name:lang==='ar'?'إغلاق':'Close'}).last().click();await dialog.waitFor({state:'hidden'});
  }
  if(['/contact','/auth','/about','/track'].includes(route))await page.screenshot({path:`${out}/${engine}-${lang}-${width}-${route.slice(1)}.png`,fullPage:true});
  results.push({engine,lang,width,route,errors});console.log(JSON.stringify(results.at(-1)));
 }
 await context.close();await browser.close();
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));if(results.some(r=>r.errors.length))throw Error(JSON.stringify(results.filter(r=>r.errors.length)));
