import { useEffect, useMemo, useState } from "react";
import { FilePenLine, Send } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createFinancialEditRequest,
  loadFinancialEditRequests,
  loadFinancialEntries,
  updateFinancialEditRequestStatus,
} from "@/domain/accounting/service";
import { loadDeals } from "@/lib/operationsDomain";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { filterFinancialEditRequests } from "@/lib/adminOperations";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { canManageAccounting } from "@/features/auth/rbac";

export default function EditRequestsPage() {
  const { locale, t } = useI18n();
  const { profile } = useAuthSession();
  const canManageFinancialEditRequests = profile?.role ? canManageAccounting(profile.role) : false;
  const [searchParams] = useSearchParams();
  const focusDeal = searchParams.get("deal") || "";
  const focusEntry = searchParams.get("entry") || "";
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadFinancialEditRequests>>>([]);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof loadFinancialEntries>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof loadDeals>>>([]);
  const [loading, setLoading] = useState(true);
  const [requester, setRequester] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [proposedAmount, setProposedAmount] = useState("");
  const [proposedMethod, setProposedMethod] = useState("");
  const [proposedCounterparty, setProposedCounterparty] = useState("");
  const [proposedCategory, setProposedCategory] = useState("");
  const [proposedNote, setProposedNote] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [loadError, setLoadError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [requestRows, entryRows, dealRows] = await Promise.all([
        canManageFinancialEditRequests ? loadFinancialEditRequests() : Promise.resolve([]),
        loadFinancialEntries(),
        loadDeals(),
      ]);
      setRows(requestRows);
      setEntries(entryRows);
      setDeals(dealRows);
    } catch (error) {
      logOperationalError("financial_edit_requests_load", error);
      setLoadError(t("editRequests.toasts.updateError"));
      toast.error(t("editRequests.toasts.updateError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entry = entries.find((row) => row.id === focusEntry || row.entryNumber === focusEntry) || null;
  const deal = deals.find((row) => row.dealNumber === focusDeal) || null;
  const scopedRows = rows.filter((row) => (!focusDeal ? true : row.dealNumber === focusDeal));
  const visibleRows = useMemo(() => filterFinancialEditRequests(scopedRows, search, statusFilter), [scopedRows, search, statusFilter]);
  const pendingCount = useMemo(() => visibleRows.filter((row) => row.status === "pending").length, [visibleRows]);

  useEffect(() => {
    if (!entry) return;
    setProposedAmount(String(entry.amount));
    setProposedMethod(entry.method || "");
    setProposedCounterparty(entry.counterparty || "");
    setProposedCategory(entry.category || "");
    setProposedNote(entry.note || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    if (updatingId) return;
    if (!canManageFinancialEditRequests) {
      toast.error(t("editRequests.toasts.updateError"));
      return;
    }

    const current = rows.find((row) => row.id === id);
    if (!current || current.status !== "pending") {
      toast.error(t("editRequests.toasts.updateError"));
      return;
    }

    setUpdatingId(id);

    try {
      await updateFinancialEditRequestStatus(id, status, reviewNotes[id] || "");
      toast.success(
        `${status === "approved" ? t("editRequests.toasts.approved") : t("editRequests.toasts.rejected")} ${
          current.targetEntryNumber || current.financialEntryId
        }`,
      );
      setReviewNotes((currentNotes) => ({ ...currentNotes, [id]: "" }));
      await refresh();
    } catch (error: unknown) {
      logOperationalError("financial_edit_request_review", error, { id, status });
      toast.error(error instanceof Error ? error.message : t("editRequests.toasts.updateError"));
    } finally {
      setUpdatingId(null);
    }
  };

  const submit = async () => {
    if (submitting) return;
    if (!canManageFinancialEditRequests) {
      toast.error(t("editRequests.toasts.submitError"));
      return;
    }

    if (!requester.trim() || !email.trim() || !reason.trim() || !entry) {
      toast.error(t("editRequests.validation"));
      return;
    }
    const parsedAmount = Number(proposedAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t("editRequests.validation"));
      return;
    }

    setSubmitting(true);

    try {
      await createFinancialEditRequest({
        financialEntryId: entry.id,
        dealId: deal?.id,
        customerId: deal?.customerId,
        requester,
        email,
        reason,
        oldValue: {
          amount: entry.amount,
          method: entry.method,
          counterparty: entry.counterparty,
          category: entry.category,
          note: entry.note,
        },
        proposedValue: {
          amount: parsedAmount,
          method: proposedMethod,
          counterparty: proposedCounterparty,
          category: proposedCategory,
          note: proposedNote,
        },
      });

      toast.success(`${t("editRequests.toasts.submitted")} ${entry.entryNumber}`);
      setRequester("");
      setEmail("");
      setReason("");
      await refresh();
    } catch (error: unknown) {
      logOperationalError("financial_edit_request_submit", error, { financialEntryId: entry.id });
      toast.error(error instanceof Error ? error.message : t("editRequests.toasts.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const formatStatus = (status: "pending" | "approved" | "rejected") =>
    status === "approved" ? t("editRequests.approved") : status === "rejected" ? t("editRequests.rejected") : t("editRequests.pending");

  return (
    <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <BentoCard className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("editRequests.newRequest")}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold">{t("editRequests.title")}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("editRequests.description")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("editRequests.requesterName")}</Label>
            <Input value={requester} onChange={(event) => setRequester(event.target.value)} />
          </div>
          <div>
            <Label>{t("editRequests.requesterEmail")}</Label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        </div>
        <div>
          <Label>{t("editRequests.dealReference")}</Label>
          <Input value={deal?.dealNumber || focusDeal} readOnly />
        </div>
        <div>
          <Label>{t("editRequests.entryReference")}</Label>
          <Input value={entry?.entryNumber || focusEntry} readOnly />
        </div>
        {entry ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4">
                <p className="text-xs text-muted-foreground">{t("editRequests.currentValue")}</p>
                <p className="mt-2 font-medium">{entry.amount.toLocaleString()} {entry.currency}</p>
                <p className="mt-2 text-sm text-muted-foreground">{entry.method || t("editRequests.noMethod")} • {entry.counterparty || t("editRequests.noCounterparty")}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4">
                <p className="text-xs text-muted-foreground">{t("editRequests.currentDescription")}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{entry.note || t("editRequests.noDescription")}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{t("editRequests.newAmount")}</Label>
                <Input value={proposedAmount} onChange={(event) => setProposedAmount(event.target.value)} />
              </div>
              <div>
                <Label>{t("editRequests.newMethod")}</Label>
                <Input value={proposedMethod} onChange={(event) => setProposedMethod(event.target.value)} />
              </div>
              <div>
                <Label>{t("editRequests.newCounterparty")}</Label>
                <Input value={proposedCounterparty} onChange={(event) => setProposedCounterparty(event.target.value)} />
              </div>
              <div>
                <Label>{t("editRequests.newCategory")}</Label>
                <Input value={proposedCategory} onChange={(event) => setProposedCategory(event.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t("editRequests.newDescription")}</Label>
              <Textarea rows={4} value={proposedNote} onChange={(event) => setProposedNote(event.target.value)} />
            </div>
          </>
        ) : null}
        <div>
          <Label>{t("editRequests.reason")}</Label>
          <Textarea rows={6} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="gold" onClick={submit} disabled={submitting || !entry || !canManageFinancialEditRequests}>
            {submitting ? t("editRequests.submitting") : t("editRequests.submit")}
          </Button>
          {focusDeal ? (
            <Button variant="outline" asChild>
              <Link to={`/dashboard/deals?deal=${focusDeal}`}>{t("editRequests.backToDeal")}</Link>
            </Button>
          ) : null}
        </div>
      </BentoCard>

      <BentoCard className="p-0">
        <div className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-semibold">{t("editRequests.incomingTitle")}</h2>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {t("editRequests.pendingCount", { count: pendingCount })}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("editRequests.searchPlaceholder")}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "pending" | "approved" | "rejected")}
              className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">{t("editRequests.filters.all")}</option>
              <option value="pending">{t("editRequests.filters.pending")}</option>
              <option value="approved">{t("editRequests.filters.approved")}</option>
              <option value="rejected">{t("editRequests.filters.rejected")}</option>
            </select>
            <Button variant="outline" onClick={() => void refresh()}>
              {t("common.refresh")}
            </Button>
          </div>
          {loadError ? (
            <div className="mt-4 rounded-[1.25rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
              {loadError}
            </div>
          ) : null}
        </div>
        <div className="space-y-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-[1.5rem]" />
              ))}
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FilePenLine}
                title={t("editRequests.emptyTitle")}
                description={t("editRequests.emptyDescription")}
              />
            </div>
          ) : (
            visibleRows.map((row) => (
              <div key={row.id} className="border-b border-border/40 px-6 py-5 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.requestedBy}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{row.requestedByEmail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.dealNumber ? `${t("editRequests.dealReference")}: ${row.dealNumber}` : t("editRequests.withoutDeal")}
                      {row.targetEntryNumber ? ` • ${t("editRequests.entryReference")}: ${row.targetEntryNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                        row.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : row.status === "rejected"
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {formatStatus(row.status)}
                    </span>
                    <Send className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{row.reason}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                    <p className="text-xs text-muted-foreground">{t("editRequests.oldValue")}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{JSON.stringify(row.oldValue || {}, null, 2)}</p>
                  </div>
                  <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                    <p className="text-xs text-muted-foreground">{t("editRequests.proposedValue")}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{JSON.stringify(row.proposedValue || {}, null, 2)}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {row.dealNumber ? (
                    <Link to={`/dashboard/deals?deal=${row.dealNumber}`} className="text-xs font-medium text-primary hover:underline">
                      {t("editRequests.openDeal")}
                    </Link>
                  ) : null}
                  {row.financialEntryId ? (
                    <Link
                      to={`/dashboard/accounting${row.dealNumber ? `?deal=${row.dealNumber}` : ""}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t("editRequests.openAccounting")}
                    </Link>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{new Date(row.submittedAt).toLocaleString(locale)}</p>
                </div>
                {row.reviewedAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.reviewerName
                      ? t("editRequests.reviewedBy", { name: row.reviewerName, date: new Date(row.reviewedAt).toLocaleString(locale) })
                      : t("editRequests.reviewedGeneric", { date: new Date(row.reviewedAt).toLocaleString(locale) })}
                    {row.reviewNote ? ` • ${row.reviewNote}` : ""}
                  </p>
                ) : null}
                {row.status === "pending" && canManageFinancialEditRequests ? (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      rows={3}
                      value={reviewNotes[row.id] || ""}
                      onChange={(event) => setReviewNotes((currentNotes) => ({ ...currentNotes, [row.id]: event.target.value }))}
                      placeholder={t("editRequests.reviewPlaceholder")}
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="gold"
                        size="sm"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusUpdate(row.id, "approved")}
                      >
                        {updatingId === row.id ? t("editRequests.updating") : t("editRequests.approve")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusUpdate(row.id, "rejected")}
                      >
                        {t("editRequests.reject")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </BentoCard>
    </div>
  );
}
