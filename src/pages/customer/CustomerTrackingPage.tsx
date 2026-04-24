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
import { loadShipments } from "@/lib/operationsDomain";
import { getShipmentStageCopy, shipmentStages } from "@/lib/shipmentStages";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";

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

const normalizeSearchValue = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const formatNumber = (value: number, locale: string) =>
    new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(value || 0);

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

const getRemainingStages = (stage: string) => {
  const activeStageIndex = shipmentStages.findIndex((item) => item.code === stage);

  if (activeStageIndex < 0) {
    return shipmentStages.length;
  }

  return Math.max(0, shipmentStages.length - activeStageIndex - 1);
};

const getShipmentCustomerId = (row: CustomerShipmentRow) => {
  const withOwnership = row as CustomerShipmentRow & ShipmentOwnershipFields;

  return withOwnership.customerId || withOwnership.customer_id || withOwnership.customer?.id || "";
};

const getShipmentCustomerEmail = (row: CustomerShipmentRow) => {
  const withOwnership = row as CustomerShipmentRow & ShipmentOwnershipFields;

  return withOwnership.customerEmail || withOwnership.customer_email || withOwnership.customer?.email || "";
};

const filterRowsForProfile = (
  rows: CustomerShipmentRows,
  profileId: string,
  profileEmail: string,
) => {
  const hasOwnershipFields = rows.some((row) => getShipmentCustomerId(row) || getShipmentCustomerEmail(row));

  if (!hasOwnershipFields) {
    return rows;
  }

  return rows.filter((row) => {
    const customerId = getShipmentCustomerId(row);
    const customerEmail = getShipmentCustomerEmail(row).trim().toLowerCase();

    if (profileId && customerId && customerId === profileId) {
      return true;
    }

    return Boolean(profileEmail && customerEmail && customerEmail === profileEmail);
  });
};

const ShipmentMetricCard = ({
                              icon,
                              label,
                              value,
                            }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
    <div className="rounded-[1.2rem] bg-secondary/20 p-4 text-center">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
);

const ShipmentInfoTile = ({
                            label,
                            value,
                          }: {
  label: string;
  value: string;
}) => (
    <div className="rounded-[1.2rem] bg-secondary/25 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value || "-"}</p>
    </div>
);

