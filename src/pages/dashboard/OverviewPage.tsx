import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  ClipboardList,
  Clock3,
  FilePenLine,
  Loader2,
  PackageSearch,
  Receipt,
  RefreshCw,
  Sparkles,
  Truck,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

interface OverviewMetrics {
  requests: number;
  deals: number;
  shipments: number;
  audits: number;
  financialEntries: number;
}

interface MetricCard {
  label: string;
  value: number;
  icon: LucideIcon;
  helper: string;
  accent: string;
}

const loadingCards = Array.from({ length: 4 }, (_, index) => index);

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
  const [recentRequests, setRecentRequests] = useState<Awaited<ReturnType<typeof fetchRequests>>>([]);
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
        setRecentRequests(requestsDomain.slice(0, 4));
        setShipments(shipmentsDomain);
        setEditRequests(editsDomain);
        setFinancialEntries(financialEntriesDomain);
      } catch (error) {
        logOperationalError("dashboard_overview_load", error, { role: profile?.role });
        setMetrics({ requests: 0, deals: 0, shipments: 0, audits: 0, financialEntries: 0 });
        setRequests([]);
        setDeals([]);
        setRecentRequests([]);
        setShipments([]);
        setEditRequests([]);
        setFinancialEntries([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profile?.role]);

  const requestSummary = useMemo(
    () => ({
      review: recentRequests.filter((item) => item.status === "under_review").length,
      ready: recentRequests.filter((item) => item.status === "ready_for_conversion").length,
      converted: recentRequests.filter((item) => item.status === "in_progress" || item.status === "completed").length,
    }),
    [recentRequests],
  );

  const dashboardContext = useMemo(
    () => buildDashboardContext(requests, shipments, editRequests, metrics),
    [requests, shipments, editRequests, metrics],
  );

  const deliverySummary = useMemo(
    () => ({
      active: shipments.filter((item) => item.stage !== "delivered" && item.stage !== "closed").length,
      delivered: shipments.filter((item) => item.stage === "delivered" || item.stage === "closed").length,
    }),
    [shipments],
  );

  const pendingEditRequests = editRequests.filter((item) => item.status === "pending").length;
  const newestFinancialEntry = financialEntries[0];

  const recentActivity = useMemo(() => {
    const requestActivity = requests.slice(0, 3).map((item) => ({
      id: `request-${item.id}`,
      title: item.requestNumber || t("overview.genericRequest"),
      description: item.productName || item.customer.fullName,
      badge: t(`statuses.${item.status}`),
      date: item.createdAt,
      to: "/dashboard/requests",
      icon: ClipboardList,
    }));

    const dealActivity = deals.slice(0, 2).map((item) => ({
      id: `deal-${item.id}`,
      title: item.dealNumber,
      description: item.operationTitle || item.customerName,
      badge: t("dashboardNav.deals"),
      date: item.createdAt,
      to: "/dashboard/deals",
      icon: PackageSearch,
    }));

    const shipmentActivity = shipments.slice(0, 2).map((item) => ({
      id: `shipment-${item.id}`,
      title: item.trackingId,
      description: item.clientName || item.destination,
      badge: t("dashboardNav.tracking"),
      date: item.updatedAt,
      to: "/dashboard/tracking",
      icon: Truck,
    }));

    return [...requestActivity, ...dealActivity, ...shipmentActivity]
      .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
      .slice(0, 6);
  }, [deals, requests, shipments, t]);

  const prepareDailyBriefing = useCallback(async () => {
    if (!isInternal || loading) {
      return;
    }

    setBriefingLoading(true);
    setBriefingUsedFallback(false);

    try {
      const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
        body: {
          message: "Prepare the internal LOUREX AI Daily Briefing for the dashboard overview.",
          messages: [],
          pageContext: "dashboard_home",
          route: window.location.pathname,
          locale,
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
    } catch (error: unknown) {
      logOperationalError("dashboard_ai_daily_briefing", error, { role: profile?.role });
      setBriefingUsedFallback(true);
      setBriefingText(buildLocalDailyBriefing(dashboardContext, lang));
    } finally {
      setBriefingLoading(false);
    }
  }, [dashboardContext, isInternal, lang, loading, locale, profile?.role]);

  useEffect(() => {
    if (!loading && isInternal && !briefingText && !briefingLoading) {
      void prepareDailyBriefing();
    }
  }, [briefingLoading, briefingText, isInternal, loading, prepareDailyBriefing]);

  const metricCards: MetricCard[] = [
    {
      label: t("overview.metrics.requests"),
      value: metrics.requests,
      icon: ClipboardList,
      helper: t("overview.reviewDescription"),
      accent: "from-blue-500/25 to-cyan-400/10 text-blue-100 ring-blue-400/25",
    },
    {
      label: t("overview.metrics.deals"),
      value: metrics.deals,
      icon: PackageSearch,
      helper: t("overview.readyDescription"),
      accent: "from-indigo-500/25 to-blue-400/10 text-indigo-100 ring-indigo-400/25",
    },
    {
      label: t("overview.activeShipments"),
      value: metrics.shipments,
      icon: Truck,
      helper: t("overview.currentOpsDescription"),
      accent: "from-sky-500/25 to-blue-400/10 text-sky-100 ring-sky-400/25",
    },
    {
      label: t("reports.metrics.linkedEntries"),
      value: metrics.financialEntries,
      icon: WalletCards,
      helper: t("overview.editDescription"),
      accent: "from-emerald-500/20 to-blue-400/10 text-emerald-100 ring-emerald-400/25",
    },
  ];

  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <BentoCard
        span="full"
        className="rounded-[1.75rem] border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_34%),linear-gradient(180deg,rgba(6,17,31,0.98),rgba(8,12,22,0.94))] p-6 shadow-[0_28px_70px_-48px_rgba(59,130,246,0.9)] md:p-8"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            {t("overview.heroEyebrow")}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
            {new Date().toLocaleDateString(locale)}
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              {t("overview.heroTitle")} <span className="text-blue-200">Lourex</span>
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{t("overview.heroDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="default" asChild className="rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-400">
              <Link to="/dashboard/requests">
                {t("overview.openRequests")}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="rounded-xl border-white/10 bg-white/[0.04] text-slate-200 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white">
              <Link to="/dashboard/deals">
                {t("overview.openDeals")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </BentoCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading ? loadingCards : metricCards).map((item, index) => (
          <BentoCard
            key={loading ? item : item.label}
            delay={index * 0.05}
            className="rounded-[1.5rem] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(6,17,31,0.9))] p-5"
          >
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ${item.accent}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-100">
                    {t("overview.liveFocus")}
                  </span>
                </div>
                <p className="mt-5 font-serif text-4xl font-bold text-white">{item.value.toLocaleString(locale)}</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{item.label}</p>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{item.helper}</p>
              </>
            )}
          </BentoCard>
        ))}
      </div>

      {isInternal ? (
        <BentoCard span="full" className="rounded-[1.5rem] border-blue-400/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(6,17,31,0.9))] p-6 shadow-[0_22px_60px_-42px_rgba(59,130,246,0.9)] md:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-blue-100">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-blue-200">
                    {lang === "ar" ? "موجز LOUREX AI اليومي" : "LOUREX AI Daily Briefing"}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-400">
                    {lang === "ar"
                      ? "مخرجات الذكاء الاصطناعي إرشادية فقط، والقرارات النهائية تبقى لفريق لوركس."
                      : "AI output is advisory. Final decisions remain with the Lourex team."}
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="shrink-0 rounded-xl border-white/10 bg-white/[0.04] text-slate-200 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white"
              disabled={briefingLoading || loading}
              onClick={() => void prepareDailyBriefing()}
            >
              {briefingLoading ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin text-blue-200" />
              ) : (
                <RefreshCw className="me-2 h-4 w-4 text-blue-200" />
              )}
              {lang === "ar" ? "تحديث الموجز" : "Refresh briefing"}
            </Button>
          </div>

          {briefingUsedFallback ? (
            <div className="mt-5 rounded-[1rem] border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
              {lang === "ar"
                ? "مساعد LOUREX AI غير متاح الآن. تم إنشاء موجز تشغيلي محلي بدلاً من ذلك."
                : "LOUREX AI is unavailable right now. A local operational briefing was generated instead."}
            </div>
          ) : null}

          <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5">
            {briefingLoading ? (
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-blue-200" />
                {lang === "ar" ? "جارٍ تجهيز الموجز اليومي..." : "Preparing daily briefing..."}
              </div>
            ) : briefingText ? (
              <pre className="max-h-[28rem] whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-100">{briefingText}</pre>
            ) : (
              <div className="text-sm leading-7 text-slate-400">
                {lang === "ar"
                  ? "سيظهر الموجز اليومي بعد تحميل بيانات لوحة التحكم."
                  : "The daily briefing will appear after dashboard data finishes loading."}
              </div>
            )}
          </div>
        </BentoCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <BentoCard className="space-y-5 rounded-[1.5rem] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(6,17,31,0.88))]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">{t("overview.priorityBoard")}</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-white">{t("overview.priorityTitle")}</h3>
            </div>
            <div className="rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-100">{t("overview.liveFocus")}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: t("overview.reviewLabel"), value: requestSummary.review, description: t("overview.reviewDescription") },
              { label: t("overview.readyLabel"), value: requestSummary.ready, description: t("overview.readyDescription") },
              { label: t("overview.editLabel"), value: pendingEditRequests, description: t("overview.editDescription") },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-blue-400/30 hover:bg-blue-500/10">
                <p className="text-xs font-medium text-slate-400">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{item.value.toLocaleString(locale)}</p>
                <p className="mt-2 text-sm leading-7 text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard className="space-y-4 rounded-[1.5rem] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(6,17,31,0.88))]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/25">
            <Receipt className="h-5 w-5" />
          </div>
          <h3 className="font-serif text-2xl font-semibold text-white">{t("overview.currentOpsTitle")}</h3>
          <div className="grid gap-3">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-medium text-slate-400">{t("overview.activeShipments")}</p>
              <p className="mt-2 text-2xl font-bold text-white">{deliverySummary.active.toLocaleString(locale)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-medium text-slate-400">{t("overview.deliveredShipments")}</p>
              <p className="mt-2 text-2xl font-bold text-white">{deliverySummary.delivered.toLocaleString(locale)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-7 text-slate-300">
              {t("overview.currentOpsDescription")}
            </div>
          </div>
        </BentoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <BentoCard span="1" className="rounded-[1.5rem] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(6,17,31,0.88))] p-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">{t("customers.activity")}</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-white">{t("overview.latestRequests")}</h3>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/25">
              <Clock3 className="h-4 w-4" />
            </span>
          </div>
          <div className="space-y-0">
            {loading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="group block border-b border-white/10 px-6 py-4 transition-colors last:border-b-0 hover:bg-blue-500/10"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-blue-100 group-hover:border-blue-400/30">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 truncate text-sm text-slate-400">{item.description || t("overview.genericRequest")}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-100">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{new Date(item.date).toLocaleString(locale)}</p>
                </Link>
              ))
            ) : (
              <div className="px-6 py-10 text-sm text-slate-400">{t("overview.noRequests")}</div>
            )}
          </div>
        </BentoCard>

        <BentoCard className="space-y-4 rounded-[1.5rem] border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(6,17,31,0.88))]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/25">
            <FilePenLine className="h-5 w-5" />
          </div>
          <h3 className="font-serif text-2xl font-semibold text-white">{t("overview.quickActions")}</h3>
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
                className="group flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-blue-400/35 hover:bg-blue-500/10 hover:text-white"
              >
                <span>{item.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-blue-100" />
              </Link>
            ))}
          </div>
          {newestFinancialEntry ? (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-xs leading-6 text-emerald-100">
              {t("reports.metrics.linkedEntries")}: {metrics.financialEntries.toLocaleString(locale)}
            </div>
          ) : null}
        </BentoCard>
      </div>
    </div>
  );
}
