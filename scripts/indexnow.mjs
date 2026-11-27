import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const origin="https://www.lou-rex.com";
const host="www.lou-rex.com";
const endpoint="https://api.indexnow.org/indexnow";
const keyPattern=/^[A-Za-z0-9-]{8,128}$/;
export function makeIndexNowPayload(key,urls,publicPaths){
  if(!keyPattern.test(key||""))throw new Error("Invalid IndexNow key");
  const list=[...new Set(urls.map(value=>{
    const u=new URL(value,origin);
    if(u.origin!==origin||u.username||u.password||u.search||u.hash)throw new Error("Non-canonical or external URL");
    const path=u.pathname.replace(/\/+$/,"")||"/";
    if(!publicPaths.has(path)&&!/^\/products\/(?:[a-z0-9-]|%[0-9A-F]{2}){1,540}$/i.test(path))throw new Error("Not an approved public content URL");
    // Encoded separators, control characters, and traversal must never be submitted.
    const decoded=decodeURIComponent(path);
    if(!publicPaths.has(path)&&!/^\/products\/[a-z0-9\u0600-\u06ff]+(?:-[a-z0-9\u0600-\u06ff]+)*$/.test(decoded))throw new Error("Invalid product slug");
    return origin+path;
  }))];
  if(!list.length||list.length>10000)throw new Error("Expected 1–10000 URLs");
  return {host,key,keyLocation:origin+"/"+key+".txt",urlList:list};
}
export async function writeIndexNowKey(dist,key){
  if(!key)return false;
  if(!keyPattern.test(key))throw new Error("Invalid IndexNow key");
  await writeFile(join(dist,key+".txt"),key,{encoding:"utf8"});
  return true;
}
export async function submitIndexNow(payload,{fetchImpl=fetch}={}){
  const proof=await fetchImpl(payload.keyLocation,{redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!proof.ok||(await proof.text()).trim()!==payload.key)throw new Error("Live key ownership proof is missing");
  const response=await fetchImpl(endpoint,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(payload),redirect:"error",signal:AbortSignal.timeout(10000)});
  if(![200,202].includes(response.status))throw new Error("IndexNow response "+response.status);
  return response.status;
}
async function main(){
  const args=process.argv.slice(2);
  if(args[0]==="--write-key"){await writeIndexNowKey(args[1]||"dist",process.env.INDEXNOW_KEY);return;}
  const aeo=JSON.parse(await readFile("src/lib/aeo-content.json","utf8"));
  const paths=new Set(["/","/products","/about","/why-lourex","/faq","/contact","/request",...Object.values(aeo.pages).flatMap(p=>[p.path,"/ar"+p.path,"/tr"+p.path])]);
  const live=args[0]==="--submit";
  const urls=live?args.slice(1):args.filter(x=>x!=="--dry-run");
  const payload=makeIndexNowPayload(process.env.INDEXNOW_KEY||(!live?"dry-run-key":""),urls,paths);
  if(live){
    if(process.env.INDEXNOW_SUBMISSION_APPROVED!=="true")throw new Error("Explicit live submission approval required");
    console.log("IndexNow HTTP "+await submitIndexNow(payload)+"; submitted "+payload.urlList.length+" URLs. Acceptance is not indexing.");
  }else console.log(JSON.stringify({mode:"dry-run",host,urlList:payload.urlList},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
