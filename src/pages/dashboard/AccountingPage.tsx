import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { FilePenLine, Info, Loader2, Receipt, Route, Sparkles, TrendingDown, TrendingUp, Wallet, RefreshCw, Download, FileText, FileSpreadsheet } from "lucide-react";
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
import {
  detectOperationalBlockers,
  generateCoordinationWarnings
} from "@/features/autonomous-coordination/lib/autonomousCoordinationEngine";
import { CoordinationWarningsPanel } from "@/features/autonomous-coordination/components/CoordinationWarningsPanel";
import {
  generatePartnerProfiles,
  generatePartnerCommunicationInsight
} from "@/features/partner-intelligence/lib/partnerIntelligenceEngine";
import { PartnerCommunicationCenter } from "@/features/partner-intelligence/components/PartnerCommunicationCenter";
import {
  generateExecutiveWorkspaceState
} from "@/features/executive-command/lib/executiveWorkspaceEngine";
import { CrossSystemInsightsPanel } from "@/features/executive-command/components/CrossSystemInsightsPanel";
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
import { DashboardPageShell, DashboardSection, DashboardGrid } from "@/components/layout";
import { cn } from "@/lib/utils";

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
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadPartnerSettlements>>>([]);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateBranchProfiles([], deals as any, entries as any),
    [deals, entries]
  );

  const branchFinancialSummaries = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => branchProfiles.map(b => generateBranchFinancialSummary(b.id, entries as any, settlements as any)),
    [branchProfiles, entries, settlements]
  );

  const autonomousBlockers = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => detectOperationalBlockers([], deals as any, entries as any, editRequests as any),
    [deals, entries, editRequests]
  );

  const coordinationWarnings = useMemo(
    () => generateCoordinationWarnings(autonomousBlockers, []),
    [autonomousBlockers]
  );

  const partnerProfiles = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generatePartnerProfiles([], deals as any, [], entries as any),
    [deals, entries]
  );

  const firstPartnerId = partnerProfiles[0]?.id;
  const partnerCommunicationInsight = useMemo(
    () => firstPartnerId ? generatePartnerCommunicationInsight(firstPartnerId) : null,
    [firstPartnerId]
  );

  const executiveWorkspaceState = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateExecutiveWorkspaceState([], deals as any, entries as any, settlements as any, editRequests as any),
    [deals, entries, settlements, editRequests]
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
      <DashboardPageShell>
        <DashboardGrid variant="main">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-[2rem]" />
          ))}
        </DashboardGrid>
      </DashboardPageShell>
    );
  }

  if (entries.length === 0 && deals.length === 0) {
    return (
      <DashboardPageShell>
        <EmptyState
          icon={Receipt}
          title={t("accounting.emptyTitle")}
          description={t("accounting.emptyDescription")}
        />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell dir={lang === "ar" ? "rtl" : "ltr"}>
      <PageHelpBox pageKey="accounting" role={profile?.role} />

      <DashboardSection
        title={t("accounting.title")}
        description={t("accounting.description")}
        icon={<Wallet className="h-6 w-6" />}
        headerAction={
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("accounting.focusedContext")}</p>
              <p className="text-sm font-bold text-amber-500">{focusDeal || t("accounting.global")}</p>
            </div>
            <Button variant="outline" size="lg" onClick={() => void refresh()} className="rounded-2xl border-amber-200/10 bg-stone-900/40 text-stone-200 hover:text-amber-200 h-12 px-6">
              <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin text-amber-500")} />
              <span className="font-bold">{t("common.refresh")}</span>
            </Button>
          </div>
        }
      >
        <DashboardGrid variant="kpi">
          {[
            { label: t("accounting.labels.totalIncome"), value: totals.income, icon: TrendingUp, accent: "text-emerald-400" },
            { label: t("accounting.labels.totalExpense"), value: totals.expense, icon: TrendingDown, accent: "text-rose-400" },
            { label: t("accounting.labels.net"), value: totals.net, icon: Wallet, accent: totals.net >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label: t("accounting.labels.lockedEntries"), value: totals.lockedCount, icon: Receipt, accent: "text-amber-200" },
          ].map((item) => (
            <BentoCard key={item.label} className="p-5 border-amber-200/10 bg-stone-900/50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{item.label}</p>
                <item.icon className={cn("h-4 w-4", item.accent)} />
              </div>
              <p className={cn("mt-4 text-2xl font-black", item.accent)}>
                {item.value.toLocaleString()} <span className="text-xs">{totals.currencyLabel}</span>
              </p>
            </BentoCard>
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardGrid variant="wide-side">
        <div className="space-y-12">
          {!loading && !focusDeal && (
            <div className="space-y-8">
              <DashboardSection title="Coordination Insights" description="Automated systemic warnings and branch health.">
                <div className="space-y-6">
                  <CoordinationWarningsPanel warnings={coordinationWarnings} />
                  <CrossSystemInsightsPanel insights={executiveWorkspaceState.insights.filter(i => i.type === 'financial')} />
                  {partnerCommunicationInsight && <PartnerCommunicationCenter insight={partnerCommunicationInsight} />}
                  <BranchFinancialSummary summaries={branchFinancialSummaries} />
                </div>
              </DashboardSection>
            </div>
          )}

          <DashboardSection
            title={t("accounting.financialSignals")}
            description="Deep audit analysis and statement readiness signals."
          >
            <div className="space-y-6">
              {focusedDeal && (
                <div className="grid grid-cols-1 gap-6">
                  <BentoCard className="p-6 border-amber-500/20 bg-amber-500/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <p className="text-[10px] font-black uppercase text-amber-500/80 tracking-widest">{t("accounting.statementReadiness")}</p>
                        <h3 className="mt-1 font-serif text-2xl font-bold text-stone-100">
                          {statementSummary?.ready ? t("accounting.readyForFinalReview") : t("accounting.needsReviewBeforeIssue")}
                        </h3>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        statementSummary?.ready ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-200 border-amber-500/20"
                      )}>
                        {statementSummary?.currencySummaries.length || 0} {t("accounting.currencyGroupsCount")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {statementSummary?.currencySummaries.map((item) => (
                        <div key={item.currency} className="p-4 rounded-2xl bg-stone-950/40 border border-amber-200/10">
                          <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{item.currency}</p>
                          <p className="mt-1 text-lg font-bold text-stone-100">{item.net.toLocaleString()} {item.currency}</p>
                          <p className="mt-1 text-[10px] font-bold text-stone-700 uppercase">{t("accounting.linkedEntriesCount", { count: item.entriesCount })}</p>
                        </div>
                      ))}
                    </div>

                    {statementSummary && statementSummary.issues.length > 0 && (
                      <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sm font-medium text-amber-200">
                        {statementSummary.issues[0]}
                      </div>
                    )}
                  </BentoCard>

                  <BentoCard className="p-6 border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-[10px] font-black uppercase text-amber-500/80 tracking-widest">{t("accounting.dealSignal")}</p>
                        <h3 className="mt-1 font-serif text-2xl font-bold text-stone-100">{focusedDeal.dealNumber}</h3>
                      </div>
                      <div className={cn(
                        "h-12 w-12 flex items-center justify-center rounded-2xl border",
                        (dealFinancialSignal?.variance || 0) >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {(dealFinancialSignal?.variance || 0) >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-2xl bg-stone-950/40 border border-amber-200/10">
                        <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{t("accounting.referenceValue")}</p>
                        <p className="mt-1 text-lg font-bold text-stone-100">{focusedDeal.totalValue.toLocaleString()} {focusedDeal.currency}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-stone-950/40 border border-amber-200/10">
                        <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{t("accounting.accountingReference")}</p>
                        <p className="mt-1 text-lg font-bold text-stone-100">{focusedDeal.accountingReference || "-"}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-stone-500 leading-relaxed">
                      {totals.net >= 0 ? t("accounting.positiveSignal") : t("accounting.negativeSignal")}
                      {dealFinancialSignal ? ` ${dealFinancialSignal.variance.toLocaleString()} ${focusedDeal.currency}.` : ""}
                    </p>
                  </BentoCard>
                </div>
              )}

              <FinanceAuditProPanel analysis={financeRiskAnalysis} t={t} locale={locale} />
            </div>
          </DashboardSection>

          <DashboardSection
            title={lang === "ar" ? "مراجعة مالية بالذكاء الاصطناعي" : "AI Financial Audit"}
            description={lang === "ar" ? "مراجعة إرشادية فقط ولا تنشئ أو تعدل قيودا مالية." : "Read-only advisory review for data integrity."}
            icon={<Sparkles className="h-6 w-6" />}
            headerAction={
              <Button type="button" variant="outline" disabled={aiReviewLoading} onClick={() => void handleFinanceAiReview("finance_audit_review")} className="h-10 border-amber-200/15 bg-stone-900/40 text-stone-200 hover:text-amber-200">
                {aiReviewLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Sparkles className="me-2 h-4 w-4" />}
                {lang === "ar" ? "راجع القيود" : "Review entries"}
              </Button>
            }
          >
            <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50">
              <div className="flex flex-wrap gap-2 mb-6">
                {(["customer_balance_review", "settlement_review", "accounting_risk_briefing"] as const).map((mode) => (
                  <Button key={mode} type="button" variant="outline" size="sm" disabled={aiReviewLoading} onClick={() => void handleFinanceAiReview(mode)} className="h-9 border-amber-200/10 bg-stone-950/40 text-stone-300 hover:text-stone-100">
                    {t(`accounting.pro.aiActions.${mode}`)}
                  </Button>
                ))}
              </div>

              {aiReview ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  {aiUsedFallback && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                      {lang === "ar" ? "مساعد الذكاء الاصطناعي غير متاح، تم استخدام المحلل المحلي." : "AI assistant unavailable, local analyzer used."}
                    </div>
                  )}
                  {aiReviewTitle && <p className="text-[10px] font-black uppercase text-amber-500/80 tracking-widest">{aiReviewTitle}</p>}
                  <pre className="p-6 rounded-2xl bg-stone-950/60 border border-amber-200/5 font-sans text-sm text-stone-300 whitespace-pre-wrap leading-relaxed max-h-[30rem] overflow-y-auto">
                    {aiReview}
                  </pre>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Sparkles className="h-8 w-8 text-stone-800 mx-auto mb-3" />
                  <p className="text-sm font-medium text-stone-600">{lang === "ar" ? "اضغط على زر المراجعة لبدء تحليل الذكاء الاصطناعي" : "Click review to start AI analysis"}</p>
                </div>
              )}
            </BentoCard>
          </DashboardSection>

          <DashboardSection
            title={t("accounting.entriesTitle")}
            description={t("accounting.description")}
            headerAction={
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("accounting.searchPlaceholder")}
                  className="h-10 w-64 bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20"
                />
                <Button variant="outline" size="sm" onClick={handleExport} className="h-10 border-stone-800 bg-stone-900/40 text-stone-400 hover:text-stone-100">
                  <FileSpreadsheet className="h-4 w-4 me-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf} className="h-10 border-stone-800 bg-stone-900/40 text-stone-400 hover:text-stone-100">
                  <FileText className="h-4 w-4 me-2" />
                  PDF
                </Button>
              </div>
            }
          >
            <BentoCard className="p-0 border-amber-200/10 bg-stone-900/50 overflow-hidden">
              <div className="divide-y divide-amber-200/5">
                {[...dealEntries, ...globalEntries].length === 0 ? (
                  <div className="p-12 text-center">
                    <EmptyState
                      icon={Receipt}
                      title={t("accounting.emptyListTitle")}
                      description={t("accounting.emptyListDescription")}
                      className="bg-transparent border-0"
                    />
                  </div>
                ) : (
                  [...dealEntries, ...globalEntries].map((row) => (
                    <div key={row.id} className="p-6 hover:bg-stone-800/20 transition-colors group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <p className="text-xs font-black text-stone-500 uppercase tracking-widest">{row.entryNumber}</p>
                          <h4 className="mt-1 font-bold text-stone-100">
                            {row.scope === "deal" ? `${t("accounting.scopeDeal")}: ${row.dealNumber}` : row.scope === "customer" ? `${t("accounting.scopeCustomer")}: ${row.customerName}` : t("accounting.scopeGlobal")}
                          </h4>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border self-start",
                          row.locked ? "bg-amber-500/10 text-amber-200 border-amber-500/20" : "bg-stone-800 text-stone-400 border-stone-700"
                        )}>
                          {row.locked ? t("accounting.locked") : t("accounting.openState")}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800">
                          <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{t("accounting.labels.type")}</p>
                          <p className={cn("font-bold", row.type === 'income' ? 'text-emerald-400' : 'text-rose-400')}>
                            {row.type === "income" ? t("accounting.typeIncome") : t("accounting.typeExpense")}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800">
                          <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{t("accounting.labels.amount")}</p>
                          <p className="font-bold text-stone-100">{row.amount.toLocaleString()} {row.currency}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800">
                          <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{t("accounting.labels.category")}</p>
                          <p className="font-bold text-stone-300 truncate">{row.category || "-"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800">
                          <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1">{t("common.date")}</p>
                          <p className="font-bold text-stone-300">{new Date(row.entryDate).toLocaleDateString(locale)}</p>
                        </div>
                      </div>

                      <p className="text-sm text-stone-400 leading-relaxed mb-6 italic">"{row.note || t("accounting.noNotes")}"</p>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-4 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                          <span>{t("accounting.pro.createdBy")}: {row.createdBy || "-"}</span>
                          <span>{t("accounting.pro.createdAt")}: {new Date(row.createdAt).toLocaleDateString(locale)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          {row.dealNumber && (
                            <Link to={`/dashboard/deals?deal=${row.dealNumber}`} className="text-xs font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest">
                              {t("accounting.openDeal")}
                            </Link>
                          )}
                          {row.locked && (
                            <Link to={`/dashboard/edit-requests?deal=${row.dealNumber || focusDeal || ""}&entry=${row.id}`} className="text-xs font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest">
                              {t("accounting.requestCorrection")}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </BentoCard>
          </DashboardSection>
        </div>

        <aside className="space-y-12">
          <DashboardSection title={t("accounting.createTitle")} icon={<FilePenLine className="h-6 w-6" />}>
            <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50">
              <div className="mb-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  <Info className="h-3 w-3" />
                  {t("accounting.guidanceTitle")}
                </div>
                <ul className="text-xs font-medium text-stone-500 space-y-2 list-disc list-inside">
                  <li>{t("accounting.guidance.entryPurpose")}</li>
                  <li>{t("accounting.guidance.lockedMeaning")}</li>
                </ul>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("common.type")}</Label>
                    <select
                      value={type}
                      onChange={(event) => setType(event.target.value as "income" | "expense")}
                      className="w-full h-11 rounded-xl border border-amber-200/10 bg-stone-950/40 px-4 text-sm text-stone-100 outline-none focus:ring-1 focus:ring-amber-500/20"
                    >
                      <option value="expense" className="bg-stone-900">{t("accounting.typeExpense")}</option>
                      <option value="income" className="bg-stone-900">{t("accounting.typeIncome")}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("common.amount")}</Label>
                      <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="h-11 bg-stone-950/40 border-amber-200/10 text-stone-100" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("common.currency")}</Label>
                      <Input value={currency} onChange={(event) => setCurrency(event.target.value)} className="h-11 bg-stone-950/40 border-amber-200/10 text-stone-100" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("common.date")}</Label>
                    <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="h-11 bg-stone-950/40 border-amber-200/10 text-stone-100" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("accounting.counterparty")}</Label>
                    <Input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} className="h-11 bg-stone-950/40 border-amber-200/10 text-stone-100" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("common.category")}</Label>
                    <Input value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 bg-stone-950/40 border-amber-200/10 text-stone-100" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("accounting.paymentMethod")}</Label>
                    <Input value={method} onChange={(event) => setMethod(event.target.value)} className="h-11 bg-stone-950/40 border-amber-200/10 text-stone-100" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("accounting.descriptionLabel")}</Label>
                    <Textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} className="bg-stone-950/40 border-amber-200/10 text-stone-100" />
                  </div>
                </div>

                <Button className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-black text-stone-950 shadow-xl hover:brightness-110 uppercase tracking-widest" onClick={handleCreateEntry} disabled={submitting || !canCreateAccountingEntries}>
                  {submitting ? t("accounting.creating") : t("accounting.createLocked")}
                </Button>
              </div>
            </BentoCard>
          </DashboardSection>

          {focusDeal && (
            <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50">
              <Link to={`/dashboard/deals?deal=${focusDeal}`} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Route className="h-5 w-5 text-amber-500" />
                  <span className="font-bold text-stone-100">{t("accounting.backToDeal")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            </BentoCard>
          )}
        </aside>
      </DashboardGrid>
    </DashboardPageShell>
  );
}
