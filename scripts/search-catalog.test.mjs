import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPublicCatalogReader,renderProductSitemap,renderProductDocument,renderCatalogDocument,catalogResponse } from "../server/search-catalog.mjs";
const template=await readFile("index.html","utf8");
const row={id:"123e4567-e89b-42d3-a456-426614174000",slug:"test-product",name_en:"Example <script>",short_description_en:"Quote & specifications",description_en:"Test only",status:"active",updated_at:"2026-11-27T00:00:00Z"};
const config={url:"https://gxmqchznfolerliorpkz.supabase.co",key:"sb_publishable_test"};
test("reject privileged or wrong-project configuration",()=>{
 assert.throws(()=>createPublicCatalogReader({...config,key:"sb_secret_test"}));
 assert.throws(()=>createPublicCatalogReader({...config,url:"https://other.supabase.co"}));
});
test("queries only active products with the public key; excludes drafts, malformed IDs and mismatched slugs",async()=>{
 const reader=createPublicCatalogReader({...config,fetchImpl:async(url,options)=>{
  assert.equal(url.searchParams.get("status"),"eq.active");
  assert.equal(options.headers.apikey,config.key);
  assert.equal(options.headers.Authorization,undefined);
  return new Response(JSON.stringify([{...row,status:"draft"}]));
 }});
 assert.equal(await reader.product("test-product"),null);
 assert.deepEqual(await reader.products(),[]);
 assert.equal(await reader.product("../private"),null);
});
test("sitemap uses actual active slugs, encoded URLs, valid dates, and excludes drafts",()=>{
 const xml=renderProductSitemap([row,{...row,slug:"منتج"},{...row,slug:"draft",status:"draft"},{...row,slug:"../bad"}]);
 assert.match(xml,/products\/test-product/);
 assert.ok(xml.includes(encodeURIComponent("منتج")));
 assert.ok(!xml.includes("/draft"));assert.ok(!xml.includes("../bad"));
 assert.match(xml,/<lastmod>2026-11-27T00:00:00.000Z<\/lastmod>/);
 assert.equal((xml.match(/<loc>/g)||[]).length,2);
});
test("product HTML escapes data and retains application entry; no fabricated prices or ratings",()=>{
 const html=renderProductDocument(template,row);
 assert.ok(html.includes("Example &lt;script&gt;"));
 assert.ok(!html.includes("<h1>Example <script>"));
 assert.match(html,/rel="canonical" href="https:\/\/www\.lou-rex\.com\/products\/test-product"/);
 assert.match(html,/script type="module"/);
 assert.ok(html.includes("product="+row.id));
 assert.ok(!html.includes("lrx-boot\" role"));
 assert.throws(()=>renderProductDocument(template,{...row,status:"archived"}));
});
test("missing and invalid products return 404; backend outage returns retryable 503, not false empty sitemap",async()=>{
 const reader={product:async()=>null,products:async()=>{throw new Error("offline");}};
 const missing=await catalogResponse({mode:"detail",slug:row.slug,reader});
 assert.equal(missing.status,404);assert.match(missing.headers["X-Robots-Tag"],/noindex/);
 const bad=await catalogResponse({mode:"detail",slug:"../bad",reader});assert.equal(bad.status,404);
 const outage=await catalogResponse({mode:"sitemap",reader});assert.equal(outage.status,503);assert.equal(outage.headers["Retry-After"],"60");
 const ok=await catalogResponse({mode:"detail",slug:row.slug,reader:{product:async()=>row},readTemplate:async()=>template});assert.equal(ok.status,200);
 const empty=await catalogResponse({mode:"sitemap",reader:{products:async()=>[]}});assert.equal(empty.status,200);assert.ok(!empty.body.includes("<loc>"));
});

test("an active row with missing search metadata returns retryable 503 rather than permanently missing",async()=>{
 const reader=createPublicCatalogReader({...config,fetchImpl:async()=>new Response(JSON.stringify([{...row,short_description_en:""}]))});
 const result=await catalogResponse({mode:"detail",slug:row.slug,reader});
 assert.equal(result.status,503);assert.equal(result.headers["Retry-After"],"60");
 assert.deepEqual(await reader.products(),[]);
});

test("catalog contains active product links and ItemList, excludes drafts",async()=>{
 const html=renderCatalogDocument(template,[row,{...row,slug:"draft",status:"draft"}]);
 assert.ok(html.includes('href="https://www.lou-rex.com/products/test-product"'));
 assert.ok(html.includes('"@type":"ItemList"'));assert.ok(!html.includes("/products/draft"));
 const result=await catalogResponse({mode:"catalog",reader:{products:async()=>[row]},readTemplate:async()=>template});assert.equal(result.status,200);
});
test("product includes safe image, breadcrumbs and sourcing links without fictitious offers",()=>{
 const html=renderProductDocument(template,{...row,image_url:"https://images.openfoodfacts.org/images/test.jpg",weight:"50 g"});
 assert.ok(html.includes('<img src="https://images.openfoodfacts.org/images/test.jpg"'));assert.ok(html.includes('"@type":"BreadcrumbList"'));assert.ok(html.includes("Reference pack size"));assert.ok(html.includes('href="/fmcg-wholesale-sourcing"'));assert.ok(!html.includes('"@type":"Offer"'));
 const bad=renderProductDocument(template,{...row,image_url:"javascript:alert(1)"});assert.ok(!bad.includes("javascript:alert(1)"));
});
