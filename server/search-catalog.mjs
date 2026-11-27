// Public-only catalog discovery. No privileged keys, customer data or writes.
const ORIGIN = "https://www.lou-rex.com";
const SUPABASE = "https://gxmqchznfolerliorpkz.supabase.co";
const slugPattern = /^[a-z0-9\u0600-\u06ff]+(?:-[a-z0-9\u0600-\u06ff]+)*$/;
const validSlug = s => typeof s === "string" && s.length <= 90 && slugPattern.test(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const urlFor = slug => ORIGIN + "/products/" + encodeURIComponent(slug);
const columns = "id,slug,name_en,short_description_en,description_en,origin_country,brand,packaging,unit,weight,image_url,image_alt_en,status,updated_at";
const identityValid = row => row && row.status === "active" && validSlug(row.slug) && typeof row.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id);
const eligible = row => identityValid(row) && typeof row.name_en === "string" && Boolean(row.name_en.trim()) && typeof row.short_description_en === "string" && Boolean(row.short_description_en.trim());
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
      const row=rows.find(row=>row?.status==="active"&&row.slug===slug);
      if(row&&!eligible(row))throw new Error("Active product has incomplete public metadata");
      return row??null;
    },
    async products(){
      const all=[],seen=new Set();
      const size=500;
      const deadline=Date.now()+8000;
      // Keyset pagination, bounded under the sitemap protocol's 50,000 URL limit.
      let cursor;
      for(let page=0;page<100;page++){
        if(Date.now()>deadline)throw new Error("Catalog sitemap time budget exceeded");
        const rows=await read({order:"id.asc",limit:String(size),...(cursor?{id:"gt."+cursor}:{})});
        for(const row of rows){
          if(!eligible(row))continue;
          if(seen.has(row.slug))throw new Error("Duplicate catalog slug");
          seen.add(row.slug);all.push(row);
        }
        if(rows.length<size)return all;
        const next=rows.at(-1)?.id;
        if(typeof next!=="string"||!identityValid({...rows.at(-1),slug:"cursor",status:"active"})||(cursor&&next<=cursor))throw new Error("Invalid catalog cursor");
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
const safeImage = value => {
  if(typeof value!=="string"||!value)return "";
  try { const u=new URL(value,ORIGIN); return u.protocol==="https:"&&!u.username&&!u.password&&(u.origin===ORIGIN||["images.openfoodfacts.org","images.openfoodfacts.net","gxmqchznfolerliorpkz.supabase.co"].includes(u.hostname))?u.href:""; }catch{return "";}
};
const schema = value => '<script type="application/ld+json">'+JSON.stringify(value).replace(/</g,"\\u003c")+'</script>';
const sectorLinks = () => '<nav aria-label="Sourcing resources"><h2>Commercial sourcing resources</h2><ul><li><a href="/food-products-sourcing">Food products sourcing</a></li><li><a href="/fmcg-wholesale-sourcing">FMCG wholesale sourcing</a></li><li><a href="/turkiye-sourcing-guide">Sourcing from Türkiye</a></li><li><a href="/wholesale-rfq-checklist">Wholesale RFQ checklist</a></li></ul></nav>';
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
  const details=[["Origin",row.origin_country],["Brand",row.brand],["Packaging",row.packaging],["Reference pack size",row.weight],["Unit",row.unit]].filter(([,value])=>typeof value==="string"&&value.trim()).map(([label,value])=>"<dt>"+label+"</dt><dd>"+esc(value)+"</dd>").join("");
  const image=safeImage(row.image_url);
  if(image) html=html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,()=>'<meta property="og:image" content="'+esc(image)+'" />');
  const crumbs={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"LOUREX",item:ORIGIN+"/"},{"@type":"ListItem",position:2,name:"Product catalog",item:ORIGIN+"/products"},{"@type":"ListItem",position:3,name:row.name_en,item:url}]};
  html=html.replace("</head>",()=>schema(crumbs)+"</head>");
  const body='<div id="root"><main data-lourex-prerender style="max-width:70rem;margin:auto;padding:2rem 1.5rem;line-height:1.7"><a href="/products">LOUREX product catalog</a><h1>'+esc(row.name_en)+'</h1>'+(image?'<img src="'+esc(image)+'" alt="'+esc(row.image_alt_en||row.name_en)+'" width="320" loading="lazy" style="max-width:100%;height:auto">':'')+'<p>'+esc(row.short_description_en)+'</p>'+(row.description_en?"<p>"+esc(row.description_en)+"</p>":"")+(details?"<dl>"+details+"</dl>":"")+'<a href="/request?source=products&amp;product='+encodeURIComponent(row.id)+'">Create a sourcing request</a>'+sectorLinks()+'</main></div>';
  return replaceRequired(html,/<div id="root"><div class="lrx-boot"[^>]*>[\s\S]*?<\/div><\/div>/,body);
}
export function renderCatalogDocument(template,rows){
  const url=ORIGIN+"/products";
  const title="Wholesale FMCG product catalog | LOUREX";
  const description="Browse branded food, confectionery, biscuits and beverages for wholesale sourcing inquiries. Availability and commercial terms are confirmed on request.";
  let html=replaceRequired(template,/<title>[\s\S]*?<\/title>/,"<title>"+esc(title)+"</title>");
  html=html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/g,"");
  for(const [attr,name,value] of [["name","description",description],["property","og:title",title],["property","og:description",description],["property","og:url",url],["name","twitter:title",title],["name","twitter:description",description]]){
    html=replaceRequired(html,new RegExp('<meta\\s+'+attr+'="'+name+'"\\s+content="[^"]*"\\s*/?>'),'<meta '+attr+'="'+name+'" content="'+esc(value)+'" />');
  }
  const visible=rows.filter(eligible).sort((a,b)=>a.name_en.localeCompare(b.name_en)||a.slug.localeCompare(b.slug)).slice(0,500);
  const items=visible.map(r=>'<li><a href="'+esc(urlFor(r.slug))+'">'+esc(r.name_en)+'</a> — '+esc(r.short_description_en)+'</li>').join("");
  const ld={"@context":"https://schema.org","@type":"ItemList",itemListElement:visible.map((r,i)=>({"@type":"ListItem",position:i+1,url:urlFor(r.slug),name:r.name_en}))};
  html=html.replace("</head>",()=>'<link rel="canonical" href="'+url+'" />'+schema(ld)+"</head>");
  const body='<div id="root"><main data-lourex-prerender style="max-width:70rem;margin:auto;padding:2rem 1.5rem;line-height:1.7"><a href="/">LOUREX</a><h1>Wholesale FMCG product catalog</h1><p>'+esc(description)+'</p><h2>Products for sourcing inquiries</h2>'+(items?'<ul>'+items+'</ul>':'<p>No products are listed at present. Submit your sourcing requirements.</p>')+'<a href="/request">Create a sourcing request</a>'+sectorLinks()+'</main></div>';
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
    if(mode==="catalog")return {status:200,headers:{...htmlHeaders,"Cache-Control":"public, max-age=0, s-maxage=60"},body:renderCatalogDocument(await readTemplate(),await reader.products())};
    if(mode!=="detail")return {status:404,headers:{...htmlHeaders,"X-Robots-Tag":"noindex, follow"},body:errorPage(404)};
    const row=await reader.product(slug);
    if(!row)return {status:404,headers:{...htmlHeaders,"X-Robots-Tag":"noindex, follow"},body:errorPage(404)};
    return {status:200,headers:{...htmlHeaders,"Cache-Control":"public, max-age=0, s-maxage=30"},body:renderProductDocument(await readTemplate(),row)};
  }catch{
    return {status:503,headers:{...htmlHeaders,"Retry-After":"60"},body:errorPage(503)};
  }
}
