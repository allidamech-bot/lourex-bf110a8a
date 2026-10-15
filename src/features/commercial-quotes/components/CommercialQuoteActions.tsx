import { useState } from "react";
import { CheckCheck, FileText, Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CommercialQuoteDraft } from "@/features/commercial-quotes/services/commercialQuoteDraftService";
import { emailIssuedCommercialQuote, updateQuotationState } from "@/features/commercial-quotes/services/commercialQuoteLifecycleService";
import { CommercialQuotationDocument } from "@/features/commercial-quotes/components/CommercialQuotationDocument";

export function CommercialQuoteActions({ quote, lang, canApprove, onUpdate }: {
  quote: CommercialQuoteDraft; lang: "ar" | "en"; canApprove: boolean;
  onUpdate: (quote: CommercialQuoteDraft) => void;
}) {
  const ar=lang==="ar";
  const [busy,setBusy]=useState<""|"approve"|"issue"|"email">("");
  const [error,setError]=useState("");
  const [emailSent,setEmailSent]=useState(false);
  const next=async (action:"approve"|"issue"|"email")=>{
    if(busy)return;
    const prompt=action==="approve"
      ? (ar?"هل راجعت جميع الأسعار وشروط الدفع والتسليم وتعتمد هذا العرض رسميًا؟":"Approve this quotation after verifying every price and trade term?")
      : action==="issue"
        ? (ar?"سيصبح العرض مرئيًا للعميل ولن يمكن تعديله. هل تريد إصداره؟":"This will publish the quotation to the customer and lock pricing. Continue?")
        : "";
    if(prompt&&!window.confirm(prompt))return;
    setBusy(action);setError("");
    try{
      if(action==="email"){await emailIssuedCommercialQuote(quote);setEmailSent(true);}
      else{const updated=await updateQuotationState(quote,action);onUpdate(updated);}
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy("");}
  };
  const canApproveDraft=quote.status==="draft"&&canApprove;
  const canIssue=quote.status==="approved"&&canApprove;
  const canEmail=quote.status==="issued"&&canApprove;
  const hasDocument=quote.status!=="draft";
  return (
    <div data-testid="commercial-quote-actions" className="space-y-4 rounded-2xl border border-primary/20 bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />
            {ar?"مراجعة العرض واعتماده":"Review, approval & customer delivery"}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {ar?"الاعتماد والإصدار يتطلبان صلاحية المالك. لا يمكن تعديل الأسعار بعد الاعتماد.":"Owner approval and issue are required. Pricing locks after approval."}
          </p>
        </div>
        <span className="rounded-lg border border-primary/20 px-3 py-1 text-xs font-semibold">{quote.status}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {canApproveDraft&&<Button type="button" disabled={Boolean(busy)} onClick={()=>void next("approve")} className="gap-2">
          {busy==="approve"?<Loader2 className="h-4 w-4 animate-spin"/>:<CheckCheck className="h-4 w-4"/>}
          {ar?"اعتماد العرض":"Approve quotation"}
        </Button>}
        {canIssue&&<Button type="button" disabled={Boolean(busy)} onClick={()=>void next("issue")} className="gap-2">
          {busy==="issue"?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}
          {ar?"إصدار العرض للعميل":"Issue to customer"}
        </Button>}
        {canEmail&&<Button type="button" variant="outline" disabled={Boolean(busy)} onClick={()=>void next("email")} className="gap-2">
          {busy==="email"?<Loader2 className="h-4 w-4 animate-spin"/>:<Mail className="h-4 w-4"/>}
          {ar?"إرسال إشعار العرض بالبريد":"Email quotation notification"}
        </Button>}
        {!canApprove&&quote.status==="draft"&&<p className="text-sm text-muted-foreground">
          {ar?"المسودة بانتظار مراجعة المالك واعتمادها.":"This draft awaits owner approval."}</p>}
        {hasDocument&&<p className="flex items-center gap-1 text-xs text-muted-foreground"><FileText className="h-4 w-4"/>
          {ar?"المستند متاح للعرض والطباعة PDF":"Ready for PDF print/save"}</p>}
      </div>
      {emailSent&&<p role="status" className="text-sm text-primary">
        {ar?"أكد مزود البريد استلام طلب الإرسال. يبقى وصول الرسالة لصندوق العميل غير مضمون.":"Email provider accepted the send request. Inbox delivery is not guaranteed."}
      </p>}
      {error&&<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {hasDocument&&<CommercialQuotationDocument quote={quote} lang={lang}/>}
    </div>
  );
}
