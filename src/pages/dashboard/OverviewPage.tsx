import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ClipboardList, FilePenLine, Loader2, PackageSearch, Receipt, RefreshCw, Sparkles, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAuditCount,
  fetchDeals,
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
}

interface MetricCard {
  label: string;
  value: number;
  icon: LucideIcon;
}

const loadingCards = Array.from({ length: 4 }, (_, index) => index);

type DashboardRequests = Awaited<ReturnType<typeof fetchRequests>>;
type DashboardShipments = Awaited<ReturnType<typeof fetchShipments>>;
type DashboardEditRequests = Awaited<ReturnType<typeof fetchFinancialEditRequests>>;

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
  const [metrics, setMetrics] = useState<OverviewMetrics>({ requests: 0, deals: 0, shipments: 0, audits: 0 });
  const [requests, setRequests] = useState<DashboardRequests>([]);
  const [recentRequests, setRecentRequests] = useState<Awaited<ReturnType<typeof fetchRequests>>>([]);
  const [shipments, setShipments] = useState<Awaited<ReturnType<typeof fetchShipments>>>([]);
  const [editRequests, setEditRequests] = useState<Awaited<ReturnType<typeof fetchFinancialEditRequests>>>([]);
  const [loading, setLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [briefingUsedFallback, setBriefingUsedFallback] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const canReadAccountingManagement = profile?.role ? canManageAccounting(profile.role) : false;
        const [requestsDomain, dealsDomain, shipmentsDomain, auditCount, editsDomain] = await Promise.all([
          fetchRequests(),
          fetchDeals(),
          fetchShipments(),
          fetchAuditCount(),
          canReadAccountingManagement ? fetchFinancialEditRequests() : Promise.resolve([]),
        ]);

        setMetrics({
          requests: requestsDomain.length,
          deals: dealsDomain.length,
          shipments: shipmentsDomain.length,
          audits: auditCount,
        });
        setRequests(requestsDomain);
        setRecentRequests(requestsDomain.slice(0, 4));
        setShipments(shipmentsDomain);
        setEditRequests(editsDomain);
      } catch (error) {
        logOperationalError("dashboard_overview_load", error, { role: profile?.role });
        setMetrics({ requests: 0, deals: 0, shipments: 0, audits: 0 });
        setRequests([]);
        setRecentRequests([]);
        setShipments([]);
        setEditRequests([]);
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
      active: shipments.filter((item) => item.stage !== "delivered").length,
      delivered: shipments.filter((item) => item.stage === "delivered").length,
    }),
    [shipments],
  );

  const pendingEditRequests = editRequests.filter((item) => item.status === "pending").length;
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
    { label: t("overview.metrics.requests"), value: metrics.requests, icon: ClipboardList },
    { label: t("overview.metrics.deals"), value: metrics.deals, icon: PackageSearch },
    { label: t("overview.metrics.shipments"), value: metrics.shipments, icon: Truck },
    { label: t("overview.metrics.audits"), value: metrics.audits, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <BentoCard span="full" className="rounded-[2rem] p-8 md:p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t("overview.heroEyebrow")}</p>
        <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              {t("overview.heroTitle")} <span className="text-gradient-gold">Lourex</span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("overview.heroDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="gold" asChild>
              <Link to="/dashboard/requests">{t("overview.openRequests")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/deals">{t("overview.openDeals")}</Link>
            </Button>
          </div>
        </div>
      </BentoCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading ? loadingCards : metricCards).map((item, index) => (
          <BentoCard key={loading ? item : item.label} delay={index * 0.05}>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="mt-5 font-serif text-4xl font-bold">{item.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
              </>
            )}
          </BentoCard>
        ))}
      </div>

      {isInternal ? (
        <BentoCard span="full" className="border-primary/25 bg-[#080808] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-primary">
                    {lang === "ar" ? "موجز LOUREX AI اليومي" : "LOUREX AI Daily Briefing"}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
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
              className="shrink-0 border-primary/25 bg-[#111111] hover:border-primary/45 hover:bg-primary/10"
              disabled={briefingLoading || loading}
              onClick={() => void prepareDailyBriefing()}
            >
              {briefingLoading ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin text-primary" />
              ) : (
                <RefreshCw className="me-2 h-4 w-4 text-primary" />
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

          <div className="mt-5 rounded-[1.25rem] border border-primary/20 bg-[#111111] p-5">
            {briefingLoading ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {lang === "ar" ? "جارٍ تجهيز الموجز اليومي..." : "Preparing daily briefing..."}
              </div>
            ) : briefingText ? (
              <pre className="max-h-[28rem] whitespace-pre-wrap break-words font-sans text-sm leading-7 text-foreground">{briefingText}</pre>
            ) : (
              <div className="text-sm leading-7 text-muted-foreground">
                {lang === "ar"
                  ? "سيظهر الموجز اليومي بعد تحميل بيانات لوحة التحكم."
                  : "The daily briefing will appear after dashboard data finishes loading."}
              </div>
            )}
          </div>
        </BentoCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <BentoCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("overview.priorityBoard")}</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold">{t("overview.priorityTitle")}</h3>
            </div>
            <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary">{t("overview.liveFocus")}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: t("overview.reviewLabel"), value: requestSummary.review, description: t("overview.reviewDescription") },
              { label: t("overview.readyLabel"), value: requestSummary.ready, description: t("overview.readyDescription") },
              { label: t("overview.editLabel"), value: pendingEditRequests, description: t("overview.editDescription") },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-border/60 bg-secondary/20 p-5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-bold">{item.value}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <h3 className="font-serif text-2xl font-semibold">{t("overview.currentOpsTitle")}</h3>
          <div className="grid gap-3">
            <div className="rounded-[1.4rem] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs text-muted-foreground">{t("overview.activeShipments")}</p>
              <p className="mt-2 text-2xl font-bold">{deliverySummary.active}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs text-muted-foreground">{t("overview.deliveredShipments")}</p>
              <p className="mt-2 text-2xl font-bold">{deliverySummary.delivered}</p>
            </div>
            <div className="rounded-[1.4rem] border border-primary/15 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
              {t("overview.currentOpsDescription")}
            </div>
          </div>
        </BentoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <BentoCard span="1" className="p-0">
          <div className="border-b border-border/60 px-6 py-5">
            <h3 className="font-serif text-2xl font-semibold">{t("overview.latestRequests")}</h3>
          </div>
          <div className="space-y-0">
            {loading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : recentRequests.length > 0 ? (
              recentRequests.map((item) => (
                <div key={item.id} className="border-b border-border/40 px-6 py-5 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.customer.fullName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.productName || t("overview.genericRequest")}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {t(`statuses.${item.status}`)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString(locale)}</p>
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-sm text-muted-foreground">{t("overview.noRequests")}</div>
            )}
          </div>
        </BentoCard>

        <BentoCard className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FilePenLine className="h-5 w-5" />
          </div>
          <h3 className="font-serif text-2xl font-semibold">{t("overview.quickActions")}</h3>
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
                className="rounded-[1.25rem] border border-border/60 bg-secondary/25 px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
