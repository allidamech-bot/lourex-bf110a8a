import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDollarSign, RefreshCcw, Scale, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  approvePartnerSettlement,
  calculatePartnerSettlement,
  createPartnerSettlement,
  disputePartnerSettlement,
  loadPartnerProfiles,
  loadPartnerSettlements,
  markPartnerSettlementPaid,
} from "@/domain/accounting/partnerSettlements";
import { canManageAccounting, type LourexRole } from "@/features/auth/rbac";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getRoleDisplayName } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import type { PartnerSettlementRole } from "@/types/lourex";

type PartnerProfile = Awaited<ReturnType<typeof loadPartnerProfiles>>[number];

const defaultPeriod = () => new Date().toISOString().slice(0, 7);

export default function PartnerSettlementsPage() {
  const { profile } = useAuthSession();
  const { lang, t } = useI18n();
  const canManage = profile?.role ? canManageAccounting(profile.role) : false;
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadPartnerSettlements>>>([]);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
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
      const [settlementRows, partnerRows] = await Promise.all([loadPartnerSettlements(), loadPartnerProfiles()]);
      setSettlements(settlementRows);
      setPartners(partnerRows);
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
      <div className="grid gap-4 xl:grid-cols-3">
        <BentoCard>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("partnerSettlements.metrics.unpaid")}</p>
          <p className="mt-3 text-3xl font-bold">{formatMoney(totals.unpaid)} SAR</p>
        </BentoCard>
        <BentoCard>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("partnerSettlements.metrics.paid")}</p>
          <p className="mt-3 text-3xl font-bold">{formatMoney(totals.paid)} SAR</p>
        </BentoCard>
        <BentoCard>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("partnerSettlements.metrics.disputed")}</p>
          <p className="mt-3 text-3xl font-bold">{totals.disputed}</p>
        </BentoCard>
      </div>

      {canManage ? (
        <BentoCard className="space-y-4">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-semibold">{t("partnerSettlements.createTitle")}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>{t("partnerSettlements.partner")}</Label>
              <select
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
                className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.full_name || partner.email} ({roleLabel(partner.role)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("partnerSettlements.period")}</Label>
              <Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2026-04" />
            </div>
            <div>
              <Label>{t("partnerSettlements.commissionRate")}</Label>
              <Input value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="gold" onClick={handleCreate} disabled={!selectedPartner || submitting}>
                {t("partnerSettlements.createDraft")}
              </Button>
            </div>
          </div>
        </BentoCard>
      ) : null}

      <BentoCard className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-5">
          <div>
            <h2 className="font-serif text-2xl font-semibold">{t("partnerSettlements.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("partnerSettlements.description")}</p>
          </div>
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCcw className="me-2 h-4 w-4" />
            {t("common.refresh")}
          </Button>
        </div>

        {settlements.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={CircleDollarSign} title={t("partnerSettlements.emptyTitle")} description={t("partnerSettlements.emptyDescription")} />
          </div>
        ) : (
          settlements.map((settlement) => (
            <div key={settlement.id} className="border-b border-border/40 px-6 py-5 last:border-b-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{settlement.partnerName || settlement.partnerId}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {roleLabel(settlement.partnerRole)} · {settlement.settlementPeriod}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {t(`statuses.${settlement.status}`)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  { label: t("partnerSettlements.gross"), value: settlement.grossAmount },
                  { label: t("partnerSettlements.commission"), value: settlement.partnerCommission },
                  { label: t("partnerSettlements.expenses"), value: settlement.expenses },
                  { label: t("partnerSettlements.netDue"), value: settlement.netDue },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.15rem] bg-secondary/20 p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 font-medium">{formatMoney(item.value)} SAR</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {canManage && ["draft", "pending_review", "disputed"].includes(settlement.status) ? (
                  <Button size="sm" onClick={() => runAction(t("partnerSettlements.toasts.approved"), () => approvePartnerSettlement(settlement.id))} disabled={submitting}>
                    <CheckCircle2 className="me-2 h-4 w-4" />
                    {t("partnerSettlements.approve")}
                  </Button>
                ) : null}
                {canManage && settlement.status === "approved" ? (
                  <Button size="sm" variant="gold" onClick={() => runAction(t("partnerSettlements.toasts.paid"), () => markPartnerSettlementPaid(settlement.id))} disabled={submitting}>
                    {t("partnerSettlements.markPaid")}
                  </Button>
                ) : null}
                {settlement.status !== "paid" && settlement.status !== "disputed" ? (
                  <Button size="sm" variant="outline" onClick={() => runAction(t("partnerSettlements.toasts.disputed"), () => disputePartnerSettlement(settlement.id, t("partnerSettlements.dashboardDisputeReason")))} disabled={submitting}>
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
