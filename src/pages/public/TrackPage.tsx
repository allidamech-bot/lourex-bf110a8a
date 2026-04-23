import { AlertCircle, Clock3, Search, ShieldCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ShipmentTimeline } from "@/features/tracking/components/ShipmentTimeline";
import { useI18n } from "@/lib/i18n";
import { lookupPublicTracking } from "@/lib/operationsDomain";
import { getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import { logOperationalError, trackEvent } from "@/lib/monitoring";

export default function TrackPage() {
  const { lang } = useI18n();
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupPublicTracking>>>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stageIndex = shipmentStages.findIndex((item) => item.code === result?.currentStage);
  const nextStage = stageIndex >= 0 ? getShipmentStageCopy(shipmentStages[stageIndex + 1]?.code, lang) : null;
  const completedStages = stageIndex >= 0 ? stageIndex : 0;
  const remainingStages = stageIndex >= 0 ? shipmentStages.length - stageIndex - 1 : shipmentStages.length;
  const progressRatio = result?.progressRatio || 0;
  const currentStage = result ? getShipmentStageCopy(result.currentStage, lang) : null;

  const publicTimeline = useMemo(
    () => (result?.timeline || []).filter((event) => event.visibility === "customer_visible" || event.customerNote),
    [result],
  );

  const handleLookup = async () => {
    if (loading) {
      return;
    }

    const normalized = trackingId.trim().toUpperCase();

    if (!normalized) {
      setError(lang === "ar" ? "أدخل رقم تتبع صالحًا لبدء المتابعة." : "Enter a valid tracking number to begin.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await lookupPublicTracking(normalized);

      if (!data) {
        setError(lang === "ar" ? "لم يتم العثور على شحنة مطابقة لهذا الرقم." : "No shipment was found for this tracking number.");
        return;
      }

      setResult(data);
      trackEvent("tracking_viewed", {
        found: true,
        trackingId: data.trackingId,
        stage: data.currentStage,
      });
    } catch (error) {
      logOperationalError("public_tracking_lookup", error, {
        trackingId: normalized,
      });
      setError(
        lang === "ar"
          ? "تعذر تنفيذ عملية التتبع حاليًا. حاول مرة أخرى بعد قليل."
          : "Tracking is temporarily unavailable. Please try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 md:px-8">
        <SectionHeading
          eyebrow={lang === "ar" ? "تتبع العميل" : "Customer Tracking"}
          title={lang === "ar" ? "تتبع تشغيلي واضح وموثوق" : "Clear and trusted shipment tracking"}
          description={
            lang === "ar"
              ? "هذه الواجهة مخصصة لمتابعة الشحنة داخل مسار Lourex الرسمي. عند إدخال رقم التتبع الصحيح ستظهر المرحلة الحالية، التقدم عبر المراحل الإحدى عشرة، وآخر تحديث آمن للعميل."
              : "This page is designed for customers to follow their shipment through Lourex's official flow, including the current stage, 11-stage progress, and the latest customer-safe update."
          }
        />

        <div className="mt-8 rounded-[2.2rem] border border-border/60 bg-[linear-gradient(180deg,hsla(var(--card)/0.98),hsla(var(--card)/0.9))] p-6 shadow-[0_24px_55px_-36px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_55px_-36px_rgba(0,0,0,0.75)] md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={trackingId}
                    onChange={(event) => setTrackingId(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleLookup()}
                    placeholder={lang === "ar" ? "مثال: TRK-2026-15482" : "Example: TRK-2026-15482"}
                    className="h-12 w-full rounded-2xl border border-border bg-background ps-11 pe-4 text-sm outline-none ring-0 transition-colors focus:border-primary"
                  />
                </div>
                <button onClick={handleLookup} disabled={loading} className="h-12 rounded-2xl bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-60">
                  {loading ? (lang === "ar" ? "جاري التتبع..." : "Checking...") : lang === "ar" ? "تتبع الشحنة" : "Track shipment"}
                </button>
              </div>

              {error ? (
                <div className="mt-4 flex items-start gap-3 rounded-[1.4rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.7rem] border border-primary/15 bg-primary/8 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="font-medium">{lang === "ar" ? "ما الذي يعرضه هذا التتبع" : "What this tracking page shows"}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {lang === "ar"
                  ? "المرحلة الحالية، التسلسل الرسمي للمراحل، آخر تحديث آمن للعميل، وسياق العملية الأساسي مثل رقم الصفقة أو الطلب عند توفره. لا تظهر هنا أي بيانات محاسبية أو ملاحظات داخلية."
                  : "The current stage, official stage sequence, latest customer-safe update, and core operation context such as deal or request number when available. No accounting or private internal notes are exposed here."}
              </p>
            </div>
          </div>
        </div>

        {result ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-border/60 bg-card p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {lang === "ar" ? "ملخص الشحنة" : "Shipment summary"}
                </p>
                <div className="mt-5 space-y-4">
                  {[
                    { label: lang === "ar" ? "رقم التتبع" : "Tracking number", value: result.trackingId },
                    { label: lang === "ar" ? "رقم الصفقة" : "Deal number", value: result.dealNumber || (lang === "ar" ? "غير ظاهر" : "Not shown") },
                    { label: lang === "ar" ? "رقم الطلب" : "Request number", value: result.requestNumber || (lang === "ar" ? "غير ظاهر" : "Not shown") },
                    { label: lang === "ar" ? "عنوان العملية" : "Operation title", value: result.operationTitle || "Lourex operation" },
                    { label: lang === "ar" ? "الوجهة" : "Destination", value: result.destination },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-primary/15 bg-primary/8 p-6">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium">{lang === "ar" ? "المرحلة الحالية" : "Current stage"}</p>
                </div>
                <p className="mt-4 font-serif text-3xl font-semibold">{currentStage?.label || result.currentStageLabel}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{currentStage?.description || result.currentStageDescription}</p>
                {result.customerNote ? (
                  <div className="mt-5 rounded-[1.35rem] border border-primary/15 bg-background/65 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {lang === "ar" ? "تحديث العميل" : "Customer update"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-foreground">{result.customerNote}</p>
                  </div>
                ) : null}
                {nextStage ? (
                  <div className="mt-5 rounded-[1.35rem] border border-primary/15 bg-background/65 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {lang === "ar" ? "المرحلة المتوقعة التالية" : "Expected next stage"}
                    </p>
                    <p className="mt-2 font-medium">{nextStage.label}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: lang === "ar" ? "مراحل مكتملة" : "Completed", value: completedStages },
                  { label: lang === "ar" ? "مراحل متبقية" : "Remaining", value: remainingStages },
                  { label: lang === "ar" ? "إجمالي المراحل" : "Total stages", value: shipmentStages.length },
                  { label: lang === "ar" ? "نسبة التقدم" : "Progress", value: `${Math.round(progressRatio)}%` },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.6rem] border border-border/60 bg-card p-5 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[2rem] border border-border/60 bg-card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {lang === "ar" ? "ثقة التتبع" : "Tracking confidence"}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl font-semibold">
                      {lang === "ar" ? "المسار ضمن المراحل الرسمية" : "The shipment is moving inside the official stages"}
                    </h3>
                  </div>
                  <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      {lang === "ar" ? "آخر تحديث" : "Last update"}
                    </div>
                    <p className="mt-2 text-sm font-medium">{new Date(result.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary/35">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(progressRatio, 6)}%` }} />
                </div>

                <div className="mt-6">
                  <ShipmentTimeline currentStage={result.currentStage} />
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-border/60 bg-secondary/10 p-5">
                <p className="font-medium">{lang === "ar" ? "سجل التحديثات الآمنة للعميل" : "Customer-safe update history"}</p>
                {publicTimeline.length === 0 ? (
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {lang === "ar"
                      ? "لا توجد تحديثات تفصيلية منشورة للعميل بعد. تظهر لك المرحلة الحالية وآخر وقت تحديث محفوظ في النظام."
                      : "No detailed customer-safe updates are published yet. The current stage and latest recorded update time are shown above."}
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {publicTimeline.slice().reverse().map((event) => {
                      const stage = getShipmentStageCopy(event.stageCode, lang);
                      return (
                        <div key={event.id} className="rounded-[1.2rem] border border-border/60 bg-card px-4 py-4">
                          <p className="font-medium">{stage?.label || event.stageCode}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</p>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            {event.customerNote ||
                              (lang === "ar"
                                ? "تم تسجيل تحديث مرحلي جديد على الشحنة."
                                : "A new stage update was recorded for this shipment.")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : !error && !loading ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-border/60 bg-secondary/10 px-6 py-10 text-center">
            <p className="font-serif text-2xl font-semibold">{lang === "ar" ? "ابدأ بإدخال رقم التتبع" : "Enter a tracking number to begin"}</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {lang === "ar"
                ? "ستظهر هنا نتيجة التتبع الفعلية عندما يتم العثور على شحنة مرتبطة بالرقم المدخل داخل النظام."
                : "The real shipment result will appear here once a matching tracking number is found in the system."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
