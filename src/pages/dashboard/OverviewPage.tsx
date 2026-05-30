import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  PackageSearch,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { GlassPanel } from "@/components/ui/GlassPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ProductionFallbackCard, ProductionSectionSkeleton } from "@/components/production/ProductionFallbacks";
import { ReadableMetricCard } from "@/components/readable/ReadableCards";
import { TimelineFlow } from "@/components/timeline/TimelineFlow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { buildOperationsAdvisor } from "@/features/ai-ops/advisors/operationsAdvisor";
import { loadAvailableSettlements } from "@/features/ai-ops/services/aiOpsService";
import type { EventSystemDataset } from "@/features/event-system/types/eventTypes";
import type { WorkflowIntelligenceDataset } from "@/features/workflow-intelligence/types/workflowTypes";
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
import { logOperationalError } from "@/lib/monitoring";
import type { PartnerSettlement } from "@/types/lourex";
import { OperationsHealthCenter } from "@/features/operations-intelligence/components/OperationsHealthCenter";
import { PriorityQueueEngine } from "@/features/operations-intelligence/components/PriorityQueueEngine";
import { type OperationalRisk } from "@/features/operations-intelligence/components/OperationalRiskCenter";
import { DailyOperationsBriefing } from "@/features/operations-intelligence/components/DailyOperationsBriefing";
import { generateRecommendations } from "@/features/operations-intelligence/lib/operationsRecommendationEngine";
import {
  generateBranchProfiles,
  generateTeamWorkloadInsights,
  generateCrossBranchExecutiveSummary
} from "@/features/organization-intelligence/lib/organizationIntelligenceEngine";
import { BranchPerformanceCenter } from "@/features/organization-intelligence/components/BranchPerformanceCenter";
import { CrossBranchExecutiveSummary } from "@/features/organization-intelligence/components/CrossBranchExecutiveSummary";
import {
  generateAutonomousOperationsPlan,
  analyzeOperationalMomentum,
  generateSuggestedNextActions
} from "@/features/autonomous-coordination/lib/autonomousCoordinationEngine";
import { AutonomousOperationsPlan } from "@/features/autonomous-coordination/components/AutonomousOperationsPlan";
import { OperationalMomentumPanel } from "@/features/autonomous-coordination/components/OperationalMomentumPanel";
import {
  generatePartnerProfiles
} from "@/features/partner-intelligence/lib/partnerIntelligenceEngine";
import { PartnerIntelligenceDashboard } from "@/features/partner-intelligence/components/PartnerIntelligenceDashboard";
import {
  generateCustomerProfiles,
  generateCustomerSuccessAlerts
} from "@/features/customer-success-intelligence/lib/customerSuccessEngine";
import { CustomerSuccessDashboard } from "@/features/customer-success-intelligence/components/CustomerSuccessDashboard";
import { CustomerRetentionAlerts } from "@/features/customer-success-intelligence/components/CustomerRetentionAlerts";
import { ExecutiveCommandSection } from "@/components/executive/ExecutiveCommandSection";
import {
  generateExecutiveWorkspaceState
} from "@/features/executive-command/lib/executiveWorkspaceEngine";
import { CriticalActionQueue } from "@/features/executive-command/components/CriticalActionQueue";
import { OperationalPressureMap } from "@/features/executive-command/components/OperationalPressureMap";
import { BusinessStabilityPanel } from "@/features/executive-command/components/BusinessStabilityPanel";
import { ExecutiveMomentumTracker } from "@/features/executive-command/components/ExecutiveMomentumTracker";
import { CrossSystemInsightsPanel } from "@/features/executive-command/components/CrossSystemInsightsPanel";
import { CommandPriorityMatrix } from "@/features/executive-command/components/CommandPriorityMatrix";
import { DashboardPageShell, DashboardSection, DashboardGrid } from "@/components/layout";

const AIOperationsCenter = React.lazy(() =>
  import("@/features/ai-ops/components/AIOperationsCenter").then((module) => ({ default: module.AIOperationsCenter })),
);
const WorkflowIntelligenceCenter = React.lazy(() =>
  import("@/features/workflow-intelligence/components/WorkflowIntelligenceCenter"),
);
const OperationsEventCenter = React.lazy(() =>
  import("@/features/event-system/components/OperationsEventCenter"),
);
const RuntimeInfrastructureCenter = React.lazy(() =>
  import("@/features/runtime-infra/components/RuntimeInfrastructureCenter"),
);
const DistributedRuntimeCenter = React.lazy(() =>
  import("@/features/distributed-runtime/components/DistributedRuntimeCenter"),
);
const AutonomousExecutionCenter = React.lazy(() =>
  import("@/features/execution-runtime/components/AutonomousExecutionCenter"),
);
const CognitiveOperationsCenter = React.lazy(() =>
  import("@/features/cognitive-ops/components/CognitiveOperationsCenter"),
);
const MultiAgentOperationsCenter = React.lazy(() =>
  import("@/features/agent-fabric/components/MultiAgentOperationsCenter"),
);

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

