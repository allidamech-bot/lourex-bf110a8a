import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, PackageSearch, RefreshCcw, Route, Search, Send, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShipmentTimeline } from "@/features/tracking/components/ShipmentTimeline";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { createTrackingUpdate, loadShipments } from "@/lib/operationsDomain";
import { getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import { isInternalRole } from "@/features/auth/rbac";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { canAdvanceShipmentStage } from "@/domain/operations/guards";
import { logOperationalError } from "@/lib/monitoring";
import { filterShipments } from "@/lib/adminOperations";

export default function TrackingPage() {
  const { lang, locale, t } = useI18n();
  const [searchParams] = useSearchParams();
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
  const selectedTracking = searchParams.get("tracking");
  const selectedDeal = searchParams.get("deal");

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

  useEffect(() => {
    setInternalNote("");
    setCustomerNote(activeShipment?.customerVisibleNote || "");
  }, [activeShipment?.customerVisibleNote, activeShipment?.id]);

  const currentStage = activeShipment ? getShipmentStageCopy(activeShipment.stage, lang) : null;
  const activeStageIndex = shipmentStages.findIndex((item) => item.code === activeShipment?.stage);
  const nextStageCode = activeStageIndex >= 0 ? shipmentStages[activeStageIndex + 1]?.code : null;
  const nextStage = nextStageCode ? getShipmentStageCopy(nextStageCode, lang) : null;

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
      <EmptyState
        icon={Route}
        title={t("tracking.noTimelineTitle")}
        description={t("tracking.noTimelineDescription")}
      />
    );
  }

  const visibilityLabel = (visibility: "internal" | "customer_visible") =>
    visibility === "customer_visible" ? t("tracking.visibilityCustomer") : t("tracking.visibilityInternal");

  return (
    <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
      <BentoCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("tracking.contextEyebrow")}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold">{t("tracking.contextTitle")}</h2>
          {activeShipment.dealNumber ? <p className="mt-2 text-sm text-muted-foreground">{t("tracking.linkedDeal", { deal: activeShipment.dealNumber })}</p> : null}
          {partnerWorkspaceHint ? <p className="mt-3 text-sm leading-7 text-muted-foreground">{partnerWorkspaceHint}</p> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
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
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{currentStage?.description}</p>
          {currentStage?.owner ? <p className="mt-3 text-sm font-medium text-primary/90">{t("tracking.owner", { value: currentStage.owner })}</p> : null}
        </div>

        <div className="space-y-3">
          {[
            { label: t("tracking.labels.trackingNumber"), value: activeShipment.trackingId },
            { label: t("tracking.labels.customer"), value: activeShipment.clientName },
            { label: t("tracking.labels.destination"), value: activeShipment.destination },
            { label: t("tracking.labels.deal"), value: activeShipment.dealNumber || t("tracking.unlinked") },
            { label: t("tracking.labels.lastUpdated"), value: new Date(activeShipment.updatedAt).toLocaleString(locale) },
          ].map((item) => {
            if (item.label === t("tracking.labels.customer") && !isInternal) return null;
            return (
              <div key={item.label} className="rounded-[1.2rem] bg-secondary/25 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-medium">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("tracking.labels.completedStages"), value: Math.max(activeStageIndex, 0) },
            { label: t("tracking.labels.remainingStages"), value: activeStageIndex >= 0 ? shipmentStages.length - activeStageIndex - 1 : shipmentStages.length },
            { label: t("tracking.labels.loggedUpdates"), value: activeShipment.timeline.length },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.2rem] bg-secondary/20 p-4 text-center">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
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
              <Link
                key={row.id}
                to={`/dashboard/tracking?deal=${row.dealNumber || ""}&tracking=${row.trackingId}`}
                className={`block rounded-[1.3rem] border px-4 py-4 transition-colors ${
                  activeShipment.id === row.id ? "border-primary/30 bg-primary/10" : "border-border/60 bg-secondary/10 hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.trackingId}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{row.dealNumber || t("tracking.unlinked")}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                    {getShipmentStageCopy(row.stage, lang)?.label || row.stage}
                  </span>
                </div>
              </Link>
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

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs leading-6 text-muted-foreground">
                {trackingRuleText}
              </p>

              <Button variant="gold" disabled={!canAdvance || submitting} onClick={handleAdvance}>
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

      <div className="space-y-4">
        <BentoCard className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PackageSearch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold">{t("tracking.labels.officialTimeline")}</h2>
              <p className="text-sm text-muted-foreground">{t("tracking.labels.officialTimelineDescription")}</p>
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{getShipmentStageCopy(event.stageCode, lang)?.label || event.stageCode}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString(locale)}</p>
                      </div>

                      {isInternal && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {visibilityLabel(event.visibility)}
                        </span>
                      )}
                    </div>

                    {isInternal && (
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
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
