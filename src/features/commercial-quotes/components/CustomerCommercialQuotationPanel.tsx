import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, GitBranch, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommercialQuotationDocument } from "@/features/commercial-quotes/components/CommercialQuotationDocument";
import {
  fetchCustomerQuotation, fetchCustomerQuoteVersions, respondToCustomerQuotation, type CustomerQuotation, type CustomerQuoteVersion,
} from "@/features/commercial-quotes/services/commercialQuoteLifecycleService";

export function CustomerCommercialQuotationPanel({ requestId, requestNumber, lang }: {
  requestId: string; requestNumber?: string; lang: "ar" | "en";
}) {
  const ar=lang==="ar";
  const statusLabel=(status:CustomerQuotation["status"])=>({
    issued:ar?"بانتظار ردك":"Awaiting your response",
    accepted:ar?"تم قبول العرض":"Accepted",
    changes_requested:ar?"تم طلب تعديل":"Changes requested",
    declined:ar?"تم رفض العرض":"Declined",
  } as Record<CustomerQuotation["status"],string>)[status] || status;
  const [quote,setQuote]=useState<CustomerQuotation|null>(null);
  const [versions,setVersions]=useState<CustomerQuoteVersion[]>([]);
  const [loading,setLoading]=useState(false);
  const [working,setWorking]=useState(false);
  const [note,setNote]=useState("");
  const [error,setError]=useState("");
  const isSmart=Boolean(requestNumber?.startsWith("RFQ-"));
  const reload=async ()=>{
    setLoading(true);setError("");
    try {
      const [current, history] = await Promise.all([fetchCustomerQuotation(requestId),fetchCustomerQuoteVersions(requestId)]);
      setQuote(current);setVersions(history);
    }
    catch(e){setError(e instanceof Error?e.message:"Could not load quotation");}
    finally{setLoading(false);}
  };
  useEffect(()=>{
    let active=true;
    setQuote(null);setVersions([]);setNote("");setError("");
    if(!isSmart)return;
    setLoading(true);
    void Promise.all([fetchCustomerQuotation(requestId),fetchCustomerQuoteVersions(requestId)])
      .then(([result,history])=>{if(active){setQuote(result);setVersions(history);}})
      .catch(err=>{if(active)setError(err instanceof Error?err.message:String(err));})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false};
  },[requestId,isSmart]);
  const viewVersion=async(id:string)=>{
    if(loading||working)return;
    setLoading(true);setError("");
    try{
      const historical=await fetchCustomerQuotation(requestId,id);
      if(!historical)throw new Error("Quotation version is not available");
      setQuote(historical);setNote("");
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  };
  if(!isSmart)return null;
  if(loading&&!quote)return <p className="my-3 text-sm text-muted-foreground">{ar?"التحقق من عروض الأسعار الصادرة…":"Checking issued quotations…"}</p>;
  // No customer-facing hint about unissued/private quotation existence.
  if(!quote&&!error)return null;
  const respond=async(action:"accepted"|"changes_requested"|"declined")=>{
    if(!quote||working)return;
    const confirmText=action==="accepted"
      ? (ar?"هل قرأت عرض السعر وشروط الدفع والتسليم وتوافق على العرض؟ لا يعني هذا أنك دفعت.":
          "Have you reviewed the quotation and payment/delivery terms? Acceptance does not mean payment.")
      : action==="declined"
        ? (ar?"هل تريد رفض عرض السعر؟":"Decline this quotation?")
        : "";
    if(confirmText&&!window.confirm(confirmText))return;
    setWorking(true);setError("");
    try {
      const result=await respondToCustomerQuotation(quote,action,note);
      setQuote(result);setNote("");
    }catch(e){setError(e instanceof Error?e.message:"Could not save response");}
    finally{setWorking(false);}
  };
  return <section data-testid="customer-commercial-quotation" className="my-5 min-w-0 space-y-5 overflow-hidden rounded-[1.5rem] border border-amber-300/20 bg-gradient-to-br from-stone-900 via-stone-950 to-blue-950/30 p-4 text-stone-100 shadow-xl sm:p-6">
    <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">LOUREX / COMMERCIAL QUOTATION</p>
        <h3 className="mt-2 break-words text-xl font-bold leading-tight text-white sm:text-2xl">{ar?"عرض السعر التجاري":"Your commercial quotation"}</h3>
        {quote&&<p className="mt-2 break-all font-mono text-xs text-stone-300 sm:text-sm">{quote.number} · {ar?"الإصدار":"Version"} {quote.versionNo}</p>}
      </div>
      {quote&&<span className="w-fit max-w-full rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">{statusLabel(quote.status)}</span>}
      <Button type="button" variant="outline" size="sm" disabled={loading||working} onClick={()=>void reload()} className="min-h-11 w-full rounded-xl border-amber-200/20 bg-stone-800/70 text-stone-100 sm:w-auto">
        {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<RefreshCw className="h-4 w-4"/>}
        {ar?"تحديث":"Refresh"}
      </Button>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {quote&&<>
      {versions.length>1&&<div className="min-w-0 rounded-2xl border border-amber-200/15 bg-stone-900/60 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-100"><GitBranch className="h-4 w-4 text-primary"/>
          {ar?"تاريخ الإصدارات السابقة":"Previous issued versions"}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          {versions.map(v=><Button type="button" key={v.id} size="sm" disabled={loading||working}
            variant={v.id===quote.id?"default":"outline"} onClick={()=>void viewVersion(v.id)} className="min-h-11 w-full rounded-xl sm:w-auto">
            {ar?"الإصدار":"Version"} {v.versionNo} · {statusLabel(v.status)}
          </Button>)}
        </div>
        {versions[0]?.id!==quote.id&&<p className="mt-2 text-xs text-muted-foreground">
          {ar?"أنت تستعرض إصدارًا سابقًا محفوظًا. اختر الإصدار الأحدث أعلاه للمتابعة.":
            "You are viewing a preserved older version. Select the newest version above to continue."}
        </p>}
      </div>}
      <CommercialQuotationDocument quote={quote} lang={lang}/>
      {quote.status==="issued"&&versions[0]?.id===quote.id?<div className="space-y-4 rounded-2xl border border-amber-300/20 bg-stone-900/65 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-base font-semibold text-amber-100"><ShieldCheck className="h-4 w-4 text-primary"/>
          {ar?"ردّك على العرض":"Your response"}
        </div>
        <p className="text-xs text-muted-foreground">{ar?"يمكنك قبول العرض، رفضه، أو طلب تعديل. قبول العرض لا ينشئ عملية دفع.":
          "Accept, decline or request a revision. Accepting does not initiate payment."}</p>
        <Textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={2000} disabled={working}
          placeholder={ar?"اذكر تفاصيل التعديل المطلوب أو ملاحظاتك…":"Describe requested changes or add optional notes…"}
          className="min-h-24 rounded-xl border-amber-200/15 bg-stone-950/70 text-stone-100 placeholder:text-stone-500"/>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button type="button" disabled={working} onClick={()=>void respond("accepted")} className="min-h-11 w-full justify-center gap-2 rounded-xl bg-amber-400 text-stone-950 hover:bg-amber-300 sm:w-auto">
            <CheckCircle2 className="h-4 w-4"/>{ar?"قبول العرض":"Accept quotation"}</Button>
          <Button type="button" variant="outline" disabled={working||note.trim().length<5}
            onClick={()=>void respond("changes_requested")} className="min-h-11 w-full justify-center gap-2 rounded-xl border-amber-200/25 text-stone-100 sm:w-auto">
            <ClipboardList className="h-4 w-4"/>{ar?"طلب تعديل":"Request changes"}</Button>
          <Button type="button" variant="outline" disabled={working} onClick={()=>void respond("declined")} className="min-h-11 w-full justify-center gap-2 rounded-xl border-red-500/25 text-red-200 sm:w-auto">
            <XCircle className="h-4 w-4"/>{ar?"رفض العرض":"Decline quotation"}</Button>
        </div>
      </div>:<p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
        {quote.status==="accepted"?(ar?"تم تسجيل موافقتك، وسيتابع فريق LOUREX الخطوات التجارية.":"Your acceptance has been recorded; LOUREX will follow up."):
        quote.status==="changes_requested"?(ar?"تم تسجيل طلب تعديل العرض، وسيقوم فريق LOUREX بمراجعته.":"Your change request was recorded for LOUREX review."):
        (ar?"تم تسجيل رفض العرض.":"Your quotation was declined.")}
        {quote.responseNote&&<span className="mt-1 block text-xs text-muted-foreground">{quote.responseNote}</span>}
      </p>}
    </>}
  </section>;
}
