import { useEffect, useMemo, useState } from "react";
import { PackageSearch, Route } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShipmentTimeline } from "@/features/tracking/components/ShipmentTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { loadShipments } from "@/lib/operationsDomain";
import { getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import { useI18n } from "@/lib/i18n";

export default function CustomerTrackingPage() {
  const { lang, locale, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadShipments>>>([]);
  const [loading, setLoading] = useState(true);

  const selectedTracking = searchParams.get("tracking");
  const selectedDeal = searchParams.get("deal");

  useEffect(() => {
    const refresh = async () => {
      setLoading(true);
      try {
        setRows(await loadShipments());
      } finally {
        setLoading(false);
      }
    };

    void refresh();
  }, []);

  const activeShipment =
    rows.find((row) => (selectedTracking ? row.trackingId === selectedTracking : row.dealNumber === selectedDeal)) ||
    rows.find((row) => row.trackingId === selectedTracking) ||
    rows[0] ||
    null;

  useEffect(() => {
    if (!rows.length || activeShipment) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tracking", rows[0].trackingId);
    setSearchParams(nextParams, { replace: true });
  }, [activeShipment, rows, searchParams, setSearchParams]);

  const currentStage = activeShipment ? getShipmentStageCopy(activeShipment.stage, lang) : null;
  const activeStageIndex = shipmentStages.findIndex((item) => item.code === activeShipment?.stage);

  const setSelectedTracking = (trackingId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tracking", trackingId);
    nextParams.delete("deal");
    setSearchParams(nextParams);
  };

  const shipmentMetrics = useMemo(
    () => ({
      total: rows.length,
      completed: rows.filter((row) => row.stage === "delivered").length,
      active: rows.filter((row) => row.stage !== "delivered").length,
      updates: rows.reduce((sum, row) => sum + row.timeline.length, 0),
    }),
    [rows],
  );

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
        <Skeleton className="h-[32rem] w-full rounded-[2rem]" />
        <Skeleton className="h-[32rem] w-full rounded-[2rem]" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon={Route}
        title={t("tracking.noTimelineTitle")}
        description={t("tracking.noShipments")}
      />
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

  return (
    <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
      <BentoCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("customerPortal.actions.tracking.title")}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold">{t("tracking.contextTitle")}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("customerPortal.actions.tracking.description")}</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: t("common.all"), value: shipmentMetrics.total },
            { label: t("statuses.delivered"), value: shipmentMetrics.completed },
            { label: t("common.active"), value: shipmentMetrics.active },
            { label: t("tracking.labels.loggedUpdates"), value: shipmentMetrics.updates },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.2rem] bg-secondary/20 p-4 text-center">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedTracking(row.trackingId)}
              className={`w-full rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                activeShipment.id === row.id
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/60 bg-secondary/15 hover:border-primary/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{row.trackingId}</p>
                  <p className="mt-2 font-medium">{row.destination}</p>
                  {row.dealNumber ? (
                    <p className="mt-1 text-sm text-muted-foreground">{t("tracking.linkedDeal", { deal: row.dealNumber })}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {t(`tracking.stages.${row.stage}`)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </BentoCard>

      <div className="space-y-4">
        <BentoCard className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{activeShipment.trackingId}</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">{currentStage?.label || t("tracking.noStage")}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{currentStage?.description}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: t("tracking.labels.destination"), value: activeShipment.destination },
              { label: t("tracking.labels.deal"), value: activeShipment.dealNumber || t("tracking.unlinked") },
              { label: t("tracking.labels.lastUpdated"), value: new Date(activeShipment.updatedAt).toLocaleString(locale) },
              {
                label: t("tracking.labels.remainingStages"),
                value: String(activeStageIndex >= 0 ? shipmentStages.length - activeStageIndex - 1 : shipmentStages.length),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.2rem] bg-secondary/25 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-medium">{item.value}</p>
              </div>
            ))}
          </div>

          {activeShipment.customerVisibleNote ? (
            <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
              {activeShipment.customerVisibleNote}
            </div>
          ) : null}
        </BentoCard>

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
            <Route className="h-5 w-5 text-primary" />
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
                  <div key={event.id} className="rounded-[1.3rem] border border-border/60 bg-secondary/10 p-4">
                    <div>
                      <p className="font-medium">{getShipmentStageCopy(event.stageCode, lang)?.label || event.stageCode}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString(locale)}</p>
                    </div>

                    {event.customerNote ? (
                      <div className="mt-3 rounded-[1rem] border border-primary/15 bg-primary/8 px-4 py-3 text-sm text-muted-foreground">
                        {event.customerNote}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm italic text-muted-foreground">{t("tracking.noCustomerNote")}</p>
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
