import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base=new URL(process.argv[2]||"https://www.lou-rex.com");
assert.equal(base.protocol,"https:");
const content=JSON.parse(await readFile("src/lib/aeo-content.json","utf8"));
const copy=JSON.parse(await readFile("src/lib/public-search-copy.json","utf8"));
const urls=[{path:"/",heading:copy.home.h1En},{path:"/products",heading:copy.catalog.h1En},...Object.values(content.pages).flatMap(page=>["en","ar","tr"].map(lang=>({path:(lang==="en"?"":"/"+lang)+page.path,heading:page[lang==="en"?"h1En":lang==="ar"?"h1Ar":"h1Tr"],lang})))];
const agents=["LOUREX-HTTP-Acceptance/1.0","Googlebot","OAI-SearchBot"];
const report=[];
const esc=s=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
async function get(path,agent){const res=await fetch(new URL(path,base),{headers:{"User-Agent":agent},redirect:"manual",signal:AbortSignal.timeout(12000)});return {status:res.status,headers:res.headers,body:await res.text()};}
async function test(label,fn){try{await fn();report.push({label,pass:true});}catch(e){report.push({label,pass:false,error:String(e)});}}
for(const agent of agents){
 for(const item of urls)await test(agent+" "+item.path,async()=>{const r=await get(item.path,agent);assert.equal(r.status,200);assert.ok(r.body.includes(esc(item.heading)),"Missing rendered heading");assert.ok(r.body.includes('rel="canonical" href="https://www.lou-rex.com'+item.path+'"'),"Wrong canonical");if(item.lang)assert.equal((r.body.match(/hreflang=/g)||[]).length,4);});
 await test(agent+" robots",async()=>{const r=await get("/robots.txt",agent);assert.equal(r.status,200);assert.match(r.body,/User-agent: OAI-SearchBot/i);assert.match(r.body,/Sitemap: https:\/\/www\.lou-rex\.com\/sitemap\.xml/i);});
 await test(agent+" sitemap",async()=>{const r=await get("/sitemap.xml",agent);assert.equal(r.status,200);for(const item of urls)assert.ok(r.body.includes("https://www.lou-rex.com"+item.path+"</loc>"),"Missing "+item.path);});
 await test(agent+" unknown route",async()=>{const r=await get("/search-acceptance-nonexistent-404",agent);assert.equal(r.status,404);});
 await test(agent+" private noindex",async()=>{const r=await get("/auth",agent);assert.match(r.headers.get("x-robots-tag")||"",/noindex/i);});
}
console.log(JSON.stringify({target:base.origin,total:report.length,passed:report.filter(x=>x.pass).length,report},null,2));
if(report.some(x=>!x.pass))process.exitCode=1;
