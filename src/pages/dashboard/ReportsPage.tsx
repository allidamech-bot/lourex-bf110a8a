import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ClipboardList,
  Download,
  PackageSearch,
  Printer,
  Receipt,
  ShieldCheck,
  Truck,
  Users,
  Clock,
  ExternalLink,
  RefreshCw,
  Calendar,
} from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getDashboardReportSnapshot,
  getMetricDetails,
  type DashboardReportSnapshot,
} from "@/lib/reportsDomain";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { buildReportCsv, downloadCsv, printPdfReport } from "@/lib/adminOperations";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { fetchRequests, fetchDeals } from "@/domain/operations/service";
import { generateRegionalOperationsSummary } from "@/features/organization-intelligence/lib/organizationIntelligenceEngine";
import { RegionalOperationsVisibility } from "@/features/organization-intelligence/components/RegionalOperationsVisibility";
import {
  analyzeOperationalMomentum,
  detectOperationalBlockers
} from "@/features/autonomous-coordination/lib/autonomousCoordinationEngine";
import { OperationalMomentumPanel } from "@/features/autonomous-coordination/components/OperationalMomentumPanel";
import {
  generatePartnerProfiles,
  generatePartnerPerformanceScorecard
} from "@/features/partner-intelligence/lib/partnerIntelligenceEngine";
import { PartnerPerformanceScorecard } from "@/features/partner-intelligence/components/PartnerPerformanceScorecard";
import {
  generateCustomerProfiles
} from "@/features/customer-success-intelligence/lib/customerSuccessEngine";
import { CustomerLifetimeValuePanel } from "@/features/customer-success-intelligence/components/CustomerLifetimeValuePanel";
import {
  generateExecutiveWorkspaceState
} from "@/features/executive-command/lib/executiveWorkspaceEngine";
import { BusinessStabilityPanel } from "@/features/executive-command/components/BusinessStabilityPanel";
import { ExecutiveReportPanel } from "@/features/reports/components/ExecutiveReportPanel";
import { buildExecutiveReportAdvisor } from "@/features/reports/lib/executiveReportAdvisor";
import { DashboardPageShell, DashboardSection, DashboardGrid } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportRange = "monthly" | "quarterly" | "semiannual" | "annual" | "custom";
type DrillDownItem = { id: string; status: string; totalValue?: number; amount?: number };

const getRangeStart = (range: ReportRange, customStart?: string) => {
  const now = new Date();
  if (range === "custom" && customStart) return new Date(customStart);

  const start = new Date(now);
  if (range === "monthly") start.setMonth(now.getMonth() - 1);
  if (range === "quarterly") start.setMonth(now.getMonth() - 3);
  if (range === "semiannual") start.setMonth(now.getMonth() - 6);
  if (range === "annual") start.setFullYear(now.getFullYear() - 1);
  return start;
};

