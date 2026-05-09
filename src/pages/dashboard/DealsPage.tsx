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
import {
  operationalStatusMeta,
  uploadDealAttachment,
} from "@/lib/operationsDomain";
import { getShipmentStageCopy } from "@/lib/shipmentStages";
import { pickText, useI18n } from "@/lib/i18n";
import type { DealOperationalStatus } from "@/types/lourex";
import { logOperationalError } from "@/lib/monitoring";
import { filterDeals } from "@/lib/adminOperations";
import { supabase } from "@/integrations/supabase/client";
import { DealCommandCenterPanel } from "@/features/deals/components/DealCommandCenterPanel";
import { analyzeDealHealth, buildDealAiContext } from "@/features/deals/lib/dealCommand";

const HEADER_SEPARATOR = " | ";
type DealAiMode = "deal_briefing" | "deal_risk_review";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export default function DealsPage() {
  const { lang, t } = useI18n();
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
            `- الإشارة المالية: ${selectedDeal.accountingSummary.net.toLocaleString()} ${selectedDeal.currency}`,
            "- التوصية: راجع عناصر المخاطر يدوياً قبل أي اعتماد أو إغلاق أو تحديث مالي أو تغيير مرحلة شحن.",
          ].join("\n")
        : [
            `Deal risk review for ${selectedDeal.dealNumber}`,
            `- Health: ${t(`deals.command.health.${analysis.state}`)} (${analysis.score}/100)`,
            `- Risks: ${riskLabels.length ? riskLabels.join(", ") : t("deals.command.noRisks")}`,
            `- Shipment: ${selectedDeal.trackingId || t("deals.noTracking")}`,
            `- Financial signal: ${selectedDeal.accountingSummary.net.toLocaleString()} ${selectedDeal.currency}`,
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
      const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
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
      const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
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
    <div className="grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <BentoCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t("deals.inboxEyebrow")}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold">{t("deals.inboxTitle")}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
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
              <div key={item.label} className="rounded-[1.2rem] bg-secondary/20 p-4 text-center">
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
          />
          <Button variant="outline" onClick={() => void refresh()}>
            {t("common.refresh")}
          </Button>
        </div>

        {loadError ? (
          <div className="rounded-[1.25rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
            {loadError}
          </div>
        ) : null}

        <div className="space-y-3">
          {filteredRows.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/10 p-6">
              <EmptyState icon={Route} title={t("deals.emptyTitle")} description={t("deals.noMatches")} />
            </div>
          ) : filteredRows.map((row) => {
            const rowHealth = analyzeDealHealth(row);

            return (
              <button
                key={row.id}
                onClick={() => setSearchParams({ deal: row.dealNumber })}
                className={`w-full max-w-full min-w-0 rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                  selectedDeal?.id === row.id
                    ? "border-primary/30 bg-primary/10"
                    : "border-border/60 bg-secondary/15 hover:border-primary/20"
                }`}
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{row.dealNumber}</p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{row.customerName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="max-w-full self-start break-words rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                      {getShipmentStageCopy(row.stage, lang).label}
                    </span>
                    <span className="max-w-full self-start break-words rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      {t(`deals.command.health.${rowHealth.state}`)}
                    </span>
                  </div>
                </div>
                <p className="mt-3 break-words text-xs text-muted-foreground">{row.operationTitle}</p>
                {isPartnerWorkspace ? (
                  <p className="mt-2 break-words text-xs text-muted-foreground">{getShipmentStageCopy(row.stage, lang).description}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </BentoCard>

      {selectedDeal ? (
        <BentoCard className="p-0">
          <div className="border-b border-border/50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t("deals.operationalCenter")}
                </p>
                <h2 className="mt-2 break-words font-serif text-2xl font-semibold sm:text-3xl">{selectedDeal.dealNumber}</h2>
                <p className="mt-2 break-words text-sm text-muted-foreground">{selectedDealHeaderMeta}</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                {selectedDeal.sourceRequestId ? (
                  <Button variant="outline" asChild>
                    <Link to={`/dashboard/requests?request=${selectedDeal.sourceRequestId}`}>
                      {t("deals.backToRequest")}
                    </Link>
                  </Button>
                ) : null}
                <Button variant="gold" asChild>
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
            <div className="min-w-0 border-b border-border/50 p-4 sm:p-6 2xl:border-b-0 2xl:border-e">
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
                    value: `${selectedDeal.totalValue.toLocaleString()} ${selectedDeal.currency || "SAR"}`,
                  },
                ].map((item) => (
                  <div key={item.label} className="min-w-0 rounded-[1.25rem] bg-secondary/25 p-4">
                    <p className="break-words text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 break-words font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-primary/15 bg-primary/8 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-primary/80">
                  {t("deals.labels.currentStage")}
                </p>
                <p className="mt-2 font-serif text-2xl font-semibold">
                  {getShipmentStageCopy(selectedDeal.stage, lang).label}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
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

              <div className="mt-5 rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-primary" />
                  <p className="font-medium">{t("deals.labels.financialSummary")}</p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {[
                    {
                      label: t("deals.labels.totalIncome"),
                      value: `${selectedDeal.accountingSummary.income.toLocaleString()} ${selectedDeal.currency}`,
                    },
                    {
                      label: t("deals.labels.totalExpense"),
                      value: `${selectedDeal.accountingSummary.expense.toLocaleString()} ${selectedDeal.currency}`,
                    },
                    {
                      label: t("deals.labels.netSignal"),
                      value: `${selectedDeal.accountingSummary.net.toLocaleString()} ${selectedDeal.currency}`,
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
                    <div key={item.label} className="min-w-0 rounded-[1.15rem] bg-card p-4">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`mt-1 break-words font-medium ${item.className || ""}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 p-4 sm:p-6">
              <div className="space-y-5">
                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center gap-3">
                    <UserCog className="h-4 w-4 text-primary" />
                    <p className="font-medium">{t("deals.labels.assignment")}</p>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">
                        {t("deals.labels.turkishPartner")}
                      </label>
                      <select
                        value={turkishPartnerId}
                        onChange={(event) => setTurkishPartnerId(event.target.value)}
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{t("deals.unassigned")}</option>
                        {turkishPartners.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        {t("deals.labels.saudiPartner")}
                      </label>
                      <select
                        value={saudiPartnerId}
                        onChange={(event) => setSaudiPartnerId(event.target.value)}
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{t("deals.unassigned")}</option>
                        {saudiPartners.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName || user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        {t("deals.labels.operationalStatus")}
                      </label>
                      <select
                        value={operationalStatus}
                        onChange={(event) =>
                          setOperationalStatus(event.target.value as DealOperationalStatus)
                        }
                        disabled={!canManageDeal}
                        className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {Object.entries(operationalStatusMeta).map(([key]) => (
                          <option key={key} value={key}>
                            {t(`statuses.${key}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button variant="outline" onClick={handleSave} disabled={saving || !canManageDeal}>
                      <Save className={`me-2 h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
                      {saving ? t("deals.saving") : t("deals.saveChanges")}
                    </Button>
                    {!canManageDeal && partnerAssignmentHint ? (
                      <p className="text-xs leading-6 text-muted-foreground">
                        {partnerAssignmentHint}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{t("deals.labels.notes")}</p>
                  </div>
                  <Textarea
                    rows={8}
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    className="mt-4"
                    disabled={!canManageDeal}
                    placeholder={t("deals.notesPlaceholder")}
                  />
                </div>

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center gap-3">
                    <FileImage className="h-4 w-4 text-primary" />
                    <p className="font-medium">{t("deals.labels.attachments")}</p>
                  </div>

                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                  />

                  <div className="mt-4 rounded-[1.2rem] border border-border/60 bg-card/60 p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      <Input
                        value={attachmentCategory}
                        onChange={(event) => setAttachmentCategory(event.target.value)}
                        placeholder={t("deals.attachmentCategoryPlaceholder")}
                        disabled={!canManageDeal || uploadingAttachment}
                      />
                      <Button
                        variant="outline"
                        disabled={!canManageDeal || uploadingAttachment}
                        onClick={() => attachmentInputRef.current?.click()}
                      >
                        <FileUp className="me-2 h-4 w-4" />
                        {uploadingAttachment
                          ? t("deals.uploadingAttachment")
                          : t("deals.uploadAttachment")}
                      </Button>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-muted-foreground">
                      {t("deals.attachmentHint")}
                    </p>
                  </div>

                  {selectedDeal.attachments.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">{t("deals.noAttachments")}</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedDeal.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-full max-w-full min-w-0 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 transition-colors hover:border-primary/25"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words font-medium">{attachment.fileName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {attachment.category}
                              </p>
                            </div>
                            <ArrowUpRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-primary" />
                    <p className="font-medium">{t("deals.labels.linkedWorkspaces")}</p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Link
                      to={`/dashboard/tracking?deal=${selectedDeal.dealNumber}&tracking=${selectedDeal.trackingId || ""}`}
                      className="flex min-w-0 items-center gap-3 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <Truck className="h-4 w-4" />
                      <span className="min-w-0 break-words">{t("deals.openTrackingWorkspace")}</span>
                    </Link>
                    <Link
                      to={`/dashboard/accounting?deal=${selectedDeal.dealNumber}`}
                      className="flex min-w-0 items-center gap-3 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <Receipt className="h-4 w-4" />
                      <span className="min-w-0 break-words">{t("deals.openAccountingWorkspace")}</span>
                    </Link>
                    <Link
                      to={`/dashboard/edit-requests?deal=${selectedDeal.dealNumber}`}
                      className="flex min-w-0 items-center gap-3 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="min-w-0 break-words">{t("deals.openEditRequests")}</span>
                    </Link>
                    <Link
                      to={`/dashboard/audit?deal=${selectedDeal.dealNumber}${selectedDeal.sourceRequestId ? `&request=${selectedDeal.sourceRequestId}` : ""}`}
                      className="flex min-w-0 items-center gap-3 rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                    >
                      <Route className="h-4 w-4" />
                      <span className="min-w-0 break-words">{t("deals.openAuditTrace")}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </BentoCard>
      ) : null}
    </div>
  );
}
