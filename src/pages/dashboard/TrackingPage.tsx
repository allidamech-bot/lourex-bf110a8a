import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Loader2, PackageSearch, RefreshCcw, Route, Search, Send, ShieldCheck, Sparkles, Files, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShipmentIntelligencePanel } from "@/features/shipments/components/ShipmentIntelligencePanel";
import {
  analyzeShipmentIntelligence,
  buildShipmentIntelligenceAiContext,
  type ShipmentIntelligenceAnalysis,
} from "@/features/shipments/lib/shipmentIntelligence";
import { ShipmentTimeline } from "@/features/tracking/components/ShipmentTimeline";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { createTrackingUpdate, loadShipments } from "@/lib/operationsDomain";
import { fetchRequests, fetchDeals } from "@/domain/operations/service";
import { generateRegionalOperationsSummary } from "@/features/organization-intelligence/lib/organizationIntelligenceEngine";
import { RegionalOperationsVisibility } from "@/features/organization-intelligence/components/RegionalOperationsVisibility";
import {
  detectWorkflowDependencies,
  generateCoordinationWarnings
} from "@/features/autonomous-coordination/lib/autonomousCoordinationEngine";
import { WorkflowDependencyMap } from "@/features/autonomous-coordination/components/WorkflowDependencyMap";
import { CoordinationWarningsPanel } from "@/features/autonomous-coordination/components/CoordinationWarningsPanel";
import {
  generatePartnerProfiles,
  generatePartnerShipmentInsights
} from "@/features/partner-intelligence/lib/partnerIntelligenceEngine";
import { PartnerShipmentResponsibilityPanel } from "@/features/partner-intelligence/components/PartnerShipmentResponsibilityPanel";
import {
  generateExecutiveWorkspaceState
} from "@/features/executive-command/lib/executiveWorkspaceEngine";
import { OperationalPressureMap } from "@/features/executive-command/components/OperationalPressureMap";
import { CommandPriorityMatrix } from "@/features/executive-command/components/CommandPriorityMatrix";
import { getNextShipmentStage, getShipmentProgressPercent, getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import { isInternalRole } from "@/features/auth/rbac";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { canAdvanceShipmentStage } from "@/domain/operations/guards";
import { logOperationalError } from "@/lib/monitoring";
import { filterShipments } from "@/lib/adminOperations";
import { loadPartnerSettlements } from "@/domain/accounting/partnerSettlements";
import { getCustomerNotificationCopy, recordNotificationReadiness } from "@/domain/notifications/readiness";
import { revealActiveSection, setStableSearchParam } from "@/lib/activeNavigation";
import { getAiReplyText, invokeLourexAi } from "@/lib/aiClient";
import { OperationsTimelineIntelligence } from "@/features/operations-intelligence/components/OperationsTimelineIntelligence";
import { DashboardPageShell, DashboardSection, DashboardGrid } from "@/components/layout";
import { cn } from "@/lib/utils";

type ShipmentAiContext = {
  trackingId: string;
  dealNumber?: string | null;
  stage: string;
  nextStage?: string | null;
  destination: string;
  lastUpdated: string;
  customerVisibleNote?: string | null;
  timelineCount: number;
  recentTimeline: Array<{
    stageCode: string;
    visibility: string;
    customerNote?: string;
    occurredAt: string;
  }>;
};

const buildShipmentAiContext = (
  shipment: Awaited<ReturnType<typeof loadShipments>>[number],
  nextStageCode: string | null,
): ShipmentAiContext => ({
  trackingId: shipment.trackingId,
  dealNumber: shipment.dealNumber,
  stage: shipment.stage,
  nextStage: nextStageCode,
  destination: shipment.destination,
  lastUpdated: shipment.updatedAt,
  customerVisibleNote: shipment.customerVisibleNote,
  timelineCount: shipment.timeline.length,
  recentTimeline: shipment.timeline.slice(-5).map((event) => ({
    stageCode: event.stageCode,
    visibility: event.visibility,
    customerNote: event.customerNote,
    occurredAt: event.occurredAt,
  })),
});

const buildLocalShipmentReview = (context: ShipmentAiContext, lang: string) => {
  const daysStale = Math.max(
    0,
    Math.floor((Date.now() - new Date(context.lastUpdated).getTime()) / 86_400_000),
  );
  const hasCustomerNote = Boolean(context.customerVisibleNote?.trim()) ||
    context.recentTimeline.some((event) => event.visibility === "customer_visible" && event.customerNote?.trim());

  return lang === "ar"
    ? [
        `مراجعة مخاطر الشحنة ${context.trackingId}`,
        `- المرحلة الحالية: ${context.stage}`,
        `- المرحلة التالية: ${context.nextStage || "لا توجد مرحلة تالية"}`,
        `- آخر تحديث منذ ${daysStale} يوم/أيام.`,
        `- ملاحظة للعميل: ${hasCustomerNote ? "متوفرة" : "غير متوفرة وتحتاج صياغة آمنة"}.`,
        `- توصية مراجعة: تحقق من سبب التأخير قبل تحديث العميل، ولا تغير المرحلة إلا بعد تأكيد تشغيلي.`,
        `- مسودة رسالة آمنة للعميل: نتابع شحنتكم حالياً في مرحلة ${context.stage}، وسنشارككم أي تحديث مؤكد فور توفره.`,
      ].join("\n")
    : [
        `Shipment risk review for ${context.trackingId}`,
        `- Current stage: ${context.stage}`,
        `- Next stage: ${context.nextStage || "No next stage"}`,
        `- Last update was ${daysStale} day(s) ago.`,
        `- Customer-visible note: ${hasCustomerNote ? "present" : "missing and should be drafted safely"}.`,
        `- Review recommendation: verify the delay reason before customer updates, and do not advance the stage without operational confirmation.`,
        `- Customer-safe draft: We are currently following your shipment at the ${context.stage} stage and will share confirmed updates as soon as available.`,
      ].join("\n");
};

type ShipmentIntelligenceAiMode = "shipment_briefing" | "shipment_customer_update_draft" | "shipment_document_review";

const buildLocalShipmentIntelligenceReview = (
  shipment: Awaited<ReturnType<typeof loadShipments>>[number],
  analysis: ShipmentIntelligenceAnalysis,
  mode: ShipmentIntelligenceAiMode,
  lang: string,
) => {
  if (lang === "ar") {
    const heading =
      mode === "shipment_customer_update_draft"
        ? "مسودة تحديث آمن للعميل"
        : mode === "shipment_document_review"
          ? "مراجعة مستندات الشحنة"
          : "موجز ذكاء الشحنة";

    return [
      `${heading}: ${shipment.trackingId}`,
      `- الحالة الصحية: ${analysis.healthState}`,
      `- درجة الصحة: ${analysis.healthScore}%.`,
      `- آخر تحديث تشغيلي منذ ${analysis.staleDays} يوم/أيام.`,
      `- إشارات المراجعة: ${analysis.riskFlags.length ? analysis.riskFlags.join(", ") : "لا توجد إشارات حرجة"}.`,
      "- الإجراء الداخلي التالي: راجع إشارات المخاطر والمستندات قبل أي تحديث مرحلة أو رسالة للعميل.",
      "- مسودة آمنة للعميل: نتابع شحنتكم حالياً في المرحلة المسجلة، وسنشارك أي تحديث مؤكد فور توفره.",
    ].join("\n");
  }

  const heading =
    mode === "shipment_customer_update_draft"
      ? "Customer-safe shipment update draft"
      : mode === "shipment_document_review"
        ? "Shipment document review"
        : "Shipment intelligence briefing";

  return [
    `${heading}: ${shipment.trackingId}`,
    `- Health state: ${analysis.healthState}`,
    `- Health score: ${analysis.healthScore}%.`,
    `- Last operational update was ${analysis.staleDays} day(s) ago.`,
    `- Review flags: ${analysis.riskFlags.length ? analysis.riskFlags.join(", ") : "no critical flags"}.`,
    "- Next internal action: review risk and document signals before any stage update or customer message.",
    "- Customer-safe draft: We are following your shipment at the current confirmed stage and will share verified updates as soon as they are available.",
  ].join("\n");
};

export default function TrackingPage() {
  const { lang, locale, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuthSession();
  const isInternal = isInternalRole(profile?.role);
  const isTurkishPartner = profile?.role === "turkish_partner";
  const isSaudiPartner = profile?.role === "saudi_partner";
  const isPartnerWorkspace = isTurkishPartner || isSaudiPartner;
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadShipments>>>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchRequests>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof fetchDeals>>>([]);
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadPartnerSettlements>>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [internalNote, setInternalNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [aiReview, setAiReview] = useState("");
  const [aiReviewTitle, setAiReviewTitle] = useState("");
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const selectedTracking = searchParams.get("tracking");
  const selectedDeal = searchParams.get("deal");
  const detailsRef = useRef<HTMLDivElement>(null);
  const shouldRevealDetailsRef = useRef(Boolean(selectedTracking || selectedDeal));

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [shipmentRows, requestsData, dealsData, settlementData] = await Promise.all([
        loadShipments(),
        fetchRequests(),
        fetchDeals(),
        loadPartnerSettlements().catch(() => []),
      ]);
      setRows(shipmentRows);
      setRequests(requestsData);
      setDeals(dealsData);
      setSettlements(settlementData);
    } catch (error) {
      logOperationalError("tracking_load", error, { flow: "tracking_workspace" });
      const message = t("tracking.toasts.advanceError");
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredRows = useMemo(() => filterShipments(rows, deferredSearch), [deferredSearch, rows]);
  const activeShipment =
    filteredRows.find((row) => (selectedTracking ? row.trackingId === selectedTracking : row.dealNumber === selectedDeal)) ||
    filteredRows.find((row) => row.trackingId === selectedTracking) ||
    filteredRows[0] ||
    null;

  const setSelectedTracking = useCallback(
    (trackingId: string, dealNumber?: string | null, revealDetails = true, replace = false) => {
      if (!trackingId) return;

      shouldRevealDetailsRef.current = revealDetails;
      let nextParams = setStableSearchParam(searchParams, "tracking", trackingId);
      nextParams = setStableSearchParam(nextParams, "deal", dealNumber || null);
      setSearchParams(nextParams, { replace });

      if (trackingId === selectedTracking && revealDetails) {
        shouldRevealDetailsRef.current = false;
        revealActiveSection(detailsRef.current, { force: true, focus: true });
      }
    },
    [searchParams, selectedTracking, setSearchParams],
  );

  useEffect(() => {
    if (!filteredRows.length || selectedTracking || selectedDeal) return;
    setSelectedTracking(filteredRows[0].trackingId, filteredRows[0].dealNumber, false, true);
  }, [filteredRows, selectedDeal, selectedTracking, setSelectedTracking]);

  useEffect(() => {
    if (!activeShipment || !shouldRevealDetailsRef.current) return;
    shouldRevealDetailsRef.current = false;
    revealActiveSection(detailsRef.current, { force: true, focus: true });
  }, [activeShipment]);

  useEffect(() => {
    setInternalNote("");
    setCustomerNote(activeShipment?.customerVisibleNote || "");
  }, [activeShipment]);

  const currentStage = activeShipment ? getShipmentStageCopy(activeShipment.stage, lang) : null;
  const shipmentAnalysis = useMemo(
    () => (activeShipment ? analyzeShipmentIntelligence(activeShipment) : null),
    [activeShipment],
  );

  const regionalSummary = useMemo(
    () => generateRegionalOperationsSummary(requests, deals),
    [requests, deals]
  );

  const workflowDependencies = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => detectWorkflowDependencies(requests as any, deals as any),
    [requests, deals]
  );

  const coordinationWarnings = useMemo(
    () => generateCoordinationWarnings([], workflowDependencies),
    [workflowDependencies]
  );

  const partnerProfiles = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generatePartnerProfiles(requests as any, deals as any, rows, settlements),
    [requests, deals, rows, settlements]
  );

  const activePartnerProfile = useMemo(
    () => isPartnerWorkspace ? partnerProfiles.find(p => p.name === profile?.fullName) : null,
    [partnerProfiles, isPartnerWorkspace, profile?.fullName]
  );

  const partnerShipmentInsights = useMemo(
    () => activePartnerProfile ? generatePartnerShipmentInsights(activePartnerProfile.id, rows) : [],
    [activePartnerProfile, rows]
  );

  const executiveWorkspaceState = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateExecutiveWorkspaceState(requests as any, deals as any, [], settlements as any, []),
    [requests, deals, settlements]
  );
  const activeStageIndex = shipmentStages.findIndex((item) => item.code === activeShipment?.stage);
  const nextStageDefinition = getNextShipmentStage(activeShipment?.stage);
  const nextStageCode = nextStageDefinition?.code || null;
  const nextStage = nextStageCode ? getShipmentStageCopy(nextStageCode, lang) : null;
  const progressPercent = activeShipment ? getShipmentProgressPercent(activeShipment.stage) : 0;

  const canAdvance = useMemo(() => {
    if (!profile || !activeShipment) return false;
    const activeDeal = deals.find(d => d.id === activeShipment.dealId || d.dealNumber === activeShipment.dealNumber);
    return canAdvanceShipmentStage({
      role: profile.role,
      currentStage: activeShipment.stage,
      nextStage: nextStageCode,
      dealOperationalStatus: activeDeal?.operationalStatus,
    });
  }, [activeShipment, profile, nextStageCode, deals]);

  const partnerWorkspaceHint = isTurkishPartner
    ? t("tracking.partnerWorkspaceHintTurkey")
    : isSaudiPartner
      ? t("tracking.partnerWorkspaceHintSaudi")
      : null;
  const trackingRuleText = isTurkishPartner
    ? t("tracking.trackingRuleTextTurkey")
    : isSaudiPartner
      ? t("tracking.saudiRule")
      : t("tracking.internalRule");
  const searchPlaceholder = isPartnerWorkspace
    ? t("tracking.searchAssignedPlaceholder")
    : t("tracking.searchPlaceholder");

  const handleShipmentRiskReview = async () => {
    if (!activeShipment || aiReviewLoading) return;

    const shipmentContext = buildShipmentAiContext(activeShipment, nextStageCode);
    setAiReviewTitle(lang === "ar" ? "مراجعة مخاطر الشحنة" : "Shipment risk review");
    setAiReviewLoading(true);
    setAiUsedFallback(false);

    try {
      const responseLanguage = lang === "ar" ? "Arabic" : "English";
      const { data, error } = await invokeLourexAi({
        lang,
        area: "shipment_ai_risk_review",
        context: { trackingId: activeShipment.trackingId },
        body: {
          message:
            lang === "ar"
              ? `راجع مخاطر الشحنة ${activeShipment.trackingId} باللغة العربية فقط.`
              : `Review shipment risk for ${activeShipment.trackingId} in English only.`,
          messages: [],
          pageContext: "dashboard_tracking",
          route: window.location.pathname,
          locale,
          language: lang,
          responseLanguage,
          languageInstruction: `Respond in ${responseLanguage} only.`,
          userRole: profile?.role,
          analysisMode: "shipment_risk_review",
          shipmentContext,
        },
      });

      if (error) throw error;
      const reply = getAiReplyText(data);
      if (!reply) throw new Error("Empty shipment risk review");
      setAiReview(reply);
    } catch (error) {
      logOperationalError("shipment_ai_risk_review", error, { trackingId: activeShipment.trackingId });
      setAiUsedFallback(true);
      setAiReview(buildLocalShipmentReview(shipmentContext, lang));
    } finally {
      setAiReviewLoading(false);
    }
  };

  const handleShipmentIntelligenceAi = async (mode: ShipmentIntelligenceAiMode) => {
    if (!activeShipment || !shipmentAnalysis || aiReviewLoading) return;

    const shipmentContext = buildShipmentIntelligenceAiContext(activeShipment, shipmentAnalysis);
    const responseLanguage = lang === "ar" ? "Arabic" : "English";
    setAiReviewTitle(t(`tracking.intelligence.aiActions.${mode}`));
    setAiReviewLoading(true);
    setAiUsedFallback(false);

    try {
      const { data, error } = await invokeLourexAi({
        lang,
        area: "shipment_ai_intelligence_review",
        context: { trackingId: activeShipment.trackingId, mode },
        body: {
          message:
            lang === "ar"
              ? `راجع ذكاء الشحنة ${activeShipment.trackingId} باللغة العربية فقط.`
              : `Review shipment intelligence for ${activeShipment.trackingId} in English only.`,
          messages: [],
          pageContext: "dashboard_tracking",
          route: window.location.pathname,
          locale,
          language: lang,
          responseLanguage,
          languageInstruction: `Respond in ${responseLanguage} only.`,
          userRole: profile?.role,
          analysisMode: mode,
          shipmentContext,
        },
      });

      if (error) throw error;
      const reply = getAiReplyText(data);
      if (!reply) throw new Error("Empty shipment intelligence review");
      setAiReview(reply);
    } catch (error) {
      logOperationalError("shipment_ai_intelligence_review", error, {
        trackingId: activeShipment.trackingId,
        mode,
      });
      setAiUsedFallback(true);
      setAiReview(buildLocalShipmentIntelligenceReview(activeShipment, shipmentAnalysis, mode, lang));
    } finally {
      setAiReviewLoading(false);
    }
  };

  const handleAdvance = async () => {
    if (!activeShipment || !nextStageCode || !nextStage) return;
    if (submitting) return;

    if (!internalNote.trim()) {
      toast.error(t("tracking.toasts.noteRequired"));
      return;
    }

    setSubmitting(true);

    try {
      await createTrackingUpdate({
        shipmentId: activeShipment.id,
        dealId: activeShipment.dealId || undefined,
        stageCode: nextStageCode,
        note: internalNote,
        customerNote,
        visibility: customerNote.trim() ? "customer_visible" : "internal",
      });

      toast.success(
        `${activeShipment.trackingId}: ${t("tracking.toasts.advanced", { stage: nextStage.label })}`,
      );
      void recordNotificationReadiness({
        eventType: "shipment_status_changed",
        orderId: activeShipment.dealId,
        trackingId: activeShipment.trackingId,
        metadata: { nextStage: nextStageCode },
      }).catch((notificationError) => {
        logOperationalError("shipment_notification_readiness", notificationError, { trackingId: activeShipment.trackingId });
      });
      toast.info(getCustomerNotificationCopy(lang));
      await refresh();
    } catch (error: unknown) {
      logOperationalError("tracking_advance", error, {
        flow: "tracking_workspace",
        shipmentId: activeShipment.id,
        stageCode: nextStageCode,
      });
      const message = error instanceof Error ? error.message : t("tracking.toasts.advanceError");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardGrid variant="balanced">
          <Skeleton className="h-[32rem] w-full rounded-[2rem]" />
          <Skeleton className="h-[32rem] w-full rounded-[2rem]" />
        </DashboardGrid>
      </DashboardPageShell>
    );
  }

  if (!activeShipment) {
    return (
      <DashboardPageShell>
        <div className="space-y-4">
          {loadError ? (
            <div className="rounded-[1.25rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
              {loadError}
            </div>
          ) : null}
          <EmptyState
            icon={Route}
            title={t("tracking.noShipments")}
            description={t("tracking.noTimelineDescription")}
          />
        </div>
      </DashboardPageShell>
    );
  }

  const visibilityLabel = (visibility: "internal" | "customer_visible") =>
    visibility === "customer_visible" ? t("tracking.visibilityCustomer") : t("tracking.visibilityInternal");

  return (
    <DashboardPageShell dir={lang === "ar" ? "rtl" : "ltr"}>
       <DashboardSection
        title={t("tracking.contextTitle")}
        description={partnerWorkspaceHint || t("tracking.contextEyebrow")}
        icon={<Files className="h-6 w-6" />}
        headerAction={
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="ps-9 bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20 h-10"
              />
            </div>
            <Button variant="outline" size="lg" onClick={() => void refresh()} className="rounded-2xl border-amber-200/10 bg-stone-900/40 text-stone-200 hover:text-amber-200 h-12 px-6">
              <RefreshCcw className={cn("me-2 h-4 w-4", loading && "animate-spin text-amber-500")} />
              <span className="font-bold">{t("common.refresh")}</span>
            </Button>
          </div>
        }
      >
        <DashboardGrid variant="main">
          <div className="space-y-12">
            <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                 <div>
                  <p className="text-[10px] font-black uppercase text-amber-500/80 tracking-widest">{t("tracking.currentStage")}</p>
                  <h3 className="mt-1 font-serif text-3xl font-bold text-stone-100">{currentStage?.label || t("tracking.noStage")}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-stone-600 tracking-widest">Progress</p>
                  <p className="text-2xl font-black text-amber-500">{progressPercent}%</p>
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-stone-950/40 mb-6">
                <div className="h-full rounded-full bg-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800">
                  <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{t("tracking.labels.stageCode")}</p>
                  <p className="font-bold text-stone-300">{activeShipment.stage}</p>
                </div>
                <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800">
                  <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest">{t("tracking.labels.nextStage")}</p>
                  <p className="font-bold text-stone-300 truncate">{nextStage?.label || t("tracking.completedMessage")}</p>
                </div>
              </div>

              <p className="text-sm text-stone-400 leading-relaxed font-medium mb-6">{currentStage?.description}</p>
              {currentStage?.owner && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-200 uppercase tracking-widest">
                  Owner: {currentStage.owner}
                </div>
              )}
            </BentoCard>

            {isInternal && shipmentAnalysis && (
              <ShipmentIntelligencePanel
                shipment={activeShipment}
                analysis={shipmentAnalysis}
                lang={lang}
                locale={locale}
                t={t}
                internal
                aiOutput={aiReview}
                aiOutputTitle={aiReviewTitle}
                aiLoading={aiReviewLoading}
                aiUsedFallback={aiUsedFallback}
                onRunAi={(mode) => void handleShipmentIntelligenceAi(mode)}
              />
            )}

            <DashboardSection title={t("commandCenter.systemicCoordination")} description={t("commandCenter.systemicCoordinationDescription")}>
              <div className="space-y-6">
                <OperationalPressureMap pressures={executiveWorkspaceState.pressureMap.filter(p => p.zone.includes('Turkey') || p.zone.includes('Logistics'))} />
                <CommandPriorityMatrix priorities={executiveWorkspaceState.priorityMatrix.filter(p => p.pressureType === 'Operational')} />
                <CoordinationWarningsPanel warnings={coordinationWarnings} />
                <WorkflowDependencyMap dependencies={workflowDependencies} />
                <RegionalOperationsVisibility regions={regionalSummary} />
              </div>
            </DashboardSection>

            <BentoCard className="p-0 border-amber-200/10 bg-stone-900/50 overflow-hidden">
               <div className="p-6 border-b border-amber-200/10">
                <h3 className="font-bold text-stone-100 uppercase tracking-widest text-xs">{t("tracking.labels.updatesLog")}</h3>
              </div>
              <div className="divide-y divide-amber-200/5 max-h-[40rem] overflow-y-auto">
                {activeShipment.timeline.length === 0 ? (
                  <div className="p-12 text-center text-stone-600 italic">No updates logged yet.</div>
                ) : (
                  activeShipment.timeline.slice().reverse().map((event) => (
                    <div key={event.id} className="p-6 hover:bg-stone-800/20 transition-colors">
                       <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="font-bold text-stone-100">{getShipmentStageCopy(event.stageCode, lang)?.label || event.stageCode}</p>
                          <p className="text-[10px] font-black text-stone-600 uppercase mt-1">{new Date(event.occurredAt).toLocaleString(locale)}</p>
                        </div>
                        {isInternal && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-200 uppercase tracking-widest">
                            {visibilityLabel(event.visibility)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-400 leading-relaxed font-medium italic">"{event.note || t("tracking.noInternalNote")}"</p>
                    </div>
                  ))
                )}
              </div>
            </BentoCard>
          </div>

          <aside className="space-y-12">
            <BentoCard className="p-6 border-amber-200/15 bg-stone-900/55">
               <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl font-bold text-stone-100">{t("tracking.labels.officialTimeline")}</h3>
              </div>
              <ShipmentTimeline currentStage={activeShipment.stage} />
            </BentoCard>

            {isInternal && (
              <OperationsTimelineIntelligence
                stages={[
                  { id: '1', name: 'Order Validation', nameAr: 'تأكيد الطلب', status: 'completed', confidence: 100 },
                  { id: '2', name: 'Factory Preparation', nameAr: 'تجهيز المصنع', status: activeStageIndex >= 0 ? 'completed' : 'in_progress', confidence: 95 },
                  { id: '3', name: 'International Transit', nameAr: 'الشحن الدولي', status: activeStageIndex >= 5 ? 'completed' : (activeStageIndex >= 4 ? 'in_progress' : 'pending'), confidence: 85 },
                  { id: '4', name: 'Customs Clearance', nameAr: 'التخليص الجمركي', status: activeStageIndex >= 7 ? 'completed' : (activeStageIndex >= 6 ? 'in_progress' : 'pending'), confidence: 70 },
                  { id: '5', name: 'Final Delivery', nameAr: 'التسليم النهائي', status: activeStageIndex >= 9 ? 'completed' : (activeStageIndex >= 8 ? 'in_progress' : 'pending'), confidence: 90 },
                ]}
              />
            )}

            {isInternal && nextStage ? (
              <DashboardSection title="Action Center" icon={<Send className="h-6 w-6" />}>
                <BentoCard className="p-6 border-amber-200/10 bg-stone-900/50 space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-500/80 tracking-widest mb-1">Next Action</p>
                    <p className="text-sm font-bold text-stone-100">{t("tracking.advance", { stage: nextStage.label })}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("tracking.internalPlaceholder")}</Label>
                      <Textarea
                        rows={4}
                        value={internalNote}
                        onChange={(event) => setInternalNote(event.target.value)}
                        className="bg-stone-950/40 border-amber-200/10 text-stone-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{t("tracking.customerPlaceholder")}</Label>
                      <Textarea
                        rows={3}
                        value={customerNote}
                        onChange={(event) => setCustomerNote(event.target.value)}
                        className="bg-stone-950/40 border-amber-200/10 text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-amber-200/5">
                     <Button className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-black text-stone-950 shadow-xl hover:brightness-110 uppercase tracking-widest" disabled={!canAdvance || submitting} onClick={handleAdvance}>
                      {submitting ? t("tracking.advancing") : t("tracking.advance", { stage: nextStage.label })}
                    </Button>
                    <p className="mt-4 text-center text-[10px] font-bold text-stone-600 uppercase tracking-widest leading-relaxed">{trackingRuleText}</p>
                  </div>
                </BentoCard>
              </DashboardSection>
            ) : (
               !isInternal && nextStage ? null : (
                <BentoCard className="p-6 border-emerald-500/20 bg-emerald-500/5 text-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-emerald-200">{t("tracking.completedMessage")}</p>
                </BentoCard>
              )
            )}

            <div className="space-y-4">
               {isInternal && activeShipment.dealNumber && (
                <>
                  <Link to={`/dashboard/deals?deal=${activeShipment.dealNumber}`} className="flex items-center justify-between p-4 rounded-2xl border border-amber-200/10 bg-stone-900/50 hover:bg-stone-800 transition-colors group">
                    <div className="flex items-center gap-3 text-stone-100 font-bold text-sm">
                      <ArrowRightLeft className="h-4 w-4 text-amber-500" />
                      {t("tracking.backToDeal")}
                    </div>
                    <ChevronRight className="h-4 w-4 text-stone-600 group-hover:translate-x-1 transition-transform" />
                  </Link>
                   <Link to={`/dashboard/accounting?deal=${activeShipment.dealNumber}`} className="flex items-center justify-between p-4 rounded-2xl border border-amber-200/10 bg-stone-900/50 hover:bg-stone-800 transition-colors group">
                    <div className="flex items-center gap-3 text-stone-100 font-bold text-sm">
                      <PackageSearch className="h-4 w-4 text-amber-500" />
                      {t("tracking.openAccounting")}
                    </div>
                    <ChevronRight className="h-4 w-4 text-stone-600 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </>
              )}
            </div>

             <DashboardSection title="Recent Shipments">
              <div className="space-y-3">
                {filteredRows.slice(0, 10).map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setSelectedTracking(row.trackingId, row.dealNumber)}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-start transition-all",
                      activeShipment.id === row.id
                        ? "border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-950/20"
                        : "border-amber-200/5 bg-stone-900/30 hover:border-amber-200/20"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-stone-100 text-sm">{row.trackingId}</p>
                        <p className="text-[10px] font-black text-stone-600 uppercase mt-1">{row.dealNumber || "Unlinked"}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
                        {row.stage}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </DashboardSection>
          </aside>
        </DashboardGrid>
      </DashboardSection>
    </DashboardPageShell>
  );
}
