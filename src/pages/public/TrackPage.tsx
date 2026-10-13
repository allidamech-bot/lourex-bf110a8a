import { AlertCircle, CheckCircle2, Clock3, MapPin, Search, ShieldCheck, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ShipmentIntelligencePanel } from "@/features/shipments/components/ShipmentIntelligencePanel";
import { analyzeShipmentIntelligence } from "@/features/shipments/lib/shipmentIntelligence";
import { ShipmentTimeline } from "@/features/tracking/components/ShipmentTimeline";
import { useI18n } from "@/lib/i18n";
import { lookupPublicTracking, type OperationalShipment } from "@/lib/operationsDomain";
import { getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import { logOperationalError, trackEvent } from "@/lib/monitoring";

export default function TrackPage() {
  const { lang, locale, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupPublicTracking>>>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stageIndex = shipmentStages.findIndex((item) => item.code === result?.currentStage);
  const nextStage = stageIndex >= 0 ? getShipmentStageCopy(shipmentStages[stageIndex + 1]?.code, lang) : null;
  const completedStages = stageIndex >= 0 ? stageIndex + 1 : 0;
  const remainingStages = stageIndex >= 0 ? shipmentStages.length - stageIndex - 1 : shipmentStages.length;
  const progressRatio = result?.progressRatio || 0;
  const currentStage = result ? getShipmentStageCopy(result.currentStage, lang) : null;

  const publicTimeline = useMemo(
    () => (result?.timeline || []).filter((event) => event.visibility === "customer_visible" || event.customerNote),
    [result],
  );
  const publicShipment = useMemo<OperationalShipment | null>(() => {
    if (!result) return null;

    return {
      id: result.trackingId,
      trackingId: result.trackingId,
      clientName: result.clientName,
      destination: result.destination,
      pallets: 0,
      weight: 0,
      dealId: null,
      dealNumber: result.dealNumber,
      requestNumber: result.requestNumber,
      stage: result.currentStage,
      updatedAt: result.lastUpdated,
      customerVisibleNote: result.customerNote,
      timeline: publicTimeline,
      shipmentEvents: [],
    };
  }, [publicTimeline, result]);
  const publicShipmentAnalysis = useMemo(
    () => (publicShipment ? analyzeShipmentIntelligence(publicShipment) : null),
    [publicShipment],
  );

  const handleLookup = useCallback(async (value?: string) => {
    if (loading) return;

    const normalized = (value ?? trackingId).trim().toUpperCase();

    if (!normalized) {
      setError(t("publicTracking.errorEmpty"));
      setResult(null);
      return;
    }

    if (!/^[A-Z0-9][A-Z0-9-]{2,63}$/.test(normalized)) {
      setError(t("publicTracking.errorInvalid"));
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setTrackingId(normalized);

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
  }, [loading, t, trackingId]);

  useEffect(() => {
    const initialTracking = searchParams.get("tracking") || searchParams.get("id") || "";
    if (!initialTracking) return;

    setTrackingId(initialTracking);
    void handleLookup(initialTracking);
    // Run once for a shared tracking URL; subsequent searches use the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitLookup = () => {
    const normalized = trackingId.trim().toUpperCase();
    if (normalized) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tracking", normalized);
      setSearchParams(nextParams, { replace: true });
    }
    void handleLookup(normalized);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={t("publicTracking.title")}
        description={t("publicTracking.description")}
        url="https://www.lou-rex.com/track"
      />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <section className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            {t("publicTracking.eyebrow")}
          </div>
          <h1 className="font-serif text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
            {t("publicTracking.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {t("publicTracking.description")}
          </p>

          <div className="mt-8 rounded-[1.8rem] border border-primary/20 bg-card p-3 shadow-soft backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={trackingId}
                  onChange={(event) => setTrackingId(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && submitLookup()}
                  placeholder={t("publicTracking.placeholder")}
                  className="h-14 w-full rounded-2xl border border-primary/20 bg-secondary/65 ps-12 pe-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/20"
                />
              </div>
              <button
                onClick={submitLookup}
                disabled={loading}
                className="h-14 rounded-2xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-lg shadow-amber-950/20 transition-colors hover:brightness-110 disabled:opacity-60"
              >
                {loading ? t("publicTracking.loading") : t("publicTracking.cta")}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mx-auto mt-4 flex max-w-2xl items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-start text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        {result ? (
          <section className="mt-10 space-y-5">
            <div className="rounded-[2rem] border border-primary/20 bg-card p-5 shadow-soft backdrop-blur-xl md:p-8">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-primary">{result.trackingId}</p>
                  <div className="mt-4 inline-flex max-w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-primary">
                    <Truck className="h-5 w-5 shrink-0" />
                    <span className="truncate text-2xl font-bold md:text-4xl">
                      {currentStage?.label || result.currentStageLabel}
                    </span>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                    {currentStage?.description || result.currentStageDescription}
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-3 sm:min-w-[20rem]">
                  <div className="rounded-2xl border border-primary/20 bg-secondary/65 p-4">
                    <p className="text-xs text-muted-foreground">{t("publicTracking.progressLabels.ratio")}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{Math.round(progressRatio)}%</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-secondary/65 p-4">
                    <p className="text-xs text-muted-foreground">{t("publicTracking.progressLabels.remaining")}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{remainingStages}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-primary/20 bg-secondary/65 p-4">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-xs text-muted-foreground">{t("publicTracking.summaryLabels.destination")}</p>
                  <p className="mt-1 font-semibold text-heading">{result.destination}</p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-secondary/65 p-4">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-xs text-muted-foreground">{t("publicTracking.lastUpdate")}</p>
                  <p className="mt-1 font-semibold text-heading">{new Date(result.lastUpdated).toLocaleString(locale)}</p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-secondary/65 p-4">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-xs text-muted-foreground">{t("publicTracking.statusLabels.next")}</p>
                  <p className="mt-1 font-semibold text-heading">
                    {nextStage?.label || t("publicTracking.statusLabels.notShown")}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{t("publicTracking.confidenceSubtitle")}</p>
                  <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                    {completedStages.toLocaleString(locale)} / {shipmentStages.length.toLocaleString(locale)}
                  </span>
                </div>
                <ShipmentTimeline currentStage={result.currentStage} />
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-primary/20 bg-card p-5 backdrop-blur-xl">
              <p className="font-semibold text-foreground">{t("publicTracking.historyTitle")}</p>
              {result.customerNote ? (
                <p className="mt-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm leading-7 text-heading">
                  {result.customerNote}
                </p>
              ) : null}
              {publicTimeline.length === 0 ? (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("publicTracking.historyEmpty")}</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {publicTimeline.slice().reverse().map((event) => {
                    const stage = getShipmentStageCopy(event.stageCode, lang);
                    return (
                      <div key={event.id} className="rounded-2xl border border-primary/20 bg-secondary/65 px-4 py-4">
                        <p className="font-medium text-foreground">{stage?.label || event.stageCode}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString(locale)}</p>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                          {event.customerNote || t("publicTracking.defaultUpdateNote")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {publicShipment && publicShipmentAnalysis ? (
              <div className="rounded-[1.8rem] border border-primary/20 bg-card p-5 backdrop-blur-xl">
                <ShipmentIntelligencePanel
                  shipment={publicShipment}
                  analysis={publicShipmentAnalysis}
                  lang={lang}
                  locale={locale}
                  t={t}
                />
              </div>
            ) : null}
          </section>
        ) : !error && !loading ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-dashed border-primary/20 bg-card px-6 py-10 text-center backdrop-blur-xl">
            <p className="font-serif text-2xl font-semibold text-foreground">{t("publicTracking.startPrompt")}</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("publicTracking.startDescription")}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
