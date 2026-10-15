import { useEffect, useState } from "react";
import { FileText, Loader2, LockKeyhole, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createCommercialQuoteDraft,
  fetchCommercialQuoteDraft,
  isSmartRfqForCommercialQuote,
  type CommercialQuoteDraft,
} from "@/features/commercial-quotes/services/commercialQuoteDraftService";

type Props = { requestId: string; requestNumber: string; lang: "ar" | "en"; canManage: boolean };

export function CommercialQuoteDraftPanel({ requestId, requestNumber, lang, canManage }: Props) {
  const ar = lang === "ar";
  const [state, setState] = useState<{
    requestId: string;
    draft: CommercialQuoteDraft | null;
    loading: boolean;
    error: string;
  }>({ requestId, draft: null, loading: true, error: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    setState({ requestId, draft: null, loading: true, error: "" });
    setCreating(false);
    if (canManage && isSmartRfqForCommercialQuote(requestNumber)) {
      void fetchCommercialQuoteDraft(requestId)
        .then(draft => { if (active) setState({ requestId, draft, loading: false, error: "" }); })
        .catch(error => {
          if (active) setState({ requestId, draft: null, loading: false, error: error instanceof Error ? error.message : String(error) });
        });
    }
    return () => { active = false; };
  }, [requestId, requestNumber, canManage]);

  if (!canManage || !isSmartRfqForCommercialQuote(requestNumber)) return null;
  const view = state.requestId === requestId
    ? state
    : { requestId, draft: null, loading: true, error: "" };

  const create = async () => {
    if (creating || view.loading || view.draft) return;
    setCreating(true);
    setState({ requestId, draft: null, loading: false, error: "" });
    try {
      const draft = await createCommercialQuoteDraft(requestId);
      setState({ requestId, draft, loading: false, error: "" });
    } catch (error) {
      setState({ requestId, draft: null, loading: false, error: error instanceof Error ? error.message : String(error) });
    } finally {
      setCreating(false);
    }
  };

  const reload = async () => {
    if (creating) return;
    setState({ requestId, draft: null, loading: true, error: "" });
    try {
      const draft = await fetchCommercialQuoteDraft(requestId);
      setState({ requestId, draft, loading: false, error: "" });
    } catch (error) {
      setState({ requestId, draft: null, loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <section data-testid="commercial-quote-draft-panel" className="rounded-[1.5rem] border border-amber-600/30 bg-card/90 p-5 shadow-xl sm:p-6" aria-label={ar ? "مسودات العروض التجارية" : "Commercial quotation drafts"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-amber-500"><FileText className="h-4 w-4" /> LOUREX · QUOTATIONS</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{ar ? "مسودة عرض السعر التجاري" : "Commercial quotation draft"}</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            {ar ? "أنشئ مسودة داخلية من أصناف الطلب المحفوظة. لا تتضمن أسعارًا بعد، ولا تُرسل للعميل." : "Create an internal draft from saved Smart RFQ lines. No pricing or customer delivery is enabled yet."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-600/25 bg-amber-600/10 px-3 py-2 text-xs font-semibold text-amber-400">
          <LockKeyhole className="h-4 w-4" /> {ar ? "داخلي — غير مرسل" : "Internal — not sent"}
        </span>
      </div>

      {view.loading ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {ar ? "جارٍ تحميل المسودة…" : "Loading quotation draft…"}</p>
      ) : view.error ? (
        <div className="mt-5 space-y-3">
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{view.error}</p>
          <Button type="button" onClick={() => void reload()} disabled={creating} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> {ar ? "إعادة التحميل" : "Retry"}
          </Button>
        </div>
      ) : view.draft ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-background/70 p-4">
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{view.draft.number}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ar ? "مرتبط بطلب" : "Source request"} {requestNumber} · {view.draft.currency}</p>
            </div>
            <span className="rounded-full border border-amber-600/30 bg-amber-600/10 px-3 py-1 text-xs text-amber-400">
              {ar ? "مسودة" : "Draft"}
            </span>
          </div>
          <div className="space-y-2">
            {view.draft.items.map(item => (
              <div key={item.id} className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <p className="font-semibold text-foreground">#{item.lineNumber} {item.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{ar ? "الكمية" : "Quantity"}: {item.quantity.toLocaleString()} {item.unit}</p>
                {item.specifications ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.specifications}</p> : null}
                {item.moq ? <p className="mt-1 text-xs text-muted-foreground">MOQ: {item.moq}</p> : null}
                {item.packaging ? <p className="mt-1 text-xs text-muted-foreground">{ar ? "التعبئة" : "Packaging"}: {item.packaging}</p> : null}
                <p className="mt-2 text-xs text-amber-400">{ar ? "السعر: لم يُحدّد" : "Price: not set"}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{ar ? "الدفعة التالية: التسعير، الشروط التجارية، الاعتماد وإصدار PDF. لا يمكن إرسال هذه المسودة حاليًا." : "Next phase: pricing, terms, approvals and PDF. This draft cannot be sent yet."}</p>
        </div>
      ) : (
        <div className="mt-5">
          <Button type="button" onClick={() => void create()} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? (ar ? "جارٍ إنشاء المسودة…" : "Creating draft…") : (ar ? "إنشاء مسودة عرض السعر" : "Create quotation draft")}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">{ar ? "يتم نسخ جميع البنود مرة واحدة وبشكل آمن، ولن ينشئ الضغط المتكرر نسخًا مكررة." : "All request lines are copied atomically. Retrying will not create duplicate drafts."}</p>
        </div>
      )}
    </section>
  );
}
