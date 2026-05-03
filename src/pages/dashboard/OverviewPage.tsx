import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Clock3,
  FilePenLine,
  Loader2,
  PackageSearch,
  RefreshCw,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  fetchAuditCount,
  fetchDeals,
  fetchFinancialEntries,
  fetchFinancialEditRequests,
  fetchRequests,
  fetchShipments,
} from "@/domain/operations/service";
import { useI18n } from "@/lib/i18n";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { canManageAccounting, isInternalRole } from "@/features/auth/rbac";
import { supabase } from "@/integrations/supabase/client";
import { logOperationalError } from "@/lib/monitoring";

// UI Components
import GradientMeshBackground from "@/components/ui/GradientMeshBackground";
import GlassPanel from "@/components/ui/GlassPanel";
import AiOrb from "@/components/ai/AiOrb";
import FloatingMetrics from "@/components/dashboard/FloatingMetrics";
import TimelineFlow, { TimelineItem } from "@/components/timeline/TimelineFlow";

interface OverviewMetrics {
  requests: number;
  deals: number;
  shipments: number;
  audits: number;
  financialEntries: number;
}

type DashboardRequests = Awaited<ReturnType<typeof fetchRequests>>;
type DashboardDeals = Awaited<ReturnType<typeof fetchDeals>>;
type DashboardShipments = Awaited<ReturnType<typeof fetchShipments>>;
type DashboardEditRequests = Awaited<ReturnType<typeof fetchFinancialEditRequests>>;
type DashboardFinancialEntries = Awaited<ReturnType<typeof fetchFinancialEntries>>;

const buildDashboardContext = (
  requests: DashboardRequests,
  shipments: DashboardShipments,
  editRequests: DashboardEditRequests,
  metrics: OverviewMetrics,
) => {
  const countByStatus = (status: string) => requests.filter((item) => item.status === status).length;
  const activeShipments = shipments.filter((item) => item.stage !== "delivered").length;
  const deliveredShipments = shipments.filter((item) => item.stage === "delivered").length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      purchaseRequests: metrics.requests,
      deals: metrics.deals,
      shipments: metrics.shipments,
      audits: metrics.audits,
      financialEntries: metrics.financialEntries,
    },
    purchaseRequests: {
      intakeSubmitted: countByStatus("intake_submitted"),
      underReview: countByStatus("under_review"),
      awaitingClarification: countByStatus("awaiting_clarification"),
      readyForConversion: countByStatus("ready_for_conversion"),
      convertedOrInProgress: requests.filter((item) => item.status === "in_progress" || item.status === "completed").length,
      transferProofPending: countByStatus("transfer_proof_pending"),
    },
    shipments: {
      active: activeShipments,
      delivered: deliveredShipments,
      riskCount: shipments.filter((item) => item.stage !== "delivered" && item.timeline.length === 0).length,
    },
    accounting: {
      pendingEditRequests: editRequests.filter((item) => item.status === "pending").length,
    },
    recentRequests: requests.slice(0, 5).map((item) => ({
      requestNumber: item.requestNumber,
      status: item.status,
      productName: item.productName,
      destination: item.destination,
      createdAt: item.createdAt,
    })),
  };
};

