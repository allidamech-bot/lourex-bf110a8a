import { useEffect, useState } from "react";
import { FileText, Loader2, LockKeyhole, Plus, RefreshCw, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommercialQuotePricingEditor } from "@/features/commercial-quotes/components/CommercialQuotePricingEditor";
import { CommercialQuoteActions } from "@/features/commercial-quotes/components/CommercialQuoteActions";
import { CommercialQuoteEventHistory } from "@/features/commercial-quotes/components/CommercialQuoteEventHistory";
import {
  createCommercialQuoteDraft,
  createCommercialQuoteRevision,
  fetchCommercialQuoteDraft,
  fetchCommercialQuoteVersions,
  type CommercialQuoteVersion,
  isSmartRfqForCommercialQuote,
  type CommercialQuoteDraft,
} from "@/features/commercial-quotes/services/commercialQuoteDraftService";

type Props = { requestId: string; requestNumber: string; lang: "ar" | "en"; canManage: boolean; canApprove: boolean };

export function CommercialQuoteDraftPanel({ requestId, requestNumber, lang, canManage, canApprove }: Props) {
  const ar = lang === "ar";
  const [state, setState] = useState<{
    requestId: string;
    draft: CommercialQuoteDraft | null;
    loading: boolean;
    error: string;
  }>({ requestId, draft: null, loading: true, error: "" });
  const [creating, setCreating] = useState(false);
  const [versions, setVersions] = useState<CommercialQuoteVersion[]>([]);

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

  useEffect(() => {
    let active = true;
    setVersions([]);
    if (canManage && isSmartRfqForCommercialQuote(requestNumber)) {
      void fetchCommercialQuoteVersions(requestId)
        .then(result => { if (active) setVersions(result); })
        .catch(() => { if (active) setVersions([]); });
    }
    return () => { active = false; };
  }, [canManage, requestId, requestNumber, state.draft?.id, state.draft?.status]);

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

  const showVersion = async (quoteId: string) => {
    if (creating || view.loading) return;
    setState({ requestId, draft: null, loading: true, error: "" });
    try {
      const draft = await fetchCommercialQuoteDraft(requestId, quoteId);
      if (!draft) throw new Error("Quotation version not found");
      setState({ requestId, draft, loading: false, error: "" });
    } catch (error) {
      setState({ requestId, draft: null, loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  const createRevision = async () => {
    if (creating || !view.draft || view.draft.status !== "changes_requested" ||
        versions[0]?.id !== view.draft.id) return;
    if (!window.confirm(ar
      ? "إنشاء إصدار جديد قابل للتحرير مع الاحتفاظ بالعرض السابق كما صدر؟"
      : "Create an editable revision while preserving the previous issued quotation?")) return;
    setCreating(true);
    try {
      const draft = await createCommercialQuoteRevision(view.draft);
      setState({ requestId, draft, loading: false, error: "" });
    } catch (error) {
      setState({ requestId, draft: view.draft, loading: false, error: error instanceof Error ? error.message : String(error) });
    } finally { setCreating(false); }
  };

  return (
    <section data-testid="commercial-quote-draft-panel" className="rounded-[1.5rem] border border-amber-600/30 bg-card/90 p-5 shadow-xl sm:p-6" aria-label={ar ? "مسودات العروض التجارية" : "Commercial quotation drafts"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-amber-500"><FileText className="h-4 w-4" /> LOUREX · QUOTATIONS</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">{ar ? "عروض الأسعار وإصداراتها" : "Commercial quotation versions"}</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            {ar ? "تابع العرض من المسودة إلى الاعتماد والإصدار، وأنشئ نسخة جديدة فقط بعد طلب تعديل العميل." : "Manage quotation approval, issuance, and customer-requested revisions without losing previous versions."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-600/25 bg-amber-600/10 px-3 py-2 text-xs font-semibold text-amber-400">
          <LockKeyhole className="h-4 w-4" /> {ar ? "تحكم إداري آمن" : "Secure staff workspace"}
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
              <p className="mt-1 text-xs text-muted-foreground">{ar ? "مرتبط بطلب" : "Source request"} {requestNumber} · {view.draft.currency} · {ar ? "الإصدار" : "Version"} {view.draft.versionNo}</p>
            </div>
            <span className="rounded-full border border-amber-600/30 bg-amber-600/10 px-3 py-1 text-xs text-amber-400">
              {view.draft.status}
            </span>
          </div>
          {versions.length > 1 && <div className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><GitBranch className="h-4 w-4"/> {ar ? "سجل الإصدارات المحفوظة" : "Preserved quotation versions"}</p>
            <div className="flex flex-wrap gap-2">
              {versions.map(v => <Button type="button" key={v.id} size="sm"
                variant={v.id === view.draft?.id ? "default" : "outline"}
                disabled={creating} onClick={() => void showVersion(v.id)}>
                {ar ? "الإصدار" : "Version"} {v.version_no} · {v.status}
              </Button>)}
            </div>
          </div>}
          {view.draft.status === "changes_requested" && versions[0]?.id === view.draft.id && <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 text-sm text-foreground">
              {ar ? "طلب العميل تعديلات. سيُنشأ إصدار جديد بأسعار قابلة للمراجعة، ويبقى هذا الإصدار محفوظًا دون تغيير." :
                "The customer requested changes. Create a new editable version; this issued version stays unchanged."}
            </p>
            <Button type="button" disabled={creating} onClick={() => void createRevision()} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin"/> : <GitBranch className="h-4 w-4"/>}
              {ar ? "إنشاء إصدار معدل" : "Create revised quotation"}
            </Button>
          </div>}
          <div className="space-y-2">
            {view.draft.items.map(item => (
              <div key={item.id} className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <p className="font-semibold text-foreground">#{item.lineNumber} {item.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{ar ? "الكمية" : "Quantity"}: {item.quantity.toLocaleString()} {item.unit}</p>
                {item.specifications ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.specifications}</p> : null}
                {item.moq ? <p className="mt-1 text-xs text-muted-foreground">MOQ: {item.moq}</p> : null}
                {item.packaging ? <p className="mt-1 text-xs text-muted-foreground">{ar ? "التعبئة" : "Packaging"}: {item.packaging}</p> : null}
                <p className="mt-2 text-xs text-amber-400">{ar ? "سعر الوحدة" : "Unit price"}: {item.unitPrice === null ? (ar ? "لم يُحدّد" : "Not set") : `${item.unitPrice} ${view.draft.currency}`}</p>
              </div>
            ))}
          </div>
          {view.draft.status === "draft" && <CommercialQuotePricingEditor
            key={view.draft.id}
            quote={view.draft}
            lang={lang}
            onSaved={draft => setState({ requestId, draft, loading: false, error: "" })}
          />}
          <CommercialQuoteActions
            quote={view.draft}
            lang={lang}
            canApprove={canApprove}
            onUpdate={draft => setState({ requestId, draft, loading: false, error: "" })}
          />
          {view.draft.customerResponseNote && (
            <p className="rounded-xl border border-primary/20 bg-background/70 p-4 text-sm">
              <strong>{ar ? "ملاحظات العميل: " : "Customer response note: "}</strong>
              <span className="whitespace-pre-wrap break-words">{view.draft.customerResponseNote}</span>
            </p>
          )}
          <CommercialQuoteEventHistory quoteId={view.draft.id} status={view.draft.status} lang={lang} />
          <p className="text-xs text-muted-foreground">{ar ? "لا يتم إرسال العرض بالبريد إلا بعد اعتماده وإصداره للعميل." : "Email notification is enabled only after owner approval and issuance."}</p>
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