export default function ReportsPage() {
  const { lang, locale, t } = useI18n();
  const { profile } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<ReportRange>("monthly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [snapshot, setSnapshot] = useState<DashboardReportSnapshot | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [drillDownData, setDrillDownData] = useState<{ type: string; items: DrillDownItem[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [executiveRefreshKey, setExecutiveRefreshKey] = useState(0);

  const rangeStart = useMemo(() => getRangeStart(range, customStart), [range, customStart]);
  const rangeEnd = useMemo(() => (range === "custom" && customEnd ? new Date(customEnd) : new Date()), [range, customEnd]);

  const refresh = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [nextSnapshot, allRequests, allDeals] = await Promise.all([
        getDashboardReportSnapshot(rangeStart, rangeEnd),
        fetchRequests(),
        fetchDeals()
      ]);
      setSnapshot(nextSnapshot);
      setRequests(allRequests);
      setDeals(allDeals);
    } catch (error: unknown) {
      logOperationalError("reports_snapshot_load", error, {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      });
      setSnapshot(null);
      setLoadError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [rangeStart, rangeEnd, t]);

  const executiveReport = useMemo(
    () => (snapshot ? buildExecutiveReportAdvisor(snapshot, lang === "ar" ? "ar" : "en") : null),
    [executiveRefreshKey, lang, snapshot],
  );

  const regionalSummary = useMemo(
    () => generateRegionalOperationsSummary(requests, deals),
    [requests, deals]
  );

  const autonomousBlockers = useMemo(
    () => detectOperationalBlockers(requests, deals, [], []),
    [requests, deals]
  );

  const operationalMomentum = useMemo(
    () => analyzeOperationalMomentum(requests, deals, autonomousBlockers),
    [requests, deals, autonomousBlockers]
  );

  const partnerProfiles = useMemo(
    () => generatePartnerProfiles(requests, deals, [], []),
    [requests, deals]
  );

  const partnerScorecards = useMemo(
    () => partnerProfiles.slice(0, 2).map(p => ({
      name: p.name,
      scorecard: generatePartnerPerformanceScorecard(p)
    })),
    [partnerProfiles]
  );

  const customerProfiles = useMemo(
    () => generateCustomerProfiles(requests as any, deals as any, []),
    [requests, deals]
  );

  const executiveWorkspaceState = useMemo(
    () => generateExecutiveWorkspaceState(requests as any, deals as any, [], [], []),
    [requests, deals]
  );

  const metrics = snapshot?.summary || {
    requests: 0,
    deals: 0,
    shipments: 0,
    customers: 0,
    audits: 0,
    linkedEntries: 0,
    lockedEntries: 0,
    pendingEditRequests: 0,
    income: 0,
    expense: 0,
    averageOperationValue: 0,
    inTransit: 0,
    destination: 0,
    delivered: 0,
    currencyGroups: 0,
  };
  const statementExportHint = metrics.currencyGroups > 1
    ? t("reports.statementExportHintMixed")
    : t("reports.statementExportHintSingle");

  const handleDrillDown = async (metric: "active_deals" | "pending_requests" | "recent_expenses") => {
    setLoading(true);
    try {
      const items = await getMetricDetails(metric);
      const normalizedItems: DrillDownItem[] = items.map((item) => {
        if ("totalValue" in item) {
          return { id: item.id, status: item.status, totalValue: item.totalValue };
        }

        if ("amount" in item) {
          return { id: item.id, status: item.type, amount: item.amount };
        }

        return { id: item.id, status: item.status };
      });
      setDrillDownData({ type: metric, items: normalizedItems });
    } catch (error) {
      logOperationalError("report_metric_drilldown", error, { metric });
      setLoadError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!snapshot) {
      const message = t("reports.export.noData");
      setLoadError(message);
      toast.error(message);
      return;
    }
    const exported = downloadCsv(
      `lourex-report-${range}.csv`,
      buildReportCsv(snapshot, {
        metric: t("common.value"),
        value: t("common.value"),
        requests: t("reports.metrics.requests"),
        deals: t("reports.metrics.deals"),
        shipments: t("reports.metrics.shipments"),
        customers: t("reports.metrics.customers"),
        income: t("reports.metrics.income"),
        expense: t("reports.metrics.expense"),
        lockedEntries: t("reports.metrics.lockedEntries"),
        pendingEditRequests: t("reports.metrics.pendingEditRequests"),
        topCustomer: t("reports.topCustomers"),
        outstandingBalance: t("reports.labels.outstandingBalance"),
      }),
    );
    if (!exported) {
      logOperationalError("reports_export_unavailable", new Error("CSV export unavailable"));
      setLoadError(t("reports.export.unavailable"));
      toast.error(t("reports.export.unavailable"));
      return;
    }
    toast.success(t("reports.export.success"));
  };

  const handleExportPdf = () => {
    if (!snapshot) {
      const message = t("common.noDataToExport");
      setLoadError(message);
      toast.error(message);
      return;
    }

    const executiveLabels = lang === "ar"
      ? {
          summary: "ملخص التقرير التنفيذي الذكي",
          decisionMetrics: "مؤشرات القرار التنفيذي",
          risks: "المخاطر التي تحتاج قرارا",
          opportunities: "الفرص الإدارية",
          actionPlan: "خطة العمل المقترحة",
          field: "البند",
          value: "القيمة",
          title: "العنوان",
          description: "الوصف",
          level: "المستوى",
          generatedAt: "وقت القراءة التنفيذية",
          followUpLevel: "مستوى المتابعة",
          followUpScore: "درجة المتابعة",
          netProfit: "الصافي المالي",
          profitMargin: "هامش الربح",
          collectionExposure: "تعرض التحصيل",
          settlementCoverage: "تغطية التسويات",
          pendingEditRequests: "طلبات التعديل المالي المعلقة",
          activeDeals: "الصفقات النشطة",
          averageProcessingTime: "متوسط زمن المعالجة",
        }
      : {
          summary: "Executive AI Report Summary",
          decisionMetrics: "Executive Decision Metrics",
          risks: "Risks Requiring Decision",
          opportunities: "Management Opportunities",
          actionPlan: "Suggested Action Plan",
          field: "Field",
          value: "Value",
          title: "Title",
          description: "Description",
          level: "Level",
          generatedAt: "Executive reading generated at",
          followUpLevel: "Follow-up level",
          followUpScore: "Follow-up score",
          netProfit: "Net result",
          profitMargin: "Profit margin",
          collectionExposure: "Collection exposure",
          settlementCoverage: "Settlement coverage",
          pendingEditRequests: "Pending financial edit requests",
          activeDeals: "Active deals",
          averageProcessingTime: "Average processing time",
        };

    const executiveSections = executiveReport
      ? [
          {
            title: executiveLabels.summary,
            headers: [executiveLabels.field, executiveLabels.value],
            rows: [
              [executiveLabels.followUpLevel, executiveReport.executiveLevel],
              [executiveLabels.followUpScore, executiveReport.executiveScore],
              [executiveLabels.generatedAt, new Date(executiveReport.generatedAt).toLocaleString(locale)],
              [executiveLabels.summary, executiveReport.summary],
            ],
          },
          {
            title: executiveLabels.decisionMetrics,
            headers: [executiveLabels.field, executiveLabels.value],
            rows: [
              [executiveLabels.netProfit, `${Math.round(executiveReport.metrics.netProfit).toLocaleString(locale)} SAR`],
              [executiveLabels.profitMargin, `${Math.round(executiveReport.metrics.profitMargin * 100)}%`],
              [executiveLabels.collectionExposure, `${Math.round(executiveReport.metrics.collectionExposure).toLocaleString(locale)} SAR`],
              [executiveLabels.settlementCoverage, `${Math.round(executiveReport.metrics.settlementCoverageRatio * 100)}%`],
              [executiveLabels.pendingEditRequests, executiveReport.metrics.pendingEditRequests],
              [executiveLabels.activeDeals, executiveReport.metrics.activeDeals],
              [executiveLabels.averageProcessingTime, `${Math.round(executiveReport.metrics.averageProcessingTimeDays)} ${t("common.days")}`],
            ],
          },
          {
            title: executiveLabels.risks,
            headers: [executiveLabels.title, executiveLabels.description, executiveLabels.level],
            rows: executiveReport.risks.map((item) => [item.title, item.description, item.level]),
          },
          {
            title: executiveLabels.opportunities,
            headers: [executiveLabels.title, executiveLabels.description, executiveLabels.level],
            rows: executiveReport.opportunities.map((item) => [item.title, item.description, item.level]),
          },
          {
            title: executiveLabels.actionPlan,
            headers: [executiveLabels.title, executiveLabels.description, executiveLabels.level],
            rows: executiveReport.actionPlan.map((item) => [item.title, item.description, item.level]),
          },
        ]
      : [];

    const exported = printPdfReport({
      title: t("reports.title"),
      filename: `lourex-report-${range}.pdf`,
      appName: t("common.appName"),
      generatedAtLabel: t("common.generatedAt"),
      generatedAt: new Date().toLocaleString(locale),
      direction: lang === "ar" ? "rtl" : "ltr",
      filters: [
        [t("reports.window"), `${rangeStart.toLocaleDateString(locale)} - ${rangeEnd.toLocaleDateString(locale)}`],
        [t("reports.ranges.custom"), t(`reports.ranges.${range}`)],
      ],
      sections: [
        ...executiveSections,
        {
          title: t("reports.operationsRead"),
          headers: [t("common.value"), t("common.amount")],
          rows: [
            [t("reports.metrics.requests"), metrics.requests],
            [t("reports.metrics.deals"), metrics.deals],
            [t("reports.metrics.shipments"), metrics.shipments],
            [t("reports.metrics.customers"), metrics.customers],
            [t("reports.metrics.income"), `${metrics.income.toLocaleString(locale)} SAR`],
            [t("reports.metrics.expense"), `${metrics.expense.toLocaleString(locale)} SAR`],
            [t("reports.metrics.profit"), `${(metrics.income - metrics.expense).toLocaleString(locale)} SAR`],
            [t("reports.metrics.lockedEntries"), metrics.lockedEntries],
            [t("reports.metrics.pendingEditRequests"), metrics.pendingEditRequests],
          ],
        },
        {
          title: t("reports.shipmentSummary"),
          headers: [t("common.status"), t("common.value")],
          rows: [
            [t("reports.inTransit"), metrics.inTransit],
            [t("reports.destination"), metrics.destination],
            [t("reports.delivered"), metrics.delivered],
          ],
        },
        {
          title: t("reports.topCustomers"),
          headers: [t("common.customer"), t("reports.metrics.requests"), t("reports.labels.outstandingBalance")],
          rows: snapshot.topCustomers.map((customer) => [
            customer.fullName,
            customer.requestsCount,
            `${customer.outstandingBalance.toLocaleString(locale)} SAR`,
          ]),
        },
        {
          title: t("reports.topExpenses"),
          headers: [t("common.category"), t("common.amount")],
          rows: snapshot.topExpenseCategories.map((item) => [
            item.category || t("reports.uncategorized"),
            `${Number(item.amount).toLocaleString(locale)} SAR`,
          ]),
        },
      ],
    });

    if (!exported) {
      setLoadError(t("common.exportFailed"));
      toast.error(t("common.exportFailed"));
      return;
    }

    toast.success(t("common.exportCompleted"));
  };

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardGrid variant="balanced">
          <Skeleton className="h-60 w-full rounded-[2rem]" />
          <Skeleton className="h-60 w-full rounded-[2rem]" />
        </DashboardGrid>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell dir={lang === "ar" ? "rtl" : "ltr"}>
      <PageHelpBox pageKey="reports" role={profile?.role} />

      <DashboardSection
        title={t("reports.title")}
        description={t("reports.structuredHint")}
        icon={<BarChart3 className="h-6 w-6" />}
        headerAction={
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 px-4 h-11 rounded-xl bg-stone-900/40 border border-amber-200/10">
              <Calendar className="h-4 w-4 text-stone-500" />
              <select
                value={range}
                onChange={(event) => setRange(event.target.value as ReportRange)}
                className="bg-transparent text-sm text-stone-200 outline-none"
              >
                <option value="monthly" className="bg-stone-900">{t("reports.ranges.monthly")}</option>
                <option value="quarterly" className="bg-stone-900">{t("reports.ranges.quarterly")}</option>
                <option value="semiannual" className="bg-stone-900">{t("reports.ranges.semiannual")}</option>
                <option value="annual" className="bg-stone-900">{t("reports.ranges.annual")}</option>
                <option value="custom" className="bg-stone-900">{t("reports.ranges.custom")}</option>
              </select>
            </div>
            {range === 'custom' && (
              <>
                <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-11 rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 text-sm text-stone-100" />
                <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-11 rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 text-sm text-stone-100" />
              </>
            )}
            <Button variant="outline" size="lg" onClick={() => void refresh()} className="rounded-2xl border-amber-200/10 bg-stone-900/40 text-stone-200 hover:text-amber-200 h-12 px-6">
              <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin text-amber-500")} />
              <span className="font-bold">{t("common.refresh")}</span>
            </Button>
          </div>
        }
      >
        <DashboardGrid variant="kpi">
          {[
            { label: t("reports.metrics.requests"), value: metrics.requests, icon: ClipboardList, action: () => handleDrillDown("pending_requests") },
            { label: t("reports.metrics.deals"), value: metrics.deals, icon: PackageSearch, action: () => handleDrillDown("active_deals") },
            { label: t("reports.metrics.shipments"), value: metrics.shipments, icon: Truck },
            { label: t("reports.metrics.customers"), value: metrics.customers, icon: Users },
            { label: t("reports.metrics.income"), value: `${metrics.income.toLocaleString()} SAR`, icon: Receipt },
          ].map((item) => (
            <BentoCard key={item.label} className={cn("p-5 border-amber-200/10 bg-stone-900/50", item.action && "cursor-pointer hover:border-amber-200/30 transition-all")} onClick={item.action}>
               <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{item.label}</p>
                <item.icon className="h-4 w-4 text-amber-500/50" />
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-stone-100">{item.value}</p>
                {item.action && <ExternalLink className="h-3 w-3 text-stone-700" />}
              </div>
            </BentoCard>
          ))}
        </DashboardGrid>
      </DashboardSection>

      {drillDownData && (
        <DashboardSection title={t(`reports.drilldowns.${drillDownData.type}`)}>
          <BentoCard className="p-0 border-amber-200/15 bg-stone-900/55 overflow-hidden">
            <div className="p-6 border-b border-amber-200/10 flex justify-between items-center">
              <h3 className="font-bold text-stone-100 uppercase tracking-widest text-xs">{drillDownData.type} Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setDrillDownData(null)} className="text-stone-500 hover:text-stone-300">Close</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-stone-300">
                <thead>
                  <tr className="border-b border-amber-200/10 text-left text-stone-500 font-bold uppercase tracking-widest text-[10px]">
                    <th className="p-4">{t("common.id")}</th>
                    <th className="p-4">{t("common.status")}</th>
                    <th className="p-4 text-right">{t("common.value")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200/5">
                  {drillDownData.items.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-stone-400">{item.id}</td>
                      <td className="p-4">
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-200 uppercase tracking-widest">{item.status}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-stone-200">
                        {item.totalValue ? `${item.totalValue.toLocaleString()} SAR` : item.amount ? `${item.amount.toLocaleString()} SAR` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoCard>
        </DashboardSection>
      )}

      {executiveReport && (
        <ExecutiveReportPanel
          result={executiveReport}
          language={lang === "ar" ? "ar" : "en"}
          locale={locale}
          onRefresh={() => setExecutiveRefreshKey((current) => current + 1)}
        />
      )}

      <DashboardGrid variant="balanced">
        <DashboardSection title="Operational Momentum" description="Strategic flow and coordination blockers.">
          <OperationalMomentumPanel momentum={operationalMomentum} />
        </DashboardSection>
        <DashboardSection title="Regional Visibility" description="Global logistics distribution analysis.">
          <RegionalOperationsVisibility regions={regionalSummary} />
        </DashboardSection>
      </DashboardGrid>

      <DashboardGrid variant="balanced">
        <DashboardSection title="Partner Performance" description="Top branch and logistics partner auditing.">
          <div className="space-y-6">
            {partnerScorecards.map(ps => (
              <PartnerPerformanceScorecard key={ps.name} details={ps.scorecard} partnerName={ps.name} />
            ))}
          </div>
        </DashboardSection>
        <DashboardSection title="System Stability" description="Risk resilience and business continuity scores.">
          <BusinessStabilityPanel stability={executiveWorkspaceState.stability} />
        </DashboardSection>
      </DashboardGrid>

      <DashboardSection title="Customer Intelligence" description="Lifetime value and retention analytics.">
        <CustomerLifetimeValuePanel profiles={customerProfiles.slice(0, 2)} />
      </DashboardSection>

      <DashboardGrid variant="balanced">
        <DashboardSection title={t("reports.operationsRead")} description="Audit trail and financial integrity metrics.">
          <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: t("reports.metrics.audits"), value: metrics.audits },
                { label: t("reports.metrics.linkedEntries"), value: metrics.linkedEntries },
                { label: t("reports.metrics.lockedEntries"), value: metrics.lockedEntries },
                { label: t("reports.metrics.pendingEditRequests"), value: metrics.pendingEditRequests },
                { label: t("reports.metrics.profit"), value: `${(metrics.income - metrics.expense).toLocaleString()} SAR` },
                { label: t("reports.metrics.averageValue"), value: `${Math.round(metrics.averageOperationValue).toLocaleString()} SAR` },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-2xl bg-stone-950/40 border border-amber-200/5">
                  <p className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{item.label}</p>
                  <p className="mt-1 text-xl font-bold text-stone-100">{item.value}</p>
                </div>
              ))}
            </div>
          </BentoCard>
        </DashboardSection>

        <DashboardSection title={t("reports.shipmentSummary")} description="Global logistics throughput status.">
          <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50">
            <div className="space-y-4">
              {[
                { label: t("reports.inTransit"), value: metrics.inTransit },
                { label: t("reports.destination"), value: metrics.destination },
                { label: t("reports.delivered"), value: metrics.delivered },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-stone-950/40 border border-amber-200/5">
                  <p className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{item.label}</p>
                  <p className="text-2xl font-black text-amber-500">{item.value}</p>
                </div>
              ))}
            </div>
          </BentoCard>
        </DashboardSection>
      </DashboardGrid>

      <DashboardGrid variant="balanced">
        <DashboardSection title={t("reports.topCustomers")}>
          <div className="space-y-4">
            {snapshot?.topCustomers.map((customer) => (
              <BentoCard key={customer.customerId} className="p-5 border-amber-200/10 bg-stone-900/50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-stone-100">{customer.fullName}</h4>
                    <p className="text-xs text-stone-500">{customer.email}</p>
                  </div>
                  <div className="text-right text-[10px] font-black text-amber-500/70 uppercase tracking-widest">
                    {customer.dealsCount} {t("dashboardNav.deals")}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800">
                    <p className="text-[9px] font-black text-stone-600 uppercase tracking-tighter">{t("reports.labels.outstandingBalance")}</p>
                    <p className="font-bold text-stone-200 text-sm">{customer.outstandingBalance.toLocaleString()} SAR</p>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800">
                    <p className="text-[9px] font-black text-stone-600 uppercase tracking-tighter">Edit Requests</p>
                    <p className="font-bold text-stone-200 text-sm">{customer.pendingEditRequests}</p>
                  </div>
                </div>
              </BentoCard>
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title={t("reports.topExpenses")}>
          <div className="space-y-4">
            {snapshot?.topExpenseCategories.map((item) => (
              <BentoCard key={item.category} className="p-4 border-amber-200/10 bg-stone-900/50 flex justify-between items-center">
                <span className="font-black text-xs text-stone-300 uppercase tracking-widest">{item.category}</span>
                <span className="font-black text-stone-100">{Number(item.amount).toLocaleString()} SAR</span>
              </BentoCard>
            ))}
          </div>
        </DashboardSection>
      </DashboardGrid>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-12 border-t border-amber-200/5">
        <Button onClick={handleExport} variant="outline" className="h-12 rounded-2xl border-amber-200/15 bg-stone-900/50 text-stone-200 hover:text-amber-200">
          <Download className="h-4 w-4 me-2" />
          {t("common.exportCsv")}
        </Button>
        <Button onClick={handleExportPdf} variant="outline" className="h-12 rounded-2xl border-amber-200/15 bg-stone-900/50 text-stone-200 hover:text-amber-200">
          <Printer className="h-4 w-4 me-2" />
          {t("common.exportPdf")}
        </Button>
      </div>
    </DashboardPageShell>
  );
}