const buildLocalDailyBriefing = (dashboardContext: ReturnType<typeof buildDashboardContext>, lang: string) => {
  const isArabic = lang === "ar";
  const priorities: string[] = [];
  const requests = dashboardContext.purchaseRequests;

  const add = (condition: boolean, en: string, ar: string) => {
    if (condition) priorities.push(isArabic ? ar : en);
  };

  add(
    requests.readyForConversion > 0,
    `Review ${requests.readyForConversion} ready purchase request(s) and convert qualified ones to deals.`,
    `راجع ${requests.readyForConversion} طلب/طلبات جاهزة للتحويل وحوّل المؤهل منها إلى صفقات.`,
  );
  add(
    requests.awaitingClarification > 0,
    `Follow up on ${requests.awaitingClarification} request(s) awaiting customer clarification.`,
    `تابع ${requests.awaitingClarification} طلب/طلبات بانتظار توضيح من العميل.`,
  );
  add(
    requests.transferProofPending > 0,
    `Review ${requests.transferProofPending} pending transfer proof(s).`,
    `راجع ${requests.transferProofPending} إثبات/إثباتات تحويل معلقة.`,
  );
  add(
    requests.intakeSubmitted > 0,
    `Start initial review of ${requests.intakeSubmitted} newly submitted request(s).`,
    `ابدأ المراجعة الأولية لـ ${requests.intakeSubmitted} طلب/طلبات جديدة.`,
  );
  add(
    dashboardContext.accounting.pendingEditRequests > 0,
    `Check ${dashboardContext.accounting.pendingEditRequests} pending financial edit request(s).`,
    `راجع ${dashboardContext.accounting.pendingEditRequests} طلب/طلبات تعديل مالي معلقة.`,
  );
  add(
    dashboardContext.shipments.riskCount > 0,
    `Inspect ${dashboardContext.shipments.riskCount} active shipment(s) with limited timeline activity.`,
    `افحص ${dashboardContext.shipments.riskCount} شحنة/شحنات نشطة ذات نشاط محدود في السجل الزمني.`,
  );

  if (priorities.length === 0) {
    priorities.push(
      isArabic
        ? "لا توجد عوائق تشغيلية عاجلة ظاهرة من بيانات لوحة التحكم الحالية."
        : "No urgent operational blockers detected from current dashboard data.",
    );
  }

  return isArabic
    ? [
        "## الملخص التنفيذي",
        `يوجد حالياً ${dashboardContext.totals.purchaseRequests} طلب شراء، و${dashboardContext.totals.deals} صفقة، و${dashboardContext.shipments.active} شحنة نشطة.`,
        "",
        "## الأولويات التشغيلية",
        ...priorities.map((item) => `- ${item}`),
        "",
        "## الإجراءات المقترحة",
        "- ابدأ بالطلبات الجاهزة للتحويل ثم الطلبات التي تنتظر توضيحات من العملاء.",
        "- راجع إثباتات التحويل المعلقة قبل أي تقدم تشغيلي.",
        "- راقب الشحنات النشطة وطلبات التعديل المالي حسب الأولوية.",
      ].join("\n")
    : [
        "## Executive summary",
        `Current dashboard data shows ${dashboardContext.totals.purchaseRequests} purchase requests, ${dashboardContext.totals.deals} deals, and ${dashboardContext.shipments.active} active shipments.`,
        "",
        "## Operational priorities",
        ...priorities.map((item) => `- ${item}`),
        "",
        "## Suggested next actions",
        "- Start with ready-for-conversion requests, then customer clarification follow-ups.",
        "- Review pending transfer proofs before any operational progression.",
        "- Monitor active shipments and pending financial edit requests by urgency.",
      ].join("\n");
};

