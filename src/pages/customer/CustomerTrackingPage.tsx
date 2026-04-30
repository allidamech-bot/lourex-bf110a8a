import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  PackageSearch,
  RefreshCw,
  Route,
  Search,
  Truck,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ShipmentTimeline } from "@/features/tracking/components/ShipmentTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { loadShipments, loadPurchaseRequests } from "@/lib/operationsDomain";
import { getShipmentProgressPercent, getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import { useI18n, type Lang } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { toast } from "sonner";

type CustomerShipmentRows = Awaited<ReturnType<typeof loadShipments>>;
type CustomerShipmentRow = CustomerShipmentRows[number];
type ShipmentOwnershipFields = {
  customerId?: string | null;
  customer_id?: string | null;
  customerEmail?: string | null;
  customer_email?: string | null;
  customer?: {
    id?: string | null;
    email?: string | null;
  } | null;
};

const getSafeLabel = (value: string, fallback: string) => {
  if (!value || value.includes(".")) {
    return fallback;
  }

  return value;
};

const normalizeSearchValue = (value: string | undefined | null) => {
  return (value || "").trim().toLowerCase();
};

const formatDateTime = (value: string | undefined, locale: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatNumber = (value: number, locale: string) => {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(value);
};

const getRemainingStages = (currentStage: string) => {
  const index = shipmentStages.findIndex((s) => s.code === currentStage);

  if (index === -1) return 0;

  return Math.max(0, shipmentStages.length - 1 - index);
};

const getEventTypeLabel = (eventType: string, locale: string) => {
  const labels: Record<string, { ar: string; en: string }> = {
    stage_changed: { ar: "تغيرت المرحلة", en: "Stage changed" },
    note_added: { ar: "تمت إضافة ملاحظة", en: "Note added" },
    system_created: { ar: "بدأ التتبع", en: "Timeline started" },
  };

  const label = labels[eventType];
  if (!label) return eventType.replace(/_/g, " ");
  return locale === "ar" ? label.ar : label.en;
};

const getEventStageLabel = (stage: string | null | undefined, lang: Lang) => {
  if (!stage) return "";
  return getShipmentStageCopy(stage, lang)?.label || stage;
};

const ShipmentMetricCard = ({
                              icon,
                              label,
                              value,
                            }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition-colors hover:border-blue-400/25 hover:bg-blue-500/[0.06]">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/25">
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
);

const ShipmentInfoTile = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors hover:border-blue-400/25">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-white">{value}</p>
    </div>
);

export default function CustomerTrackingPage() {
  const { locale, t, lang } = useI18n();
  const { profile } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<CustomerShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [trackInput, setTrackInput] = useState("");

  const selectedTracking = searchParams.get("tracking");
  const selectedDeal = searchParams.get("deal");
  const normalizedProfileEmail = profile?.email?.trim().toLowerCase() || "";

  const refresh = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const data = await loadShipments();

      const customerShipments = normalizedProfileEmail
          ? data.filter((row: CustomerShipmentRow & ShipmentOwnershipFields) => {
            const rowEmail = (
                row.customerEmail ||
                row.customer_email ||
                row.customer?.email ||
                ""
            )
                .trim()
                .toLowerCase();

            if (!rowEmail) {
              return true;
            }

            return rowEmail === normalizedProfileEmail;
          })
          : data;

      setRows(customerShipments);
    } catch (err) {
      logOperationalError("customer_tracking_load", err);
      setError(getSafeLabel(t("common.error"), "Error loading shipments"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedProfileEmail]);

  const filteredRows = useMemo(() => {
    const normalized = normalizeSearchValue(search);

    return rows.filter((row) => {
      const searchSource = normalizeSearchValue(
          `${row.trackingId} ${row.dealNumber || ""} ${row.destination} ${row.requestNumber || ""}`,
      );

      return !normalized || searchSource.includes(normalized);
    });
  }, [rows, search]);

  const activeShipment = useMemo(() => {
    if (!filteredRows.length) return null;

    if (selectedTracking) {
      return filteredRows.find((r) => r.trackingId === selectedTracking) || null;
    }

    if (selectedDeal) {
      return filteredRows.find((r) => r.dealNumber === selectedDeal) || null;
    }

    return filteredRows[0];
  }, [filteredRows, selectedDeal, selectedTracking]);

  useEffect(() => {
    if (activeShipment || !rows.length || !searchParams.toString()) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("tracking");
    nextParams.delete("deal");
    setSearchParams(nextParams, { replace: true });
  }, [activeShipment, filteredRows, rows.length, searchParams, selectedDeal, selectedTracking, setSearchParams]);

  const currentStage = activeShipment ? getShipmentStageCopy(activeShipment.stage, lang) : null;
  const activeStageIndex = activeShipment
      ? shipmentStages.findIndex((item) => item.code === activeShipment.stage)
      : -1;
  const progressPercent = activeShipment ? getShipmentProgressPercent(activeShipment.stage) : 0;
  const latestShipmentEvent = activeShipment?.shipmentEvents[activeShipment.shipmentEvents.length - 1] || null;

  const setSelectedTracking = (trackingId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tracking", trackingId);
    nextParams.delete("deal");
    setSearchParams(nextParams);
  };

  const handleTrackSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const normalized = trackInput.trim().toLowerCase();
    if (!normalized) {
      toast.error(t("tracking.searchInputPlaceholder"));
      return;
    }

    setSearch(trackInput);
    
    const match = rows.find(r => 
      normalizeSearchValue(r.trackingId) === normalized ||
      normalizeSearchValue(r.dealNumber || "") === normalized ||
      normalizeSearchValue(r.requestNumber || "") === normalized
    );

    if (match) {
      setSelectedTracking(match.trackingId);
    } else {
      try {
        const allRequests = await loadPurchaseRequests();
        const requestMatch = allRequests.find(r => 
          normalizeSearchValue(r.requestNumber) === normalized ||
          normalizeSearchValue(r.trackingCode || "") === normalized
        );

        if (requestMatch) {
          toast.info(t("tracking.notYetApproved"));
        } else {
          toast.error(t("tracking.noShipmentFound"));
        }
      } catch {
        toast.error(t("tracking.noShipmentFound"));
      }
    }
  };

  const shipmentMetrics = useMemo(
      () => ({
        total: rows.length,
        completed: rows.filter((row) => row.stage === "delivered").length,
        active: rows.filter((row) => row.stage !== "delivered").length,
        updates: rows.reduce((sum, row) => sum + (row.shipmentEvents?.length || row.timeline?.length || 0), 0),
      }),
      [rows],
  );

  if (loading) {
    return (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-[2rem]" />
          <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
            <Skeleton className="h-[32rem] w-full rounded-[2rem]" />
            <Skeleton className="h-[32rem] w-full rounded-[2rem]" />
          </div>
        </div>
    );
  }

  if (!rows.length) {
    return (
        <div className="space-y-4">
          <BentoCard className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t("customerPortal.actions.tracking.title")}
                </p>
                <h1 className="mt-2 font-serif text-3xl font-semibold">
                  {t("tracking.contextTitle")}
                </h1>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t("customerPortal.actions.tracking.description")}
                </p>
              </div>

              <Button
                  variant="outline"
                  onClick={() => void refresh("refresh")}
                  disabled={refreshing}
              >
                <RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {t("common.refresh")}
              </Button>
            </div>

            <div className="pt-2">
              <form 
                onSubmit={handleTrackSubmit}
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                      value={trackInput}
                      onChange={(e) => setTrackInput(e.target.value)}
                      placeholder={t("tracking.searchInputPlaceholder")}
                      className="h-12 ps-9"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 px-8">
                  {t("tracking.trackButton")}
                </Button>
              </form>
            </div>
          </BentoCard>

          <EmptyState
              icon={Route}
              title={getSafeLabel(t("tracking.noShipments"), locale === "ar" ? "لا توجد شحنات بعد" : "No shipments yet")}
              description={
                locale === "ar"
                    ? "ستظهر الشحنات هنا بعد تحويل الطلب إلى عملية تشغيلية."
                    : "Shipments will appear here after a request is converted into an operation."
              }
          />
        </div>
    );
  }

  return (
      <div className="space-y-4">
        <BentoCard className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t("customerPortal.actions.tracking.title")}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold">
                {t("tracking.contextTitle")}
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {t("customerPortal.actions.tracking.description")}
              </p>
            </div>

            <Button
                variant="outline"
                onClick={() => void refresh("refresh")}
                disabled={refreshing}
            >
              <RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing
                  ? t("common.saving")
                  : t("common.refresh")}
            </Button>
          </div>

          <div className="pt-2">
            <form 
              onSubmit={handleTrackSubmit}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={trackInput}
                    onChange={(e) => setTrackInput(e.target.value)}
                    placeholder={t("tracking.searchInputPlaceholder")}
                    className="h-12 ps-9"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8">
                {t("tracking.trackButton")}
              </Button>
            </form>
          </div>
        </BentoCard>

        <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
          <BentoCard className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
              <ShipmentMetricCard
                  icon={<Route className="h-4 w-4" />}
                  label={getSafeLabel(t("common.all"), locale === "ar" ? "الكل" : "All")}
                  value={shipmentMetrics.total}
              />
              <ShipmentMetricCard
                  icon={<Clock3 className="h-4 w-4" />}
                  label={getSafeLabel(t("common.active"), locale === "ar" ? "نشط" : "Active")}
                  value={shipmentMetrics.active}
              />
              <ShipmentMetricCard
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label={getSafeLabel(t("common.completed"), locale === "ar" ? "مكتمل" : "Completed")}
                  value={shipmentMetrics.completed}
              />
              <ShipmentMetricCard
                  icon={<PackageSearch className="h-4 w-4" />}
                  label={getSafeLabel(t("common.updates"), locale === "ar" ? "تحديثات" : "Updates")}
                  value={shipmentMetrics.updates}
              />
            </div>

            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={getSafeLabel(
                      t("common.search"),
                      locale === "ar" ? "بحث في الشحنات..." : "Search shipments...",
                  )}
                  className="ps-9"
              />
            </div>

            <div className="space-y-3">
              {filteredRows.map((row) => {
                const isSelected = activeShipment?.trackingId === row.trackingId;
                const stageCopy = getShipmentStageCopy(row.stage, lang);

                return (
                    <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedTracking(row.trackingId)}
                        className={`w-full rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                            isSelected
                                ? "border-primary/35 bg-primary/10"
                                : "border-border/60 bg-secondary/15 hover:border-primary/25"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {row.trackingId}
                          </p>
                          <p className="mt-2 break-words font-medium">{row.destination}</p>
                          {row.dealNumber ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {getSafeLabel(
                                    t("tracking.linkedDeal", { deal: row.dealNumber }),
                                    locale === "ar"
                                        ? `مرتبطة بالعملية ${row.dealNumber}`
                                        : `Linked deal ${row.dealNumber}`,
                                )}
                              </p>
                          ) : null}
                        </div>

                        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {stageCopy?.label || getSafeLabel(t(`tracking.stages.${row.stage}`), row.stage)}
                    </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDateTime(row.updatedAt, locale)}
                      </div>
                    </button>
                );
              })}
            </div>
          </BentoCard>

          <div className="space-y-4">
            {activeShipment ? (
              <>
            <BentoCard className="space-y-6 rounded-[1.8rem] border-blue-400/20 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34%),linear-gradient(180deg,rgba(6,17,31,0.98),rgba(8,12,22,0.94))] p-6 shadow-[0_28px_80px_-50px_rgba(59,130,246,0.9)] md:p-7">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-blue-200">
                    {locale === "ar" ? "تتبع الشحنة" : "Shipment tracking"}
                  </p>
                  <h2 className="mt-3 break-words font-serif text-4xl font-bold text-white md:text-5xl">
                    {activeShipment.trackingId}
                  </h2>
                  <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-2xl border border-blue-300/30 bg-blue-500/15 px-4 py-3 text-blue-50 shadow-[0_0_32px_rgba(59,130,246,0.22)]">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-300 opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-200" />
                    </span>
                    <span className="truncate text-lg font-bold md:text-2xl">
                      {currentStage?.label ||
                          getSafeLabel(t("tracking.noStage"), locale === "ar" ? "مرحلة غير محددة" : "No stage")}
                    </span>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                    {currentStage?.description ||
                        (locale === "ar"
                            ? "لا يوجد وصف متاح لهذه المرحلة حالياً."
                            : "No description is available for this stage yet.")}
                  </p>
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-3 sm:min-w-[18rem]">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-medium text-slate-400">
                      {locale === "ar" ? "نسبة التقدم" : "Progress"}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-white">{formatNumber(progressPercent, locale)}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-medium text-slate-400">
                      {getSafeLabel(t("tracking.labels.remainingStages"), locale === "ar" ? "المتبقي" : "Remaining")}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-white">{formatNumber(getRemainingStages(activeShipment.stage), locale)}</p>
                  </div>
                </div>
              </div>

              <div className="hidden">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {activeShipment.trackingId}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold">
                  {currentStage?.label ||
                      getSafeLabel(t("tracking.noStage"), locale === "ar" ? "مرحلة غير محددة" : "No stage")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {currentStage?.description ||
                      (locale === "ar"
                          ? "لا يوجد وصف متاح لهذه المرحلة حالياً."
                          : "No description is available for this stage yet.")}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ShipmentInfoTile
                    label={locale === "ar" ? "رقم التتبع" : "Tracking ID"}
                    value={activeShipment.trackingId}
                />
                <ShipmentInfoTile
                    label={locale === "ar" ? "التقدم" : "Progress"}
                    value={`${formatNumber(progressPercent, locale)}%`}
                />
                <ShipmentInfoTile
                    label={locale === "ar" ? "آخر حدث" : "Latest event"}
                    value={latestShipmentEvent ? formatDateTime(latestShipmentEvent.createdAt, locale) : formatDateTime(activeShipment.updatedAt, locale)}
                />
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    {locale === "ar" ? "مسار تقدم الشحنة" : "Shipment progress"}
                  </p>
                  <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-100">
                    {formatNumber(activeStageIndex + 1, locale)} / {formatNumber(shipmentStages.length, locale)}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {shipmentStages.map((stage, index) => {
                    const stageCopy = getShipmentStageCopy(stage.code, lang);
                    const isDone = activeStageIndex > index;
                    const isCurrent = activeStageIndex === index;

                    return (
                      <div
                        key={stage.code}
                        className={`rounded-2xl border px-3 py-3 transition-colors ${
                          isCurrent
                            ? "border-blue-300/60 bg-blue-500/20 text-blue-50 shadow-[0_0_28px_rgba(59,130,246,0.24)]"
                            : isDone
                              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                              : "border-white/10 bg-slate-950/30 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                              isCurrent
                                ? "bg-blue-300 text-blue-950"
                                : isDone
                                  ? "bg-emerald-400 text-emerald-950"
                                  : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                          </span>
                          <p className="min-w-0 truncate text-xs font-semibold">
                            {stageCopy?.label || stage.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-primary/15 bg-primary/10 p-4 text-sm leading-7 text-muted-foreground">
                {getSafeLabel(
                    t("tracking.trustDescription"),
                    locale === "ar"
                        ? "يعرض هذا الخط الزمني المراحل التشغيلية الرسمية التي يتم تحديثها من لوحة الإدارة."
                        : "This timeline shows official operation stages updated by the management team.",
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ShipmentInfoTile
                    label={getSafeLabel(t("tracking.labels.destination"), locale === "ar" ? "الوجهة" : "Destination")}
                    value={activeShipment.destination}
                />
                <ShipmentInfoTile
                    label={getSafeLabel(t("tracking.labels.deal"), locale === "ar" ? "رقم العملية" : "Deal")}
                    value={activeShipment.dealNumber || getSafeLabel(t("tracking.unlinked"), locale === "ar" ? "غير مرتبطة" : "Unlinked")}
                />
                <ShipmentInfoTile
                    label={getSafeLabel(t("tracking.labels.lastUpdated"), locale === "ar" ? "آخر تحديث" : "Last updated")}
                    value={formatDateTime(activeShipment.updatedAt, locale)}
                />
                <ShipmentInfoTile
                    label={getSafeLabel(t("tracking.labels.remainingStages"), locale === "ar" ? "المراحل المتبقية" : "Remaining stages")}
                    value={formatNumber(getRemainingStages(activeShipment.stage), locale)}
                />
              </div>

              {activeShipment.customerVisibleNote ? (
                  <div className="rounded-[1.35rem] border border-primary/15 bg-primary/10 p-4 text-sm leading-7 text-muted-foreground">
                    {activeShipment.customerVisibleNote}
                  </div>
              ) : (
                  <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4 text-sm leading-7 text-muted-foreground">
                    {getSafeLabel(
                        t("tracking.noCustomerStageNote"),
                        locale === "ar"
                            ? "لا توجد ملاحظة خاصة بالعميل لهذه المرحلة حالياً."
                            : "No customer-visible note is available for this stage yet.",
                    )}
                  </div>
              )}
            </BentoCard>

            <BentoCard>
              <ShipmentTimeline
                  currentStage={activeShipment.stage}
              />
            </BentoCard>

            <BentoCard className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {locale === "ar" ? "سجل الشحنة" : "Shipment timeline"}
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {locale === "ar" ? "الأحداث المرئية للعميل" : "Customer-visible events"}
                </h3>
              </div>

              {activeShipment.shipmentEvents.length ? (
                <div className="space-y-3">
                  {activeShipment.shipmentEvents.map((event) => {
                    const fromStage = getEventStageLabel(event.fromStage, lang);
                    const toStage = getEventStageLabel(event.toStage, lang);

                    return (
                      <div
                        key={event.id}
                        className="rounded-[1.25rem] border border-border/60 bg-secondary/10 px-4 py-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {getEventTypeLabel(event.eventType, locale)}
                            </p>
                            {fromStage || toStage ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {fromStage && toStage
                                  ? `${fromStage} → ${toStage}`
                                  : toStage || fromStage}
                              </p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-xs text-muted-foreground">
                            {formatDateTime(event.createdAt, locale)}
                          </p>
                        </div>
                        {event.note ? (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {event.note}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border/60 bg-secondary/5 p-4 text-sm text-muted-foreground">
                  {locale === "ar"
                    ? "لا توجد أحداث مرئية للعميل بعد."
                    : "No customer-visible shipment events yet."}
                </div>
              )}
            </BentoCard>
            </>
            ) : (
                <div className="rounded-[2rem] border border-dashed border-border/60 bg-secondary/5 py-32 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/5 text-primary/30">
                    <PackageSearch className="h-8 w-8" />
                  </div>
                  <p className="mt-4 font-medium text-muted-foreground">
                    {getSafeLabel(
                        t("tracking.selectToTrack"),
                        locale === "ar" ? "اختر شحنة لعرض التفاصيل" : "Select a shipment to track",
                    )}
                  </p>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}
