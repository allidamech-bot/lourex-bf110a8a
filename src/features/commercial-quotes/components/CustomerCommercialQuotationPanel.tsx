import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommercialQuotationDocument } from "@/features/commercial-quotes/components/CommercialQuotationDocument";
import {
  fetchCustomerQuotation, respondToCustomerQuotation, type CustomerQuotation,
} from "@/features/commercial-quotes/services/commercialQuoteLifecycleService";

export function CustomerCommercialQuotationPanel({ requestId, requestNumber, lang }: {
  requestId: string; requestNumber?: string; lang: "ar" | "en";
}) {
  const ar=lang==="ar";
  const [quote,setQuote]=useState<CustomerQuotation|null>(null);
  const [loading,setLoading]=useState(false);
  const [working,setWorking]=useState(false);
  const [note,setNote]=useState("");
  const [error,setError]=useState("");
  const isSmart=Boolean(requestNumber?.startsWith("RFQ-"));
  const reload=async ()=>{
    setLoading(true);setError("");
    try {setQuote(await fetchCustomerQuotation(requestId));}
    catch(e){setError(e instanceof Error?e.message:"Could not load quotation");}
    finally{setLoading(false);}
  };
  useEffect(()=>{
    let active=true;
    setQuote(null);setNote("");setError("");
    if(!isSmart)return;
    setLoading(true);
    void fetchCustomerQuotation(requestId).then(result=>{if(active)setQuote(result);})
      .catch(err=>{if(active)setError(err instanceof Error?err.message:String(err));})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false};
  },[requestId,isSmart]);
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
  return <section data-testid="customer-commercial-quotation" className="my-5 space-y-4 rounded-[1.5rem] border border-primary/30 bg-card p-5 shadow-xl">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-primary">LOUREX · QUOTATION</p>
        <h3 className="mt-1 text-xl font-semibold">{ar?"عرض السعر التجاري":"Your commercial quotation"}</h3>
        {quote&&<p className="mt-1 font-mono text-sm text-muted-foreground">{quote.number}</p>}
      </div>
      {quote&&<span className="rounded-xl border border-primary/20 px-3 py-1 text-xs font-semibold">{quote.status}</span>}
      <Button type="button" variant="outline" size="sm" disabled={loading||working} onClick={()=>void reload()}>
        {loading?<Loader2 className="h-4 w-4 animate-spin"/>:<RefreshCw className="h-4 w-4"/>}
        {ar?"تحديث":"Refresh"}
      </Button>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {quote&&<>
      <CommercialQuotationDocument quote={quote} lang={lang}/>
      {quote.status==="issued"?<div className="space-y-3 rounded-2xl border border-primary/25 bg-background/70 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-primary"/>
          {ar?"ردّك على العرض":"Your response"}
        </div>
        <p className="text-xs text-muted-foreground">{ar?"يمكنك قبول العرض، رفضه، أو طلب تعديل. قبول العرض لا ينشئ عملية دفع.":
          "Accept, decline or request a revision. Accepting does not initiate payment."}</p>
        <Textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={2000} disabled={working}
          placeholder={ar?"اذكر تفاصيل التعديل المطلوب أو ملاحظاتك…":"Describe requested changes or add optional notes…"}
          className="bg-background/80"/>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={working} onClick={()=>void respond("accepted")} className="gap-2">
            <CheckCircle2 className="h-4 w-4"/>{ar?"قبول العرض":"Accept quotation"}</Button>
          <Button type="button" variant="outline" disabled={working||note.trim().length<5}
            onClick={()=>void respond("changes_requested")} className="gap-2">
            <ClipboardList className="h-4 w-4"/>{ar?"طلب تعديل":"Request changes"}</Button>
          <Button type="button" variant="outline" disabled={working} onClick={()=>void respond("declined")} className="gap-2">
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
