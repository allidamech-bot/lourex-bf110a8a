import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import {
  createOrderFollowup,
  loadOrderFollowups,
  orderFollowupStages,
  type OrderFollowup,
  type OrderFollowupVisibility,
} from "@/domain/operations/followup";

type OrderFollowupTimelineProps = {
  requestId: string;
  dealId?: string | null;
  customerId?: string | null;
  mode: "customer" | "admin";
};

const formatDateTime = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const OrderFollowupTimeline = ({ requestId, dealId, customerId, mode }: OrderFollowupTimelineProps) => {
  const { lang, locale, dir } = useI18n();
  const { profile } = useAuthSession();
  const [items, setItems] = useState<OrderFollowup[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stageCode, setStageCode] = useState(orderFollowupStages[0].code);
  const [adminNote, setAdminNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [visibility, setVisibility] = useState<OrderFollowupVisibility>("customer_visible");
  const [error, setError] = useState("");

  const isAdmin = mode === "admin";

  const copy = {
    title: lang === "ar" ? "تعقيب الطلب" : "Order Follow-up",
    empty:
      lang === "ar"
        ? "لا توجد تحديثات متابعة رسمية بعد."
        : "No official follow-up updates yet.",
    loading: lang === "ar" ? "جاري تحميل التعقيب..." : "Loading follow-up...",
    add: lang === "ar" ? "إضافة تعقيب" : "Add follow-up",
    saving: lang === "ar" ? "جاري الحفظ..." : "Saving...",
    adminNote: lang === "ar" ? "ملاحظة داخلية" : "Internal note",
    customerNote: lang === "ar" ? "ملاحظة للعميل" : "Customer-visible note",
    visible: lang === "ar" ? "ظاهر للعميل" : "Customer visible",
    internal: lang === "ar" ? "داخلي فقط" : "Internal only",
    refresh: lang === "ar" ? "تحديث" : "Refresh",
    latest: lang === "ar" ? "الأحدث" : "Latest",
    unavailable:
      lang === "ar"
        ? "تعقيب الطلب غير مهيأ حالياً."
        : "Order follow-up is not configured yet.",
  };

  const selectedStage = useMemo(
    () => orderFollowupStages.find((stage) => stage.code === stageCode) || orderFollowupStages[0],
    [stageCode],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const loaded = await loadOrderFollowups({
        requestId,
        dealId,
        customerVisibleOnly: !isAdmin,
      });
      setItems(loaded);
    } catch (loadError) {
      logOperationalError("order_followup_load", loadError, { requestId, dealId });
      setError(copy.unavailable);
    } finally {
      setLoading(false);
    }
  }, [copy.unavailable, dealId, isAdmin, requestId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleCreate = async () => {
    if (!customerId || saving) return;

    setSaving(true);
    setError("");

    const result = await createOrderFollowup({
      requestId,
      dealId,
      customerId,
      stageCode: selectedStage.code,
      stageTitle: lang === "ar" ? selectedStage.ar : selectedStage.en,
      adminNote,
      customerNote,
      visibility,
      createdBy: profile?.id,
    });

    setSaving(false);

    if (result.error || !result.data) {
      setError(copy.unavailable);
      return;
    }

    setItems((current) => [...current, result.data as OrderFollowup]);
    setAdminNote("");
    setCustomerNote("");
  };

  return (
    <section className="w-full max-w-full min-w-0 rounded-[1.35rem] border border-primary/20 bg-primary/5 p-4 sm:p-5" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold">{copy.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{requestId}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadItems()} disabled={loading} className="shrink-0">
          <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="whitespace-nowrap">{copy.refresh}</span>
        </Button>
      </div>

      {isAdmin ? (
        <div className="mt-4 grid gap-3 rounded-[1rem] border border-white/10 bg-background/35 p-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={stageCode}
              onChange={(event) => setStageCode(event.target.value)}
              className="h-10 min-w-0 rounded-xl border border-white/10 bg-background px-3 text-sm text-foreground"
            >
              {orderFollowupStages.map((stage) => (
                <option key={stage.code} value={stage.code}>
                  {lang === "ar" ? stage.ar : stage.en}
                </option>
              ))}
            </select>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as OrderFollowupVisibility)}
              className="h-10 min-w-[9rem] rounded-xl border border-white/10 bg-background px-3 text-sm text-foreground"
            >
              <option value="customer_visible">{copy.visible}</option>
              <option value="internal_only">{copy.internal}</option>
            </select>
          </div>
          <Textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder={copy.adminNote} rows={3} />
          <Textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder={copy.customerNote} rows={3} />
          <Button type="button" variant="gold" onClick={() => void handleCreate()} disabled={saving || !customerId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="whitespace-nowrap">{saving ? copy.saving : copy.add}</span>
          </Button>
        </div>
      ) : null}

      {error ? <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy.loading}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-secondary/10 px-3 py-3 text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          items.map((item, index) => {
            const isLatest = index === items.length - 1;
            return (
              <article key={item.id} className={`relative rounded-[1rem] border p-3 ${isLatest ? "border-primary/35 bg-primary/10" : "border-border/60 bg-secondary/10"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <p className="min-w-0 truncate font-medium">{item.stageTitle}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isLatest ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">{copy.latest}</span> : null}
                    <time className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(item.createdAt, locale)}</time>
                  </div>
                </div>
                {item.customerNote ? <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{item.customerNote}</p> : null}
                {isAdmin && item.adminNote ? <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{item.adminNote}</p> : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
