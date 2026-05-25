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
  getFinancialOperationErrorMessage,
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
  const fieldLabel = (key: string) => {
    switch (key) {
      case "amount":
        return t("editRequests.fields.amount");
      case "method":
        return t("editRequests.fields.method");
      case "counterparty":
        return t("editRequests.fields.counterparty");
      case "category":
        return t("editRequests.fields.category");
      case "note":
        return t("editRequests.fields.note");
      default:
        return key;
    }
  };

  const formatEditValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return t("editRequests.emptyValue");
    }

    if (typeof value === "number") {
      return value.toLocaleString(locale);
    }

    if (typeof value === "boolean") {
      return value ? t("common.yes") : t("common.no");
    }

    return String(value);
  };

  const renderEditValueSummary = (value: Record<string, unknown>) => {
    const entries = Object.entries(value || {});

    if (entries.length === 0) {
      return <p className="mt-2 text-sm text-muted-foreground">{t("editRequests.emptyValue")}</p>;
    }

    return (
      <dl className="mt-3 grid gap-2 text-sm">
        {entries.map(([key, currentValue]) => (
          <div key={key} className="grid gap-1 rounded-[0.9rem] bg-background/45 px-3 py-2 sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">{fieldLabel(key)}</dt>
            <dd className="font-medium text-foreground">{formatEditValue(currentValue)}</dd>
          </div>
        ))}
      </dl>
    );
  };

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
      toast.error(getFinancialOperationErrorMessage(error));
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
    if (!entry.locked) {
      toast.error(t("editRequests.lockedRequired"));
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
      toast.error(getFinancialOperationErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const formatStatus = (status: "pending" | "approved" | "rejected") =>
    status === "approved" ? t("editRequests.approved") : status === "rejected" ? t("editRequests.rejected") : t("editRequests.pending");

  return (
    <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <BentoCard className="space-y-5 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
        <div>
          <p className="whitespace-normal text-[10px] font-bold uppercase tracking-widest text-stone-500">{t("editRequests.newRequest")}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-stone-100">{t("editRequests.title")}</h2>
          <p className="mt-3 text-sm leading-7 text-stone-400 font-medium">{t("editRequests.description")}</p>
        </div>
        <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-7 text-stone-400">
          <p className="font-bold text-amber-200 uppercase tracking-wide">{t("editRequests.lockedGuidanceTitle")}</p>
          <p className="mt-1 font-medium">{t("editRequests.lockedGuidanceDescription")}</p>
          {entry && !entry.locked ? (
            <p className="mt-3 rounded-[1rem] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-100 font-bold">
              {t("editRequests.unlockedEntryNotice")}
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-stone-300">{t("editRequests.requesterName")}</Label>
            <Input value={requester} onChange={(event) => setRequester(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
          </div>
          <div>
            <Label className="text-stone-300">{t("editRequests.requesterEmail")}</Label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
          </div>
        </div>
        <div>
          <Label className="text-stone-300">{t("editRequests.dealReference")}</Label>
          <Input value={deal?.dealNumber || focusDeal} readOnly className="bg-stone-950/40 border-amber-200/10 text-stone-100 opacity-80" />
        </div>
        <div>
          <Label className="text-stone-300">{t("editRequests.entryReference")}</Label>
          <Input value={entry?.entryNumber || focusEntry} readOnly className="bg-stone-950/40 border-amber-200/10 text-stone-100 opacity-80" />
        </div>
        {entry ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-amber-200/10 bg-stone-950/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("editRequests.currentValue")}</p>
                <p className="mt-2 font-bold text-stone-200">{entry.amount.toLocaleString()} {entry.currency}</p>
                <p className="mt-2 text-xs text-stone-500 font-medium">{entry.method || t("editRequests.noMethod")} / {entry.counterparty || t("editRequests.noCounterparty")}</p>
              </div>
              <div className="rounded-[1.25rem] border border-amber-200/10 bg-stone-950/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("editRequests.currentDescription")}</p>
                <p className="mt-2 text-sm leading-7 text-stone-400 font-medium">{entry.note || t("editRequests.noDescription")}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-stone-300">{t("editRequests.newAmount")}</Label>
                <Input value={proposedAmount} onChange={(event) => setProposedAmount(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("editRequests.newMethod")}</Label>
                <Input value={proposedMethod} onChange={(event) => setProposedMethod(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("editRequests.newCounterparty")}</Label>
                <Input value={proposedCounterparty} onChange={(event) => setProposedCounterparty(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("editRequests.newCategory")}</Label>
                <Input value={proposedCategory} onChange={(event) => setProposedCategory(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
            </div>
            <div>
              <Label className="text-stone-300">{t("editRequests.newDescription")}</Label>
              <Textarea rows={4} value={proposedNote} onChange={(event) => setProposedNote(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
            </div>
          </>
        ) : null}
        <div>
          <Label className="text-stone-300">{t("editRequests.reason")}</Label>
          <Textarea rows={6} value={reason} onChange={(event) => setReason(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={submit} disabled={submitting || !entry || !entry.locked || !canManageFinancialEditRequests} className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110">
            {submitting ? t("editRequests.submitting") : t("editRequests.submit")}
          </Button>
          {focusDeal ? (
            <Button variant="outline" asChild className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
              <Link to={`/dashboard/deals?deal=${focusDeal}`}>{t("editRequests.backToDeal")}</Link>
            </Button>
          ) : null}
        </div>
      </BentoCard>

      <BentoCard className="p-0 border-amber-200/15 bg-stone-900/55 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="border-b border-amber-200/10 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-semibold text-stone-100">{t("editRequests.incomingTitle")}</h2>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest">
              {t("editRequests.pendingCount", { count: pendingCount })}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("editRequests.searchPlaceholder")}
              className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "pending" | "approved" | "rejected")}
              className="h-11 rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none"
            >
              <option value="all" className="bg-stone-900">{t("editRequests.filters.all")}</option>
              <option value="pending" className="bg-stone-900">{t("editRequests.filters.pending")}</option>
              <option value="approved" className="bg-stone-900">{t("editRequests.filters.approved")}</option>
              <option value="rejected" className="bg-stone-900">{t("editRequests.filters.rejected")}</option>
            </select>
            <Button variant="outline" onClick={() => void refresh()} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
              {t("common.refresh")}
            </Button>
          </div>
          {loadError ? (
            <div className="mt-4 rounded-[1.25rem] border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
              {loadError}
            </div>
          ) : null}
        </div>
        <div className="space-y-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-[1.5rem] bg-stone-950/40" />
              ))}
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FilePenLine}
                title={t("editRequests.emptyTitle")}
                description={t("editRequests.emptyDescription")}
                className="bg-transparent border-0"
              />
            </div>
          ) : (
            visibleRows.map((row) => (
              <div key={row.id} className="border-b border-amber-200/10 px-6 py-5 last:border-b-0 hover:bg-stone-800/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-stone-200 uppercase tracking-tight">{row.requestedBy}</p>
                    <p className="mt-1 text-xs text-stone-500 font-medium">{row.requestedByEmail}</p>
                    <p className="mt-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                      {row.dealNumber ? `${t("editRequests.dealReference")}: ${row.dealNumber}` : t("editRequests.withoutDeal")}
                      {row.targetEntryNumber ? ` / ${t("editRequests.entryReference")}: ${row.targetEntryNumber}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                        row.status === "approved"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : row.status === "rejected"
                            ? "border-red-500/20 bg-red-500/10 text-red-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {formatStatus(row.status)}
                    </span>
                    <Send className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-stone-400 font-medium">{row.reason}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.15rem] border border-amber-200/10 bg-stone-950/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("editRequests.oldValue")}</p>
                    {renderEditValueSummary(row.oldValue || {})}
                  </div>
                  <div className="rounded-[1.15rem] border border-amber-200/10 bg-stone-950/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("editRequests.proposedValue")}</p>
                    {renderEditValueSummary(row.proposedValue || {})}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {row.dealNumber ? (
                    <Link to={`/dashboard/deals?deal=${row.dealNumber}`} className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">
                      {t("editRequests.openDeal")}
                    </Link>
                  ) : null}
                  {row.financialEntryId ? (
                    <Link
                      to={`/dashboard/accounting${row.dealNumber ? `?deal=${row.dealNumber}` : ""}`}
                      className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      {t("editRequests.openAccounting")}
                    </Link>
                  ) : null}
                  <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest ml-auto">{new Date(row.submittedAt).toLocaleString(locale)}</p>
                </div>
                {row.reviewedAt ? (
                  <p className="mt-2 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                    {row.reviewerName
                      ? t("editRequests.reviewedBy", { name: row.reviewerName, date: new Date(row.reviewedAt).toLocaleString(locale) })
                      : t("editRequests.reviewedGeneric", { date: new Date(row.reviewedAt).toLocaleString(locale) })}
                    {row.reviewNote ? ` / ${row.reviewNote}` : ""}
                  </p>
                ) : null}
                {row.status === "pending" && canManageFinancialEditRequests ? (
                  <div className="mt-4 space-y-3 pt-4 border-t border-amber-200/10">
                    <Textarea
                      rows={3}
                      value={reviewNotes[row.id] || ""}
                      onChange={(event) => setReviewNotes((currentNotes) => ({ ...currentNotes, [row.id]: event.target.value }))}
                      placeholder={t("editRequests.reviewPlaceholder")}
                      className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20"
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusUpdate(row.id, "approved")}
                        className="bg-emerald-600 text-stone-950 font-bold hover:bg-emerald-500"
                      >
                        {updatingId === row.id ? t("editRequests.updating") : t("editRequests.approve")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusUpdate(row.id, "rejected")}
                        className="border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20"
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
