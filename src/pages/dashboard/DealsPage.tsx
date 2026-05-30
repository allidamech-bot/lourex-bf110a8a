import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowUpRight,
  FileImage,
  FileText,
  FileUp,
  Receipt,
  Route,
  Save,
  Truck,
  UserCog,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchDeals,
  fetchOperationalUsers,
  updateDealStatus,
} from "@/domain/operations/service";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import {
  operationalStatusMeta,
  uploadDealAttachment,
} from "@/lib/operationsDomain";
import { getShipmentStageCopy } from "@/lib/shipmentStages";
import { pickText, useI18n } from "@/lib/i18n";
import type { DealOperationalStatus } from "@/types/lourex";
import { logOperationalError } from "@/lib/monitoring";
import { filterDeals } from "@/lib/adminOperations";
import { formatMoney } from "@/lib/currency";
import { getAiReplyText, invokeLourexAi } from "@/lib/aiClient";
import { DealCommandCenterPanel } from "@/features/deals/components/DealCommandCenterPanel";
import { analyzeDealHealth, buildDealAiContext } from "@/features/deals/lib/dealCommand";

const HEADER_SEPARATOR = " | ";
type DealAiMode = "deal_briefing" | "deal_risk_review";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export default function DealsPage() {
  const { lang, t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuthSession();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchDeals>>>([]);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof fetchOperationalUsers>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [notesDraft, setNotesDraft] = useState("");
  const [turkishPartnerId, setTurkishPartnerId] = useState("");
  const [saudiPartnerId, setSaudiPartnerId] = useState("");
  const [operationalStatus, setOperationalStatus] =
    useState<DealOperationalStatus>("awaiting_assignment");
  const [attachmentCategory, setAttachmentCategory] = useState("reference");
  const [aiModeLoading, setAiModeLoading] = useState<DealAiMode | null>(null);
  const [aiOutput, setAiOutput] = useState("");
  const [aiOutputTitle, setAiOutputTitle] = useState("");
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const selectedDealNumber = searchParams.get("deal");
  const canManageDeal = profile?.role === "owner" || profile?.role === "operations_employee";
  const isTurkishPartner = profile?.role === "turkish_partner";
  const isSaudiPartner = profile?.role === "saudi_partner";
  const isPartnerWorkspace = isTurkishPartner || isSaudiPartner;

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [dealsData, usersData] = await Promise.all([fetchDeals(), fetchOperationalUsers()]);
      setRows(dealsData);
      setUsers(usersData);
    } catch (error) {
      logOperationalError("deals_load", error);
      const message = t("deals.toasts.saveError");
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredRows = useMemo(() => filterDeals(rows, deferredSearch), [deferredSearch, rows]);
  const selectedDeal = filteredRows.find((row) => row.dealNumber === selectedDealNumber) || filteredRows[0] || null;
  const assignedSummary = useMemo(
    () => ({
      assigned: rows.length,
      actionable: rows.filter((row) =>
        isTurkishPartner ? !["departed_turkey", "in_transit", "arrived_destination", "customs_clearance", "out_for_delivery", "delivered", "closed"].includes(row.stage) : row.stage !== "delivered" && row.stage !== "closed",
      ).length,
      delivered: rows.filter((row) => row.stage === "delivered").length,
    }),
    [isTurkishPartner, rows],
  );

  useEffect(() => {
    if (!selectedDeal) return;
    setNotesDraft(selectedDeal.notes || "");
    setTurkishPartnerId(selectedDeal.turkishPartnerId || "");
    setSaudiPartnerId(selectedDeal.saudiPartnerId || "");
    setOperationalStatus(selectedDeal.operationalStatus);
    setAttachmentCategory("reference");
    setAiModeLoading(null);
    setAiOutput("");
    setAiOutputTitle("");
    setAiUsedFallback(false);
  }, [selectedDeal]);

  const turkishPartners = useMemo(
    () => users.filter((user) => user.role === "turkish_partner" && user.status === "active"),
    [users],
  );

  const saudiPartners = useMemo(
    () => users.filter((user) => user.role === "saudi_partner" && user.status === "active"),
    [users],
  );

  const selectedDealHeaderMeta = selectedDeal
    ? [
        selectedDeal.customerName,
        selectedDeal.requestNumber
          ? t("deals.requestRef", { value: selectedDeal.requestNumber })
          : null,
        selectedDeal.trackingId
          ? t("deals.trackingRef", { value: selectedDeal.trackingId })
          : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(HEADER_SEPARATOR)
    : "";
  const workspaceDescription = isTurkishPartner
    ? t("deals.workspaceDescriptionTurkey")
    : isSaudiPartner
      ? t("deals.workspaceDescriptionSaudi")
      : t("deals.inboxDescription");
  const partnerAssignmentHint = isPartnerWorkspace
    ? t("deals.partnerAssignmentHint")
    : null;
  const searchPlaceholder = isPartnerWorkspace
    ? t("deals.searchAssignedPlaceholder")
    : t("deals.searchPlaceholder");

  const handleSave = async () => {
    if (!selectedDeal) return;
    if (saving) return;

    setSaving(true);
    try {
      const { error } = await updateDealStatus(selectedDeal.id, {
        notes: notesDraft,
        operationalStatus,
        turkishPartnerId: turkishPartnerId || null,
        saudiPartnerId: saudiPartnerId || null,
      });
      if (error) throw error;
      toast.success(t("deals.toasts.saved"));
      await refresh();
      setSearchParams({ deal: selectedDeal.dealNumber });
    } catch (error: unknown) {
      logOperationalError("deal_save", error, { dealId: selectedDeal.id });
      toast.error(getErrorMessage(error, t("deals.toasts.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDeal) return;
    if (uploadingAttachment) return;

    setUploadingAttachment(true);
    try {
      await uploadDealAttachment({
        dealId: selectedDeal.id,
        dealNumber: selectedDeal.dealNumber,
        file,
        category: attachmentCategory.trim() || "reference",
      });
      toast.success(t("deals.toasts.attachmentUploaded"));
      await refresh();
    } catch (error: unknown) {
      logOperationalError("deal_attachment_upload", error, { dealId: selectedDeal.id });
      toast.error(getErrorMessage(error, t("deals.toasts.attachmentError")));
    } finally {
      event.target.value = "";
      setUploadingAttachment(false);
    }
  };

  const buildLocalDealAiOutput = (mode: DealAiMode) => {
    if (!selectedDeal) return "";
    const analysis = analyzeDealHealth(selectedDeal);
    const riskLabels = analysis.riskFlags.map((flag) => t(`deals.command.risks.${flag}`));
    const isArabic = lang === "ar";

    if (mode === "deal_risk_review") {
      return isArabic
        ? [
            `مراجعة مخاطر الصفقة ${selectedDeal.dealNumber}`,
            `- الحالة الصحية: ${t(`deals.command.health.${analysis.state}`)} (${analysis.score}/100)`,
            `- المخاطر: ${riskLabels.length ? riskLabels.join("، ") : t("deals.command.noRisks")}`,
            `- الشحنة: ${selectedDeal.trackingId || t("deals.noTracking")}`,
            `- الإشارة المالية: ${formatMoney(selectedDeal.accountingSummary.net, selectedDeal.currency, locale)}`,
            "- التوصية: راجع عناصر المخاطر يدوياً قبل أي اعتماد أو إغلاق أو تحديث مالي أو تغيير مرحلة شحن.",
          ].join("\n")
        : [
            `Deal risk review for ${selectedDeal.dealNumber}`,
            `- Health: ${t(`deals.command.health.${analysis.state}`)} (${analysis.score}/100)`,
            `- Risks: ${riskLabels.length ? riskLabels.join(", ") : t("deals.command.noRisks")}`,
            `- Shipment: ${selectedDeal.trackingId || t("deals.noTracking")}`,
            `- Financial signal: ${formatMoney(selectedDeal.accountingSummary.net, selectedDeal.currency, locale)}`,
            "- Recommendation: review risk items manually before approval, closure, finance changes, or shipment stage changes.",
          ].join("\n");
    }

    return isArabic
      ? [
          `موجز الصفقة ${selectedDeal.dealNumber}`,
          `- العميل: ${selectedDeal.customerName || t("common.notSpecified")}`,
          `- العملية: ${selectedDeal.operationTitle || t("common.notSpecified")}`,
          `- الحالة التشغيلية: ${t(`statuses.${selectedDeal.operationalStatus}`)}`,
          `- مرحلة الشحن: ${getShipmentStageCopy(selectedDeal.stage, lang).label}`,
          `- الصحة: ${t(`deals.command.health.${analysis.state}`)} (${analysis.score}/100)`,
          `- الإجراء التالي: ${riskLabels[0] || "متابعة التشغيل وفق المسار الحالي."}`,
          "- هذا الموجز إرشادي فقط ولا ينفذ أي إجراء داخل النظام.",
        ].join("\n")
      : [
          `Deal briefing for ${selectedDeal.dealNumber}`,
          `- Customer: ${selectedDeal.customerName || t("common.notSpecified")}`,
          `- Operation: ${selectedDeal.operationTitle || t("common.notSpecified")}`,
          `- Operational status: ${t(`statuses.${selectedDeal.operationalStatus}`)}`,
          `- Shipment stage: ${getShipmentStageCopy(selectedDeal.stage, lang).label}`,
          `- Health: ${t(`deals.command.health.${analysis.state}`)} (${analysis.score}/100)`,
          `- Next internal action: ${riskLabels[0] || "Continue normal operational follow-up."}`,
          "- This briefing is advisory only and does not perform any system action.",
        ].join("\n");
  };

  const handleDealAiAction = async (mode: DealAiMode) => {
    if (!selectedDeal || aiModeLoading) return;

    const title = mode === "deal_briefing" ? t("deals.command.aiBriefing") : t("deals.command.aiRiskReview");
    const analysis = analyzeDealHealth(selectedDeal);
    setAiModeLoading(mode);
    setAiOutputTitle(title);
    setAiOutput("");
    setAiUsedFallback(false);

    try {
      const { data, error } = await invokeLourexAi({
        lang,
        area: "deal_ai_briefing",
        context: { dealId: selectedDeal.id, mode },
        body: {
          message:
            lang === "ar"
              ? `${title} للصفقة ${selectedDeal.dealNumber}. أجب بالعربية فقط.`
              : `${title} for deal ${selectedDeal.dealNumber}. Respond in English only.`,
          messages: [],
          pageContext: "dashboard_deals",
          route: window.location.pathname,
          locale: lang === "ar" ? "ar-SA" : "en-US",
          language: lang,
          analysisMode: mode,
          dashboardContext: {
            deal: buildDealAiContext(selectedDeal, analysis),
          },
        },
      });

      if (error) throw error;
      const reply = getAiReplyText(data);
      if (!reply) throw new Error("Empty AI response");
      setAiOutput(reply);
    } catch (error) {
      logOperationalError("deal_ai_briefing", error, { dealId: selectedDeal.id, mode });
      setAiUsedFallback(true);
      setAiOutput(buildLocalDealAiOutput(mode));
    } finally {
      setAiModeLoading(null);
    }
  };

  const handleCopyAiOutput = async () => {
    if (!aiOutput) return;
    try {
      await navigator.clipboard.writeText(aiOutput);
      toast.success(t("requests.ai.copySuccess"));
    } catch (error) {
      logOperationalError("deal_ai_copy", error, { dealId: selectedDeal?.id });
      toast.error(t("requests.ai.copyError"));
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-[2rem]" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title={t("deals.emptyTitle")}
        description={t("deals.emptyDescription")}
      />
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4">
      <PageHelpBox pageKey="deals" role={profile?.role} />
      <div className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
        <div>
          <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-widest text-stone-500">
            {t("deals.inboxEyebrow")}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-stone-100">{t("deals.inboxTitle")}</h2>
          <p className="mt-3 text-sm leading-7 text-stone-400">
            {workspaceDescription}
          </p>
        </div>

        {isPartnerWorkspace ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: t("deals.assignedDeals"), value: assignedSummary.assigned },
              { label: t("deals.needFollowUp"), value: assignedSummary.actionable },
              { label: t("deals.delivered"), value: assignedSummary.delivered },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.2rem] bg-stone-950/40 border border-amber-200/10 p-4 text-center">
                <p className="text-2xl font-bold text-stone-100">{item.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-stone-600 font-bold">{item.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20"
          />
          <Button variant="outline" onClick={() => void refresh()} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
            {t("common.refresh")}
          </Button>
        </div>

        {loadError ? (
          <div className="rounded-[1.25rem] border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
            {loadError}
          </div>
        ) : null}

        <div className="space-y-3">
          {filteredRows.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-amber-200/10 bg-stone-950/20 p-6">
              <EmptyState icon={Route} title={t("deals.emptyTitle")} description={t("deals.noMatches")} className="bg-transparent border-0" />
            </div>
          ) : filteredRows.map((row) => {
            const rowHealth = analyzeDealHealth(row);

            return (
              <button
                key={row.id}
                onClick={() => setSearchParams({ deal: row.dealNumber })}
                className={`w-full max-w-full min-w-0 rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                  selectedDeal?.id === row.id
                    ? "border-amber-500/35 bg-amber-500/10 shadow-[0_18px_46px_-34px_rgba(251,191,36,0.3)]"
                    : "border-amber-200/10 bg-stone-950/30 hover:border-amber-500/25 hover:bg-stone-900/50"
                }`}
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-stone-100">{row.dealNumber}</p>
                    <p className="mt-1 break-words text-sm text-stone-400">{row.customerName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="max-w-full self-start break-words rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-wider">
                      {getShipmentStageCopy(row.stage, lang).label}
                    </span>
                    <span className="max-w-full self-start break-words rounded-full bg-stone-800 border border-stone-700 px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      {t(`deals.command.health.${rowHealth.state}`)}
                    </span>
                  </div>
                </div>
                <p className="mt-3 break-words text-xs text-stone-500 font-medium tracking-tight">{row.operationTitle}</p>
                {isPartnerWorkspace ? (
                  <p className="mt-2 break-words text-xs text-stone-500 leading-relaxed">{getShipmentStageCopy(row.stage, lang).description}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </BentoCard>

      {selectedDeal ? (
        <BentoCard className="p-0 border-amber-200/15 bg-stone-900/55 backdrop-blur-xl shadow-2xl">
          <div className="border-b border-amber-200/10 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                  {t("deals.operationalCenter")}
                </p>
                <h2 className="mt-2 break-words font-serif text-2xl font-semibold text-stone-100 sm:text-3xl">{selectedDeal.dealNumber}</h2>
                <p className="mt-2 break-words text-sm text-stone-400">{selectedDealHeaderMeta}</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                {selectedDeal.sourceRequestId ? (
                  <Button variant="outline" asChild className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                    <Link to={`/dashboard/requests?request=${selectedDeal.sourceRequestId}`}>
                      {t("deals.backToRequest")}
                    </Link>
                  </Button>
                ) : null}
                <Button asChild className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110">
                  <Link
                    to={`/dashboard/tracking?deal=${selectedDeal.dealNumber}&tracking=${selectedDeal.trackingId || ""}`}
                  >
                    {t("deals.openTracking")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-0 2xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
            <div className="min-w-0 border-b border-amber-200/10 p-4 sm:p-6 2xl:border-b-0 2xl:border-e">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    label: t("deals.labels.customer"),
                    value: selectedDeal.customerName || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.email"),
                    value: selectedDeal.customerEmail || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.phone"),
                    value: selectedDeal.customerPhone || t("common.notAvailable"),
                  },
                  {
                    label: t("deals.labels.operationTitle"),
                    value: selectedDeal.operationTitle || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.requestNumber"),
                    value: selectedDeal.requestNumber || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.trackingNumber"),
                    value: selectedDeal.trackingId || t("deals.noTracking"),
                  },
                  {
                    label: t("deals.labels.accountingReference"),
                    value: selectedDeal.accountingReference || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.origin"),
                    value: selectedDeal.originCountry || t("roles.partnerTurkey"),
                  },
                  {
                    label: t("deals.labels.destination"),
                    value: selectedDeal.destinationCountry || t("common.notSpecified"),
                  },
                  {
                    label: t("deals.labels.dealValue"),
                    value: formatMoney(selectedDeal.totalValue, selectedDeal.currency, locale),
                  },
                ].map((item) => (
                  <div key={item.label} className="min-w-0 rounded-[1.25rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="break-words text-xs text-stone-500">{item.label}</p>
                    <p className="mt-1 break-words font-medium text-stone-200">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-5">
                <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold">
                  {t("deals.labels.currentStage")}
                </p>
                <p className="mt-2 font-serif text-2xl font-semibold text-stone-100">
                  {getShipmentStageCopy(selectedDeal.stage, lang).label}
                </p>
                <p className="mt-3 text-sm leading-7 text-stone-400">
                  {t("deals.operationContext")}
                </p>
              </div>

              <div className="mt-5">
                <DealCommandCenterPanel
                  deal={selectedDeal}
                  lang={lang}
                  t={t}
                  aiOutput={aiOutput}
                  aiOutputTitle={aiOutputTitle}
                  aiLoading={Boolean(aiModeLoading)}
                  aiUsedFallback={aiUsedFallback}
                  onRunAiBriefing={() => void handleDealAiAction("deal_briefing")}
                  onRunAiRiskReview={() => void handleDealAiAction("deal_risk_review")}
                  onCopyAiOutput={() => void handleCopyAiOutput()}
                />
              </div>

              <div className="mt-5 rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4">
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <p className="font-medium text-stone-100">{t("deals.labels.financialSummary")}</p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
                  {[
                    {
                      label: t("deals.labels.totalIncome"),
                      value: formatMoney(selectedDeal.accountingSummary.income, selectedDeal.currency, locale),
                    },
                    {
                      label: t("deals.labels.totalExpense"),
                      value: formatMoney(selectedDeal.accountingSummary.expense, selectedDeal.currency, locale),
                    },
                    {
                      label: t("deals.labels.netSignal"),
                      value: formatMoney(selectedDeal.accountingSummary.net, selectedDeal.currency, locale),
                      className:
                        selectedDeal.accountingSummary.net >= 0
                          ? "text-emerald-400"
                          : "text-rose-400",
                    },
                    {
                      label: t("deals.labels.entriesCount"),
                      value: selectedDeal.accountingSummary.entriesCount,
                    },
                  ].map((item) => (
                    <div key={item.label} className="min-w-0 rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                      <p className="text-xs text-stone-500">{item.label}</p>
                      <p className={`mt-1 break-words font-bold ${item.className || "text-stone-200"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 p-4 sm:p-6">
              <div className="space-y-5">
                <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4">
                  <div className="flex items-center gap-3">
                    <UserCog className="h-4 w-4 text-amber-500" />
                    <p className="font-medium text-stone-100">{t("deals.labels.assignment")}</p>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-xs text-stone-500 uppercase tracking-wider font-bold">
                        {t("deals.labels.turkishPartner")}
                      </label>
                      <select
                        value={turkishPartnerId}
                        onChange={(event) => setTurkishPartnerId(event.target.value)}
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="" className="bg-stone-900">{t("deals.unassigned")}</option>
                        {turkishPartners.map((user) => (
                          <option key={user.id} value={user.id} className="bg-stone-900">
                            {user.fullName || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 uppercase tracking-wider font-bold">
                        {t("deals.labels.saudiPartner")}
                      </label>
                      <select
                        value={saudiPartnerId}
                        onChange={(event) => setSaudiPartnerId(event.target.value)}
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="" className="bg-stone-900">{t("deals.unassigned")}</option>
                        {saudiPartners.map((user) => (
                          <option key={user.id} value={user.id} className="bg-stone-900">
                            {user.fullName || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 uppercase tracking-wider font-bold">
                        {t("deals.labels.operationalStatus")}
                      </label>
                      <select
                        value={operationalStatus}
                        onChange={(event) =>
                          setOperationalStatus(event.target.value as DealOperationalStatus)
                        }
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {Object.entries(operationalStatusMeta).map(([key]) => (
                          <option key={key} value={key} className="bg-stone-900">
                            {t(`statuses.${key}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button variant="outline" onClick={handleSave} disabled={saving || !canManageDeal} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                      <Save className={`me-2 h-4 w-4 ${saving ? "animate-pulse text-amber-500" : "text-amber-500"}`} />
                      {saving ? t("deals.saving") : t("deals.saveChanges")}
                    </Button>
                    {!canManageDeal && partnerAssignmentHint ? (
                      <p className="text-xs leading-6 text-stone-500">
                        {partnerAssignmentHint}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-stone-100">{t("deals.labels.notes")}</p>
                  </div>
                  <Textarea
                    rows={8}
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    className="mt-4 bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20"
                    disabled={!canManageDeal}
                    placeholder={t("deals.notesPlaceholder")}
                  />
                </div>

                <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4">
                  <div className="flex items-center gap-3">
                    <FileImage className="h-4 w-4 text-amber-500" />
                    <p className="font-medium text-stone-100">{t("deals.labels.attachments")}</p>
                  </div>

                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                  />

                  <div className="mt-4 rounded-[1.2rem] border border-amber-200/10 bg-stone-950/20 p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      <Input
                        value={attachmentCategory}
                        onChange={(event) => setAttachmentCategory(event.target.value)}
                        placeholder={t("deals.attachmentCategoryPlaceholder")}
                        disabled={!canManageDeal || uploadingAttachment}
                        className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20"
                      />
                      <Button
                        variant="outline"
                        disabled={!canManageDeal || uploadingAttachment}
                        onClick={() => attachmentInputRef.current?.click()}
                        className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10"
                      >
                        <FileUp className="me-2 h-4 w-4 text-amber-500" />
                        {uploadingAttachment
                          ? t("deals.uploadingAttachment")
                          : t("deals.uploadAttachment")}
                      </Button>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-stone-500">
                      {t("deals.attachmentHint")}
                    </p>
                  </div>

                  {selectedDeal.attachments.length === 0 ? (
                    <p className="mt-4 text-sm text-stone-500 text-center">{t("deals.noAttachments")}</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedDeal.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-full max-w-full min-w-0 rounded-[1.2rem] border border-amber-200/10 bg-stone-950/40 px-4 py-4 transition-colors hover:border-amber-500/25 group"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words font-medium text-stone-200 group-hover:text-amber-200">{attachment.fileName}</p>
                              <p className="mt-1 text-xs text-stone-500">
                                {attachment.category}
                              </p>
                            </div>
                            <ArrowUpRight className="mt-0.5 h-4 w-4 text-stone-600 group-hover:text-amber-500" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-amber-500" />
                    <p className="font-medium text-stone-100">{t("deals.labels.linkedWorkspaces")}</p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {[
                      { to: `/dashboard/tracking?deal=${selectedDeal.dealNumber}&tracking=${selectedDeal.trackingId || ""}`, icon: Truck, label: t("deals.openTrackingWorkspace") },
                      { to: `/dashboard/accounting?deal=${selectedDeal.dealNumber}`, icon: Receipt, label: t("deals.openAccountingWorkspace") },
                      { to: `/dashboard/edit-requests?deal=${selectedDeal.dealNumber}`, icon: FileText, label: t("deals.openEditRequests") },
                      { to: `/dashboard/audit?deal=${selectedDeal.dealNumber}${selectedDeal.sourceRequestId ? `&request=${selectedDeal.sourceRequestId}` : ""}`, icon: Route, label: t("deals.openAuditTrace") },
                    ].map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        className="flex min-w-0 items-center gap-3 rounded-[1.2rem] border border-amber-200/10 bg-stone-950/40 px-4 py-4 text-sm font-bold text-stone-300 transition-colors hover:border-amber-500/25 hover:text-amber-200 group"
                      >
                        <item.icon className="h-4 w-4 text-stone-600 group-hover:text-amber-500" />
                        <span className="min-w-0 break-words">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BentoCard>
      ) : null}
    </div>
    </div>
  );
}
