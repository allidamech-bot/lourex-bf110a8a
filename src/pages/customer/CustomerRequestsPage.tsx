import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Archive,
  CalendarDays,
  ClipboardList,
  Eye,
  FileImage,
  Hash,
  ImageIcon,
  Package,
  Plus,
  RotateCcw,
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
import { 
  cancelPurchaseRequest as cancelRequest,
  resubmitPurchaseRequest,
  archivePurchaseRequestFromPortal,
  uploadTransferProof,
} from "@/domain/operations/service";
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

const canResubmitRequest = (status: PurchaseRequestStatus | "cancelled") =>
    status === "cancelled" || status === "awaiting_clarification";

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

const getTrackingCode = (row: CustomerRequestRow) => {
  return row.trackingCode || "-";
};

const normalizeSearchValue = (value: string | undefined | null) => {
  return (value || "").trim().toLowerCase();
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<CustomerRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<CustomerRequestFilter>("all");
  const [uploadingProof, setUploadingProof] = useState(false);

  const selectedRequestId = searchParams.get("request");

  const getStatusMeta = (status: PurchaseRequestStatus | "cancelled") => {
    if (status === "cancelled") {
      return {
        label: t("statuses.cancelled"),
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
      setRows(loadedRows as any);
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
  }, []);

  const requestFilters: Array<{ key: CustomerRequestFilter; label: string }> = [
    { key: "all", label: t("common.all") },
    {
      key: "intake_submitted",
      label: t("requests.filters.intake_submitted"),
    },
    {
      key: "under_review",
      label: t("requests.filters.under_review"),
    },
    {
      key: "awaiting_clarification",
      label: t("requests.filters.awaiting_clarification"),
    },
    {
      key: "ready_for_conversion",
      label: t("requests.filters.ready_for_conversion"),
    },
    {
      key: "transfer_proof_pending",
      label: t("requests.filters.transfer_proof_pending"),
    },
    {
      key: "in_progress",
      label: t("requests.filters.in_progress"),
    },
    {
      key: "cancelled",
      label: t("statuses.cancelled"),
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
  const removeActionLabel = locale === "ar" ? "حذف من قائمتي" : "Remove from my list";

  useEffect(() => {
    if (!filteredRows.length) {
      return;
    }

    const existsInFiltered = filteredRows.some((row) => row.id === selectedRequestId);

    if (!existsInFiltered && selectedRequestId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("request");
      setSearchParams(nextParams, { replace: true });
    }
  }, [filteredRows, searchParams, selectedRequestId, setSearchParams]);

  const detailsRef = useRef<HTMLDivElement>(null);

  const requestMetrics = useMemo(
      () => ({
        total: rows.length,
        submitted: rows.filter((row) => row.status === "intake_submitted").length,
        review: rows.filter((row) => row.status === "under_review" || row.status === "ready_for_conversion" || row.status === "transfer_proof_pending").length,
        converted: rows.filter((row) => row.status === "in_progress" || row.status === "completed").length,
      }),
      [rows],
  );

  useEffect(() => {
    if (selectedRequestId && detailsRef.current && window.innerWidth < 1280) {
      detailsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedRequestId]);

  const setSelectedRequest = (requestId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("request", requestId);
    setSearchParams(nextParams);
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

      toast.success(t("requests.cancel.success"));

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

  const handleEditRequest = (request: CustomerRequestRow) => {
    if (!canEditRequest(request.status)) {
      toast.error(t("requests.errors.editBlocked"));
      return;
    }

    navigate(`/request?edit=${request.id}`);
  };

  const handleResubmitRequest = async (request: CustomerRequestRow) => {
    if (!canResubmitRequest(request.status)) {
      return;
    }

    setActionLoadingId(request.id);

    try {
      const result = await resubmitPurchaseRequest(request.id);

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success(t("requests.resubmit.success"));
      void loadRows("refresh");
      
      if (result.data) {
        setSelectedRequest(result.data.id);
      }
    } catch (error) {
      logOperationalError("customer_request_resubmit", error, { requestId: request.id });
      toast.error(t("requests.resubmit.failed"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRow) return;

    setUploadingProof(true);
    const { error } = await uploadTransferProof(selectedRow.id, file);
    setUploadingProof(false);

    if (error) {
      toast.error(error.message || t("transferProof.error"));
    } else {
      toast.success(t("transferProof.success"));
      void loadRows("refresh");
    }
  };

  const handleRemoveRequest = async (request: CustomerRequestRow) => {
    const confirmed = window.confirm(
        t("requests.actions.remove") + "?",
    );

    if (!confirmed) return;

    setActionLoadingId(request.id);
    const { error } = await archivePurchaseRequestFromPortal(request.id);
    setActionLoadingId(null);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("requests.actions.removeSuccess") || "Removed from list.");
      void loadRows("refresh");
    }
  };

  if (loading) {
    return (
        <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
          <Skeleton className="h-[600px] rounded-[2rem]" />
          <Skeleton className="h-[600px] rounded-[2rem]" />
        </div>
    );
  }

  return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <BentoCard className="flex flex-col gap-4 overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t("customerPortal.eyebrow")}
                </p>
                <h1 className="mt-2 font-serif text-2xl font-semibold">{t("customerPortal.title")}</h1>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void loadRows("refresh")} disabled={refreshing}>
                  <RotateCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
                <Button variant="gold" size="sm" asChild>
                  <Link to="/request">
                    <Plus className="me-2 h-4 w-4" />
                    {t("requests.new")}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-4 gap-2">
              {[
                { label: t("requests.total"), value: requestMetrics.total },
                { label: t("requests.submitted"), value: requestMetrics.submitted },
                { label: t("requests.review"), value: requestMetrics.review },
                { label: t("requests.converted"), value: requestMetrics.converted },
              ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-secondary/20 p-3 text-center">
                    <p className="text-xl font-bold">{item.value}</p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
              ))}
            </div>

            <div className="shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("requests.searchPlaceholder")}
                    className="ps-9"
                />
              </div>

              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {requestFilters.map((filter) => (
                    <Button
                        key={filter.key}
                        variant={activeFilter === filter.key ? "gold" : "outline"}
                        size="sm"
                        onClick={() => setActiveFilter(filter.key)}
                        className="whitespace-nowrap"
                    >
                      {filter.label}
                    </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {filteredRows.length === 0 ? (
                  <EmptyState
                      icon={ClipboardList}
                      title={t("requests.emptyTitle")}
                      description={t("requests.emptyDescription")}
                  />
              ) : (
                  filteredRows.map((row) => {
                    const statusMeta = getStatusMeta(row.status);
                    const isSelected = selectedRow?.id === row.id;

                    return (
                        <div
                            key={row.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedRequest(row.id)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) {
                                return;
                              }

                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedRequest(row.id);
                              }
                            }}
                            className={`w-full rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                                isSelected
                                    ? "border-primary/35 bg-primary/10"
                                    : "border-border/60 bg-secondary/15 hover:border-primary/25"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {row.requestNumber}
                              </p>
                              <p className="mt-2 break-words font-medium">
                                {row.productName || t("requests.genericRequest")}
                              </p>
                            </div>

                            <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${statusMeta.tone}`}>
                          {t(`statuses.${row.status}`)}
                        </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDate(row.createdAt, locale)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <FileImage className="h-3.5 w-3.5" />
                                {row.attachments.length}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {canEditRequest(row.status) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRequest(row);
                                  }}
                                >
                                  <Plus className="h-4 w-4 rotate-45" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full text-rose-400 hover:bg-rose-500/10"
                                aria-label={removeActionLabel}
                                title={removeActionLabel}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveRequest(row);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                    );
                  })
              )}
            </div>
          </BentoCard>

          <div ref={detailsRef} className="min-w-0">
            {selectedRow ? (
                <BentoCard className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {selectedRow.requestNumber}
                        </p>
                      </div>
                      <h2 className="mt-2 break-words font-serif text-3xl font-semibold">
                        {selectedRow.productName || t("requests.genericRequest")}
                      </h2>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {canResubmitRequest(selectedRow.status) && (
                          <Button
                              variant="gold"
                              disabled={actionLoadingId === selectedRow.id}
                              onClick={() => handleResubmitRequest(selectedRow)}
                          >
                            {actionLoadingId === selectedRow.id ? (
                                <RotateCcw className="me-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RotateCcw className="me-2 h-4 w-4" />
                            )}
                            {t("requests.actions.resubmit")}
                          </Button>
                      )}

                      {canEditRequest(selectedRow.status) && (
                          <Button variant="outline" onClick={() => handleEditRequest(selectedRow)}>
                            {t("requests.actions.edit")}
                          </Button>
                      )}

                      {canCancelRequest(selectedRow.status) && (
                          <Button
                              variant="outline"
                              disabled={actionLoadingId === selectedRow.id}
                              onClick={() => handleCancelRequest(selectedRow)}
                              className="border-rose-500/30 text-rose-500 hover:bg-rose-500/5"
                          >
                            {t("requests.actions.cancel")}
                          </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${selectedStatusMeta?.tone}`}>
                  {t(`statuses.${selectedRow.status}`)}
                </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {t("requests.submittedAt", { value: formatDateTime(selectedRow.createdAt, locale) })}
                    </div>
                  </div>

                  {selectedStatusCopy && (
                      <div className="rounded-[1.35rem] border border-primary/20 bg-primary/10 p-5 leading-7">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
                          <p className="font-medium text-foreground">{selectedStatusCopy.label}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{selectedStatusCopy.description}</p>
                      </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <RequestInfoTile
                        icon={<Truck className="h-3.5 w-3.5" />}
                        label={t("requests.labels.shipping")}
                        value={getShippingLabel(selectedRow.preferredShippingMethod, t)}
                    />
                    <RequestInfoTile
                        icon={<Archive className="h-3.5 w-3.5" />}
                        label={t("requests.labels.destination")}
                        value={selectedRow.destination}
                    />
                    <RequestInfoTile
                        icon={<Plus className="h-3.5 w-3.5" />}
                        label={t("requests.labels.sourcingType")}
                        value={getRequestTypeLabel(selectedRow.isFullSourcing, t)}
                    />
                    <RequestInfoTile
                        icon={<Hash className="h-3.5 w-3.5" />}
                        label={t("requests.labels.quantity")}
                        value={String(selectedRow.quantity)}
                    />
                    <RequestInfoTile
                        icon={<CalendarDays className="h-3.5 w-3.5" />}
                        label={t("requests.labels.expectedDate")}
                        value={selectedRow.expectedSupplyDate || "-"}
                    />
                    <RequestInfoTile
                        icon={<Hash className="h-3.5 w-3.5" />}
                        label={t("requests.labels.trackingCode")}
                        value={getTrackingCode(selectedRow)}
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-1">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      {[
                        {
                          label: t("requests.intake.productName"),
                          value: selectedRow.productName,
                        },
                        {
                          label: t("requests.intake.sizeDimensions"),
                          value: selectedRow.sizeDimensions,
                        },
                        {
                          label: t("requests.intake.color"),
                          value: selectedRow.color,
                        },
                        {
                          label: t("requests.intake.material"),
                          value: selectedRow.material,
                        },
                        {
                          label: t("requests.labels.weight"),
                          value: selectedRow.weight,
                        },
                        {
                          label: t("requests.labels.brand"),
                          value: selectedRow.brand,
                        },
                        {
                          label: t("requests.labels.qualityLevel"),
                          value: selectedRow.qualityLevel,
                        },
                        {
                          label: t("requests.labels.manufacturingCountry"),
                          value: selectedRow.manufacturingCountry,
                        },
                        {
                          label: t("requests.intake.deliveryAddress"),
                          value: selectedRow.deliveryAddress,
                        },
                      ].map((item) => (
                          <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 px-4 py-3">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="mt-1 break-words text-sm font-medium">
                              {item.value || t("common.notAvailable")}
                            </p>
                          </div>
                      ))}
                    </div>

                    {selectedRow.technicalSpecs ? (
                        <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                          <p className="font-medium">
                            {t("requests.intake.technicalSpecs")}
                          </p>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                            {selectedRow.technicalSpecs}
                          </p>
                        </div>
                    ) : null}

                    {selectedRow.deliveryNotes || selectedRow.referenceLink ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4">
                            <p className="font-medium">{t("requests.intake.deliveryNotes")}</p>
                            <p className="mt-2 break-words text-sm leading-7 text-muted-foreground">
                              {selectedRow.deliveryNotes || t("common.notAvailable")}
                            </p>
                          </div>

                          <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4">
                            <p className="font-medium">{t("requests.intake.referenceLink")}</p>
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

                    {selectedRow.status === "ready_for_conversion" || selectedRow.status === "transfer_proof_rejected" ? (
                        <div className="rounded-[1.35rem] border border-primary/20 bg-primary/5 p-6">
                          <div className="flex items-center gap-3">
                            <Plus className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">{t("transferProof.title")}</h3>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("transferProof.description")}
                          </p>
                          
                          {selectedRow.status === "transfer_proof_rejected" && selectedRow.transferRejectionReason && (
                            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                              <p className="font-bold">{t("transferProof.rejectionReason")}</p>
                              <p className="mt-1">{selectedRow.transferRejectionReason}</p>
                            </div>
                          )}

                          <div className="mt-6">
                            <input
                                type="file"
                                id="proof-upload"
                                className="hidden"
                                onChange={handleUploadProof}
                                disabled={uploadingProof}
                            />
                            <Button
                                asChild
                                disabled={uploadingProof}
                                className="h-12 px-8"
                            >
                              <label htmlFor="proof-upload" className="cursor-pointer">
                                {uploadingProof ? t("transferProof.uploading") : t("transferProof.uploadButton")}
                              </label>
                            </Button>
                          </div>
                        </div>
                    ) : null}

                    {selectedRow.status === "transfer_proof_pending" ? (
                        <div className="rounded-[1.35rem] border border-indigo-500/20 bg-indigo-500/10 p-6 text-indigo-100">
                          <div className="flex items-center gap-3">
                            <RotateCcw className="h-5 w-5 animate-spin text-indigo-400" />
                            <p className="font-medium">{t("transferProof.statusPending")}</p>
                          </div>
                        </div>
                    ) : null}

                    {!canEditRequest(selectedRow.status) && selectedRow.status !== "ready_for_conversion" && selectedRow.status !== "transfer_proof_rejected" ? (
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
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {selectedRow.attachments.map((attachment) => (
                                <a
                                    key={attachment.id}
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group flex items-center justify-between rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 transition-colors hover:border-primary/25"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium group-hover:text-primary">
                                      {attachment.fileName}
                                    </p>
                                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                      {attachment.category}
                                    </p>
                                  </div>
                                  <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
                                </a>
                            ))}
                          </div>
                      )}
                    </div>
                  </div>
                </BentoCard>
            ) : (
                <EmptyState
                    icon={ClipboardList}
                    title={t("requests.emptyFilteredTitle")}
                    description={t("requests.emptyFilteredDescription")}
                />
            )}
          </div>
        </div>
      </div>
  );
}
