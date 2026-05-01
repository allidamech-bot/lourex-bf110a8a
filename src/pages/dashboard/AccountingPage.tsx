import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { FilePenLine, Info, Receipt, Route, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createFinancialEntry, loadFinancialEntries } from "@/domain/accounting/service";
import { buildDealStatementSummary, summarizeFinancialEntries } from "@/domain/accounting/utils";
import { loadDeals } from "@/lib/operationsDomain";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { buildAccountingEntriesCsv, downloadCsv, printPdfReport } from "@/lib/adminOperations";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { canManageAccounting } from "@/features/auth/rbac";

export default function AccountingPage() {
  const { locale, t } = useI18n();
  const { profile } = useAuthSession();
  const canCreateAccountingEntries = profile?.role ? canManageAccounting(profile.role) : false;
  const [searchParams] = useSearchParams();
  const focusDeal = searchParams.get("deal");
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof loadFinancialEntries>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof loadDeals>>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [category, setCategory] = useState("");
  const [referenceLabel, setReferenceLabel] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [entriesData, dealsData] = await Promise.all([loadFinancialEntries(), loadDeals()]);
      setEntries(entriesData);
      setDeals(dealsData);
    } catch (error) {
      logOperationalError("accounting_load", error);
      setLoadError(t("accounting.toasts.createError"));
      toast.error(t("accounting.toasts.createError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const focusedDeal = deals.find((row) => row.dealNumber === focusDeal) || null;
  const visibleEntries = entries.filter((row) => {
    if (focusDeal && row.dealNumber !== focusDeal) {
      return false;
    }

    if (!deferredSearch.trim()) {
      return true;
    }

    const normalizedSearch = deferredSearch.trim().toLowerCase();
    return [
      row.entryNumber,
      row.dealNumber,
      row.customerName,
      row.counterparty,
      row.category,
      row.referenceLabel,
      row.note,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  }, [deferredSearch, entries, focusDeal]);
  const dealEntries = visibleEntries.filter((row) => row.scope === "deal" || row.scope === "customer");
  const globalEntries = !focusDeal ? visibleEntries.filter((row) => row.scope === "global") : [];

  const totals = useMemo(() => {
    const summary = summarizeFinancialEntries(visibleEntries);
    const currencies = [...new Set(visibleEntries.map((entry) => entry.currency).filter(Boolean))];
    return {
      ...summary,
      currencyLabel: currencies.length === 1 ? currencies[0] : currencies.length > 1 ? t("accounting.mixedCurrency") : currency,
    };
  }, [currency, t, visibleEntries]);

  const dealFinancialSignal = useMemo(() => {
    if (!focusedDeal) return null;
    const referenceValue = focusedDeal.totalValue || 0;
    const variance = totals.net - referenceValue;
    return {
      referenceValue,
      variance,
      direction: variance >= 0 ? "positive" : "negative",
    };
  }, [focusedDeal, totals.net]);
  const focusedDealEntries = useMemo(
    () => visibleEntries.filter((row) => focusedDeal && row.dealId === focusedDeal.id),
    [focusedDeal, visibleEntries],
  );
  const statementSummary = useMemo(
    () => (focusedDeal ? buildDealStatementSummary(focusedDeal, focusedDealEntries) : null),
    [focusedDeal, focusedDealEntries],
  );

  const handleCreateEntry = async () => {
    if (submitting) return;
    if (!canCreateAccountingEntries) {
      toast.error(t("accounting.toasts.createError"));
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !currency.trim() || !note.trim() || !method.trim() || !counterparty.trim() || !category.trim()) {
      toast.error(t("accounting.validation"));
      return;
    }

    setSubmitting(true);

    try {
      const dealId = focusedDeal?.id;
      await createFinancialEntry({
        dealId,
        customerId: focusedDeal?.customerId || undefined,
        type,
        scope: dealId ? "deal_linked" : "global",
        amount: parsedAmount,
        currency,
        note,
        method,
        counterparty,
        category,
        entryDate,
        referenceLabel,
      });

      toast.success(
        focusDeal
          ? `${t("accounting.toasts.created")} ${focusDeal}`
          : t("accounting.toasts.created"),
      );
      setAmount("");
      setCurrency("SAR");
      setEntryDate(new Date().toISOString().slice(0, 10));
      setMethod("");
      setCounterparty("");
      setCategory("");
      setReferenceLabel("");
      setNote("");
      setType("expense");
      await refresh();
    } catch (error: unknown) {
      logOperationalError("financial_entry_create", error, { dealId: focusedDeal?.id || null });
      const message = error instanceof Error ? error.message : t("accounting.toasts.createError");
      setLoadError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (visibleEntries.length === 0) {
      const message = t("accounting.toasts.exportEmpty");
      setLoadError(message);
      toast.error(message);
      return;
    }
    const exported = downloadCsv(
      `lourex-accounting-${focusDeal || "all"}.csv`,
      buildAccountingEntriesCsv(visibleEntries, {
        entryNumber: t("requests.labels.requestNumber"),
        scope: t("common.status"),
        deal: t("accounting.scopeDeal"),
        customer: t("accounting.scopeCustomer"),
        type: t("accounting.labels.type"),
        amount: t("accounting.labels.amount"),
        currency: t("common.currency"),
        category: t("accounting.labels.category"),
        counterparty: t("accounting.counterparty"),
        date: t("accounting.labels.date"),
      }),
    );
    if (!exported) {
      const message = t("accounting.toasts.exportUnavailable");
      setLoadError(message);
      toast.error(message);
      return;
    }
    toast.success(
      focusDeal
        ? `${t("accounting.toasts.exportSuccess")} ${focusDeal}`
        : t("accounting.toasts.exportSuccess"),
    );
  };

  const handleExportPdf = () => {
    if (visibleEntries.length === 0) {
      const message = t("common.noDataToExport");
      setLoadError(message);
      toast.error(message);
      return;
    }

    const exported = printPdfReport({
      title: focusDeal ? `${t("accounting.entriesTitle")} - ${focusDeal}` : t("accounting.entriesTitle"),
      filename: `lourex-accounting-${focusDeal || "all"}.pdf`,
      appName: t("common.appName"),
      generatedAtLabel: t("common.generatedAt"),
      generatedAt: new Date().toLocaleString(locale),
      direction: locale.startsWith("ar") ? "rtl" : "ltr",
      filters: [
        [t("accounting.focusedContext"), focusDeal || t("accounting.global")],
        [t("accounting.labels.totalIncome"), `${totals.income.toLocaleString(locale)} ${totals.currencyLabel}`],
        [t("accounting.labels.totalExpense"), `${totals.expense.toLocaleString(locale)} ${totals.currencyLabel}`],
        [t("accounting.labels.net"), `${totals.net.toLocaleString(locale)} ${totals.currencyLabel}`],
      ],
      sections: [
        {
          title: t("accounting.entriesTitle"),
          headers: [
            t("requests.labels.requestNumber"),
            t("common.status"),
            t("accounting.labels.type"),
            t("accounting.labels.amount"),
            t("common.currency"),
            t("accounting.labels.category"),
            t("accounting.counterparty"),
            t("accounting.labels.date"),
          ],
          rows: visibleEntries.map((entry) => [
            entry.entryNumber,
            entry.locked ? t("accounting.locked") : t("accounting.openState"),
            entry.type === "income" ? t("accounting.typeIncome") : t("accounting.typeExpense"),
            entry.amount.toLocaleString(locale),
            entry.currency,
            entry.category || t("accounting.uncategorized"),
            entry.counterparty || t("common.notSpecified"),
            new Date(entry.entryDate).toLocaleDateString(locale),
          ]),
        },
      ],
    });

    if (!exported) {
      const message = t("common.exportFailed");
      setLoadError(message);
      toast.error(message);
      return;
    }

    toast.success(t("common.exportCompleted"));
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-[2rem]" />
        ))}
      </div>
    );
  }

  if (entries.length === 0 && deals.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title={t("accounting.emptyTitle")}
        description={t("accounting.emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <BentoCard>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold">{t("accounting.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("accounting.description")}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("accounting.focusedContext")}</p>
          <p className="mt-3 font-serif text-3xl font-bold">{focusDeal || t("accounting.global")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {focusDeal ? t("accounting.dealContext") : t("accounting.globalContext")}
          </p>
          {loadError ? (
            <div className="mt-4 rounded-[1.25rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
              {loadError}
            </div>
          ) : null}
        </BentoCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <div className="space-y-4">
          <BentoCard className="space-y-4">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl font-semibold">{t("accounting.financialSignals")}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: t("accounting.labels.totalIncome"), value: totals.income },
                { label: t("accounting.labels.totalExpense"), value: totals.expense },
                { label: t("accounting.labels.net"), value: totals.net, className: totals.net >= 0 ? "text-emerald-400" : "text-rose-400" },
                { label: t("accounting.labels.lockedEntries"), value: totals.lockedCount, hint: t("accounting.labels.totalEntries", { count: totals.count }) },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.25rem] border border-border/60 bg-secondary/15 p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${item.className || ""}`}>
                    {typeof item.value === "number" ? item.value.toLocaleString() : item.value} {item.hint ? "" : totals.currencyLabel}
                  </p>
                  {item.hint ? <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p> : null}
                </div>
              ))}
            </div>
            {focusedDeal ? (
              <div className="space-y-4">
                <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-primary/80">
                        {t("accounting.statementReadiness")}
                      </p>
                      <p className="mt-2 font-serif text-2xl font-semibold">
                        {statementSummary?.ready
                          ? t("accounting.readyForFinalReview")
                          : t("accounting.needsReviewBeforeIssue")}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      statementSummary?.ready
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-200"
                    }`}>
                      {statementSummary?.currencySummaries.length || 0}{" "}
                      {t("accounting.currencyGroupsCount")}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {statementSummary?.currencySummaries.length ? (
                      statementSummary.currencySummaries.map((item) => (
                        <div key={item.currency} className="rounded-[1.15rem] bg-background/65 p-4">
                          <p className="text-xs text-muted-foreground">{item.currency}</p>
                          <p className="mt-1 font-medium">
                            {item.net.toLocaleString()} {item.currency}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("accounting.linkedEntriesCount", { count: item.entriesCount })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.15rem] bg-background/65 p-4 text-sm text-muted-foreground">
                        {t("accounting.noLinkedEntries")}
                      </div>
                    )}
                  </div>
                  {statementSummary && statementSummary.issues.length > 0 ? (
                    <div className="mt-4 rounded-[1.15rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100">
                      {statementSummary.issues[0]}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-primary/80">{t("accounting.dealSignal")}</p>
                    <p className="mt-2 font-serif text-2xl font-semibold">{focusedDeal.dealNumber}</p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      (dealFinancialSignal?.variance || 0) >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {(dealFinancialSignal?.variance || 0) >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.15rem] bg-background/65 p-4">
                    <p className="text-xs text-muted-foreground">{t("accounting.referenceValue")}</p>
                    <p className="mt-1 font-medium">{focusedDeal.totalValue.toLocaleString()} {focusedDeal.currency}</p>
                  </div>
                  <div className="rounded-[1.15rem] bg-background/65 p-4">
                    <p className="text-xs text-muted-foreground">{t("accounting.accountingReference")}</p>
                    <p className="mt-1 font-medium">{focusedDeal.accountingReference || t("common.notSpecified")}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {totals.net >= 0 ? t("accounting.positiveSignal") : t("accounting.negativeSignal")}
                  {dealFinancialSignal ? ` ${dealFinancialSignal.variance.toLocaleString()} ${focusedDeal.currency}.` : ""}
                </p>
              </div>
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4 text-sm leading-7 text-muted-foreground">
                {t("accounting.globalHint")}
              </div>
            )}
          </BentoCard>

          <BentoCard className="space-y-4">
            <div className="flex items-center gap-3">
              <FilePenLine className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl font-semibold">{t("accounting.createTitle")}</h2>
            </div>
            <div className="rounded-[1.25rem] border border-primary/20 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Info className="h-4 w-4 text-primary" />
                {t("accounting.guidanceTitle")}
              </div>
              <ul className="list-inside list-disc space-y-1">
                <li>{t("accounting.guidance.entryPurpose")}</li>
                <li>{t("accounting.guidance.lockedMeaning")}</li>
                <li>{t("accounting.guidance.correctionPath")}</li>
              </ul>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{t("common.type")}</Label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as "income" | "expense")}
                  className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="expense">{t("accounting.typeExpense")}</option>
                  <option value="income">{t("accounting.typeIncome")}</option>
                </select>
              </div>
              <div>
                <Label>{t("common.amount")}</Label>
                <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12500" />
              </div>
              <div>
                <Label>{t("common.currency")}</Label>
                <Input value={currency} onChange={(event) => setCurrency(event.target.value)} />
              </div>
              <div>
                <Label>{t("common.date")}</Label>
                <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
              </div>
              <div>
                <Label>{t("accounting.paymentMethod")}</Label>
                <Input value={method} onChange={(event) => setMethod(event.target.value)} placeholder={t("accounting.paymentMethod")} />
              </div>
              <div>
                <Label>{t("accounting.counterparty")}</Label>
                <Input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder={t("accounting.counterparty")} />
              </div>
              <div>
                <Label>{t("common.category")}</Label>
                <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder={t("common.category")} />
              </div>
              <div>
                <Label>{t("accounting.extraReference")}</Label>
                <Input value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} placeholder={t("accounting.extraReference")} />
              </div>
            </div>
            <div>
              <Label>{t("accounting.descriptionLabel")}</Label>
              <Textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("accounting.descriptionPlaceholder")} />
            </div>
            <Button variant="gold" onClick={handleCreateEntry} disabled={submitting || !canCreateAccountingEntries}>
              {submitting ? t("accounting.creating") : t("accounting.createLocked")}
            </Button>
            <div className="rounded-[1.25rem] border border-border/60 bg-secondary/15 p-4 text-sm leading-7 text-muted-foreground">
              {t("accounting.createHint")}
            </div>
          </BentoCard>

          {focusDeal ? (
            <BentoCard className="space-y-3">
              <div className="flex items-center gap-3">
                <Route className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-semibold">{t("accounting.backToDeal")}</h2>
              </div>
              <Link
                to={`/dashboard/deals?deal=${focusDeal}`}
                className="flex items-center gap-3 rounded-[1.25rem] border border-border/60 bg-secondary/15 px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
              >
                <Route className="h-4 w-4" />
                {t("accounting.openDeal")}
              </Link>
            </BentoCard>
          ) : null}
        </div>

          <BentoCard className="p-0">
            <div className="border-b border-border/60 px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold">{t("accounting.entriesTitle")}</h2>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {t("accounting.count", { count: totals.count })}
                </span>
              </div>
              <div className="mt-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("accounting.searchPlaceholder")}
                  />
                  <Button variant="outline" onClick={() => void refresh()}>
                    {t("common.refresh")}
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    {t("common.exportCsv")}
                  </Button>
                  <Button variant="outline" onClick={handleExportPdf}>
                    {t("common.exportPdf")}
                  </Button>
                </div>
              </div>
            </div>
          <div className="space-y-0">
            {[...dealEntries, ...globalEntries].length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Receipt}
                  title={t("accounting.emptyListTitle")}
                  description={t("accounting.emptyListDescription")}
                />
              </div>
            ) : (
              [...dealEntries, ...globalEntries].map((row) => (
                <div key={row.id} className="border-b border-border/40 px-6 py-5 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.entryNumber}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.scope === "deal"
                          ? `${t("accounting.scopeDeal")}: ${row.dealNumber || t("common.notSpecified")}`
                          : row.scope === "customer"
                            ? `${t("accounting.scopeCustomer")}: ${row.customerName || t("common.notSpecified")}`
                            : t("accounting.scopeGlobal")}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {row.locked ? t("accounting.locked") : t("accounting.openState")}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-[1.15rem] bg-secondary/25 p-4">
                      <p className="text-xs text-muted-foreground">{t("accounting.labels.type")}</p>
                      <p className="mt-1 font-medium">{row.type === "income" ? t("accounting.typeIncome") : t("accounting.typeExpense")}</p>
                    </div>
                    <div className="rounded-[1.15rem] bg-secondary/25 p-4">
                      <p className="text-xs text-muted-foreground">{t("accounting.labels.amount")}</p>
                      <p className="mt-1 font-medium">{`${row.amount.toLocaleString()} ${row.currency}`}</p>
                    </div>
                    <div className="rounded-[1.15rem] bg-secondary/25 p-4">
                      <p className="text-xs text-muted-foreground">{t("accounting.labels.methodCounterparty")}</p>
                      <p className="mt-1 font-medium">{row.method || "-"} / {row.counterparty || "-"}</p>
                    </div>
                    <div className="rounded-[1.15rem] bg-secondary/25 p-4">
                      <p className="text-xs text-muted-foreground">{t("accounting.labels.date")}</p>
                      <p className="mt-1 font-medium">{new Date(row.entryDate).toLocaleDateString(locale)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{t("accounting.labels.category")}: {row.category || t("accounting.uncategorized")}</span>
                    <span>/</span>
                    <span>{t("accounting.labels.reference")}: {row.referenceLabel || t("accounting.noReference")}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{row.note || t("accounting.noNotes")}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {row.dealNumber ? (
                      <Link to={`/dashboard/deals?deal=${row.dealNumber}`} className="text-sm font-medium text-primary hover:underline">
                        {t("accounting.openDeal")}
                      </Link>
                    ) : null}
                    <Link
                      to={`/dashboard/edit-requests?deal=${row.dealNumber || focusDeal || ""}&entry=${row.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t("accounting.requestEdit")}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
