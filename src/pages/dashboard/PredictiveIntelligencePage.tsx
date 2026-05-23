import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Loader2, RefreshCw } from "lucide-react";
import BentoCard from "@/components/BentoCard";
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
      setError(lang === "ar" ? "تعذر تحميل بيانات الذكاء التنبؤي." : "Unable to load predictive intelligence data.");
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

      <BentoCard span="full" className="rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/10 text-blue-200">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300/80">
                {lang === "ar" ? "LOUREX INTELLIGENCE" : "LOUREX INTELLIGENCE"}
              </p>
              <h1 className="mt-1 break-words font-serif text-2xl font-bold text-white sm:text-3xl">
                {lang === "ar" ? "الذكاء التنبؤي التشغيلي" : "Predictive Intelligence"}
              </h1>
              <p className="mt-2 max-w-3xl break-words text-sm leading-7 text-slate-400">
                {lang === "ar"
                  ? "تحليل محلي آمن للطلبات والشحنات والتعديلات المالية لاكتشاف المخاطر، فرص التحويل، ونقاط الاختناق قبل أن تتضخم."
                  : "A safe local intelligence layer that analyzes requests, shipments, and finance edits to detect risk, conversion opportunities, and bottlenecks before they escalate."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-500 sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {lang === "ar" ? "تحديث التحليل" : "Refresh analysis"}
          </Button>
        </div>
      </BentoCard>

      {error ? (
        <BentoCard className="rounded-2xl border-rose-400/25 bg-rose-500/10 p-5 text-sm text-rose-100">
          {error}
        </BentoCard>
      ) : null}

      {loading ? (
        <BentoCard className="rounded-2xl p-8 text-center text-sm text-slate-400">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-200" />
          {lang === "ar" ? "جاري تحليل البيانات التشغيلية..." : "Analyzing operational data..."}
        </BentoCard>
      ) : (
        <PredictiveIntelligencePanel result={result} language={lang === "ar" ? "ar" : "en"} locale={locale} />
      )}
    </div>
  );
}
