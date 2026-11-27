// Public-only catalog discovery. No privileged keys, customer data or writes.
const ORIGIN = "https://www.lou-rex.com";
const SUPABASE = "https://gxmqchznfolerliorpkz.supabase.co";
const slugPattern = /^[a-z0-9\u0600-\u06ff]+(?:-[a-z0-9\u0600-\u06ff]+)*$/;
const validSlug = s => typeof s === "string" && s.length <= 90 && slugPattern.test(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const urlFor = slug => ORIGIN + "/products/" + encodeURIComponent(slug);
const columns = "id,slug,name_en,short_description_en,description_en,origin_country,brand,packaging,unit,status,updated_at";
const eligible = row => row && row.status === "active" && validSlug(row.slug) && typeof row.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id) && typeof row.name_en === "string" && Boolean(row.name_en.trim()) && typeof row.short_description_en === "string" && Boolean(row.short_description_en.trim());
export function createPublicCatalogReader({url,key,fetchImpl=fetch}={}){
  if(url?.replace(/\/$/,"") !== SUPABASE || typeof key !== "string" || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error("Public catalog configuration unavailable");
  async function read(params){
    const endpoint = new URL(SUPABASE+"/rest/v1/product_catalog_products");
    endpoint.search = new URLSearchParams({select:columns,status:"eq.active",...params}).toString();
    const response=await fetchImpl(endpoint,{headers:{apikey:key,Accept:"application/json"},signal:AbortSignal.timeout(7000),redirect:"error"});
    if(!response.ok) throw new Error("Catalog backend unavailable");
    const rows=await response.json();
    if(!Array.isArray(rows)) throw new Error("Invalid catalog response");
    return rows;
  }
  return {
    async product(slug){
      if(!validSlug(slug))return null;
      const rows=await read({slug:"eq."+slug,limit:"2"});
      if(rows.length>1)throw new Error("Ambiguous catalog slug");
      return rows.find(row=>eligible(row)&&row.slug===slug)??null;
    },
    async products(){
      const all=[],seen=new Set();
      const size=500;
      // Keyset pagination, bounded under the sitemap protocol's 50,000 URL limit.
      let cursor;
      for(let page=0;page<100;page++){
        const rows=await read({order:"id.asc",limit:String(size),...(cursor?{id:"gt."+cursor}:{})});
        for(const row of rows){
          if(!eligible(row))continue;
          if(seen.has(row.slug))throw new Error("Duplicate catalog slug");
          seen.add(row.slug);all.push(row);
        }
        if(rows.length<size)return all;
        const next=rows.at(-1)?.id;
        if(typeof next!=="string"||next===cursor)throw new Error("Invalid catalog cursor");
        cursor=next;
      }
      throw new Error("Catalog exceeds bounded sitemap capacity; partition required");
    }
  };
}
export function renderProductSitemap(rows){
  const items=rows.filter(eligible).map(row=>{
    const date=typeof row.updated_at==="string"&&/^\d{4}-\d{2}-\d{2}T/.test(row.updated_at)&&!Number.isNaN(Date.parse(row.updated_at))?new Date(row.updated_at).toISOString():"";
    return "<url><loc>"+esc(urlFor(row.slug))+"</loc>"+(date?"<lastmod>"+date+"</lastmod>":"")+"</url>";
  });
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+items.join("")+"</urlset>";
}
function replaceRequired(html,pattern,replacement){
  if(!pattern.test(html))throw new Error("Invalid built catalog template");
  return html.replace(pattern,()=>replacement);
}
export function renderProductDocument(template,row){
  if(!eligible(row))throw new Error("Product not public");
  const title=row.name_en.toLowerCase().includes("lourex")?row.name_en:row.name_en+" | LOUREX";
  const url=urlFor(row.slug);
  let html=replaceRequired(template,/<title>[\s\S]*?<\/title>/,"<title>"+esc(title)+"</title>");
  html=html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/g,"");
  html=replaceRequired(html,/<\/head>/,'<link rel="canonical" href="'+url+'" /></head>');
  for(const [attr,name,value] of [["name","description",row.short_description_en],["property","og:title",title],["property","og:description",row.short_description_en],["property","og:url",url],["name","twitter:title",title],["name","twitter:description",row.short_description_en]]){
    html=replaceRequired(html,new RegExp('<meta\\s+'+attr+'="'+name+'"\\s+content="[^"]*"\\s*/?>'),'<meta '+attr+'="'+name+'" content="'+esc(value)+'" />');
  }
  const details=[["Origin",row.origin_country],["Brand",row.brand],["Packaging",row.packaging],["Unit",row.unit]].filter(([,value])=>typeof value==="string"&&value.trim()).map(([label,value])=>"<dt>"+label+"</dt><dd>"+esc(value)+"</dd>").join("");
  const body='<div id="root"><main data-lourex-prerender style="max-width:70rem;margin:auto;padding:2rem 1.5rem;line-height:1.7"><a href="/products">LOUREX product catalog</a><h1>'+esc(row.name_en)+'</h1><p>'+esc(row.short_description_en)+'</p>'+(row.description_en?"<p>"+esc(row.description_en)+"</p>":"")+(details?"<dl>"+details+"</dl>":"")+'<a href="/request?source=products&amp;product='+encodeURIComponent(row.id)+'">Create a sourcing request</a></main></div>';
  return replaceRequired(html,/<div id="root"><div class="lrx-boot"[^>]*>[\s\S]*?<\/div><\/div>/,body);
}
const errorPage = (status) => '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'+(status===404?'<meta name="robots" content="noindex,follow">':"")+"<title>"+(status===404?"Product not found":"Catalog temporarily unavailable")+"</title><main><h1>"+(status===404?"Product not found":"Catalog temporarily unavailable")+'</h1><a href="/products">Product catalog</a></main></html>';
export async function catalogResponse({mode,slug,reader,readTemplate}){
  const htmlHeaders={"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"};
  if(mode==="detail"&&!validSlug(slug))return {status:404,headers:{...htmlHeaders,"X-Robots-Tag":"noindex, follow"},body:errorPage(404)};
  try{
    if(mode==="sitemap"){
      const rows=await reader.products();
      return {status:200,headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=0, s-maxage=60"},body:renderProductSitemap(rows)};
    }
    if(mode!=="detail")return {status:404,headers:{...htmlHeaders,"X-Robots-Tag":"noindex, follow"},body:errorPage(404)};
    const row=await reader.product(slug);
    if(!row)return {status:404,headers:{...htmlHeaders,"X-Robots-Tag":"noindex, follow"},body:errorPage(404)};
    return {status:200,headers:{...htmlHeaders,"Cache-Control":"public, max-age=0, s-maxage=30"},body:renderProductDocument(await readTemplate(),row)};
  }catch{
    return {status:503,headers:{...htmlHeaders,"Retry-After":"60"},body:errorPage(503)};
  }
}
