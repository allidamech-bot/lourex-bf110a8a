import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { FilePenLine, Info, Loader2, Receipt, Route, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createFinancialEntry, getFinancialOperationErrorMessage, loadFinancialEditRequests, loadFinancialEntries } from "@/domain/accounting/service";
import { loadPartnerSettlements } from "@/domain/accounting/partnerSettlements";
import { generateBranchProfiles, generateBranchFinancialSummary } from "@/features/organization-intelligence/lib/organizationIntelligenceEngine";
import { BranchFinancialSummary } from "@/features/organization-intelligence/components/BranchFinancialSummary";
import { buildDealStatementSummary, summarizeFinancialEntries } from "@/domain/accounting/utils";
import { FinanceAuditProPanel } from "@/features/accounting/components/FinanceAuditProPanel";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import {
  analyzeFinancialRisk,
  buildFinanceAuditCsv,
  prepareFinanceAuditExportRows,
} from "@/features/accounting/lib/financeAuditPro";
import { loadDeals } from "@/lib/operationsDomain";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { buildAccountingEntriesCsv, downloadCsv, printPdfReport } from "@/lib/adminOperations";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { canManageAccounting } from "@/features/auth/rbac";
import { getAiReplyText, invokeLourexAi } from "@/lib/aiClient";

type FinanceAiContext = {
  focusDeal: string | null;
  riskState?: string;
  riskFlags?: string[];
  pendingEditRequests?: number;
  totals: {
    income: number;
    expense: number;
    net: number;
    lockedCount: number;
    count: number;
    currencyLabel: string;
  };
  entries: Array<{
    entryNumber: string;
    dealNumber?: string | null;
    customerName?: string | null;
    scope: string;
    type: string;
    amount: number;
    currency: string;
    locked: boolean;
    category?: string | null;
    counterparty?: string | null;
    note?: string | null;
    entryDate: string;
  }>;
};

type FinanceAiMode = "finance_audit_review" | "customer_balance_review" | "settlement_review" | "accounting_risk_briefing";

const buildLocalFinanceReview = (context: FinanceAiContext, lang: string) => {
  const incomplete = context.entries.filter(
    (entry) => !entry.dealNumber && entry.scope !== "global" || !entry.category || !entry.counterparty || !entry.note,
  );
  const highValue = context.entries.filter((entry) => entry.amount >= 50_000);

  return lang === "ar"
    ? [
        "مراجعة مالية إرشادية",
        `- عدد القيود ضمن النطاق: ${context.totals.count}`,
        `- القيود الناقصة أو الضعيفة: ${incomplete.length}`,
        `- قيود عالية القيمة تحتاج مراجعة: ${highValue.length}`,
        `- القيود المقفلة: ${context.totals.lockedCount}. أي تصحيح يجب أن يمر عبر طلب تعديل، وليس تعديلا مباشرا.`,
        "- توصية: تحقق من ربط الصفقة/العميل، وصف القيد، الطرف المقابل، والفئة قبل إصدار أي كشف نهائي.",
      ].join("\n")
    : [
        "Advisory finance review",
        `- Entries in scope: ${context.totals.count}`,
        `- Incomplete or weak entries: ${incomplete.length}`,
        `- High-value entries needing review: ${highValue.length}`,
        `- Locked entries: ${context.totals.lockedCount}. Corrections should go through edit requests, not direct mutation.`,
        "- Recommendation: verify deal/customer links, entry notes, counterparty, and category before issuing any final statement.",
      ].join("\n");
};

