import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  Eye,
  FileImage,
  Hash,
  ImageIcon,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { deleteRequest as cancelRequest } from "@/domain/operations/service";
import { getCustomerRequestStatusCopy } from "@/lib/customerExperience";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { loadPurchaseRequests, requestStatusMeta } from "@/lib/operationsDomain";
import type { PurchaseRequestStatus } from "@/types/lourex";

type CustomerRequestFilter = "all" | PurchaseRequestStatus | "cancelled";
type CustomerRequestRow = Omit<Awaited<ReturnType<typeof loadPurchaseRequests>>[number], "status"> & {
  status: PurchaseRequestStatus | "cancelled";
  statusLabel?: string;
};

const getSafeLabel = (value: string, fallback: string) => {
  if (!value || value.includes(".")) {
    return fallback;
  }

  return value;
};

const canEditRequest = (status: PurchaseRequestStatus | "cancelled") =>
    status === "intake_submitted" || status === "awaiting_clarification";

const canCancelRequest = (status: PurchaseRequestStatus | "cancelled") =>
    status === "intake_submitted" || status === "awaiting_clarification";

const getShippingLabel = (method: string, t: (key: string) => string) => {
  const normalized = (method || "").toLowerCase();

  if (normalized === "air") return t("common.air");
  if (normalized === "sea") return t("common.sea");
  if (normalized === "land") return t("common.land");

  return method || "-";
};

const getRequestTypeLabel = (isFullSourcing: boolean | undefined, t: (key: string) => string) => {
  return isFullSourcing
      ? t("requests.labels.fullSourcing")
      : t("requests.labels.shippingOnly");
};

const formatDate = (value: string | undefined, locale: string) => {
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
  }).format(date);
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

const formatQuantity = (value: number | string | undefined, locale: string) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return value ? String(value) : "-";
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(numberValue);
};

const normalizeSearchValue = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const getTrackingCode = (row: CustomerRequestRow) => {
  const requestWithTracking = row as CustomerRequestRow & {
    trackingCode?: string;
    tracking_code?: string;
  };

  return requestWithTracking.trackingCode || requestWithTracking.tracking_code || "-";
};

const getCustomerEmail = (row: CustomerRequestRow) => {
  const requestWithCustomer = row as CustomerRequestRow & {
    customer?: {
      email?: string;
    };
    customerEmail?: string;
    email?: string;
  };

  return (
      requestWithCustomer.customer?.email ||
      requestWithCustomer.customerEmail ||
      requestWithCustomer.email ||
      ""
  );
};

const RequestInfoTile = ({
                           icon,
                           label,
                           value,
                         }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
    <div className="rounded-[1.25rem] border border-border/50 bg-secondary/20 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
);

