import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDollarSign, RefreshCw, Scale, ShieldAlert, Wallet, TrendingUp, TrendingDown, History } from "lucide-react";
import { toast } from "sonner";

import BentoCard from "@/components/BentoCard";
import { ReadableInfoCard, SectionHelpBox } from "@/components/readable/ReadableCards";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SettlementVisibilityPanel } from "@/features/accounting/components/SettlementVisibilityPanel";
import { summarizeSettlementVisibility } from "@/features/accounting/lib/financeAuditPro";
import {
  approvePartnerSettlement,
  calculatePartnerSettlement,
  createPartnerSettlement,
  disputePartnerSettlement,
  loadPartnerProfiles,
  loadPartnerSettlements,
  markPartnerSettlementPaid,
} from "@/domain/accounting/partnerSettlements";
import { fetchRequests, fetchDeals } from "@/domain/operations/service";
import { generateOwnershipAccountabilityInsights } from "@/features/organization-intelligence/lib/organizationIntelligenceEngine";
import { OwnershipAccountabilityPanel } from "@/features/organization-intelligence/components/OwnershipAccountabilityPanel";
import {
  detectOperationalBlockers,
  generateCoordinationWarnings
} from "@/features/autonomous-coordination/lib/autonomousCoordinationEngine";
import { CoordinationWarningsPanel } from "@/features/autonomous-coordination/components/CoordinationWarningsPanel";
import {
  generatePartnerProfiles,
  generatePartnerSettlementInsights,
  generatePartnerTaskQueue
} from "@/features/partner-intelligence/lib/partnerIntelligenceEngine";
import { PartnerSettlementVisibilityPanel } from "@/features/partner-intelligence/components/PartnerSettlementVisibilityPanel";
import { PartnerTaskQueue } from "@/features/partner-intelligence/components/PartnerTaskQueue";
import { canManageAccounting, type LourexRole } from "@/features/auth/rbac";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getRoleDisplayName } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";
import { formatMoney as libFormatMoney } from "@/lib/currency";
import { logOperationalError } from "@/lib/monitoring";
import type { PartnerSettlementRole } from "@/types/lourex";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { OperationalRiskCenter, type OperationalRisk } from "@/features/operations-intelligence/components/OperationalRiskCenter";
import { PriorityQueueEngine } from "@/features/operations-intelligence/components/PriorityQueueEngine";
import { generateRecommendations } from "@/features/operations-intelligence/lib/operationsRecommendationEngine";
import {
  generateExecutiveWorkspaceState
} from "@/features/executive-command/lib/executiveWorkspaceEngine";
import { OperationalPressureMap } from "@/features/executive-command/components/OperationalPressureMap";
import { DashboardPageShell, DashboardSection, DashboardGrid } from "@/components/layout";
import { loadShipments } from "@/lib/operationsDomain";

type PartnerProfile = Awaited<ReturnType<typeof loadPartnerProfiles>>[number];

const defaultPeriod = () => new Date().toISOString().slice(0, 7);

