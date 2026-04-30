import { AlertCircle, CheckCircle2, Clock3, MapPin, Search, ShieldCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
    <div className="min-h-screen bg-[#050b14] text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <section className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            <ShieldCheck className="h-4 w-4" />
            {t("publicTracking.eyebrow")}
          </div>
          <h1 className="font-serif text-4xl font-bold text-white sm:text-5xl md:text-6xl">
            {lang === "ar" ? "تتبع شحنتك" : "Track Your Shipment"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            {t("publicTracking.description")}
          </p>

          <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-3 shadow-[0_28px_80px_-54px_rgba(59,130,246,0.9)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={trackingId}
                  onChange={(event) => setTrackingId(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleLookup()}
                  placeholder={t("publicTracking.placeholder")}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/80 ps-12 pe-4 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-blue-400/60"
                />
              </div>
              <button
                onClick={handleLookup}
                disabled={loading}
                className="h-14 rounded-2xl bg-blue-500 px-8 text-sm font-bold text-white shadow-lg shadow-blue-950/35 transition-colors hover:bg-blue-400 disabled:opacity-60"
              >
                {loading ? t("publicTracking.loading") : t("publicTracking.cta")}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mx-auto mt-4 flex max-w-2xl items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-start text-sm text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        {result ? (
          <section className="mt-10 space-y-5">
            <div className="rounded-[2rem] border border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.25),transparent_34%),linear-gradient(180deg,rgba(8,18,34,0.98),rgba(5,11,20,0.96))] p-5 shadow-[0_32px_90px_-56px_rgba(59,130,246,0.95)] md:p-8">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-blue-200">{result.trackingId}</p>
                  <div className="mt-4 inline-flex max-w-full items-center gap-3 rounded-2xl border border-blue-300/30 bg-blue-500/15 px-4 py-3 text-blue-50 shadow-[0_0_32px_rgba(59,130,246,0.22)]">
                    <Truck className="h-5 w-5 shrink-0" />
                    <span className="truncate text-2xl font-bold md:text-4xl">
                      {currentStage?.label || result.currentStageLabel}
                    </span>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                    {currentStage?.description || result.currentStageDescription}
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-3 sm:min-w-[20rem]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-400">{t("publicTracking.progressLabels.ratio")}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{Math.round(progressRatio)}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-400">{t("publicTracking.progressLabels.remaining")}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{remainingStages}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <MapPin className="h-4 w-4 text-blue-200" />
                  <p className="mt-3 text-xs text-slate-400">{t("publicTracking.summaryLabels.destination")}</p>
                  <p className="mt-1 font-semibold text-white">{result.destination}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Clock3 className="h-4 w-4 text-blue-200" />
                  <p className="mt-3 text-xs text-slate-400">{t("publicTracking.lastUpdate")}</p>
                  <p className="mt-1 font-semibold text-white">{new Date(result.lastUpdated).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <CheckCircle2 className="h-4 w-4 text-blue-200" />
                  <p className="mt-3 text-xs text-slate-400">{t("publicTracking.statusLabels.next")}</p>
                  <p className="mt-1 font-semibold text-white">
                    {nextStage?.label || t("publicTracking.statusLabels.notShown")}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{t("publicTracking.confidenceSubtitle")}</p>
                  <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-100">
                    {completedStages} / {shipmentStages.length}
                  </span>
                </div>
                <ShipmentTimeline currentStage={result.currentStage} />
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="font-semibold text-white">{t("publicTracking.historyTitle")}</p>
              {result.customerNote ? (
                <p className="mt-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-7 text-slate-200">
                  {result.customerNote}
                </p>
              ) : null}
              {publicTimeline.length === 0 ? (
                <p className="mt-3 text-sm leading-7 text-slate-400">{t("publicTracking.historyEmpty")}</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {publicTimeline.slice().reverse().map((event) => {
                    const stage = getShipmentStageCopy(event.stageCode, lang);
                    return (
                      <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-4">
                        <p className="font-medium text-white">{stage?.label || event.stageCode}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(event.occurredAt).toLocaleString()}</p>
                        <p className="mt-3 text-sm leading-7 text-slate-400">
                          {event.customerNote || t("publicTracking.defaultUpdateNote")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : !error && !loading ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <p className="font-serif text-2xl font-semibold text-white">{t("publicTracking.startPrompt")}</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">{t("publicTracking.startDescription")}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
