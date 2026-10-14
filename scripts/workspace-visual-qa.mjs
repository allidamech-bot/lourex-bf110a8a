// Browser-only fixtures. All Supabase traffic is intercepted; no account or live data is modified.
import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output='workspace-qa';await mkdir(output,{recursive:true});const results=[];
const id='00000000-0000-4000-8000-000000000039';
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await launcher.launch();
 for(const lang of ['en','ar'])for(const role of ['customer','owner']){
  const routes=role==='customer'?['/request','/customer-portal/requests','/customer-portal/tracking','/profile']:['/dashboard','/dashboard/requests','/dashboard/tracking','/dashboard/accounting','/profile'];
  for(const route of routes)for(const width of (route==='/request'?[320,390,430,768,1024,1440]:[390,1440])){
   const context=await browser.newContext({viewport:{width,height:width<768?844:1000},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
   const user={id,email:'visual-fixture@example.invalid',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'Visual QA Fixture'},app_metadata:{provider:'email',providers:['email']},created_at:'2026-01-01T00:00:00Z'};
   const exp=Math.floor(Date.now()/1000)+86400;
   const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp,role:'authenticated',aud:'authenticated'})).toString('base64url'),'visual-fixture-signature'].join('.');
   await context.addInitScript(({lang,user,exp,token})=>{localStorage.setItem('lourex-lang',lang);localStorage.setItem('theme','dark');localStorage.setItem('sb-gxmqchznfolerliorpkz-auth-token',JSON.stringify({access_token:token,refresh_token:'visual-fixture-refresh',expires_in:86400,expires_at:exp,token_type:'bearer',user}));},{lang,user,exp,token});
   await context.route('**/*.supabase.co/**',async handler=>{
    const url=new URL(handler.request().url());
    const profile={id,email:user.email,full_name:'Visual QA Fixture',role,status:'active',partner_type:null,phone:'+905550000039',country:'Türkiye',created_at:user.created_at};
    const body=url.pathname.includes('/auth/v1/user')?user:url.pathname.includes('/rest/v1/profiles')?profile:[];
    await handler.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:4173${route}`,{waitUntil:'networkidle'});
   await page.waitForTimeout(350);
   await page.evaluate(()=>document.fonts.ready);
   if(page.url().includes('/auth'))errors.push('Fixture did not reach authenticated route');
   if(route==='/request'){
    const sections=await page.locator('main section').count();
    if(sections<4)errors.push(`Actual request form did not render: ${sections} sections`);
    const fileInputs=await page.locator('main input[type="file"]').count();
    if(!fileInputs)errors.push('Attachment control missing');
   }
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))errors.push('Horizontal page overflow');
   await page.screenshot({path:`${output}/${engine}-${lang}-${role}-${width}-${route.slice(1).replaceAll('/','-')}.png`,fullPage:true});
   results.push({engine,lang,role,route,width,fixtureOnly:true,errors});console.log(JSON.stringify(results.at(-1)));await context.close();
  }
 }
 await browser.close();
}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length))throw new Error(JSON.stringify(results.filter(r=>r.errors.length)));
