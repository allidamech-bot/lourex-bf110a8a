import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.100.1";
import { renderPdf, type Quote, type Line } from "./render.ts";

const host = "gxmqchznfolerliorpkz.supabase.co";
const allowedOrigins = new Set(["https://www.lou-rex.com", "https://lou-rex.com"]);
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(value: string | object, status = 200, contentType = "application/json", origin?: string) {
  const headers: Record<string,string> = {
    "Content-Type": contentType,
    "Cache-Control": "no-store, private",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(typeof value === "string" ? value : JSON.stringify(value), { status, headers });
}


Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  if(req.method==="OPTIONS") {
    if(origin && !allowedOrigins.has(origin)) return response({error:"Forbidden origin"},403,"application/json",origin);
    const headers:Record<string,string> = {
      "Cache-Control":"no-store", "Access-Control-Allow-Headers":"Authorization, apikey, Content-Type",
      "Access-Control-Allow-Methods":"POST, OPTIONS",
    };
    if(origin)headers["Access-Control-Allow-Origin"]=origin;
    return new Response(null,{status:204,headers});
  }
  if(req.method!=="POST")return response({error:"Method not allowed"},405,"application/json",origin);
  if(origin && !allowedOrigins.has(origin))return response({error:"Forbidden origin"},403,"application/json",origin);
  const token=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.get("Authorization")||"")?.[1];
  if(!token)return response({error:"Authentication required"},401,"application/json",origin);
  let quoteId:unknown;
  try {
    const body = await req.json();
    quoteId=body && typeof body==="object" && !Array.isArray(body) ? body.quoteId : null;
  }catch{return response({error:"Invalid JSON body"},400,"application/json",origin);}
  if(typeof quoteId!=="string" || !validId.test(quoteId))
    return response({error:"Invalid quote ID"},400,"application/json",origin);
  const url = Deno.env.get("SUPABASE_URL")||"";
  const key = Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(!key || new URL(url).hostname!==host)
    return response({error:"Backend configuration unavailable"},503,"application/json",origin);
  try {
    const client=createClient(url,key,{
      global:{headers:{Authorization:`Bearer ${token}`}},
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const {data:auth,error:authError}=await client.auth.getUser(token);
    if(authError||!auth.user)return response({error:"Invalid session"},401,"application/json",origin);
    const {data:profile,error:profileError}=await client.from("profiles")
      .select("role,status").eq("id",auth.user.id).maybeSingle();
    if(profileError||!profile||profile.status!=="active"||
      !["owner","operations_employee"].includes(profile.role))
      return response({error:"Staff access required"},403,"application/json",origin);
    const {data:quote,error:quoteError}=await client.from("commercial_quote_drafts")
      .select("quote_number,currency,status,payment_terms,delivery_terms,incoterm,lead_time,validity_days,shipping_cost,discount_amount,issued_at")
      .eq("id",quoteId).maybeSingle();
    if(quoteError||!quote||quote.status!=="issued")
      return response({error:"Quotation must be issued"},409,"application/json",origin);
    const {data:lines,error:lineError}=await client.from("commercial_quote_items")
      .select("line_number,product_name,quantity,unit,unit_price,specifications")
      .eq("quote_id",quoteId).order("line_number",{ascending:true});
    if(lineError||!lines?.length||lines.length>20||lines.some(v=>v.unit_price===null))
      return response({error:"Incomplete issued quotation"},409,"application/json",origin);
    const bytes=await renderPdf(quote as Quote,lines as Line[]);
    if(bytes.byteLength<400||bytes.byteLength>7500000)
      throw new Error("Invalid PDF size");
    const pdfHeaders:Record<string,string>={
      "Content-Type":"application/pdf",
      "Content-Disposition":"attachment; filename=\"LOUREX-Quotation.pdf\"",
      "Cache-Control":"no-store, private",
      "X-Content-Type-Options":"nosniff",
      "Vary":"Origin",
    };
    if(origin)pdfHeaders["Access-Control-Allow-Origin"]=origin;
    return new Response(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,{status:200,headers:pdfHeaders});
  }catch(e){
    console.error("commercial quote PDF generation failed",e instanceof Error?e.name:"UnknownError");
    return response({error:"Secure quotation PDF is temporarily unavailable"},502,"application/json",origin);
  }
});