const ProductionLazySection = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary fallback={<ProductionFallbackCard kind="lazyError" />}>
    <React.Suspense fallback={<ProductionSectionSkeleton />}>{children}</React.Suspense>
  </ErrorBoundary>
);

type DashboardRequests = Awaited<ReturnType<typeof fetchRequests>>;
type DashboardDeals = Awaited<ReturnType<typeof fetchDeals>>;
type DashboardShipments = Awaited<ReturnType<typeof fetchShipments>>;
type DashboardEditRequests = Awaited<ReturnType<typeof fetchFinancialEditRequests>>;
type DashboardFinancialEntries = Awaited<ReturnType<typeof fetchFinancialEntries>>;

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
  const [settlements, setSettlements] = useState<PartnerSettlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const canReadAccountingManagement = profile?.role ? canManageAccounting(profile.role) : false;
        const [requestsDomain, dealsDomain, shipmentsDomain, auditCount, editsDomain, financialEntriesDomain, settlementRows] = await Promise.all([
          fetchRequests(),
          fetchDeals(),
          fetchShipments(),
          fetchAuditCount(),
          canReadAccountingManagement ? fetchFinancialEditRequests() : Promise.resolve([]),
          canReadAccountingManagement ? fetchFinancialEntries() : Promise.resolve([]),
          canReadAccountingManagement ? loadAvailableSettlements() : Promise.resolve([]),
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
        setSettlements(settlementRows);
      } catch (error) {
        logOperationalError("dashboard_overview_load", error, { role: profile?.role });
        setMetrics({ requests: 0, deals: 0, shipments: 0, audits: 0, financialEntries: 0 });
        setRequests([]);
        setDeals([]);
        setRecentRequests([]);
        setShipments([]);
        setEditRequests([]);
        setFinancialEntries([]);
        setSettlements([]);
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

  const aiOpsResult = useMemo(
    () =>
      buildOperationsAdvisor(
        {
          shipments,
          deals,
          financialEntries,
          financialEditRequests: editRequests,
          settlements,
        },
        lang === "ar" ? "ar" : "en",
      ),
    [deals, editRequests, financialEntries, lang, settlements, shipments],
  );

  const workflowIntelligenceDataset = useMemo<WorkflowIntelligenceDataset>(
    () => ({
      requests,
      shipments,
      deals,
      financialEntries,
      financialEditRequests: editRequests,
      settlements,
    }),
    [deals, editRequests, financialEntries, requests, settlements, shipments],
  );

  const eventSystemDataset = useMemo<EventSystemDataset>(
    () => workflowIntelligenceDataset,
    [workflowIntelligenceDataset],
  );

  const deliverySummary = useMemo(
    () => ({
      active: shipments.filter((item) => item.stage !== "delivered" && item.stage !== "closed").length,
      delivered: shipments.filter((item) => item.stage === "delivered" || item.stage === "closed").length,
    }),
    [shipments],
  );

  const recommendations = useMemo(
    () => generateRecommendations(deals, requests, settlements),
    [deals, requests, settlements]
  );

  const branchProfiles = useMemo(
    () => generateBranchProfiles(requests, deals, financialEntries),
    [requests, deals, financialEntries]
  );

  const teamWorkloads = useMemo(
    () => generateTeamWorkloadInsights(requests, deals),
    [requests, deals]
  );

  const executiveSummary = useMemo(
    () => generateCrossBranchExecutiveSummary(branchProfiles, teamWorkloads),
    [branchProfiles, teamWorkloads]
  );

  const autonomousPlan = useMemo(
    () => generateAutonomousOperationsPlan(requests as any, deals as any, financialEntries as any, editRequests as any),
    [requests, deals, financialEntries, editRequests]
  );

  const operationalMomentum = useMemo(
    () => analyzeOperationalMomentum(requests as any, deals as any, autonomousPlan.blockers),
    [requests, deals, autonomousPlan.blockers]
  );

  const nextBestActions = useMemo(
    () => generateSuggestedNextActions(autonomousPlan, operationalMomentum),
    [autonomousPlan, operationalMomentum]
  );

  const partnerProfiles = useMemo(
    () => generatePartnerProfiles(requests as any, deals as any, shipments as any, settlements as any),
    [requests, deals, shipments, settlements]
  );

  const customerProfiles = useMemo(
    () => generateCustomerProfiles(requests as any, deals as any, financialEntries as any),
    [requests, deals, financialEntries]
  );

  const customerAlerts = useMemo(
    () => generateCustomerSuccessAlerts(customerProfiles),
    [customerProfiles]
  );

  const executiveWorkspaceState = useMemo(
    () => generateExecutiveWorkspaceState(requests as any, deals as any, financialEntries as any, settlements as any, editRequests as any),
    [requests, deals, financialEntries, settlements, editRequests]
  );

  const pendingEditRequests = editRequests.filter((item) => item.status === "pending").length;

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

  const metricCards: MetricCard[] = [
    {
      label: t("overview.metrics.requests"),
      value: metrics.requests,
      icon: ClipboardList,
      helper: t("overview.reviewDescription"),
      accent: "from-amber-500/20 to-amber-200/5 text-amber-200 ring-amber-500/20",
    },
    {
      label: t("overview.metrics.deals"),
      value: metrics.deals,
      icon: PackageSearch,
      helper: t("overview.readyDescription"),
      accent: "from-amber-500/20 to-amber-200/5 text-amber-200 ring-amber-500/20",
    },
    {
      label: t("overview.activeShipments"),
      value: metrics.shipments,
      icon: Truck,
      helper: t("overview.currentOpsDescription"),
      accent: "from-amber-500/20 to-amber-200/5 text-amber-200 ring-amber-500/20",
    },
    {
      label: t("reports.metrics.linkedEntries"),
      value: metrics.financialEntries,
      icon: WalletCards,
      helper: t("overview.editDescription"),
      accent: "from-amber-500/20 to-amber-200/5 text-amber-200 ring-amber-500/20",
    },
  ];

  return (
    <DashboardPageShell dir={lang === "ar" ? "rtl" : "ltr"}>
      <PageHelpBox pageKey="dashboard_overview" role={profile?.role} />

      {/* 1. Executive Health Bar */}
      <DashboardSection
        eyebrow="Momentum Tracker"
        title="Executive Command"
        description="Real-time systemic health and strategic oversight nodes."
        icon={<LayoutDashboard className="h-8 w-8" />}
        headerAction={
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase text-stone-600 tracking-[0.2em]">System Trend</p>
              <div className="flex items-center gap-2 justify-end text-emerald-400 font-black">
                <ArrowUpRight className="h-3 w-3" />
                {executiveWorkspaceState.momentum.trend}
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.location.reload()}
              disabled={loading}
              className="rounded-2xl border-amber-200/10 bg-stone-900/40 text-stone-200 hover:text-amber-200 hover:bg-stone-800 transition-all shadow-xl backdrop-blur-md h-14"
            >
              <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin text-amber-500")} />
              <span className="font-bold">Sync System</span>
            </Button>
          </div>
        }
      >
        <DashboardGrid variant="kpi">
          <HealthCard label="Business Health" value={executiveWorkspaceState.stability.score} status={executiveWorkspaceState.stability.state} icon={<ShieldCheck className="h-4 w-4" />} />
          <HealthCard label="Operations" value={executiveWorkspaceState.stability.operationalResilience} icon={<Truck className="h-4 w-4" />} />
          <HealthCard label="Financial" value={executiveWorkspaceState.stability.financeResilience} icon={<Receipt className="h-4 w-4" />} />
          <HealthCard label="Customer" value={customerProfiles[0]?.healthScore || 85} icon={<Users className="h-4 w-4" />} />
          <HealthCard label="Partner" value={partnerProfiles[0]?.performanceScore || 90} icon={<ArrowUpRight className="h-4 w-4" />} />
        </DashboardGrid>
      </DashboardSection>

      {/* KPI Command Row */}
      <DashboardGrid variant="kpi">
        {(loading ? loadingCards : (metricCards as MetricCard[])).map((item, index) => {
          const cardItem = loading ? null : item as MetricCard;
          return (
            <div key={loading ? index : cardItem!.label}>
              {loading ? (
                <BentoCard delay={index * 0.05} className="rounded-2xl p-5">
                  <div className="space-y-4">
                    <Skeleton className="h-11 w-11 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <Skeleton className="h-8 w-20" style={{ background: "rgba(255,255,255,0.04)" }} />
                    <Skeleton className="h-4 w-28" style={{ background: "rgba(255,255,255,0.03)" }} />
                  </div>
                </BentoCard>
              ) : cardItem ? (
                <ReadableMetricCard
                  label={cardItem.label}
                  value={cardItem.value.toLocaleString(locale)}
                  helper={cardItem.helper}
                  icon={cardItem.icon}
                  className="h-full"
                />
              ) : null}
            </div>
          );
        })}
      </DashboardGrid>

      {isInternal && !loading && (
        <div className="space-y-16">
          {/* 2. Critical Actions Center */}
          <DashboardSection
            eyebrow="Critical Path Analysis"
            title="Strategic Interventions"
            description="Unresolved bottlenecks requiring immediate executive intervention."
          >
            <CriticalActionQueue actions={executiveWorkspaceState.criticalActions.slice(0, 5)} />
          </DashboardSection>

          {/* 3. Operations + Finance */}
          <DashboardGrid variant="balanced">
            <ExecutiveCommandSection
              title="Operations Command"
              description="Logistics throughput and coordination."
              icon={<Truck className="h-5 w-5" />}
              secondaryWidgets={
                <div className="space-y-6">
                  <OperationalMomentumPanel momentum={operationalMomentum} />
                  <PriorityQueueEngine recommendations={recommendations} />
                  <OperationalPressureMap pressures={executiveWorkspaceState.pressureMap} />
                </div>
              }
            >
              <div className="space-y-6">
                <AutonomousOperationsPlan plan={autonomousPlan} />
                <OperationsHealthCenter
                  activeRequests={requests.filter(r => r.status !== "completed" && r.status !== "cancelled").length}
                  pendingOperations={deals.filter(d => d.operationalStatus !== "delivered" && d.operationalStatus !== "closed").length}
                  inTransitCount={shipments.filter(s => s.stage === "in_transit").length}
                  delayedCount={deliverySummary.active}
                  blockedWorkflows={pendingEditRequests}
                  completionScore={85}
                />
              </div>
            </ExecutiveCommandSection>

            <ExecutiveCommandSection
              title="Financial Command"
              description="AI-audited accounting and settlement integrity."
              icon={<Receipt className="h-5 w-5" />}
              secondaryWidgets={
                <div className="space-y-6">
                  <ProductionLazySection>
                    <WorkflowIntelligenceCenter dataset={workflowIntelligenceDataset} language={lang === "ar" ? "ar" : "en"} locale={locale} />
                  </ProductionLazySection>
                  <ProductionLazySection>
                    <OperationsEventCenter dataset={eventSystemDataset} language={lang === "ar" ? "ar" : "en"} locale={locale} />
                  </ProductionLazySection>
                </div>
              }
            >
              <div className="space-y-6">
                <ProductionLazySection>
                  <AIOperationsCenter result={aiOpsResult} language={lang === "ar" ? "ar" : "en"} locale={locale} />
                </ProductionLazySection>
                <div className="grid grid-cols-2 gap-4">
                  <ReadableMetricCard label="Locked Entries" value={metrics.financialEntries} icon={ShieldCheck} className="h-32" />
                  <ReadableMetricCard label="Pending Audits" value={pendingEditRequests} icon={Clock3} className="h-32" />
                </div>
              </div>
            </ExecutiveCommandSection>
          </DashboardGrid>

          {/* 4. Customers + Partners */}
          <DashboardGrid variant="balanced">
            <ExecutiveCommandSection
              title="Customer Command"
              description="Retention risk and success modeling."
              icon={<ClipboardList className="h-5 w-5" />}
              defaultExpanded={false}
              secondaryWidgets={
                <div className="space-y-6">
                   <CustomerRetentionAlerts alerts={customerAlerts.slice(0, 5)} />
                   <BentoCard className="rounded-[2rem] p-0 border-amber-200/10 bg-stone-900/50">
                    <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-amber-200/10">
                      <h3 className="font-serif text-lg font-bold text-stone-100">Live Activity</h3>
                      <Clock3 className="h-4 w-4 text-stone-600" />
                    </div>
                    <div className="px-6 pb-6 pt-4">
                      {recentActivity.length > 0 ? (
                        <TimelineFlow
                          items={recentActivity.map((item) => ({
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            timestamp: new Date(item.date).toLocaleTimeString(),
                            icon: item.icon,
                            status: "default",
                          }))}
                        />
                      ) : (
                        <div className="py-8 text-center text-sm text-stone-500">{t("overview.noRequests")}</div>
                      )}
                    </div>
                  </BentoCard>
                </div>
              }
            >
              <div className="space-y-6">
                <CustomerSuccessDashboard profiles={customerProfiles.slice(0, 3)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {[
                    { label: t("overview.quickReview"), to: "/dashboard/requests" },
                    { label: t("overview.quickDeals"), to: "/dashboard/deals" },
                  ].map((item) => (
                    <Link key={item.label} to={item.to} className="p-4 rounded-2xl bg-stone-950/40 border border-amber-200/5 text-xs font-bold text-stone-400 hover:border-amber-200/20 transition-all flex items-center justify-between group">
                      {item.label}
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            </ExecutiveCommandSection>

            <ExecutiveCommandSection
              title="Partner Command"
              description="Ecosystem performance and regional health."
              icon={<Users className="h-5 w-5" />}
              defaultExpanded={false}
              secondaryWidgets={
                <div className="space-y-6">
                  <CrossBranchExecutiveSummary summary={executiveSummary} />
                  <BranchPerformanceCenter branches={branchProfiles} />
                </div>
              }
            >
              <div className="space-y-6">
                <PartnerIntelligenceDashboard partners={partnerProfiles.slice(0, 3)} />
                <DailyOperationsBriefing
                  stats={{
                    activeShipments: metrics.shipments,
                    delayedOps: deliverySummary.active,
                    pendingReviews: requestSummary.review,
                    settlementAlerts: settlements.filter(s => s.status === "pending_review").length,
                  }}
                />
              </div>
            </ExecutiveCommandSection>
          </DashboardGrid>

          {/* 5. Advanced Intelligence */}
          <ExecutiveCommandSection
            title="Advanced Intelligence"
            description="Deep correlate analysis and experimental systemic nodes."
            icon={<Sparkles className="h-5 w-5" />}
            defaultExpanded={false}
          >
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-2">
                <CommandPriorityMatrix priorities={executiveWorkspaceState.priorityMatrix} />
                <CrossSystemInsightsPanel insights={executiveWorkspaceState.insights} />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <BusinessStabilityPanel stability={executiveWorkspaceState.stability} />
                </div>
                <div className="lg:col-span-2">
                  <ExecutiveMomentumTracker momentum={executiveWorkspaceState.momentum} />
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-amber-200/5">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-stone-600 text-center">Experimental Autonomous Fabric</h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  <ProductionLazySection>
                    <RuntimeInfrastructureCenter dataset={eventSystemDataset} language={lang === "ar" ? "ar" : "en"} locale={locale} />
                  </ProductionLazySection>
                  <ProductionLazySection>
                    <CognitiveOperationsCenter dataset={eventSystemDataset} language={lang === "ar" ? "ar" : "en"} locale={locale} />
                  </ProductionLazySection>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                  <ProductionLazySection>
                    <DistributedRuntimeCenter dataset={eventSystemDataset} language={lang === "ar" ? "ar" : "en"} locale={locale} />
                  </ProductionLazySection>
                  <ProductionLazySection>
                    <AutonomousExecutionCenter dataset={eventSystemDataset} language={lang === "ar" ? "ar" : "en"} locale={locale} />
                  </ProductionLazySection>
                  <ProductionLazySection>
                    <MultiAgentOperationsCenter dataset={eventSystemDataset} language={lang === "ar" ? "ar" : "en"} locale={locale} />
                  </ProductionLazySection>
                </div>
              </div>
            </div>
          </ExecutiveCommandSection>
        </div>
      )}
    </DashboardPageShell>
  );
}

const HealthCard = ({ label, value, status, icon }: { label: string; value: number; status?: string; icon: React.ReactNode }) => (
  <GlassPanel className="p-6 border-white/5 shadow-2xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{label}</p>
    <div className="mt-4 flex items-end justify-between">
      <h3 className="text-3xl font-black text-white">{value}%</h3>
      {status && (
        <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          {status}
        </span>
      )}
    </div>
    <Progress value={value} className="h-1 mt-4 bg-white/5" indicatorClassName={cn(
      value > 80 ? "bg-emerald-500" : value > 50 ? "bg-amber-500" : "bg-rose-500"
    )} />
  </GlassPanel>
);
