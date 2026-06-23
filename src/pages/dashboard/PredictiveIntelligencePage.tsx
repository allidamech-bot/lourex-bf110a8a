import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Loader2, RefreshCw } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ProductionFallbackCard, ProductionSectionSkeleton } from "@/components/production/ProductionFallbacks";
import { Button } from "@/components/ui/button";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { PredictiveIntelligencePanel } from "@/features/predictive-intelligence/components/PredictiveIntelligencePanel";
import { buildPredictiveIntelligence } from "@/features/predictive-intelligence/lib/predictiveEngine";
import { fetchDeals, fetchFinancialEditRequests, fetchRequests, fetchShipments } from "@/domain/operations/service";
import { canManageAccounting } from "@/features/auth/rbac";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";

export default function PredictiveIntelligencePage() {
  const { lang, locale } = useI18n();
  const { profile } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchRequests>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof fetchDeals>>>([]);
  const [shipments, setShipments] = useState<Awaited<ReturnType<typeof fetchShipments>>>([]);
  const [financialEditRequests, setFinancialEditRequests] = useState<Awaited<ReturnType<typeof fetchFinancialEditRequests>>>([]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const canReadFinance = profile?.role ? canManageAccounting(profile.role) : false;
      const [requestRows, dealRows, shipmentRows, editRows] = await Promise.all([
        fetchRequests(),
        fetchDeals(),
        fetchShipments(),
        canReadFinance ? fetchFinancialEditRequests() : Promise.resolve([]),
      ]);

      setRequests(requestRows);
      setDeals(dealRows);
      setShipments(shipmentRows);
      setFinancialEditRequests(editRows);
    } catch (loadError) {
      logOperationalError("predictive_intelligence_load", loadError, { role: profile?.role });
       setError(t("predictiveIntelligence.loadErrorTitle"));
      setRequests([]);
      setDeals([]);
      setShipments([]);
      setFinancialEditRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, lang]);

  const result = useMemo(
    () => buildPredictiveIntelligence({ requests, deals, shipments, financialEditRequests }, lang === "ar" ? "ar" : "en"),
    [deals, financialEditRequests, lang, requests, shipments],
  );

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 pb-24 lg:pb-12" dir={lang === "ar" ? "rtl" : "ltr"}>
      <PageHelpBox pageKey="dashboard_predictive_intelligence" role={profile?.role} />

      <BentoCard span="full" className="rounded-2xl p-5 sm:p-6 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-200">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/80">
                {t("predictiveIntelligence.brand")}
              </p>
              <h1 className="mt-1 break-words font-serif text-2xl font-bold text-stone-100 sm:text-3xl">
                 {t("predictiveIntelligence.title")}
              </h1>
               <p className="mt-2 max-w-3xl break-words text-sm leading-7 text-stone-400 font-medium">
                 {t("predictiveIntelligence.description")}
               </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110 sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
             {t("predictiveIntelligence.refreshAnalysis")}
          </Button>
        </div>
      </BentoCard>

      {error ? (
        <ProductionFallbackCard
          kind="backend"
          title={t("predictiveIntelligence.loadErrorTitle")}
          body={t("predictiveIntelligence.loadErrorBody")}
        >
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading} className="rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("errorBoundary.retry")}
          </Button>
        </ProductionFallbackCard>
      ) : null}

      {loading ? (
        <ProductionSectionSkeleton />
      ) : (
        <ErrorBoundary fallback={<ProductionFallbackCard kind="lazyError" />}>
          <PredictiveIntelligencePanel result={result} language={lang === "ar" ? "ar" : "en"} locale={locale} />
        </ErrorBoundary>
      )}
    </div>
  );
}
