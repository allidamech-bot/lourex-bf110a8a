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
import { canManageAccounting } from "@/features/auth/rbac";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { logOperationalError } from "@/lib/monitoring";
import type { PartnerSettlementRole } from "@/types/lourex";

type PartnerProfile = Awaited<ReturnType<typeof loadPartnerProfiles>>[number];

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(amount);

const defaultPeriod = () => new Date().toISOString().slice(0, 7);

export default function PartnerSettlementsPage() {
  const { profile } = useAuthSession();
  const canManage = profile?.role ? canManageAccounting(profile.role) : false;
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadPartnerSettlements>>>([]);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [period, setPeriod] = useState(defaultPeriod());
  const [commissionRate, setCommissionRate] = useState("5");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [settlementRows, partnerRows] = await Promise.all([loadPartnerSettlements(), loadPartnerProfiles()]);
      setSettlements(settlementRows);
      setPartners(partnerRows);
      setPartnerId((current) => current || partnerRows[0]?.id || "");
    } catch (error) {
      logOperationalError("partner_settlements_load", error);
      toast.error("Unable to load partner settlements.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      const amounts = await calculatePartnerSettlement({
        partnerId: selectedPartner.id,
        partnerRole: selectedPartner.role as PartnerSettlementRole,
        settlementPeriod: period,
        commissionRate: Number(commissionRate || 0) / 100,
      });
      await createPartnerSettlement({
        partnerId: selectedPartner.id,
        partnerRole: selectedPartner.role as PartnerSettlementRole,
        settlementPeriod: period,
        ...amounts,
      });
      toast.success("Partner settlement created.");
      await refresh();
    } catch (error) {
      logOperationalError("partner_settlement_create", error, { partnerId: selectedPartner.id });
      toast.error(error instanceof Error ? error.message : "Unable to create settlement.");
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await action();
      toast.success(label);
      await refresh();
    } catch (error) {
      logOperationalError("partner_settlement_action", error);
      toast.error(error instanceof Error ? error.message : "Settlement action failed.");
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
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unpaid</p>
          <p className="mt-3 text-3xl font-bold">{formatMoney(totals.unpaid)} SAR</p>
        </BentoCard>
        <BentoCard>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paid</p>
          <p className="mt-3 text-3xl font-bold">{formatMoney(totals.paid)} SAR</p>
        </BentoCard>
        <BentoCard>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Disputed</p>
          <p className="mt-3 text-3xl font-bold">{totals.disputed}</p>
        </BentoCard>
      </div>

      {canManage ? (
        <BentoCard className="space-y-4">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-semibold">Create partner settlement</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Partner</Label>
              <select
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
                className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.full_name || partner.email} ({partner.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Settlement period</Label>
              <Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2026-04" />
            </div>
            <div>
              <Label>Commission %</Label>
              <Input value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="gold" onClick={handleCreate} disabled={!selectedPartner || submitting}>
                Create draft
              </Button>
            </div>
          </div>
        </BentoCard>
      ) : null}

      <BentoCard className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-5">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Partner settlements</h2>
            <p className="text-sm text-muted-foreground">Partners see only their own settlements. Customers cannot access this page.</p>
          </div>
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCcw className="me-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {settlements.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={CircleDollarSign} title="No settlements yet" description="Create a draft settlement when partner activity is ready for review." />
          </div>
        ) : (
          settlements.map((settlement) => (
            <div key={settlement.id} className="border-b border-border/40 px-6 py-5 last:border-b-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{settlement.partnerName || settlement.partnerId}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {settlement.partnerRole} · {settlement.settlementPeriod}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {settlement.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="mt-1 font-medium">{formatMoney(settlement.grossAmount)} SAR</p>
                </div>
                <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="mt-1 font-medium">{formatMoney(settlement.partnerCommission)} SAR</p>
                </div>
                <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="mt-1 font-medium">{formatMoney(settlement.expenses)} SAR</p>
                </div>
                <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                  <p className="text-xs text-muted-foreground">Net due</p>
                  <p className="mt-1 font-medium">{formatMoney(settlement.netDue)} SAR</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {canManage && ["draft", "pending_review", "disputed"].includes(settlement.status) ? (
                  <Button size="sm" onClick={() => runAction("Settlement approved.", () => approvePartnerSettlement(settlement.id))} disabled={submitting}>
                    <CheckCircle2 className="me-2 h-4 w-4" />
                    Approve
                  </Button>
                ) : null}
                {canManage && settlement.status === "approved" ? (
                  <Button size="sm" variant="gold" onClick={() => runAction("Settlement marked paid.", () => markPartnerSettlementPaid(settlement.id))} disabled={submitting}>
                    Mark paid
                  </Button>
                ) : null}
                {settlement.status !== "paid" && settlement.status !== "disputed" ? (
                  <Button size="sm" variant="outline" onClick={() => runAction("Settlement disputed.", () => disputePartnerSettlement(settlement.id, "Dashboard dispute"))} disabled={submitting}>
                    <ShieldAlert className="me-2 h-4 w-4" />
                    Dispute
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
