import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicCatalogReader,catalogResponse } from "../server/search-catalog.mjs";
export default async function handler(req,res){
  if(req.method!=="GET"&&req.method!=="HEAD"){res.setHeader("Allow","GET, HEAD");return res.status(405).end();}
  const query=req.query||{};
  const mode=typeof query.mode==="string"?query.mode:undefined;
  const slug=typeof query.slug==="string"?query.slug:undefined;
  let reader;
  try{reader=createPublicCatalogReader({url:process.env.VITE_SUPABASE_URL,key:process.env.VITE_SUPABASE_PUBLISHABLE_KEY});}
  catch{reader={product:async()=>{throw new Error("Unavailable");},products:async()=>{throw new Error("Unavailable");}};}
  const response=await catalogResponse({mode,slug,reader,readTemplate:()=>readFile(join(process.cwd(),"dist/spa.html"),"utf8")});
  for(const [key,value] of Object.entries(response.headers))res.setHeader(key,value);
  res.status(response.status);
  return res.end(req.method==="HEAD"?undefined:response.body);
}
