import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const aeo=JSON.parse(await readFile("src/lib/aeo-content.json","utf8"));
const copy=JSON.parse(await readFile("src/lib/public-search-copy.json","utf8"));
const cases=[{path:"/",lang:"en",h1:copy.home.h1En,description:copy.home.introEn},{path:"/products",lang:"en",h1:copy.catalog.h1En,description:copy.catalog.introEn},...Object.values(aeo.pages).flatMap(p=>["en","ar","tr"].map(lang=>{const s=lang==="en"?"En":lang==="ar"?"Ar":"Tr";return{path:(lang==="en"?"":"/"+lang)+p.path,lang,h1:p["h1"+s],description:p["intro"+s],localized:true}}))];
const results=[];
const normalize=x=>x.replace(/\s+/g," ").trim();
for(const [engine,launcher] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await launcher.launch();
 try{
  for(const javascriptEnabled of [false,true]){
   const context=await browser.newContext({javaScriptEnabled:javascriptEnabled,viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
   try{
    for(const item of cases){
     const page=await context.newPage();
     const errors=[];
     page.on("pageerror",e=>errors.push(e.message));
     try{
      const url="http://127.0.0.1:4173"+item.path;
      const response=await page.goto(url,{waitUntil:"domcontentloaded"});
      assert.equal(response.status(),200);
      if(javascriptEnabled)await page.locator("[data-lourex-prerender]").waitFor({state:"detached"});
      else await page.locator("[data-lourex-prerender]").waitFor();
      const h1=page.locator("h1");
      await h1.waitFor();
      assert.equal(await h1.count(),1);
      assert.equal(normalize(await h1.innerText()),item.h1);
      if(javascriptEnabled) await page.waitForFunction(({path,description,lang,localized})=>document.querySelector('link[rel="canonical"]')?.getAttribute("href")==="https://www.lou-rex.com"+path && document.querySelector('meta[name="description"]')?.getAttribute("content")===description && (!localized || document.documentElement.lang===lang),item);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"),"https://www.lou-rex.com"+item.path);
      assert.equal(await page.locator('meta[name="description"]').getAttribute("content"),item.description);
      if(item.localized){assert.equal(await page.locator("html").getAttribute("lang"),item.lang);assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(),4);}
      assert.ok(await page.locator('a[href="/request"]').count()||item.path==="/products");
      if(javascriptEnabled){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);}
      results.push({engine,javascriptEnabled,path:item.path,pass:true});
     }catch(error){results.push({engine,javascriptEnabled,path:item.path,pass:false,error:String(error)});}
     finally{await page.close();}
    }
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
await mkdir("search-qa",{recursive:true});
await writeFile("search-qa/results.json",JSON.stringify(results,null,2));
const failed=results.filter(r=>!r.pass);
console.log(JSON.stringify({total:results.length,failed},null,2));
if(failed.length)throw new Error("Search browser acceptance failed");
