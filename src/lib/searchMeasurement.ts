import aeo from "./aeo-content.json";
const origin = "https://www.lou-rex.com";
const publicPaths = new Set(["/","/products","/about","/why-lourex","/faq","/contact","/request","/smart-rfq",...Object.values(aeo.pages).flatMap(p=>[p.path,"/ar"+p.path,"/tr"+p.path])]);
const aiSources = ["chatgpt.com","perplexity.ai","copilot.microsoft.com","gemini.google.com"] as const;
const allowedSources = [...aiSources,"google","bing","google.com","bing.com"] as const;
export function measurementPath(path:string):string|null {
  const normalized=path.replace(/\/+$/,"")||"/";
  if(publicPaths.has(normalized))return normalized;
  // Never send product slugs, request references, or private paths to analytics.
  if(/^\/products\/[^/]+$/.test(normalized))return "/products/detail";
  return null;
}
export function measurementSource(search:string,referrer:string):string {
  const source=new URLSearchParams(search).get("utm_source")?.toLowerCase();
  if(source&&allowedSources.some(x=>x===source))return source;
  try {
    const host=new URL(referrer).hostname.toLowerCase().replace(/^www\./,"");
    if(allowedSources.some(x=>x===host))return host;
    if(/^google\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host))return "google";
  } catch { /* No referrer or invalid URL. */ }
  return "unattributed";
}
export function safeMeasurementLocation(path:string,source:string):string|null {
  const p=measurementPath(path);
  if(!p)return null;
  return origin+p+(allowedSources.some(x=>x===source)?"?utm_source="+encodeURIComponent(source):"");
}
export function conversionKind(name:unknown):string|null {
  switch(name){
    case "purchase_request_submitted":return "purchase_request";
    case "smart_rfq_submitted":return "smart_rfq";
    case "contact_submitted":return "contact";
    default:return null;
  }
}