export default function CustomerTrackingPage() {
  const { lang, locale, t } = useI18n();
  const { profile } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<CustomerShipmentRows>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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
      const loadedRows = await loadShipments();
      setRows(filterRowsForProfile(loadedRows, profile?.id || "", normalizedProfileEmail));
    } catch (loadError) {
      logOperationalError("customer_tracking_load", loadError);
      setError(t("common.error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, normalizedProfileEmail]);

  const filteredRows = useMemo(() => {
    const normalized = normalizeSearchValue(search);

    if (!normalized) {
      return rows;
    }

    return rows.filter((row) => {
      const source = normalizeSearchValue(
          [
            row.trackingId,
            row.dealNumber,
            row.destination,
            row.stage,
            row.customerVisibleNote,
          ]
              .filter(Boolean)
              .join(" "),
      );

      return source.includes(normalized);
    });
  }, [rows, search]);

  const activeShipment = useMemo<CustomerShipmentRow | null>(() => {
    if (!filteredRows.length) {
      return null;
    }

    if (selectedTracking) {
      const matchByTracking = filteredRows.find((row) => row.trackingId === selectedTracking);

      if (matchByTracking) {
        return matchByTracking;
      }
    }

    if (selectedDeal) {
      const matchByDeal = filteredRows.find((row) => row.dealNumber === selectedDeal);

      if (matchByDeal) {
        return matchByDeal;
      }
    }

    if (filteredRows.length > 0) {
      return filteredRows[0];
    }

    return null;
  }, [filteredRows, selectedDeal, selectedTracking]);

  useEffect(() => {
    if (!rows.length || !activeShipment) {
      return;
    }

    const hasValidTracking =
        selectedTracking &&
        filteredRows.some((row) => row.trackingId === selectedTracking);

    const hasValidDeal =
        selectedDeal &&
        filteredRows.some((row) => row.dealNumber === selectedDeal);

    if (hasValidTracking || hasValidDeal) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tracking", activeShipment.trackingId);
    nextParams.delete("deal");
    setSearchParams(nextParams, { replace: true });
  }, [activeShipment, filteredRows, rows.length, searchParams, selectedDeal, selectedTracking, setSearchParams]);

  const currentStage = activeShipment ? getShipmentStageCopy(activeShipment.stage, lang) : null;
  const activeStageIndex = activeShipment
      ? shipmentStages.findIndex((item) => item.code === activeShipment.stage)
      : -1;

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
        updates: rows.reduce((sum, row) => sum + (row.timeline?.length || 0), 0),
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
          <BentoCard className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {getSafeLabel(
                    t("customerPortal.actions.tracking.title"),
                    locale === "ar" ? "التتبع" : "Tracking",
                )}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold">
                {getSafeLabel(
                    t("tracking.contextTitle"),
                    locale === "ar" ? "تتبع الشحنات" : "Shipment tracking",
                )}
              </h1>
            </div>

            <Button
                variant="outline"
                onClick={() => void refresh("refresh")}
                disabled={refreshing}
            >
              <RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing
                  ? t("common.saving").replace("Saving...", "Refreshing...")
                  : t("common.refresh")}
            </Button>
          </BentoCard>

          {error ? (
              <div className="flex items-start gap-3 rounded-[1.25rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
          ) : null}

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
        <BentoCard className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {getSafeLabel(
                  t("customerPortal.actions.tracking.title"),
                  locale === "ar" ? "التتبع" : "Tracking",
              )}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">
              {getSafeLabel(
                  t("tracking.contextTitle"),
                  locale === "ar" ? "تتبع الشحنات" : "Shipment tracking",
              )}
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {getSafeLabel(
                  t("customerPortal.actions.tracking.description"),
                  locale === "ar"
                      ? "تابع مراحل الشحنة والتحديثات المرتبطة بالعملية."
                      : "Follow shipment stages and operation updates.",
              )}
            </p>
          </div>

          <Button
              variant="outline"
              onClick={() => void refresh("refresh")}
              disabled={refreshing}
          >
            <RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing
                ? t("common.saving").replace("Saving...", "Refreshing...")
                : t("common.refresh")}
          </Button>
        </BentoCard>

        <div className="grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
          <BentoCard className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2">
              <ShipmentMetricCard
                  icon={<Route className="h-4 w-4" />}
                  label={getSafeLabel(t("common.all"), locale === "ar" ? "الكل" : "All")}
                  value={formatNumber(shipmentMetrics.total, locale)}
              />
              <ShipmentMetricCard
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label={getSafeLabel(t("statuses.delivered"), locale === "ar" ? "تم التسليم" : "Delivered")}
                  value={formatNumber(shipmentMetrics.completed, locale)}
              />
              <ShipmentMetricCard
                  icon={<Truck className="h-4 w-4" />}
                  label={getSafeLabel(t("common.active"), locale === "ar" ? "نشطة" : "Active")}
                  value={formatNumber(shipmentMetrics.active, locale)}
              />
              <ShipmentMetricCard
                  icon={<Clock3 className="h-4 w-4" />}
                  label={getSafeLabel(t("tracking.labels.loggedUpdates"), locale === "ar" ? "التحديثات" : "Updates")}
                  value={formatNumber(shipmentMetrics.updates, locale)}
              />
            </div>

            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={getSafeLabel(
                    t("tracking.searchPlaceholder"),
                    locale === "ar"
                        ? "ابحث بكود التتبع أو رقم العملية أو الوجهة"
                        : "Search by tracking code, deal number, or destination"
                  )}
                  className="ps-9"
              />
            </div>

            {error ? (
                <div className="flex items-start gap-3 rounded-[1.25rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
            ) : null}

            <div className="space-y-3">
              {filteredRows.length === 0 ? (
                  <EmptyState
                      icon={Route}
                      title={getSafeLabel(t("tracking.noMatches"), locale === "ar" ? "لا توجد شحنة مطابقة" : "No matching shipment")}
                      description={
                        locale === "ar"
                            ? "لا توجد شحنات مطابقة للبحث الحالي."
                            : "No shipments match the current search."
                      }
                  />
              ) : null}

              {filteredRows.map((row) => {
                const stageCopy = getShipmentStageCopy(row.stage, lang);
                const isSelected = activeShipment?.id === row.id;

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
            <BentoCard className="space-y-4">
              <div>
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

            <BentoCard className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-semibold">
                    {getSafeLabel(
                        t("tracking.labels.officialTimeline"),
                        locale === "ar" ? "الخط الزمني الرسمي" : "Official timeline",
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {getSafeLabel(
                        t("tracking.labels.officialTimelineDescription"),
                        locale === "ar"
                            ? "مراحل الشحنة من بداية التشغيل حتى التسليم."
                            : "Shipment stages from operation start to delivery.",
                    )}
                  </p>
                </div>
              </div>

              <ShipmentTimeline currentStage={activeShipment.stage} />
            </BentoCard>

            <BentoCard className="space-y-4">
              <div className="flex items-center gap-3">
                <Route className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-semibold">
                  {getSafeLabel(
                      t("tracking.labels.updatesLog"),
                      locale === "ar" ? "سجل التحديثات" : "Updates log",
                  )}
                </h2>
              </div>

              {(activeShipment.timeline || []).length === 0 ? (
                  <EmptyState
                      icon={Route}
                      title={getSafeLabel(t("tracking.noUpdatesTitle"), locale === "ar" ? "لا توجد تحديثات بعد" : "No updates yet")}
                      description={getSafeLabel(
                          t("tracking.noUpdatesDescription"),
                          locale === "ar"
                              ? "ستظهر التحديثات هنا عند إضافة ملاحظات تشغيلية من الإدارة."
                              : "Updates will appear here when the management team adds operation notes.",
                      )}
                  />
              ) : (
                  <div className="space-y-3">
                    {(activeShipment.timeline || [])
                        .slice()
                        .reverse()
                        .map((event) => {
                          const eventStageCopy = getShipmentStageCopy(event.stageCode, lang);

                          return (
                              <div
                                  key={event.id}
                                  className="rounded-[1.3rem] border border-border/60 bg-secondary/10 p-4"
                              >
                                <div>
                                  <p className="font-medium">
                                    {eventStageCopy?.label || event.stageCode}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatDateTime(event.occurredAt, locale)}
                                  </p>
                                </div>

                                {event.customerNote ? (
                                    <div className="mt-3 rounded-[1rem] border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
                                      {event.customerNote}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm italic text-muted-foreground">
                                      {getSafeLabel(
                                          t("tracking.noCustomerNote"),
                                          locale === "ar"
                                              ? "لا توجد ملاحظة للعميل في هذا التحديث."
                                              : "No customer note for this update.",
                                      )}
                                    </p>
                                )}
                              </div>
                          );
                        })}
                  </div>
              )}
            </BentoCard>
              </>
            ) : (
                <BentoCard className="p-8">
                  <EmptyState
                      icon={Route}
                      title={getSafeLabel(t("publicTracking.errorNotFound"), locale === "ar" ? "لا توجد شحنة مطابقة" : "No matching shipment")}
                      description={
                        locale === "ar"
                            ? "لم نتمكن من العثور على شحنة مطابقة للبحث أو الرابط الحالي."
                            : "We could not find a shipment matching the current search or link."
                      }
                  />
                </BentoCard>
            )}
          </div>
        </div>
      </div>
  );
}
