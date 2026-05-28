import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDollarSign, RefreshCcw, Scale, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import BentoCard from "@/components/BentoCard";
import { ReadableInfoCard, ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
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
import { logOperationalError } from "@/lib/monitoring";
import type { PartnerSettlementRole } from "@/types/lourex";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { OperationalRiskCenter, type OperationalRisk } from "@/features/operations-intelligence/components/OperationalRiskCenter";
import { PriorityQueueEngine } from "@/features/operations-intelligence/components/PriorityQueueEngine";
import { generateRecommendations } from "@/features/operations-intelligence/lib/operationsRecommendationEngine";

type PartnerProfile = Awaited<ReturnType<typeof loadPartnerProfiles>>[number];

const defaultPeriod = () => new Date().toISOString().slice(0, 7);

export default function PartnerSettlementsPage() {
  const { profile } = useAuthSession();
  const { lang, t } = useI18n();
  const canManage = profile?.role ? canManageAccounting(profile.role) : false;
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadPartnerSettlements>>>([]);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [period, setPeriod] = useState(defaultPeriod());
  const [commissionRate, setCommissionRate] = useState("5");

  const formatMoney = useCallback(
    (amount: number) => new Intl.NumberFormat(lang === "ar" ? "ar" : "en", { maximumFractionDigits: 2 }).format(amount),
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
        titleAr: `${pendingSettlements.length} تسويات بانتظار المراجعة`,
        recommendation: "Prioritize audit of these settlements to maintain partner trust.",
        recommendationAr: "أعط الأولوية لتدقيق هذه التسويات للحفاظ على ثقة الشركاء.",
      });
    }

    if (totals.disputed > 0) {
      risks.push({
        id: "risk-disputed",
        type: "bottleneck",
        level: "HIGH",
        title: `${totals.disputed} disputed settlements detected`,
        titleAr: `${totals.disputed} تسويات متنازع عليها تم اكتشافها`,
        recommendation: "Engage with affected partners to resolve disputes immediately.",
        recommendationAr: "تواصل مع الشركاء المتأثرين لحل النزاعات فوراً.",
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

    return uniqueOwners.slice(0, 5).map(owner => generateOwnershipAccountabilityInsights(owner, requests as any, deals as any));
  }, [requests, deals]);

  const autonomousBlockers = useMemo(
    () => detectOperationalBlockers(requests as any, deals as any, [], []),
    [requests, deals]
  );

  const coordinationWarnings = useMemo(
    () => generateCoordinationWarnings(autonomousBlockers, []),
    [autonomousBlockers]
  );

  const partnerProfiles = useMemo(
    () => generatePartnerProfiles(requests as any, deals as any, shipments, settlements as any),
    [requests, deals, shipments, settlements]
  );

  const activePartnerProfile = useMemo(
    () => partnerProfiles.find(p => p.id === partnerId) || partnerProfiles[0],
    [partnerProfiles, partnerId]
  );

  const partnerSettlementInsight = useMemo(
    () => activePartnerProfile ? generatePartnerSettlementInsights(activePartnerProfile.id, settlements as any) : null,
    [activePartnerProfile, settlements]
  );

  const partnerTasks = useMemo(
    () => activePartnerProfile ? generatePartnerTaskQueue(activePartnerProfile.id, deals as any, shipments, settlements as any) : [],
    [activePartnerProfile, deals, shipments, settlements]
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
      <div className="grid gap-4">
        <Skeleton className="h-44 rounded-[2rem]" />
        <Skeleton className="h-80 rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHelpBox pageKey="partner_settlements" role={profile?.role} />

      <div className="grid gap-4 xl:grid-cols-2">
        <OperationalRiskCenter risks={operationalRisks} />
        <PriorityQueueEngine recommendations={recommendations} />
      </div>

      {!loading && (
        <div className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <PartnerTaskQueue tasks={partnerTasks} />
            {partnerSettlementInsight && <PartnerSettlementVisibilityPanel insight={partnerSettlementInsight} />}
          </div>
          <CoordinationWarningsPanel warnings={coordinationWarnings} />
          <OwnershipAccountabilityPanel accountability={accountabilityInsights} />
        </div>
      )}

      <ResponsiveInfoGrid min="minmax(min(100%, 11rem), 1fr)">
        <ReadableMetricCard label={t("partnerSettlements.metrics.unpaid")} value={`${formatMoney(totals.unpaid)} SAR`} />
        <ReadableMetricCard label={t("partnerSettlements.metrics.paid")} value={`${formatMoney(totals.paid)} SAR`} />
        <ReadableMetricCard label={t("partnerSettlements.metrics.disputed")} value={totals.disputed.toLocaleString(lang)} />
      </ResponsiveInfoGrid>

      <SettlementVisibilityPanel summary={settlementVisibility} t={t} formatMoney={formatMoney} />

      {canManage ? (
        <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-amber-500" />
            <h2 className="font-serif text-2xl font-semibold text-stone-100">{t("partnerSettlements.createTitle")}</h2>
          </div>
          <SectionHelpBox title={t("partnerSettlements.pro.helpTitle")} body={t("partnerSettlements.pro.helpBody")} example={t("partnerSettlements.pro.helpExample")} />
          <div className="grid gap-4 md:grid-cols-[minmax(12rem,1.2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto]">
            <div>
              <Label className="text-stone-300">{t("partnerSettlements.partner")}</Label>
              <select
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
                className="mt-2 flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none"
              >
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id} className="bg-stone-900">
                    {partner.full_name || partner.email} ({roleLabel(partner.role)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-stone-300">{t("partnerSettlements.period")}</Label>
              <Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2026-04" className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
            </div>
            <div>
              <Label className="text-stone-300">{t("partnerSettlements.commissionRate")}</Label>
              <Input value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={!selectedPartner || submitting} className="w-full bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110">
                {t("partnerSettlements.createDraft")}
              </Button>
            </div>
          </div>
        </BentoCard>
      ) : null}

      <BentoCard className="p-0 border-amber-200/15 bg-stone-900/55 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/10 px-6 py-5">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-stone-100">{t("partnerSettlements.title")}</h2>
            <p className="text-sm text-stone-400 font-medium">{t("partnerSettlements.description")}</p>
          </div>
          <Button variant="outline" onClick={() => void refresh()} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
            <RefreshCcw className={`me-2 h-4 w-4 ${loading ? 'animate-spin text-amber-500' : 'text-amber-500'}`} />
            {t("common.refresh")}
          </Button>
        </div>

        {settlements.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={CircleDollarSign} title={t("partnerSettlements.emptyTitle")} description={t("partnerSettlements.emptyDescription")} className="bg-transparent border-0" />
          </div>
        ) : (
          settlements.map((settlement) => (
            <div key={settlement.id} className="border-b border-amber-200/10 px-6 py-5 last:border-b-0 hover:bg-stone-800/30 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-stone-100 uppercase tracking-tight">{settlement.partnerName || settlement.partnerId}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    {roleLabel(settlement.partnerRole)} · {settlement.settlementPeriod}
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest shadow-sm">
                  {t(`statuses.${settlement.status}`)}
                </span>
              </div>

              <ResponsiveInfoGrid className="mt-4" min="minmax(min(100%, 11rem), 1fr)">
                {[
                  { label: t("partnerSettlements.gross"), value: settlement.grossAmount },
                  { label: t("partnerSettlements.commission"), value: settlement.partnerCommission },
                  { label: t("partnerSettlements.expenses"), value: settlement.expenses },
                  { label: t("partnerSettlements.netDue"), value: settlement.netDue },
                ].map((item) => (
                  <ReadableInfoCard key={item.label} label={item.label} value={`${formatMoney(item.value)} SAR`} />
                ))}
              </ResponsiveInfoGrid>

              <div className="mt-4 flex flex-wrap gap-2">
                {canManage && ["draft", "pending_review", "disputed"].includes(settlement.status) ? (
                  <Button size="sm" onClick={() => runAction(t("partnerSettlements.toasts.approved"), () => approvePartnerSettlement(settlement.id))} disabled={submitting} className="bg-emerald-600 text-stone-950 font-bold hover:bg-emerald-500">
                    <CheckCircle2 className="me-2 h-4 w-4" />
                    {t("partnerSettlements.approve")}
                  </Button>
                ) : null}
                {canManage && settlement.status === "approved" ? (
                  <Button size="sm" onClick={() => runAction(t("partnerSettlements.toasts.paid"), () => markPartnerSettlementPaid(settlement.id))} disabled={submitting} className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110">
                    {t("partnerSettlements.markPaid")}
                  </Button>
                ) : null}
                {settlement.status !== "paid" && settlement.status !== "disputed" ? (
                  <Button size="sm" variant="outline" onClick={() => runAction(t("partnerSettlements.toasts.disputed"), () => disputePartnerSettlement(settlement.id, t("partnerSettlements.dashboardDisputeReason")))} disabled={submitting} className="border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20">
                    <ShieldAlert className="me-2 h-4 w-4" />
                    {t("partnerSettlements.dispute")}
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </BentoCard>
    </div>
  );
}
