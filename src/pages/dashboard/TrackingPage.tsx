import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Loader2, PackageSearch, RefreshCcw, Route, Search, Send, ShieldCheck, Sparkles } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { createTrackingUpdate, loadShipments } from "@/lib/operationsDomain";
import { getNextShipmentStage, getShipmentProgressPercent, getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import { isInternalRole } from "@/features/auth/rbac";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { canAdvanceShipmentStage } from "@/domain/operations/guards";
import { logOperationalError } from "@/lib/monitoring";
import { filterShipments } from "@/lib/adminOperations";
import { revealActiveSection, setStableSearchParam } from "@/lib/activeNavigation";
import { supabase } from "@/integrations/supabase/client";

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
      setRows(await loadShipments());
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
  const activeStageIndex = shipmentStages.findIndex((item) => item.code === activeShipment?.stage);
  const nextStageDefinition = getNextShipmentStage(activeShipment?.stage);
  const nextStageCode = nextStageDefinition?.code || null;
  const nextStage = nextStageCode ? getShipmentStageCopy(nextStageCode, lang) : null;
  const progressPercent = activeShipment ? getShipmentProgressPercent(activeShipment.stage) : 0;

  const canAdvance = useMemo(() => {
    if (!profile || !activeShipment) return false;
    return canAdvanceShipmentStage({
      role: profile.role,
      currentStage: activeShipment.stage,
      nextStage: nextStageCode,
    });
  }, [activeShipment, profile, nextStageCode]);
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
      const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
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
      const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
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
      const { data, error } = await supabase.functions.invoke("lourex-ai-chat", {
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
      const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
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
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <Skeleton className="h-[32rem] w-full rounded-[2rem]" />
        <Skeleton className="h-[32rem] w-full rounded-[2rem]" />
      </div>
    );
  }

  if (!activeShipment) {
    return (
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
    );
  }

  const visibilityLabel = (visibility: "internal" | "customer_visible") =>
    visibility === "customer_visible" ? t("tracking.visibilityCustomer") : t("tracking.visibilityInternal");

  return (
    <div className="grid w-full max-w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
      <BentoCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("tracking.contextEyebrow")}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold">{t("tracking.contextTitle")}</h2>
          {activeShipment.dealNumber ? <p className="mt-2 text-sm text-muted-foreground">{t("tracking.linkedDeal", { deal: activeShipment.dealNumber })}</p> : null}
          {partnerWorkspaceHint ? <p className="mt-3 text-sm leading-7 text-muted-foreground">{partnerWorkspaceHint}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="ps-9"
            />
          </div>
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCcw className="me-2 h-4 w-4" />
            {t("common.refresh")}
          </Button>
        </div>

        {loadError ? (
          <div className="rounded-[1.25rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
            {loadError}
          </div>
        ) : null}

        <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-primary/80">{t("tracking.currentStage")}</p>
          <p className="mt-2 font-serif text-2xl font-semibold">{currentStage?.label || t("tracking.noStage")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("tracking.labels.stageCode")}: {activeShipment.stage}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("tracking.labels.nextStage")}: {nextStage?.label || t("tracking.completedMessage")}
          </p>
          <div className="mt-4 h-2 rounded-full bg-secondary">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{progressPercent}%</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{currentStage?.description}</p>
          {currentStage?.owner ? <p className="mt-3 text-sm font-medium text-primary/90">{t("tracking.owner", { value: currentStage.owner })}</p> : null}
        </div>

        {isInternal && shipmentAnalysis ? (
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
        ) : null}

        {isInternal ? (
          <div className="rounded-[1.35rem] border border-primary/20 bg-[#080808] p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {lang === "ar" ? "مراجعة مخاطر الشحنة بالذكاء الاصطناعي" : "AI shipment risk review"}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                    {lang === "ar" ? "مراجعة إرشادية فقط ولا تغيّر مراحل الشحن." : "Read-only review. It never advances shipment stages."}
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={aiReviewLoading} onClick={() => void handleShipmentRiskReview()}>
                {aiReviewLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Sparkles className="me-2 h-4 w-4" />}
                {lang === "ar" ? "راجع المخاطر" : "Review risk"}
              </Button>
            </div>
            {aiUsedFallback ? (
              <div className="mt-4 rounded-[1rem] border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
                {lang === "ar" ? "مساعد LOUREX AI غير متاح الآن. تم استخدام مراجعة محلية." : "LOUREX AI is unavailable right now. A local review was used."}
              </div>
            ) : null}
            {aiReview ? (
              <pre className="mt-4 max-h-[22rem] whitespace-pre-wrap break-words rounded-[1rem] border border-primary/15 bg-secondary/15 p-4 font-sans text-sm leading-7 text-foreground">
                {aiReview}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          {[
            { label: t("tracking.labels.trackingNumber"), value: activeShipment.trackingId },
            { label: t("tracking.labels.customer"), value: activeShipment.clientName },
            { label: t("tracking.labels.destination"), value: activeShipment.destination },
            { label: t("tracking.labels.weight"), value: `${activeShipment.weight.toLocaleString(locale)} kg` },
            { label: t("tracking.labels.pallets"), value: activeShipment.pallets.toLocaleString(locale) },
            { label: t("tracking.labels.deal"), value: activeShipment.dealNumber || t("tracking.unlinked") },
            { label: t("tracking.labels.lastUpdated"), value: new Date(activeShipment.updatedAt).toLocaleString(locale) },
          ].map((item) => {
            if (item.label === t("tracking.labels.customer") && !isInternal) return null;
            return (
              <div key={item.label} className="min-w-0 rounded-[1.2rem] bg-secondary/25 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 break-words font-medium">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: t("tracking.labels.completedStages"), value: Math.max(activeStageIndex, 0) },
            { label: t("tracking.labels.remainingStages"), value: activeStageIndex >= 0 ? shipmentStages.length - activeStageIndex - 1 : shipmentStages.length },
            { label: t("tracking.labels.loggedUpdates"), value: activeShipment.timeline.length },
          ].map((item) => (
            <div key={item.label} className="min-w-0 rounded-[1.2rem] bg-secondary/20 p-4 text-center">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {filteredRows.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/10 p-6">
              <EmptyState icon={Route} title={t("tracking.noTimelineTitle")} description={t("tracking.noMatches")} />
            </div>
          ) : (
            filteredRows.map((row) => (
              <button
                key={row.id}
                type="button"
                aria-current={activeShipment.id === row.id ? "true" : undefined}
                onClick={() => setSelectedTracking(row.trackingId, row.dealNumber)}
                className={`block w-full max-w-full min-w-0 rounded-[1.3rem] border px-4 py-4 text-start transition-colors ${
                  activeShipment.id === row.id ? "border-primary/30 bg-primary/10" : "border-border/60 bg-secondary/10 hover:border-primary/20"
                }`}
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{row.trackingId}</p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{row.dealNumber || t("tracking.unlinked")}</p>
                  </div>
                  <span className="max-w-full self-start break-words rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                    {getShipmentStageCopy(row.stage, lang)?.label || row.stage}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {isInternal && nextStage ? (
          <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
            <div className="flex items-center gap-3">
              <Send className="h-4 w-4 text-primary" />
              <p className="font-medium">{t("tracking.labels.nextStage")}</p>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{t("tracking.nextStageSuggested", { stage: nextStage.label })}</p>

            <Textarea
              rows={4}
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              className="mt-4"
              placeholder={t("tracking.internalPlaceholder")}
            />

            <Textarea
              rows={3}
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
              className="mt-4"
              placeholder={t("tracking.customerPlaceholder")}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-6 text-muted-foreground">
                {trackingRuleText}
              </p>

              <Button variant="gold" className="w-full sm:w-auto" disabled={!canAdvance || submitting} onClick={handleAdvance}>
                {submitting ? t("tracking.advancing") : t("tracking.advance", { stage: nextStage.label })}
              </Button>
            </div>
          </div>
        ) : (
          !isInternal && nextStage ? null : (
            <div className="rounded-[1.35rem] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-100">
              {t("tracking.completedMessage")}
            </div>
          )
        )}

        <div className="grid gap-3">
          {activeShipment.dealNumber ? (
            <>
              {isInternal && (
                <>
                  <Link
                    to={`/dashboard/deals?deal=${activeShipment.dealNumber}`}
                    className="flex items-center gap-3 rounded-[1.25rem] border border-border/60 bg-secondary/15 px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    {t("tracking.backToDeal")}
                  </Link>

                  <Link
                    to={`/dashboard/accounting?deal=${activeShipment.dealNumber}`}
                    className="flex items-center gap-3 rounded-[1.25rem] border border-border/60 bg-secondary/15 px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
                  >
                    <PackageSearch className="h-4 w-4" />
                    {t("tracking.openAccounting")}
                  </Link>
                </>
              )}
            </>
          ) : null}
        </div>
      </BentoCard>

      <div ref={detailsRef} tabIndex={-1} className="min-w-0 space-y-4 scroll-mt-24 outline-none">
        <BentoCard className="p-6">
          <div className="mb-6 flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PackageSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="break-words font-serif text-2xl font-semibold">{t("tracking.labels.officialTimeline")}</h2>
              <p className="break-words text-sm text-muted-foreground">{t("tracking.labels.officialTimelineDescription")}</p>
            </div>
          </div>

          <ShipmentTimeline currentStage={activeShipment.stage} />
        </BentoCard>

        <BentoCard className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-semibold">{t("tracking.labels.updatesLog")}</h2>
          </div>

          {activeShipment.timeline.length === 0 ? (
            <EmptyState
              icon={Route}
              title={t("tracking.noUpdatesTitle")}
              description={t("tracking.noUpdatesDescription")}
            />
          ) : (
            <div className="space-y-3">
              {activeShipment.timeline
                .slice()
                .reverse()
                .map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[1.3rem] border border-border/60 bg-secondary/10 p-4"
                  >
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{getShipmentStageCopy(event.stageCode, lang)?.label || event.stageCode}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString(locale)}</p>
                      </div>

                      {isInternal && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {visibilityLabel(event.visibility)}
                        </span>
                      )}
                    </div>

                    {isInternal && (
                      <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                        {event.note || t("tracking.noInternalNote")}
                      </p>
                    )}

                    {event.customerNote ? (
                      <div className="mt-3 rounded-[1rem] border border-primary/15 bg-primary/8 px-4 py-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{t("tracking.customerNoteLabel")}:</span>{" "}
                        {event.customerNote}
                      </div>
                    ) : (
                      !isInternal && !event.customerNote && (
                        <p className="mt-3 text-sm italic text-muted-foreground">
                          {t("tracking.noCustomerNote")}
                        </p>
                      )
                    )}
                  </div>
                ))}
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
}
