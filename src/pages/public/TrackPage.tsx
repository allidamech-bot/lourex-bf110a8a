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
  const { lang, t } = useI18n();
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
    if (loading) return;

    const normalized = trackingId.trim().toUpperCase();

    if (!normalized) {
      setError(t("publicTracking.errorEmpty"));
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await lookupPublicTracking(normalized);

      if (!data) {
        setError(t("publicTracking.errorNotFound"));
        return;
      }

      setResult(data);
      trackEvent("tracking_viewed", {
        flow: "public_tracking",
        found: true,
        trackingId: data.trackingId,
        stage: data.currentStage,
      });
    } catch (error) {
      logOperationalError("public_tracking_lookup", error, {
        flow: "public_tracking",
        trackingId: normalized,
      });
      setError(t("publicTracking.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 md:px-8">
        <SectionHeading
          eyebrow={t("publicTracking.eyebrow")}
          title={t("publicTracking.title")}
          description={t("publicTracking.description")}
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
                    placeholder={t("publicTracking.placeholder")}
                    className="h-12 w-full rounded-2xl border border-border bg-background ps-11 pe-4 text-sm outline-none ring-0 transition-colors focus:border-primary"
                  />
                </div>
                <button onClick={handleLookup} disabled={loading} className="h-12 rounded-2xl bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-60">
                  {loading ? t("publicTracking.loading") : t("publicTracking.cta")}
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
                <p className="font-medium">{t("publicTracking.infoTitle")}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {t("publicTracking.infoDescription")}
              </p>
            </div>
          </div>
        </div>

        {result ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-border/60 bg-card p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {t("publicTracking.summaryTitle")}
                </p>
                <div className="mt-5 space-y-4">
                  {[
                    { label: t("publicTracking.summaryLabels.id"), value: result.trackingId },
                    { label: t("publicTracking.summaryLabels.deal"), value: result.dealNumber || t("publicTracking.statusLabels.notShown") },
                    { label: t("publicTracking.summaryLabels.request"), value: result.requestNumber || t("publicTracking.statusLabels.notShown") },
                    { label: t("publicTracking.summaryLabels.title"), value: result.operationTitle || "Lourex operation" },
                    { label: t("publicTracking.summaryLabels.destination"), value: result.destination },
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
                  <p className="text-sm font-medium">{t("publicTracking.statusLabels.current")}</p>
                </div>
                <p className="mt-4 font-serif text-3xl font-semibold">{currentStage?.label || result.currentStageLabel}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{currentStage?.description || result.currentStageDescription}</p>
                <div className="mt-5 rounded-[1.35rem] border border-primary/15 bg-background/65 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {lang === "ar" ? "ماذا يعني ذلك" : "What this means"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-foreground">
                    {lang === "ar"
                      ? "هذه هي آخر مرحلة مؤكدة داخل مسار Lourex الرسمي. قد تبقى الشحنة في المرحلة نفسها لبعض الوقت حتى يكتمل الإجراء التشغيلي التالي."
                      : "This is the latest confirmed stage inside Lourex's official workflow. A shipment can remain in the same stage for some time until the next operational step is completed."}
                  </p>
                </div>
                {result.customerNote ? (
                  <div className="mt-5 rounded-[1.35rem] border border-primary/15 bg-background/65 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {t("publicTracking.statusLabels.update")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-foreground">{result.customerNote}</p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.35rem] border border-border/60 bg-background/65 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {t("publicTracking.statusLabels.update")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-foreground">
                      {lang === "ar"
                        ? "لا توجد ملاحظة عميل جديدة منشورة بعد. ما زالت المرحلة الحالية ووقت آخر تحديث يمثلان الحالة الرسمية المعروضة لك."
                        : "No new customer note has been published yet. The current stage and last update time still reflect the official status shown to you."}
                    </p>
                  </div>
                )}
                {nextStage ? (
                  <div className="mt-5 rounded-[1.35rem] border border-primary/15 bg-background/65 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {t("publicTracking.statusLabels.next")}
                    </p>
                    <p className="mt-2 font-medium">{nextStage.label}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                  { label: t("publicTracking.progressLabels.completed"), value: completedStages },
                  { label: t("publicTracking.progressLabels.remaining"), value: remainingStages },
                  { label: t("publicTracking.progressLabels.total"), value: shipmentStages.length },
                  { label: t("publicTracking.progressLabels.ratio"), value: `${Math.round(progressRatio)}%` },
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
                      {t("publicTracking.confidenceTitle")}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl font-semibold">
                      {t("publicTracking.confidenceSubtitle")}
                    </h3>
                  </div>
                  <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      {t("publicTracking.lastUpdate")}
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
                <p className="font-medium">{t("publicTracking.historyTitle")}</p>
                {publicTimeline.length === 0 ? (
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {t("publicTracking.historyEmpty")}
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
                            {event.customerNote || t("publicTracking.defaultUpdateNote")}
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
            <p className="font-serif text-2xl font-semibold">{t("publicTracking.startPrompt")}</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t("publicTracking.startDescription")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
