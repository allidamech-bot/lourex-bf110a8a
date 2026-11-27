import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const origin = "https://www.lou-rex.com";
const locales = ["en","ar","tr"];
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
const replaceOnce = (input, pattern, replacement) => {
  if (!pattern.test(input)) throw new Error("Missing template marker: " + pattern);
  return input.replace(pattern, () => replacement);
};
const localizedPath = (path,lang) => lang==="en"?path:"/"+lang+path;
const safePath = path => /^\/(?:[a-z-]+\/)*[a-z-]*$/.test(path);
function metadata(template,{path,title,description,lang="en",alternates=[]}){
  if(!safePath(path)) throw new Error("Unsafe route");
  let html = replaceOnce(template, /<title>[\s\S]*?<\/title>/, "<title>"+escapeHtml(title)+"</title>");
  html = replaceOnce(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '<link rel="canonical" href="'+origin+path+'" />'+alternates.map(x=>'<link rel="alternate" hreflang="'+x.lang+'" href="'+origin+x.path+'" />').join(""));
  html = replaceOnce(html, /<html lang="en"/, '<html lang="'+lang+'" dir="'+(lang==="ar"?"rtl":"ltr")+'"');
  for(const [attr,name,value] of [["name","description",description],["property","og:title",title],["property","og:description",description],["property","og:url",origin+path],["name","twitter:title",title],["name","twitter:description",description]]){
    html = replaceOnce(html,new RegExp('<meta\\s+'+attr+'="'+name+'"\\s+content="[^"]*"\\s*/?>'),'<meta '+attr+'="'+name+'" content="'+escapeHtml(value)+'" />');
  }
  return html;
}
const bodyMarker = /<div id="root"><div class="lrx-boot"[^>]*>[\s\S]*?<\/div><\/div>/;
const frame = (content) => '<div id="root"><header data-lourex-prerender style="max-width:70rem;margin:auto;padding:1.5rem"><a href="/"><img src="/lourex-official.jpeg" alt="LOUREX" width="72" height="72"></a></header><main style="max-width:70rem;margin:auto;padding:2rem 1.5rem;line-height:1.7">'+content+"</main></div>";
const heading = text => '<h1 style="font-size:clamp(2rem,5vw,4rem);line-height:1.2">'+escapeHtml(text)+"</h1>";
const list = links => '<nav><ul>'+links.map(link=>{if(!safePath(link.to))throw new Error("Unsafe link");return '<li><a href="'+link.to+'">'+escapeHtml(link.label)+"</a></li>"}).join("")+"</ul></nav>";
export function renderAeoHtml(template,kind,content,lang="en"){
  const page=content.pages[kind];
  if(!page||!/^\/[a-z-]+$/.test(page.path)||!locales.includes(lang))throw new Error("Invalid AEO route or language");
  const suffix=lang==="en"?"En":lang==="ar"?"Ar":"Tr";
  const path=localizedPath(page.path,lang);
  const h1=page["h1"+suffix], intro=page["intro"+suffix], focus=page["focus"+suffix];
  const title=h1.toLowerCase().includes("lourex")?h1:h1+" | LOUREX";
  const labels={en:["How LOUREX works","Sourcing focus"],ar:["كيف تعمل لوريكس","نطاق التركيز"],tr:["LOUREX nasıl çalışır","Tedarik kapsamı"]}[lang];
  const alternatives=locales.map(l=>({lang:l,path:localizedPath(page.path,l)}));
  const localPaths=new Set(Object.values(content.pages).map(p=>p.path));
  const links=content.relatedLinks.map(link=>({to:localPaths.has(link.to)?localizedPath(link.to,lang):link.to,label:link[lang]}));
  const localeLinks=alternatives.map((x,i)=>({to:x.path,label:["English","العربية","Türkçe"][i]}));
  const guide=(content.guides?.[kind]??[]).map(section=>"<section><h2>"+escapeHtml(section[lang][0])+"</h2><p>"+escapeHtml(section[lang][1])+"</p></section>").join("");
  const html=metadata(template,{path,title,description:intro,lang,alternates:[...alternatives,{lang:"x-default",path:page.path}]});
  return replaceOnce(html,bodyMarker,frame(list(localeLinks)+heading(h1)+"<p>"+escapeHtml(intro)+"</p>"+(kind==="about"?"":"<p>"+escapeHtml(content[lang+"Definition"])+"</p>")+"<section><h2>"+labels[0]+"</h2><p>"+escapeHtml(focus)+"</p></section><section><h2>"+labels[1]+"</h2><p>"+escapeHtml(content[lang+"Focus"])+"</p></section>"+guide+list(links)));
}
export function renderPublicHtml(template,page,path,categories=[]){
  const html=metadata(template,{path,title:page.titleEn,description:page.introEn});
  const categoryHtml=categories.length?"<section><h2>Product categories</h2><ul>"+categories.map(c=>"<li>"+escapeHtml(c.labelEn)+"</li>").join("")+"</ul></section>":"";
  return replaceOnce(html,bodyMarker,frame(heading(page.h1En)+"<p>"+escapeHtml(page.introEn)+"</p>"+categoryHtml+list(page.links.map(x=>({to:x.to,label:x.en})))));
}
export async function generateAeoPages(dist="dist",source="src/lib/aeo-content.json"){
  const template=await readFile(join(dist,"index.html"),"utf8");
  const content=JSON.parse(await readFile(source,"utf8"));
  const routes=new Set();
  for(const [kind,page] of Object.entries(content.pages)){
    if(!/^\/[a-z-]+$/.test(page.path)||routes.has(page.path))throw new Error("Invalid or duplicate AEO route");
    routes.add(page.path);
    for(const lang of locales){
      const folder=join(dist,localizedPath(page.path,lang).slice(1));
      await mkdir(folder,{recursive:true});
      await writeFile(join(folder,"index.html"),renderAeoHtml(template,kind,content,lang));
    }
  }
  const copy=JSON.parse(await readFile("src/lib/public-search-copy.json","utf8"));
  const categories=JSON.parse(await readFile("src/features/products/data/productCatalogCategories.json","utf8"));
  await mkdir(join(dist,"products"),{recursive:true});
  await writeFile(join(dist,"products","index.html"),renderPublicHtml(template,copy.catalog,"/products",categories));
  await writeFile(join(dist,"index.html"),renderPublicHtml(template,copy.home,"/"));
  await writeFile(join(dist,"spa.html"),template.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,""));
  await writeFile(join(dist,"404.html"),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,follow"><title>Page not found | LOUREX</title></head><body><main><h1>Page not found</h1><p>The requested page does not exist.</p><a href="/">LOUREX home</a> · <a href="/products">Product catalog</a></main></body></html>');
  console.log("Generated "+(routes.size*locales.length+2)+" static public pages, SPA fallback and 404 document");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await generateAeoPages();