export default function AccountingPage() {
  const { lang, locale, t } = useI18n();
  const { profile } = useAuthSession();
  const canCreateAccountingEntries = profile?.role ? canManageAccounting(profile.role) : false;
  const [searchParams] = useSearchParams();
  const focusDeal = searchParams.get("deal");
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof loadFinancialEntries>>>([]);
  const [editRequests, setEditRequests] = useState<Awaited<ReturnType<typeof loadFinancialEditRequests>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof loadDeals>>>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
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
  const [aiReview, setAiReview] = useState("");
  const [aiReviewTitle, setAiReviewTitle] = useState("");
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [entriesData, editRequestData, dealsData, settlementsData] = await Promise.all([
        loadFinancialEntries(),
        loadFinancialEditRequests(),
        loadDeals(),
        loadPartnerSettlements(),
      ]);
      setEntries(entriesData);
      setEditRequests(editRequestData);
      setDeals(dealsData);
      setSettlements(settlementsData);
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
  const visibleEditRequests = useMemo(
    () =>
      editRequests.filter((request) => {
        if (focusDeal && request.dealNumber !== focusDeal) return false;
        const visibleEntryIds = new Set(visibleEntries.map((entry) => entry.id));
        return request.financialEntryId ? visibleEntryIds.has(request.financialEntryId) : true;
      }),
    [editRequests, focusDeal, visibleEntries],
  );
  const financeRiskAnalysis = useMemo(
    () => analyzeFinancialRisk(visibleEntries, visibleEditRequests),
    [visibleEditRequests, visibleEntries],
  );

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

  const financeAiContext = useMemo<FinanceAiContext>(
    () => ({
      focusDeal,
      riskState: financeRiskAnalysis.state,
      riskFlags: financeRiskAnalysis.riskFlags,
      pendingEditRequests: financeRiskAnalysis.pendingEditRequests,
      totals,
      entries: visibleEntries.slice(0, 20).map((entry) => ({
        entryNumber: entry.entryNumber,
        dealNumber: entry.dealNumber,
        customerName: entry.customerName,
        scope: entry.scope,
        type: entry.type,
        amount: entry.amount,
        currency: entry.currency,
        locked: entry.locked,
        category: entry.category,
        counterparty: entry.counterparty,
        note: entry.note,
        entryDate: entry.entryDate,
      })),
    }),
    [financeRiskAnalysis, focusDeal, totals, visibleEntries],
  );

  const branchProfiles = useMemo(
    () => generateBranchProfiles([], deals as any, entries as any),
    [deals, entries]
  );

  const branchFinancialSummaries = useMemo(
    () => branchProfiles.map(b => generateBranchFinancialSummary(b.id, entries as any, settlements as any)),
    [branchProfiles, entries, settlements]
  );

  const handleFinanceAiReview = async (mode: FinanceAiMode = "finance_audit_review") => {
    if (aiReviewLoading) return;

    setAiReviewTitle(t(`accounting.pro.aiActions.${mode}`));
    setAiReviewLoading(true);
    setAiUsedFallback(false);

    try {
      const responseLanguage = lang === "ar" ? "Arabic" : "English";
      const { data, error } = await invokeLourexAi({
        lang,
        area: "finance_ai_audit_review",
        context: { focusDeal, mode },
        body: {
          message:
            lang === "ar"
              ? "راجع القيود المالية الحالية باللغة العربية فقط دون تعديل أي بيانات."
              : "Review the current financial entries in English only without modifying any data.",
          messages: [],
          pageContext: "dashboard_accounting",
          route: window.location.pathname,
          locale,
          language: lang,
          responseLanguage,
          languageInstruction: `Respond in ${responseLanguage} only.`,
          userRole: profile?.role,
          analysisMode: mode,
          financeContext: financeAiContext,
        },
      });

      if (error) throw error;
      const reply = getAiReplyText(data);
      if (!reply) throw new Error("Empty finance audit review");
      setAiReview(reply);
    } catch (error) {
      logOperationalError("finance_ai_audit_review", error, { focusDeal });
      setAiUsedFallback(true);
      setAiReview(buildLocalFinanceReview(financeAiContext, lang));
    } finally {
      setAiReviewLoading(false);
    }
  };

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
      const message = getFinancialOperationErrorMessage(error);
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

  const handleExportAuditCsv = () => {
    if (visibleEntries.length === 0) {
      const message = t("accounting.toasts.exportEmpty");
      setLoadError(message);
      toast.error(message);
      return;
    }

    const exported = downloadCsv(
      `lourex-finance-audit-${focusDeal || "all"}.csv`,
      buildFinanceAuditCsv(prepareFinanceAuditExportRows(visibleEntries, visibleEditRequests)),
    );

    if (!exported) {
      const message = t("accounting.toasts.exportUnavailable");
      setLoadError(message);
      toast.error(message);
      return;
    }

    toast.success(t("accounting.pro.auditExported"));
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
    <div className="w-full max-w-full min-w-0 space-y-4">
      <PageHelpBox pageKey="accounting" role={profile?.role} />
      <div className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <BentoCard className="border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="break-words font-serif text-2xl font-semibold text-stone-100">{t("accounting.title")}</h2>
              <p className="break-words text-sm text-stone-400">{t("accounting.description")}</p>
            </div>
          </div>
        </BentoCard>

        <BentoCard className="border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
          <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-widest text-stone-500">{t("accounting.focusedContext")}</p>
          <p className="mt-3 break-words font-serif text-2xl font-bold text-stone-100 sm:text-3xl">{focusDeal || t("accounting.global")}</p>
          <p className="mt-2 break-words text-sm text-stone-500 font-medium">
            {focusDeal ? t("accounting.dealContext") : t("accounting.globalContext")}
          </p>
          {loadError ? (
            <div className="mt-4 rounded-[1.25rem] border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
              {loadError}
            </div>
          ) : null}
        </BentoCard>
      </div>

      <div className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <div className="min-w-0 space-y-4">
          {!loading && !focusDeal && (
            <BranchFinancialSummary summaries={branchFinancialSummaries} />
          )}
          <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <div className="flex min-w-0 items-center gap-3">
              <Receipt className="h-5 w-5 text-amber-500" />
              <h2 className="min-w-0 break-words font-serif text-2xl font-semibold text-stone-100">{t("accounting.financialSignals")}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
              {[
                { label: t("accounting.labels.totalIncome"), value: totals.income },
                { label: t("accounting.labels.totalExpense"), value: totals.expense },
                { label: t("accounting.labels.net"), value: totals.net, className: totals.net >= 0 ? "text-emerald-400" : "text-rose-400" },
                { label: t("accounting.labels.lockedEntries"), value: totals.lockedCount, hint: t("accounting.labels.totalEntries", { count: totals.count }) },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-[1.25rem] border border-amber-200/10 bg-stone-950/40 p-4">
                  <p className="break-words text-[10px] uppercase tracking-wider font-bold text-stone-600">{item.label}</p>
                  <p className={`mt-2 break-words text-2xl font-bold ${item.className || "text-stone-100"}`}>
                    {typeof item.value === "number" ? item.value.toLocaleString() : item.value} {item.hint ? "" : totals.currencyLabel}
                  </p>
                  {item.hint ? <p className="mt-1 text-[10px] uppercase tracking-widest text-stone-600 font-bold">{item.hint}</p> : null}
                </div>
              ))}
            </div>
            {focusedDeal ? (
              <div className="space-y-4">
                <div className="rounded-[1.35rem] border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold">
                        {t("accounting.statementReadiness")}
                      </p>
                      <p className="mt-2 break-words font-serif text-2xl font-semibold text-stone-100">
                        {statementSummary?.ready
                          ? t("accounting.readyForFinalReview")
                          : t("accounting.needsReviewBeforeIssue")}
                      </p>
                    </div>
                    <span className={`max-w-full self-start break-words rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      statementSummary?.ready
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-200 border border-amber-500/20"
                    }`}>
                      {statementSummary?.currencySummaries.length || 0}{" "}
                      {t("accounting.currencyGroupsCount")}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {statementSummary?.currencySummaries.length ? (
                      statementSummary.currencySummaries.map((item) => (
                        <div key={item.currency} className="rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                          <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{item.currency}</p>
                          <p className="mt-1 font-bold text-stone-200">
                            {item.net.toLocaleString()} {item.currency}
                          </p>
                          <p className="mt-1 text-[10px] text-stone-600 font-medium">
                            {t("accounting.linkedEntriesCount", { count: item.entriesCount })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4 text-sm text-stone-600 font-medium text-center">
                        {t("accounting.noLinkedEntries")}
                      </div>
                    )}
                  </div>
                  {statementSummary && statementSummary.issues.length > 0 ? (
                    <div className="mt-4 rounded-[1.15rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-200">
                      {statementSummary.issues[0]}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[1.35rem] border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold">{t("accounting.dealSignal")}</p>
                    <p className="mt-2 break-words font-serif text-2xl font-semibold text-stone-100">{focusedDeal.dealNumber}</p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      (dealFinancialSignal?.variance || 0) >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {(dealFinancialSignal?.variance || 0) >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{t("accounting.referenceValue")}</p>
                    <p className="mt-1 break-words font-bold text-stone-200">{focusedDeal.totalValue.toLocaleString()} {focusedDeal.currency}</p>
                  </div>
                  <div className="rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{t("accounting.accountingReference")}</p>
                    <p className="mt-1 break-words font-bold text-stone-200">{focusedDeal.accountingReference || t("common.notSpecified")}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-400 font-medium">
                  {totals.net >= 0 ? t("accounting.positiveSignal") : t("accounting.negativeSignal")}
                  {dealFinancialSignal ? ` ${dealFinancialSignal.variance.toLocaleString()} ${focusedDeal.currency}.` : ""}
                </p>
              </div>
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-950/20 p-4 text-sm leading-7 text-stone-500 text-center">
                {t("accounting.globalHint")}
              </div>
            )}

            <FinanceAuditProPanel analysis={financeRiskAnalysis} t={t} locale={locale} />
          </BentoCard>

          <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <h2 className="break-words font-serif text-2xl font-semibold text-stone-100">
                    {lang === "ar" ? "مراجعة مالية بالذكاء الاصطناعي" : "AI finance audit review"}
                  </h2>
                  <p className="mt-1 break-words text-sm leading-6 text-stone-500 font-medium">
                    {lang === "ar" ? "مراجعة إرشادية فقط ولا تنشئ أو تعدل قيودا مالية." : "Read-only review. It never creates or edits financial entries."}
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline" disabled={aiReviewLoading} onClick={() => void handleFinanceAiReview("finance_audit_review")} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                {aiReviewLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin text-amber-500" /> : <Sparkles className="me-2 h-4 w-4 text-amber-500" />}
                {lang === "ar" ? "راجع القيود" : "Review entries"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["customer_balance_review", "settlement_review", "accounting_risk_briefing"] as const).map((mode) => (
                <Button key={mode} type="button" variant="outline" size="sm" disabled={aiReviewLoading} onClick={() => void handleFinanceAiReview(mode)} className="border-amber-200/15 bg-stone-50/5 text-stone-200 hover:bg-stone-50/10">
                  {t(`accounting.pro.aiActions.${mode}`)}
                </Button>
              ))}
            </div>
            {aiUsedFallback ? (
              <div className="rounded-[1rem] border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
                {lang === "ar" ? "مساعد LOUREX AI غير متاح الآن. تم استخدام مراجعة محلية." : "LOUREX AI is unavailable right now. A local review was used."}
              </div>
            ) : null}
            {aiReviewTitle ? <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70">{aiReviewTitle}</p> : null}
            {aiReview ? (
              <pre className="max-h-[24rem] whitespace-pre-wrap break-words rounded-[1rem] border border-amber-200/10 bg-stone-950/40 p-4 font-sans text-sm leading-7 text-stone-300 shadow-inner">
                {aiReview}
              </pre>
            ) : null}
          </BentoCard>

          <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <div className="flex min-w-0 items-center gap-3">
              <FilePenLine className="h-5 w-5 text-amber-500" />
              <h2 className="min-w-0 break-words font-serif text-2xl font-semibold text-stone-100">{t("accounting.createTitle")}</h2>
            </div>
            <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-7 text-stone-400">
              <div className="mb-2 flex items-center gap-2 font-bold text-amber-200 uppercase tracking-wide">
                <Info className="h-4 w-4 text-amber-500" />
                {t("accounting.guidanceTitle")}
              </div>
              <ul className="list-inside list-disc space-y-1 font-medium">
                <li>{t("accounting.guidance.entryPurpose")}</li>
                <li>{t("accounting.guidance.lockedMeaning")}</li>
                <li>{t("accounting.guidance.correctionPath")}</li>
              </ul>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-stone-300">{t("common.type")}</Label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as "income" | "expense")}
                  className="mt-2 flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none"
                >
                  <option value="expense" className="bg-stone-900">{t("accounting.typeExpense")}</option>
                  <option value="income" className="bg-stone-900">{t("accounting.typeIncome")}</option>
                </select>
              </div>
              <div>
                <Label className="text-stone-300">{t("common.amount")}</Label>
                <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12500" className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("common.currency")}</Label>
                <Input value={currency} onChange={(event) => setCurrency(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("common.date")}</Label>
                <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("accounting.paymentMethod")}</Label>
                <Input value={method} onChange={(event) => setMethod(event.target.value)} placeholder={t("accounting.paymentMethod")} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("accounting.counterparty")}</Label>
                <Input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder={t("accounting.counterparty")} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("common.category")}</Label>
                <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder={t("common.category")} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
              <div>
                <Label className="text-stone-300">{t("accounting.extraReference")}</Label>
                <Input value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} placeholder={t("accounting.extraReference")} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
              </div>
            </div>
            <div>
              <Label className="text-stone-300">{t("accounting.descriptionLabel")}</Label>
              <Textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("accounting.descriptionPlaceholder")} className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20" />
            </div>
            <Button className="w-full sm:w-auto bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110" onClick={handleCreateEntry} disabled={submitting || !canCreateAccountingEntries}>
              {submitting ? t("accounting.creating") : t("accounting.createLocked")}
            </Button>
            <div className="rounded-[1.25rem] border border-amber-200/10 bg-stone-950/40 p-4 text-sm leading-7 text-stone-500 font-medium">
              {t("accounting.createHint")}
            </div>
          </BentoCard>

          {focusDeal ? (
            <BentoCard className="space-y-3 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-3">
                <Route className="h-5 w-5 text-amber-500" />
                <h2 className="font-serif text-2xl font-semibold text-stone-100">{t("accounting.backToDeal")}</h2>
              </div>
              <Link
                to={`/dashboard/deals?deal=${focusDeal}`}
                className="flex min-w-0 items-center gap-3 rounded-[1.25rem] border border-amber-200/10 bg-stone-950/40 px-4 py-4 text-sm font-bold text-stone-300 transition-colors hover:border-amber-500/25 hover:text-amber-200 group"
              >
                <Route className="h-4 w-4 text-stone-600 group-hover:text-amber-500" />
                <span className="min-w-0 break-words">{t("accounting.openDeal")}</span>
              </Link>
            </BentoCard>
          ) : null}
        </div>

          <BentoCard className="p-0 border-amber-200/15 bg-stone-900/55 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="border-b border-amber-200/10 px-6 py-5">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="break-words font-serif text-2xl font-semibold text-stone-100">{t("accounting.entriesTitle")}</h2>
                <span className="max-w-full self-start break-words rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest">
                  {t("accounting.count", { count: totals.count })}
                </span>
              </div>
              <div className="mt-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("accounting.searchPlaceholder")}
                    className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20"
                  />
                  <Button variant="outline" onClick={() => void refresh()} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                    {t("common.refresh")}
                  </Button>
                  <Button variant="outline" onClick={handleExport} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                    {t("common.exportCsv")}
                  </Button>
                  <Button variant="outline" onClick={handleExportPdf} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                    {t("common.exportPdf")}
                  </Button>
                  <Button variant="outline" onClick={handleExportAuditCsv} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                    {t("accounting.pro.exportAuditCsv")}
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
                  className="bg-transparent border-0"
                />
              </div>
            ) : (
              [...dealEntries, ...globalEntries].map((row) => (
                <div key={row.id} className="border-b border-amber-200/10 px-4 py-5 last:border-b-0 sm:px-6 hover:bg-stone-800/30 transition-colors">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-stone-100 uppercase tracking-wide">{row.entryNumber}</p>
                      <p className="mt-1 text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                        {row.scope === "deal"
                          ? `${t("accounting.scopeDeal")}: ${row.dealNumber || t("common.notSpecified")}`
                          : row.scope === "customer"
                            ? `${t("accounting.scopeCustomer")}: ${row.customerName || t("common.notSpecified")}`
                            : t("accounting.scopeGlobal")}
                      </p>
                    </div>
                    <span className={`max-w-full break-words rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      row.locked
                      ? "bg-amber-500/10 text-amber-200 border border-amber-500/20"
                      : "bg-stone-800 text-stone-400 border border-stone-700"
                    }`}>
                      {row.locked ? t("accounting.locked") : t("accounting.openState")}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
                    <div className="min-w-0 rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                      <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{t("accounting.labels.type")}</p>
                      <p className={`mt-1 break-words font-bold ${row.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{row.type === "income" ? t("accounting.typeIncome") : t("accounting.typeExpense")}</p>
                    </div>
                    <div className="min-w-0 rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                      <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{t("accounting.labels.amount")}</p>
                      <p className="mt-1 break-words font-bold text-stone-100">{`${row.amount.toLocaleString()} ${row.currency}`}</p>
                    </div>
                    <div className="min-w-0 rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                      <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{t("accounting.labels.methodCounterparty")}</p>
                      <p className="mt-1 break-words font-medium text-stone-200">{row.method || "-"} / {row.counterparty || "-"}</p>
                    </div>
                    <div className="min-w-0 rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                      <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{t("accounting.labels.date")}</p>
                      <p className="mt-1 break-words font-medium text-stone-200">{new Date(row.entryDate).toLocaleDateString(locale)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    <span>{t("accounting.labels.category")}: {row.category || t("accounting.uncategorized")}</span>
                    <span className="text-stone-700">/</span>
                    <span>{t("accounting.labels.reference")}: {row.referenceLabel || t("accounting.noReference")}</span>
                  </div>
                  <p className="mt-4 break-words text-sm leading-7 text-stone-400 font-medium">{row.note || t("accounting.noNotes")}</p>
                  <div className="mt-4 grid gap-3 rounded-[1.15rem] border border-amber-200/10 bg-stone-950/40 p-4 text-[10px] font-bold uppercase tracking-widest text-stone-600 sm:grid-cols-3">
                    <span>{t("accounting.pro.createdBy")}: {row.createdBy || t("common.notSpecified")}</span>
                    <span>{t("accounting.pro.createdAt")}: {new Date(row.createdAt).toLocaleString(locale)}</span>
                    <span className="text-amber-500/80">
                      {t("accounting.pro.editRequestState")}:{" "}
                      {visibleEditRequests.some((request) => request.financialEntryId === row.id && request.status === "pending")
                        ? t("accounting.pro.states.pending_correction")
                        : t("accounting.pro.states.locked")}
                    </span>
                  </div>
                  {row.locked ? (
                    <div className="mt-4 rounded-[1.15rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-200">
                      <p className="font-bold uppercase tracking-wide text-[10px]">{t("accounting.lockedEntryTitle")}</p>
                      <p className="mt-1 font-medium">{t("accounting.lockedEntryCorrectionHint")}</p>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {row.dealNumber ? (
                      <Link to={`/dashboard/deals?deal=${row.dealNumber}`} className="text-sm font-bold text-amber-500 hover:text-amber-400 transition-colors">
                        {t("accounting.openDeal")}
                      </Link>
                    ) : null}
                    {row.locked ? (
                      <Link
                        to={`/dashboard/edit-requests?deal=${row.dealNumber || focusDeal || ""}&entry=${row.id}`}
                        className="text-sm font-bold text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        {t("accounting.requestCorrection")}
                      </Link>
                    ) : null}
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
