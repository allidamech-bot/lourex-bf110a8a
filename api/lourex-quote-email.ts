import { createClient } from "@supabase/supabase-js";

type Request = { method?: string; headers: { origin?: string; authorization?: string }; body?: unknown };
type Response = { setHeader(name: string, value: string): void; status(code: number): { json(data: unknown): void; end(): void } };
const projectHost = "gxmqchznfolerliorpkz.supabase.co";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safe = (v: unknown) => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const origins = new Set(["https://www.lou-rex.com","https://lou-rex.com"]);
export default async function handler(req: Request, res: Response) {
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Origin",origins.has(req.headers.origin || "") ? req.headers.origin! : "https://www.lou-rex.com");
  res.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  if(req.headers.origin && !origins.has(req.headers.origin))return res.status(403).json({error:"Forbidden origin"});
  const match=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.authorization||"");
  if(!match)return res.status(401).json({error:"Sign-in required"});
  let quoteId:unknown;
  try {
    const body=typeof req.body==="string"?JSON.parse(req.body):req.body;
    quoteId=body && typeof body==="object" && !Array.isArray(body)?(body as {quoteId?:unknown}).quoteId:null;
  } catch {return res.status(400).json({error:"Invalid request"});}
  if(typeof quoteId!=="string"||!uuid.test(quoteId))return res.status(400).json({error:"Valid quote ID required"});
  const url=(process.env.VITE_SUPABASE_URL||"").trim();
  const publicKey=(process.env.VITE_SUPABASE_PUBLISHABLE_KEY||"").trim();
  const emailKey=(process.env.RESEND_API_KEY||"").trim();
  const from=(process.env.LOUREX_EMAIL_FROM||"").trim();
  if(!url||!publicKey||!emailKey||!from)return res.status(503).json({error:"Email service configuration is incomplete"});
  let parsed:URL;
  try {parsed=new URL(url);}catch{return res.status(503).json({error:"Invalid backend configuration"});}
  if(parsed.protocol!=="https:"||parsed.hostname!==projectHost)return res.status(503).json({error:"Backend project mismatch"});
  try {
    // Use caller JWT for all DB queries: there is no privileged service role on Vercel.
    const client=createClient(url,publicKey,{
      global:{headers:{Authorization:`Bearer ${match[1]}`}},
      auth:{persistSession:false,autoRefreshToken:false},
    });
    const {data:auth,error:authError}=await client.auth.getUser(match[1]);
    if(authError||!auth.user)return res.status(401).json({error:"Session expired"});
    const {data:profile,error:profileError}=await client.from("profiles").select("role,status")
      .eq("id",auth.user.id).maybeSingle();
    if(profileError||!profile||profile.status!=="active"||
      !["owner","operations_employee"].includes(profile.role))return res.status(403).json({error:"Staff access required"});
    const {data:quote,error:quoteError}=await client.from("commercial_quote_drafts")
      .select("id,quote_number,source_request_id,customer_id,status")
      .eq("id",quoteId).maybeSingle();
    if(quoteError||!quote||quote.status!=="issued")return res.status(409).json({error:"Only issued quotations can be sent by email"});
    const {data:customer,error:customerError}=await client.from("lourex_customers")
      .select("email,full_name").eq("id",quote.customer_id).maybeSingle();
    const recipient=customer?.email?.trim();
    if(customerError||!recipient||!/^\S+@\S+\.\S+$/.test(recipient))
      return res.status(409).json({error:"Customer email missing or invalid"});
    const link=`https://www.lou-rex.com/customer-portal/requests?request=${encodeURIComponent(quote.source_request_id)}`;
    const html=`<html><body style="background:#f7f8fa;padding:32px;font-family:Arial,Tahoma,sans-serif;color:#172033">
      <main style="max-width:650px;margin:auto;padding:30px;border-top:5px solid #c28b3c;background:white">
      <h1 style="color:#143459">LOUREX</h1><p>International Trading &amp; Resources</p>
      <h2>Your commercial quotation is ready</h2>
      <p>Dear ${safe(customer.full_name)},</p>
      <p>Quotation <strong>${safe(quote.quote_number)}</strong> has been issued for your sourcing request.
      Please sign in to your LOUREX customer account to review the pricing, download/save the PDF,
      and accept or request a revision.</p>
      <p><a href="${link}" style="background:#133b66;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">View quotation securely</a></p>
      <p style="font-size:12px;color:#6c7583">This link requires your LOUREX account. No commercial pricing is included in this email.</p>
      </main></body></html>`;
    const resp=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":`Bearer ${emailKey}`,"Content-Type":"application/json","Idempotency-Key":`lourex-quote-${quote.id}`},
      body:JSON.stringify({from,to:[recipient],subject:`LOUREX quotation ${quote.quote_number} is ready`,html,text:`LOUREX quotation ${quote.quote_number} is ready. Sign in to review it: ${link}`}),
      signal:AbortSignal.timeout(16000),
    });
    if(!resp.ok){console.error("quotation email provider status",resp.status);return res.status(502).json({error:"Quotation is visible in customer account but email delivery was not confirmed"});}
    const accepted=await resp.json() as {id?:unknown};
    if(!accepted.id)return res.status(502).json({error:"Email service did not confirm receipt"});
    return res.status(200).json({sent:true});
  }catch(e){
    console.error("quotation email failure",e instanceof Error?e.name:"UnknownError");
    return res.status(502).json({error:"Email could not be sent. Quotation remains available in customer account."});
  }
}