export default function PartnerSettlementsPage() {
  const { profile } = useAuthSession();
  const { lang, t, locale } = useI18n();
  const canManage = profile?.role ? canManageAccounting(profile.role) : false;
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadPartnerSettlements>>>([]);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchRequests>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof fetchDeals>>>([]);
  const [shipments, setShipments] = useState<Awaited<ReturnType<typeof loadShipments>>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [period, setPeriod] = useState(defaultPeriod());
  const [commissionRate, setCommissionRate] = useState("5");

  const formatMoney = useCallback(
    (amount: number | string | null | undefined, currency?: string | null) =>
      libFormatMoney(amount, currency, lang === "ar" ? "ar" : "en"),
    [lang],
  );

  const roleLabel = useCallback(
    (role: PartnerSettlementRole | LourexRole | null | undefined) =>
      role ? getRoleDisplayName(role as LourexRole, t) : t("common.notSpecified"),
    [t],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [settlementRows, partnerRows, requestsData, dealsData, shipmentRows] = await Promise.all([
        loadPartnerSettlements(),
        loadPartnerProfiles(),
        fetchRequests(),
        fetchDeals(),
        loadShipments(),
      ]);
      setSettlements(settlementRows);
      setPartners(partnerRows);
      setRequests(requestsData);
      setDeals(dealsData);
      setShipments(shipmentRows);
      setPartnerId((current) => current || partnerRows[0]?.id || "");
    } catch (error) {
      logOperationalError("partner_settlements_load", error);
      toast.error(t("partnerSettlements.toasts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedPartner = partners.find((partner) => partner.id === partnerId) || null;
  const totals = useMemo(
    () => ({
      unpaid: settlements
        .filter((settlement) => settlement.status === "approved" || settlement.status === "pending_review")
        .reduce((sum, settlement) => sum + settlement.netDue, 0),
      paid: settlements.filter((settlement) => settlement.status === "paid").reduce((sum, settlement) => sum + settlement.netDue, 0),
      disputed: settlements.filter((settlement) => settlement.status === "disputed").length,
    }),
    [settlements],
  );

  const recommendations = useMemo(
    () => generateRecommendations([], [], settlements),
    [settlements]
  );

  const operationalRisks = useMemo<OperationalRisk[]>(() => {
    const risks: OperationalRisk[] = [];
    const pendingSettlements = settlements.filter(s => s.status === "pending_review");

    if (pendingSettlements.length > 0) {
      risks.push({
        id: "risk-settlement",
        type: "settlement",
        level: pendingSettlements.length > 2 ? "HIGH" : "MEDIUM",
        title: `${pendingSettlements.length} settlements awaiting review`,
        titleAr: `${pendingSettlements.length} طھط³ظˆظٹط§طھ ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ظ…ط±ط§ط¬ط¹ط©`,
        recommendation: "Prioritize audit of these settlements to maintain partner trust.",
        recommendationAr: "ط£ط¹ط· ط§ظ„ط£ظˆظ„ظˆظٹط© ظ„طھط¯ظ‚ظٹظ‚ ظ‡ط°ظ‡ ط§ظ„طھط³ظˆظٹط§طھ ظ„ظ„ط­ظپط§ط¸ ط¹ظ„ظ‰ ط«ظ‚ط© ط§ظ„ط´ط±ظƒط§ط،.",
      });
    }

    if (totals.disputed > 0) {
      risks.push({
        id: "risk-disputed",
        type: "bottleneck",
        level: "HIGH",
        title: `${totals.disputed} disputed settlements detected`,
        titleAr: `${totals.disputed} طھط³ظˆظٹط§طھ ظ…طھظ†ط§ط²ط¹ ط¹ظ„ظٹظ‡ط§ طھظ… ط§ظƒطھط´ط§ظپظ‡ط§`,
        recommendation: "Engage with affected partners to resolve disputes immediately.",
        recommendationAr: "طھظˆط§طµظ„ ظ…ط¹ ط§ظ„ط´ط±ظƒط§ط، ط§ظ„ظ…طھط£ط«ط±ظٹظ† ظ„ط­ظ„ ط§ظ„ظ†ط²ط§ط¹ط§طھ ظپظˆط±ط§ظ‹.",
      });
    }

    return risks;
  }, [settlements, totals.disputed]);

  const settlementVisibility = useMemo(() => summarizeSettlementVisibility(settlements), [settlements]);

  const accountabilityInsights = useMemo(() => {
    const uniqueOwners = Array.from(new Set([
      ...requests.map(r => r.customer.fullName),
      ...deals.map(d => d.turkishPartnerName),
      ...deals.map(d => d.saudiPartnerName)
    ])).filter(Boolean) as string[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return uniqueOwners.slice(0, 5).map(owner => generateOwnershipAccountabilityInsights(owner, requests as any, deals as any));
  }, [requests, deals]);

  const autonomousBlockers = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => detectOperationalBlockers(requests as any, deals as any, [], []),
    [requests, deals]
  );

  const coordinationWarnings = useMemo(
    () => generateCoordinationWarnings(autonomousBlockers, []),
    [autonomousBlockers]
  );

  const partnerProfiles = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generatePartnerProfiles(requests as any, deals as any, shipments, settlements as any),
    [requests, deals, shipments, settlements]
  );

  const activePartnerProfile = useMemo(
    () => partnerProfiles.find(p => p.id === partnerId) || partnerProfiles[0],
    [partnerProfiles, partnerId]
  );

  const partnerSettlementInsight = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => activePartnerProfile ? generatePartnerSettlementInsights(activePartnerProfile.id, settlements as any) : null,
    [activePartnerProfile, settlements]
  );

  const partnerTasks = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => activePartnerProfile ? generatePartnerTaskQueue(activePartnerProfile.id, deals as any, shipments, settlements as any) : [],
    [activePartnerProfile, deals, shipments, settlements]
  );

  const executiveWorkspaceState = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateExecutiveWorkspaceState(requests as any, deals as any, [], settlements as any, []),
    [requests, deals, settlements]
  );

  const handleCreate = async () => {
    if (!selectedPartner || submitting) return;
    setSubmitting(true);
    try {
      const partnerRole = selectedPartner.role as PartnerSettlementRole;
      const amounts = await calculatePartnerSettlement({
        partnerId: selectedPartner.id,
        partnerRole,
        settlementPeriod: period,
        commissionRate: Number(commissionRate || 0) / 100,
      });
      await createPartnerSettlement({
        partnerId: selectedPartner.id,
        partnerRole,
        settlementPeriod: period,
        ...amounts,
      });
      toast.success(t("partnerSettlements.toasts.created"));
      await refresh();
    } catch (error) {
      logOperationalError("partner_settlement_create", error, { partnerId: selectedPartner.id });
      toast.error(t("partnerSettlements.toasts.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (successMessage: string, action: () => Promise<void>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await action();
      toast.success(successMessage);
      await refresh();
    } catch (error) {
      logOperationalError("partner_settlement_action", error);
      toast.error(t("partnerSettlements.toasts.actionError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardGrid variant="main">
          <Skeleton className="h-44 rounded-[2rem]" />
          <Skeleton className="h-80 rounded-[2rem]" />
        </DashboardGrid>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell dir={lang === "ar" ? "rtl" : "ltr"}>
      <PageHelpBox pageKey="partner_settlements" role={profile?.role} />

      <DashboardSection
        title={t("partnerSettlements.title")}
        description={t("partnerSettlements.description")}
        icon={<Scale className="h-6 w-6" />}
        headerAction={
          <Button variant="outline" size="lg" onClick={() => void refresh()} className="rounded-2xl border-amber-200/10 bg-stone-900/40 text-stone-200 hover:text-amber-200 h-12 px-6">
            <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin text-amber-500")} />
            <span className="font-bold">{t("common.refresh")}</span>
          </Button>
        }
      >
        <DashboardGrid variant="kpi">
          {[
            { label: t("partnerSettlements.metrics.unpaid"), value: formatMoney(totals.unpaid), icon: Wallet, accent: "text-amber-200" },
            { label: t("partnerSettlements.metrics.paid"), value: formatMoney(totals.paid), icon: TrendingUp, accent: "text-emerald-400" },
            { label: t("partnerSettlements.metrics.disputed"), value: totals.disputed, icon: ShieldAlert, accent: totals.disputed > 0 ? "text-rose-400" : "text-stone-500" },
          ].map((item) => (
            <BentoCard key={item.label} className="p-5 border-amber-200/10 bg-stone-900/50">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{item.label}</p>
                <item.icon className={cn("h-4 w-4", item.accent)} />
              </div>
              <p className={cn("text-2xl font-black", item.accent)}>{item.value}</p>
            </BentoCard>
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardGrid variant="balanced">
        <DashboardSection title="Risk Audit" description="Settlement bottlenecks and disputed claims.">
          <OperationalRiskCenter risks={operationalRisks} />
        </DashboardSection>
        <DashboardSection title="Action Pipeline" description="Priority recommendations for financial balance.">
          <PriorityQueueEngine recommendations={recommendations} />
        </DashboardSection>
      </DashboardGrid>

      {!loading && (
        <div className="space-y-12">
           <DashboardGrid variant="balanced">
            <DashboardSection title="Partner Tasks" description="Active workload and pending coordination.">
              <PartnerTaskQueue tasks={partnerTasks} />
            </DashboardSection>
            <DashboardSection title={t("commandCenter.settlementVisibility")} description={t("commandCenter.settlementVisibilityDescription")}>
              {partnerSettlementInsight && <PartnerSettlementVisibilityPanel insight={partnerSettlementInsight} />}
            </DashboardSection>
          </DashboardGrid>

          <DashboardSection title="System Pressure" description="Operational load and branch stability mapping.">
            <OperationalPressureMap pressures={executiveWorkspaceState.pressureMap} />
          </DashboardSection>

          <DashboardGrid variant="balanced">
             <DashboardSection title={t("commandCenter.systemicCoordination")}>
              <CoordinationWarningsPanel warnings={coordinationWarnings} />
            </DashboardSection>
            <DashboardSection title="Accountability Mapping">
              <OwnershipAccountabilityPanel accountability={accountabilityInsights} />
            </DashboardSection>
          </DashboardGrid>
        </div>
      )}

      <DashboardSection title="Global Overview" description="Aggregate settlement health across all partners.">
        <SettlementVisibilityPanel summary={settlementVisibility} t={t} formatMoney={formatMoney} />
      </DashboardSection>

      {canManage && (
        <DashboardSection title={t("partnerSettlements.createTitle")} description="Generate new settlement drafts for partner review.">
          <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50">
            <SectionHelpBox title={t("partnerSettlements.pro.helpTitle")} body={t("partnerSettlements.pro.helpBody")} example={t("partnerSettlements.pro.helpExample")} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("partnerSettlements.partner")}</Label>
                <select
                  value={partnerId}
                  onChange={(event) => setPartnerId(event.target.value)}
                  className="w-full h-11 rounded-xl border border-amber-200/10 bg-stone-950/40 px-4 text-sm text-stone-100 outline-none focus:ring-1 focus:ring-amber-500/20"
                >
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id} className="bg-stone-900">
                      {partner.full_name || partner.email} ({roleLabel(partner.role)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("partnerSettlements.period")}</Label>
                <Input value={period} onChange={(event) => setPeriod(event.target.value)} className="h-11 bg-stone-950/40 border-amber-200/10 text-stone-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("partnerSettlements.commissionRate")} %</Label>
                <Input value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} className="h-11 bg-stone-950/40 border-amber-200/10 text-stone-100" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreate} disabled={!selectedPartner || submitting} className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-black text-stone-950 shadow-xl hover:brightness-110 uppercase tracking-widest">
                  {t("partnerSettlements.createDraft")}
                </Button>
              </div>
            </div>
          </BentoCard>
        </DashboardSection>
      )}

      <DashboardSection title={t("commandCenter.settlementHistory")} description={t("commandCenter.settlementHistoryDescription")}>
        <BentoCard className="p-0 border-amber-200/15 bg-stone-900/55 overflow-hidden">
          <div className="divide-y divide-amber-200/5">
            {settlements.length === 0 ? (
              <div className="p-12 text-center text-stone-600 italic">No settlements found.</div>
            ) : (
              settlements.map((settlement) => (
                <div key={settlement.id} className="p-6 hover:bg-stone-800/20 transition-colors group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="text-xs font-black text-stone-500 uppercase tracking-widest flex items-center gap-2">
                        <History className="h-3 w-3" />
                        {settlement.settlementPeriod}
                      </p>
                      <h4 className="mt-1 font-bold text-stone-100 text-lg uppercase tracking-tight">
                        {settlement.partnerName || settlement.partnerId}
                      </h4>
                      <p className="text-[10px] font-black text-stone-700 uppercase tracking-widest mt-1">{roleLabel(settlement.partnerRole)}</p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border self-start shadow-sm",
                      settlement.status === 'paid' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-200 border-amber-500/20"
                    )}>
                      {t(`statuses.${settlement.status}`)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800">
                      <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{t("partnerSettlements.gross")}</p>
                      <p className="font-bold text-stone-100">{formatMoney(settlement.grossAmount)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800">
                      <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{t("partnerSettlements.commission")}</p>
                      <p className="font-bold text-stone-100">{formatMoney(settlement.partnerCommission)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800">
                      <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{t("partnerSettlements.expenses")}</p>
                      <p className="font-bold text-rose-400">{formatMoney(settlement.expenses)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-950/40 border border-amber-500/20">
                      <p className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest mb-1">{t("partnerSettlements.netDue")}</p>
                      <p className="font-bold text-amber-200 text-lg">{formatMoney(settlement.netDue)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canManage && ["draft", "pending_review", "disputed"].includes(settlement.status) && (
                      <Button size="sm" onClick={() => runAction(t("partnerSettlements.toasts.approved"), () => approvePartnerSettlement(settlement.id))} disabled={submitting} className="h-9 rounded-lg bg-emerald-600 text-stone-950 font-bold hover:bg-emerald-500 uppercase text-[10px] tracking-widest">
                        {t("partnerSettlements.approve")}
                      </Button>
                    )}
                    {canManage && settlement.status === "approved" && (
                      <Button size="sm" onClick={() => runAction(t("partnerSettlements.toasts.paid"), () => markPartnerSettlementPaid(settlement.id))} disabled={submitting} className="h-9 rounded-lg bg-gradient-to-r from-amber-100 to-amber-700 text-stone-950 font-bold hover:brightness-110 uppercase text-[10px] tracking-widest">
                        {t("partnerSettlements.markPaid")}
                      </Button>
                    )}
                    {settlement.status !== "paid" && settlement.status !== "disputed" && (
                      <Button size="sm" variant="outline" onClick={() => runAction(t("partnerSettlements.toasts.disputed"), () => disputePartnerSettlement(settlement.id, t("partnerSettlements.dashboardDisputeReason")))} disabled={submitting} className="h-9 rounded-lg border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 uppercase text-[10px] tracking-widest">
                        {t("partnerSettlements.dispute")}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </BentoCard>
      </DashboardSection>
    </DashboardPageShell>
  );
}