export default function CustomerRequestsPage() {
  const { locale, t } = useI18n();
  const { profile } = useAuthSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<CustomerRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<CustomerRequestFilter>("all");

  const selectedRequestId = searchParams.get("request");
  const normalizedProfileEmail = profile?.email?.trim().toLowerCase() || "";

  const getStatusMeta = (status: PurchaseRequestStatus | "cancelled") => {
    if (status === "cancelled") {
      return {
        label: locale === "ar" ? "ملغي" : "Cancelled",
        tone: "bg-zinc-500/15 text-zinc-300",
      };
    }

    return requestStatusMeta[status] || {
      label: status,
      tone: "bg-secondary text-muted-foreground",
    };
  };

  const loadRows = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const loadedRows = await loadPurchaseRequests();

      const customerRows = normalizedProfileEmail
          ? loadedRows.filter((row) => {
            const rowEmail = getCustomerEmail(row).trim().toLowerCase();

            if (!rowEmail) {
              return true;
            }

            return rowEmail === normalizedProfileEmail;
          })
          : loadedRows;

      setRows(customerRows);
    } catch (loadError) {
      logOperationalError("customer_requests_load", loadError);
      setError(t("common.error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRows("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedProfileEmail]);

  const requestFilters: Array<{ key: CustomerRequestFilter; label: string }> = [
    { key: "all", label: getSafeLabel(t("requests.filters.all"), locale === "ar" ? "الكل" : "All") },
    {
      key: "intake_submitted",
      label: getSafeLabel(
          t("requests.filters.intake_submitted"),
          locale === "ar" ? "مُرسل" : "Submitted",
      ),
    },
    {
      key: "under_review",
      label: getSafeLabel(
          t("requests.filters.under_review"),
          locale === "ar" ? "قيد المراجعة" : "Under review",
      ),
    },
    {
      key: "awaiting_clarification",
      label: getSafeLabel(
          t("requests.filters.awaiting_clarification"),
          locale === "ar" ? "بحاجة لتوضيح" : "Needs clarification",
      ),
    },
    {
      key: "ready_for_conversion",
      label: getSafeLabel(
          t("requests.filters.ready_for_conversion"),
          locale === "ar" ? "جاهز" : "Ready",
      ),
    },
    {
      key: "converted_to_deal",
      label: getSafeLabel(
          t("requests.filters.converted_to_deal"),
          locale === "ar" ? "تم التحويل" : "Converted",
      ),
    },
    {
      key: "cancelled",
      label: getSafeLabel(t("statuses.cancelled"), locale === "ar" ? "ملغاة" : "Cancelled"),
    },
  ];

  const filteredRows = useMemo(() => {
    const normalized = normalizeSearchValue(search);

    return rows.filter((row) => {
      const trackingCode = getTrackingCode(row);
      const matchesFilter = activeFilter === "all" ? true : row.status === activeFilter;

      const searchSource = normalizeSearchValue(
          [
            row.requestNumber,
            trackingCode,
            row.productName,
            row.productDescription,
            row.destination,
            row.preferredShippingMethod,
          ]
              .filter(Boolean)
              .join(" "),
      );

      const matchesSearch = !normalized || searchSource.includes(normalized);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, rows, search]);

  const selectedRow = useMemo(() => {
    if (filteredRows.length === 0) {
      return null;
    }

    return filteredRows.find((row) => row.id === selectedRequestId) || filteredRows[0] || null;
  }, [filteredRows, selectedRequestId]);

  const selectedStatusCopy = selectedRow && selectedRow.status !== "cancelled"
      ? getCustomerRequestStatusCopy(selectedRow.status, locale === "ar" ? "ar" : "en")
      : null;
  const selectedStatusMeta = selectedRow ? getStatusMeta(selectedRow.status) : null;

  useEffect(() => {
    if (!filteredRows.length) {
      return;
    }

    const existsInFiltered = filteredRows.some((row) => row.id === selectedRequestId);

    if (!existsInFiltered) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("request", filteredRows[0].id);
      setSearchParams(nextParams, { replace: true });
    }
  }, [filteredRows, searchParams, selectedRequestId, setSearchParams]);

  const requestMetrics = useMemo(
      () => ({
        total: rows.length,
        submitted: rows.filter((row) => row.status === "intake_submitted").length,
        review: rows.filter((row) => row.status === "under_review").length,
        converted: rows.filter((row) => row.status === "converted_to_deal").length,
      }),
      [rows],
  );

  const setSelectedRequest = (requestId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("request", requestId);
    setSearchParams(nextParams);
  };

  const handleEditRequest = (request: CustomerRequestRow) => {
    if (!canEditRequest(request.status)) {
      toast.error(t("requests.errors.cannotEdit"));
      return;
    }

    navigate(`/request?edit=${request.id}`);
  };

  const handleCancelRequest = async (request: CustomerRequestRow) => {
    if (!canCancelRequest(request.status)) {
      toast.error(t("requests.errors.cannotCancel"));
      return;
    }

    const confirmed = window.confirm(
        t("requests.actions.confirmCancel", { number: request.requestNumber }),
    );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(request.id);

    try {
      const result = await cancelRequest(request.id);

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success(t("requests.intake.errors.success"));

      setRows((currentRows) =>
          currentRows.map((row) =>
              row.id === request.id
                  ? {
                    ...row,
                    status: "cancelled",
                    statusLabel: t("statuses.cancelled"),
                  }
                  : row,
          ),
      );
      setActiveFilter("all");

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("request", request.id);
      setSearchParams(nextParams, { replace: true });
    } catch (cancelError) {
      logOperationalError("customer_request_cancel", cancelError, { requestId: request.id });
      toast.error(
          cancelError instanceof Error && cancelError.message
              ? cancelError.message
              : t("requests.intake.errors.submitFailed"),
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-[2rem]" />
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Skeleton className="h-[34rem] w-full rounded-[2rem]" />
            <Skeleton className="h-[34rem] w-full rounded-[2rem]" />
          </div>
        </div>
    );
  }

  if (rows.length === 0) {
    return (
        <EmptyState
            icon={ClipboardList}
            title={getSafeLabel(t("requests.emptyTitle"), locale === "ar" ? "لا توجد طلبات بعد" : "No requests yet")}
            description={getSafeLabel(
                t("requests.emptyDescription"),
                locale === "ar"
                    ? "أنشئ أول طلب شراء وتابعه من لوحة العميل."
                    : "Create your first purchase request and track it from your customer portal.",
            )}
            actionLabel={getSafeLabel(
                t("customerPortal.actions.newRequest.title"),
                locale === "ar" ? "إنشاء طلب" : "Create request",
            )}
            onAction={() => navigate("/request")}
        />
    );
  }

  return (
      <div className="space-y-4">
        <BentoCard className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {getSafeLabel(
                  t("customerPortal.actions.requests.title"),
                  locale === "ar" ? "طلباتي" : "My requests",
              )}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">
              {getSafeLabel(t("requests.inboxTitle"), locale === "ar" ? "صندوق الطلبات" : "Request inbox")}
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {locale === "ar"
                  ? "تابع طلبات الشراء، الصور، كود التتبع، وحالة المراجعة من مكان واحد."
                  : "Track purchase requests, images, tracking codes, and review status in one place."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadRows("refresh")} disabled={refreshing}>
              {refreshing
                  ? locale === "ar"
                      ? "جارٍ التحديث..."
                      : "Refreshing..."
                  : locale === "ar"
                      ? "تحديث"
                      : "Refresh"}
            </Button>
            <Button variant="gold" onClick={() => navigate("/request")}>
              <Plus className="me-2 h-4 w-4" />
              {t("customerPortal.actions.newRequest.title")}
            </Button>
          </div>
        </BentoCard>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <BentoCard className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-2">
              {[
                { label: getSafeLabel(t("requests.total"), locale === "ar" ? "الإجمالي" : "Total"), value: requestMetrics.total },
                { label: locale === "ar" ? "مُرسلة" : "Submitted", value: requestMetrics.submitted },
                { label: getSafeLabel(t("requests.review"), locale === "ar" ? "مراجعة" : "Review"), value: requestMetrics.review },
                { label: getSafeLabel(t("requests.converted"), locale === "ar" ? "محولة" : "Converted"), value: requestMetrics.converted },
              ].map((item) => (
                  <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 p-4 text-center">
                    <p className="text-2xl font-bold">{formatQuantity(item.value, locale)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                  </div>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={getSafeLabel(
                      t("requests.searchPlaceholder"),
                      locale === "ar"
                          ? "ابحث برقم الطلب أو المنتج أو كود التتبع"
                          : "Search by request number, product, or tracking code",
                  )}
                  className="ps-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {requestFilters.map((filter) => (
                  <Button
                      key={filter.key}
                      variant={activeFilter === filter.key ? "gold" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </Button>
              ))}
            </div>

            {error ? (
                <div className="flex items-start gap-3 rounded-[1.25rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
            ) : null}

            <div className="space-y-3">
              {filteredRows.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-border/60 bg-secondary/15 p-5 text-sm text-muted-foreground">
                    {getSafeLabel(
                        t("requests.emptyFilteredDescription"),
                        locale === "ar" ? "لا توجد طلبات مطابقة للبحث أو الفلتر الحالي." : "No requests match the current filter.",
                    )}
                  </div>
              ) : null}

              {filteredRows.map((row) => {
                const statusMeta = getStatusMeta(row.status);

                const isSelected = selectedRow?.id === row.id;
                const trackingCode = getTrackingCode(row);

                return (
                    <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedRequest(row.id)}
                        className={`w-full rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                            isSelected
                                ? "border-primary/35 bg-primary/10"
                                : "border-border/60 bg-secondary/15 hover:border-primary/25 hover:bg-secondary/25"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            <Hash className="h-3.5 w-3.5" />
                            <span>{row.requestNumber}</span>
                          </p>
                          <p className="mt-2 break-words font-medium">
                            {row.productName ||
                                getSafeLabel(
                                    t("requests.genericRequest"),
                                    locale === "ar" ? "طلب شراء" : "Purchase request",
                                )}
                          </p>
                        </div>

                        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${statusMeta.tone}`}>
                      {row.status === "cancelled" ? statusMeta.label : getSafeLabel(t(`statuses.${row.status}`), statusMeta.label)}
                    </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(row.createdAt, locale)}
                    </span>
                        <span className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5" />
                          {getShippingLabel(row.preferredShippingMethod, t)}
                    </span>
                        <span className="flex items-center gap-2 sm:col-span-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                          {locale === "ar" ? "كود التتبع: " : "Tracking: "}
                          {trackingCode}
                    </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/50 pt-3 text-xs">
                    <span className="text-muted-foreground">
                      {locale === "ar" ? "اضغط لعرض التفاصيل" : "Click to view details"}
                    </span>
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                      <Eye className="h-3.5 w-3.5" />
                          {locale === "ar" ? "التفاصيل" : "Details"}
                    </span>
                      </div>
                    </button>
                );
              })}
            </div>
          </BentoCard>

          {selectedRow ? (
              <BentoCard className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-5">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {selectedRow.requestNumber}
                    </p>
                    <h2 className="mt-2 break-words font-serif text-3xl font-semibold">
                      {selectedRow.productName ||
                          getSafeLabel(t("requests.genericRequest"), locale === "ar" ? "طلب شراء" : "Purchase request")}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatDateTime(selectedRow.createdAt, locale)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                        selectedStatusMeta?.tone || "bg-secondary text-muted-foreground"
                    }`}
                >
                  {selectedRow.status === "cancelled"
                      ? selectedStatusMeta?.label
                      : getSafeLabel(t(`statuses.${selectedRow.status}`), selectedStatusMeta?.label || selectedRow.status)}
                </span>

                    {selectedRow.convertedDealNumber ? (
                        <Button variant="outline" asChild>
                          <Link to={`/customer-portal/tracking?deal=${selectedRow.convertedDealNumber}`}>
                            <Eye className="me-2 h-4 w-4" />
                            {getSafeLabel(
                                t("customerPortal.actions.tracking.title"),
                                locale === "ar" ? "التتبع" : "Tracking",
                            )}
                          </Link>
                        </Button>
                    ) : null}

                    {/* TODO: Re-enable after request edit screen is implemented. */}

                    {canCancelRequest(selectedRow.status) ? (
                        <Button
                            variant="destructive"
                            onClick={() => void handleCancelRequest(selectedRow)}
                            disabled={actionLoadingId === selectedRow.id}
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          {actionLoadingId === selectedRow.id
                              ? locale === "ar"
                                  ? "جارٍ الإلغاء..."
                                  : "Cancelling..."
                              : locale === "ar"
                                  ? "إلغاء الطلب"
                                  : "Cancel request"}
                        </Button>
                    ) : null}
                  </div>
                </div>

                {selectedStatusCopy ? (
                    <div className="rounded-[1.35rem] border border-primary/15 bg-primary/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-primary">
                        {selectedStatusCopy.label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {selectedStatusCopy.description}
                      </p>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {selectedStatusCopy.nextStep}
                      </p>
                    </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <RequestInfoTile
                      icon={<Hash className="h-4 w-4" />}
                      label={locale === "ar" ? "كود التتبع" : "Tracking code"}
                      value={getTrackingCode(selectedRow)}
                  />
                  <RequestInfoTile
                      icon={<Package className="h-4 w-4" />}
                      label={getSafeLabel(t("requests.labels.quantity"), locale === "ar" ? "الكمية" : "Quantity")}
                      value={formatQuantity(selectedRow.quantity, locale)}
                  />
                  <RequestInfoTile
                      icon={<Truck className="h-4 w-4" />}
                      label={getSafeLabel(t("requests.labels.shipping"), locale === "ar" ? "الشحن" : "Shipping")}
                      value={getShippingLabel(selectedRow.preferredShippingMethod, t)}
                  />
                  <RequestInfoTile
                      icon={<ShieldCheck className="h-4 w-4" />}
                      label={locale === "ar" ? "نوع الخدمة" : "Service type"}
                      value={getRequestTypeLabel(selectedRow.isFullSourcing, t)}
                  />
                  <RequestInfoTile
                      icon={<CalendarDays className="h-4 w-4" />}
                      label={getSafeLabel(t("requests.labels.expectedDate"), locale === "ar" ? "تاريخ التوريد المتوقع" : "Expected date")}
                      value={selectedRow.expectedSupplyDate || getSafeLabel(t("common.notAvailable"), "N/A")}
                  />
                  <RequestInfoTile
                      icon={<Package className="h-4 w-4" />}
                      label={getSafeLabel(t("requests.labels.destination"), locale === "ar" ? "الوجهة" : "Destination")}
                      value={selectedRow.destination || getSafeLabel(t("common.notAvailable"), "N/A")}
                  />
                </div>

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <p className="font-medium">
                    {locale === "ar" ? "وصف المنتج" : "Product description"}
                  </p>
                  <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                    {selectedRow.productDescription ||
                        getSafeLabel(
                            t("requests.noDescription"),
                            locale === "ar" ? "لا يوجد وصف." : "No description provided.",
                        )}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    {
                      label: locale === "ar" ? "الأبعاد" : "Dimensions",
                      value: selectedRow.sizeDimensions,
                    },
                    {
                      label: locale === "ar" ? "اللون" : "Color",
                      value: selectedRow.color,
                    },
                    {
                      label: locale === "ar" ? "المادة" : "Material",
                      value: selectedRow.material,
                    },
                    {
                      label: getSafeLabel(t("requests.labels.weight"), locale === "ar" ? "الوزن" : "Weight"),
                      value: selectedRow.weight,
                    },
                    {
                      label: getSafeLabel(t("requests.labels.brand"), locale === "ar" ? "العلامة التجارية" : "Brand"),
                      value: selectedRow.brand,
                    },
                    {
                      label: getSafeLabel(t("requests.labels.qualityLevel"), locale === "ar" ? "مستوى الجودة" : "Quality level"),
                      value: selectedRow.qualityLevel,
                    },
                    {
                      label: getSafeLabel(
                          t("requests.labels.manufacturingCountry"),
                          locale === "ar" ? "بلد التصنيع" : "Manufacturing country",
                      ),
                      value: selectedRow.manufacturingCountry,
                    },
                    {
                      label: locale === "ar" ? "العنوان" : "Delivery address",
                      value: selectedRow.deliveryAddress,
                    },
                  ].map((item) => (
                      <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 px-4 py-3">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="mt-1 break-words text-sm font-medium">
                          {item.value || getSafeLabel(t("common.notAvailable"), "N/A")}
                        </p>
                      </div>
                  ))}
                </div>

                {selectedRow.technicalSpecs ? (
                    <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                      <p className="font-medium">
                        {locale === "ar" ? "المواصفات الفنية" : "Technical specs"}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                        {selectedRow.technicalSpecs}
                      </p>
                    </div>
                ) : null}

                {selectedRow.deliveryNotes || selectedRow.referenceLink ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4">
                        <p className="font-medium">{locale === "ar" ? "ملاحظات التسليم" : "Delivery notes"}</p>
                        <p className="mt-2 break-words text-sm leading-7 text-muted-foreground">
                          {selectedRow.deliveryNotes || getSafeLabel(t("common.notAvailable"), "N/A")}
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4">
                        <p className="font-medium">{locale === "ar" ? "رابط مرجعي" : "Reference link"}</p>
                        {selectedRow.referenceLink ? (
                            <a
                                href={selectedRow.referenceLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 block break-words text-sm leading-7 text-primary underline-offset-4 hover:underline"
                            >
                              {selectedRow.referenceLink}
                            </a>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {getSafeLabel(t("common.notAvailable"), "N/A")}
                            </p>
                        )}
                      </div>
                    </div>
                ) : null}

                {!canEditRequest(selectedRow.status) ? (
                    <div className="rounded-[1.35rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-700 dark:text-amber-100">
                      {locale === "ar"
                          ? "لا يمكن تعديل هذا الطلب بعد بدء المراجعة أو تحويله إلى عملية تشغيلية."
                          : "This request cannot be edited after review starts or after it is converted into an operation."}
                    </div>
                ) : null}

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                  <div className="flex items-center gap-3">
                    <FileImage className="h-4 w-4 text-primary" />
                    <p className="font-medium">
                      {getSafeLabel(t("requests.labels.attachments"), locale === "ar" ? "المرفقات والصور" : "Attachments")}
                    </p>
                  </div>

                  {selectedRow.attachments.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {getSafeLabel(
                            t("requests.noAttachments"),
                            locale === "ar" ? "لا توجد مرفقات مرفوعة." : "No attachments uploaded.",
                        )}
                      </p>
                  ) : (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {selectedRow.attachments.map((attachment) => (
                            <a
                                key={attachment.id}
                                href={attachment.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group overflow-hidden rounded-[1.2rem] border border-border/60 bg-card transition-colors hover:border-primary/25"
                            >
                              <div className="flex h-36 items-center justify-center overflow-hidden bg-secondary/25">
                                {attachment.fileUrl ? (
                                    <img
                                        src={attachment.fileUrl}
                                        alt={attachment.fileName}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                ) : (
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                              <div className="px-4 py-3">
                                <p className="break-words text-sm font-medium">{attachment.fileName}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{attachment.category}</p>
                              </div>
                            </a>
                        ))}
                      </div>
                  )}
                </div>

                <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4 text-sm leading-7 text-muted-foreground">
                  {selectedRow.convertedDealNumber
                      ? getSafeLabel(
                          t("requests.convertedHint"),
                          locale === "ar"
                              ? "تم تحويل هذا الطلب إلى عملية تشغيلية نشطة ويمكنك متابعة الشحنة من صفحة التتبع."
                              : "This request has been converted into an active operation.",
                      )
                      : getSafeLabel(
                          t("requests.pendingConversionHint"),
                          locale === "ar"
                              ? "هذا الطلب ما زال بانتظار المراجعة أو التحويل التشغيلي."
                              : "This request is still pending operational conversion.",
                      )}
                </div>
              </BentoCard>
          ) : (
              <EmptyState
                  icon={ClipboardList}
                  title={getSafeLabel(
                      t("requests.emptyFilteredTitle"),
                      locale === "ar" ? "لا توجد طلبات مطابقة" : "No matching requests",
                  )}
                  description={getSafeLabel(
                      t("requests.emptyFilteredDescription"),
                      locale === "ar" ? "لا توجد طلبات مطابقة للبحث أو الفلتر الحالي." : "No requests match the current filter.",
                  )}
              />
          )}
        </div>
      </div>
  );
}
