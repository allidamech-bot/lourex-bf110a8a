import { boundFontRequests } from "./visual-qa-browser.mjs";
// Browser-only fixtures. All Supabase traffic is intercepted; no account or live data is modified.
import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output='workspace-qa';await mkdir(output,{recursive:true});const results=[];
const id='00000000-0000-4000-8000-000000000039';
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launcher.launch();
 for(const lang of ['en','ar'])for(const role of ['customer','owner']){
  const routes=process.env.LOUREX_MOBILE_FIX_QA? (role==='customer'?['/request','/customer-portal']:['/dashboard']) : role==='customer'?['/request','/customer-portal','/customer-portal/operations','/customer-portal/requests','/customer-portal/request-detail','/customer-portal/tracking','/customer-portal/tracking-pro','/customer-portal/notifications','/profile']:['/dashboard','/dashboard/operations-briefing','/dashboard/predictive-intelligence','/dashboard/requests','/dashboard/products','/dashboard/customers','/dashboard/deals','/dashboard/tracking','/dashboard/accounting','/dashboard/edit-requests','/dashboard/settlements','/dashboard/audit','/dashboard/reports','/dashboard/notifications','/dashboard/system','/dashboard/health','/profile'];
  for(const route of routes)for(const width of (process.env.LOUREX_MOBILE_FIX_QA?[430]:route==='/request'?[320,390,430,768,1024,1440]:[390,1440])){
   const context=await browser.newContext({viewport:{width,height:width<768?844:1000},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
   const user={id,email:'visual-fixture@example.invalid',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Visual QA Fixture'},app_metadata:{provider:'email',providers:['email']},created_at:'2026-01-01T00:00:00Z'};
   const exp=Math.floor(Date.now()/1000)+86400;
   const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp,role:'authenticated',aud:'authenticated'})).toString('base64url'),'visual-fixture-signature'].join('.');
   await boundFontRequests(context);
   await context.addInitScript(({lang,user,exp,token})=>{localStorage.setItem('lourex-lang',lang);localStorage.setItem('theme','dark');localStorage.setItem('sb-gxmqchznfolerliorpkz-auth-token',JSON.stringify({access_token:token,refresh_token:'visual-fixture-refresh',expires_in:86400,expires_at:exp,token_type:'bearer',user}));},{lang,user,exp,token});
   await context.route('**/*.supabase.co/**',async handler=>{
    const url=new URL(handler.request().url());
    const profile={id,email:user.email,full_name:'Visual QA Fixture',role,status:'active',partner_type:null,phone:'+905550000039',country:'Türkiye',created_at:user.created_at};
    // A single-profile query and the customer/audit profile lists have different response shapes.
    const profiles=url.searchParams.get('id')===`eq.${id}`?profile:[profile];
    const body=url.pathname.includes('/auth/v1/user')?user:url.pathname.includes('/rest/v1/profiles')?profiles:[];
    await handler.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:4173${route}`,{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(350);
   await page.evaluate(()=>document.fonts.ready);
   if(page.url().includes('/auth'))errors.push('Fixture did not reach authenticated route');
   if(route==='/request'){
    if(process.env.LOUREX_MOBILE_FIX_QA){
     for(const control of await page.locator('main button[role=radio]').all()){
      const box=await control.boundingBox();if(box.width>24||box.height>24)errors.push('Radio control stretched');
     }
     await page.locator('#type-shipping').click();
     if(await page.locator('#type-shipping').getAttribute('aria-checked')!=='true')errors.push('Shipping selection failed');
     await page.locator('#type-full').click();
    }
    const sections=await page.locator('main section').count();
    if(sections<4)errors.push(`Actual request form did not render: ${sections} sections`);
    const fileInputs=await page.locator('main input[type="file"]').count();
    if(!fileInputs)errors.push('Attachment control missing');
    if(fileInputs){
     await page.locator('main input[type=file]').setInputFiles({name:'visual-qa.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII=','base64')});
     const upload=page.locator('main p').filter({hasText:/^visual-qa\.png$/});
     await upload.waitFor();
     await upload.locator('../..').locator('button').click();
     if(await upload.count())errors.push('Staged upload did not remove');
    }
    const checkbox=page.locator('#isReadyMade');
    await checkbox.click();
    if(await checkbox.getAttribute('aria-checked')!=='true')errors.push('Product specification checkbox did not activate');
    await checkbox.click();
   }
   if(process.env.LOUREX_MOBILE_FIX_QA && await page.locator('button[aria-label*="LOUREX AI"], [data-lourex-floating-ai]').count())errors.push('Floating AI still visible');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))errors.push('Horizontal page overflow');
   await page.screenshot({path:`${output}/${engine}-${lang}-${role}-${width}-${route.slice(1).replaceAll('/','-')}.png`,fullPage:true});
   results.push({engine,lang,role,route,width,fixtureOnly:true,errors});console.log(JSON.stringify(results.at(-1)));await context.close();
  }
 }
 await browser.close();
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length))throw new Error(JSON.stringify(results.filter(r=>r.errors.length)));