export default function OverviewPage() {
  const { locale, t, lang } = useI18n();
  const { profile } = useAuthSession();
  const isInternal = isInternalRole(profile?.role);
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    requests: 0,
    deals: 0,
    shipments: 0,
    audits: 0,
    financialEntries: 0,
  });
  const [requests, setRequests] = useState<DashboardRequests>([]);
  const [deals, setDeals] = useState<DashboardDeals>([]);
  const [shipments, setShipments] = useState<Awaited<ReturnType<typeof fetchShipments>>>([]);
  const [editRequests, setEditRequests] = useState<Awaited<ReturnType<typeof fetchFinancialEditRequests>>>([]);
  const [financialEntries, setFinancialEntries] = useState<DashboardFinancialEntries>([]);
  const [loading, setLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [briefingUsedFallback, setBriefingUsedFallback] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const canReadAccountingManagement = profile?.role ? canManageAccounting(profile.role) : false;
        const [requestsDomain, dealsDomain, shipmentsDomain, auditCount, editsDomain, financialEntriesDomain] = await Promise.all([
          fetchRequests(),
          fetchDeals(),
          fetchShipments(),
          fetchAuditCount(),
          canReadAccountingManagement ? fetchFinancialEditRequests() : Promise.resolve([]),
          canReadAccountingManagement ? fetchFinancialEntries() : Promise.resolve([]),
        ]);

        const activeDeals = dealsDomain.filter(
          (deal) => deal.operationalStatus !== "delivered" && deal.operationalStatus !== "closed",
        );
        const activeShipments = shipmentsDomain.filter(
          (shipment) => shipment.stage !== "delivered" && shipment.stage !== "closed",
        );

        setMetrics({
          requests: requestsDomain.length,
          deals: activeDeals.length,
          shipments: activeShipments.length,
          audits: auditCount,
          financialEntries: financialEntriesDomain.length,
        });
        setRequests(requestsDomain);
        setDeals(dealsDomain);
        setShipments(shipmentsDomain);
        setEditRequests(editsDomain);
        setFinancialEntries(financialEntriesDomain);
      } catch (error) {
        logOperationalError("dashboard_overview_load", error, { role: profile?.role });
        setMetrics({ requests: 0, deals: 0, shipments: 0, audits: 0, financialEntries: 0 });
        setRequests([]);
        setDeals([]);
        setShipments([]);
        setEditRequests([]);
        setFinancialEntries([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profile?.role]);

  const dashboardContext = useMemo(
    () => buildDashboardContext(requests, shipments, editRequests, metrics),
    [requests, shipments, editRequests, metrics],
  );

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const requestItems = requests.slice(0, 3).map((item) => ({
      id: `request-${item.id}`,
      title: item.requestNumber || t("overview.genericRequest"),
      subtitle: item.productName || item.customer.fullName,
      status: item.status === "ready_for_conversion" ? "ready" : "under_review",
      time: new Date(item.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      type: "request" as const,
      icon: <ClipboardList size={18} />,
      date: new Date(item.createdAt),
    }));

    const dealItems = deals.slice(0, 2).map((item) => ({
      id: `deal-${item.id}`,
      title: item.dealNumber,
      subtitle: item.operationTitle || item.customerName,
      status: item.operationalStatus === "delivered" || item.operationalStatus === "closed" ? "completed" : "active",
      time: new Date(item.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      type: "deal" as const,
      icon: <PackageSearch size={18} />,
      date: new Date(item.createdAt),
    }));

    const shipmentItems = shipments.slice(0, 2).map((item) => ({
      id: `shipment-${item.id}`,
      title: item.trackingId,
      subtitle: item.clientName || item.destination,
      status: item.stage === "delivered" || item.stage === "closed" ? "delivered" : "active",
      time: new Date(item.updatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      type: "shipment" as const,
      icon: <Truck size={18} />,
      date: new Date(item.updatedAt),
    }));

    return [...requestItems, ...dealItems, ...shipmentItems]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(({ date, ...rest }) => rest);
  }, [deals, requests, shipments, t, locale]);

  const prepareDailyBriefing = useCallback(async () => {
    if (!isInternal || loading) {
      return;
    }

    setBriefingLoading(true);
    setBriefingUsedFallback(false);

    try {
      const responseLanguage = lang === "ar" ? "Arabic" : "English";
      const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
        body: {
          message:
            lang === "ar"
              ? "أعد موجز LOUREX AI اليومي الداخلي للوحة التحكم باللغة العربية فقط."
              : "Prepare the internal LOUREX AI Daily Briefing for the dashboard overview in English only.",
          messages: [],
          pageContext: "dashboard_home",
          route: window.location.pathname,
          locale,
          language: lang,
          responseLanguage,
          languageInstruction: `Respond in ${responseLanguage} only.`,
          userRole: profile?.role,
          analysisMode: "dashboard_daily_briefing",
          dashboardContext,
        },
      });

      if (error) {
        throw error;
      }

      const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
      if (!reply) {
        throw new Error("Empty daily briefing response");
      }

      setBriefingText(reply);
    } catch (error: any) {
      logOperationalError("dashboard_ai_daily_briefing", error, { role: profile?.role });

      let isQuotaError = false;

      if (error instanceof Error) {
        isQuotaError = error.message.includes("402");
      }

      if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof (error as { status?: unknown }).status === "number"
      ) {
        const status = (error as { status: number }).status;
        if (status === 402) {
          isQuotaError = true;
        }
      }

      setBriefingUsedFallback(true);
      setBriefingText(buildLocalDailyBriefing(dashboardContext, lang));

      if (isQuotaError) {
        console.warn("AI Quota exceeded (402). Using local briefing engine.");
      }

    } finally {
      setBriefingLoading(false);
    }
  }, [dashboardContext, isInternal, lang, loading, locale, profile?.role]);

  useEffect(() => {
    if (!loading && isInternal && !briefingText && !briefingLoading) {
      void prepareDailyBriefing();
    }
  }, [briefingLoading, briefingText, isInternal, loading, prepareDailyBriefing]);

  const briefingPreview = useMemo(() => {
    if (!briefingText) return "";
    return briefingText.length > 120 
      ? briefingText.substring(0, 120).replace(/[#*`]/g, "") + "..." 
      : briefingText.replace(/[#*`]/g, "");
  }, [briefingText]);

  return (
    <div className="relative min-h-screen pb-20 pt-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <GradientMeshBackground />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        {/* Header Section */}
        <header className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
              {t("overview.heroTitle") || "Lourex Command Center"}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-400">
              {new Date().toLocaleDateString(locale)} • {t("overview.heroEyebrow")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => void prepareDailyBriefing()} className="rounded-xl border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10">
              <RefreshCw className={briefingLoading ? "animate-spin" : ""} size={16} />
            </Button>
            <Button asChild className="rounded-xl bg-blue-600 px-6 font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-500">
              <Link to="/dashboard/requests">
                {t("overview.openRequests")}
                <ArrowUpRight className="ms-2" size={16} />
              </Link>
            </Button>
          </div>
        </header>

        {/* AI Orb & Status Section */}
        <section className="mb-12">
          <GlassPanel className="flex flex-col items-center gap-6 p-8 md:flex-row md:gap-10">
            <AiOrb active={briefingLoading || !!briefingText} className="shrink-0" />
            <div className="flex-1 text-center md:text-start">
              <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
                {lang === "ar" ? "تحليل الذكاء الاصطناعي اليومي" : "AI Daily Analysis"}
              </h2>
              <div className="mt-3 min-h-[3rem]">
                {briefingLoading ? (
                  <p className="flex items-center justify-center gap-2 text-lg text-slate-300 md:justify-start">
                    <Loader2 className="animate-spin text-blue-400" size={20} />
                    {lang === "ar" ? "جارٍ تحليل البيانات..." : "Analyzing data..."}
                  </p>
                ) : (
                  <>
                    <p className="text-lg leading-relaxed text-slate-200">
                      {briefingText ? briefingPreview : (lang === "ar" ? "بانتظار البيانات..." : "Waiting for data...")}
                    </p>
                    {briefingUsedFallback && (
                      <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest text-amber-500/80">
                        {lang === "ar" ? "وضع المحلل المحلي" : "Local Engine Active"}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            {briefingText && (
              <Button asChild variant="ghost" className="rounded-xl text-blue-400 hover:bg-blue-500/10 hover:text-blue-300">
                <Link to="/dashboard/requests">
                  {lang === "ar" ? "عرض التفاصيل" : "View Details"}
                  <ChevronRight className="ms-1" size={16} />
                </Link>
              </Button>
            )}
          </GlassPanel>
        </section>

        {/* Floating Metrics Section */}
        <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FloatingMetrics 
            label={t("overview.metrics.requests")} 
            value={loading ? "..." : metrics.requests} 
          />
          <FloatingMetrics 
            label={t("overview.metrics.deals")} 
            value={loading ? "..." : metrics.deals} 
          />
          <FloatingMetrics 
            label={t("overview.activeShipments")} 
            value={loading ? "..." : metrics.shipments} 
          />
          <FloatingMetrics 
            label={t("reports.metrics.linkedEntries")} 
            value={loading ? "..." : metrics.financialEntries} 
          />
        </section>

        {/* Activity & Quick Actions Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <section>
            <GlassPanel className="h-full overflow-hidden">
              <div className="border-b border-white/5 px-6 py-5">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
                  <Clock3 size={14} />
                  {t("overview.priorityTitle") || "Operational Flow"}
                </h3>
              </div>
              <div className="p-6">
                {loading ? (
                   <div className="flex flex-col gap-6">
                     {Array.from({ length: 4 }).map((_, i) => (
                       <div key={i} className="flex gap-4 animate-pulse">
                         <div className="h-10 w-10 rounded-full bg-white/5" />
                         <div className="flex-1 space-y-2">
                           <div className="h-4 w-1/3 rounded bg-white/5" />
                           <div className="h-3 w-1/4 rounded bg-white/5" />
                         </div>
                       </div>
                     ))}
                   </div>
                ) : timelineItems.length > 0 ? (
                  <TimelineFlow items={timelineItems} />
                ) : (
                  <div className="py-10 text-center text-sm text-slate-500">
                    {t("overview.noRequests")}
                  </div>
                )}
              </div>
            </GlassPanel>
          </section>

          <section className="flex flex-col gap-6">
            <GlassPanel className="p-6">
              <h3 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
                <FilePenLine size={14} />
                {t("overview.quickActions")}
              </h3>
              <div className="grid gap-3">
                {[
                  { label: t("overview.quickReview"), to: "/dashboard/requests" },
                  { label: t("overview.quickDeals"), to: "/dashboard/deals" },
                  { label: t("overview.quickTracking"), to: "/dashboard/tracking" },
                  { label: t("overview.quickEditRequests"), to: "/dashboard/edit-requests" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition-all hover:bg-white/10 hover:ps-5"
                  >
                    {item.label}
                    <ChevronRight size={14} className="text-slate-600" />
                  </Link>
                ))}
              </div>
            </GlassPanel>

            {isInternal && (
               <GlassPanel className="border-blue-500/20 bg-blue-500/5 p-6">
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                   {t("reports.metrics.linkedEntries")}
                 </h4>
                 <p className="mt-2 text-2xl font-bold text-white">
                   {metrics.financialEntries.toLocaleString(locale)}
                 </p>
                 <p className="mt-1 text-xs text-slate-400">
                   {lang === "ar" ? "مدخلات مالية مسجلة" : "Financial entries recorded"}
                 </p>
               </GlassPanel>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
