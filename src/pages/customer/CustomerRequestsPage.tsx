import { SmartRfqItems } from "@/features/smart-rfq/SmartRfqItems";
import { CustomerCommercialQuotationPanel } from "@/features/commercial-quotes/components/CustomerCommercialQuotationPanel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Archive,
  CalendarDays,
  ClipboardList,
  CreditCard,
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
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { loadCustomerPaymentSummaries, type CustomerPaymentSummary } from "@/domain/accounting/payments";
import { getCustomerRequestStatusCopy } from "@/lib/customerExperience";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { loadPurchaseRequests, requestStatusMeta, submitPurchaseRequestClarificationReply } from "@/lib/operationsDomain";
import { revealActiveSection, setStableSearchParam } from "@/lib/activeNavigation";
import type { PurchaseRequestStatus } from "@/types/lourex";
import { SmartPurchaseRequestPanel } from "@/features/purchase-requests/components/SmartPurchaseRequestPanel";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { OfficialOrderConversationBox } from "@/components/OfficialOrderConversationBox";
import { OrderFollowupTimeline } from "@/components/OrderFollowupTimeline";
import {
  detectRepeatRequestPatterns
} from "@/features/customer-success-intelligence/lib/customerSuccessEngine";
import { CustomerSuccessInsights } from "@/features/customer-success-intelligence/components/CustomerSuccessInsights";

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

const formatMoney = (amount: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    style: "currency",
    currency: currency || "SAR",
    maximumFractionDigits: 2,
  }).format(amount || 0);

const getTrackingCode = (row: CustomerRequestRow) => {
  return row.trackingCode || "-";
};

const ACCEPTED_TRANSFER_PROOF_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_TRANSFER_PROOF_SIZE = 8 * 1024 * 1024;

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
    <div className="w-full max-w-full min-w-0 rounded-[1rem] border border-amber-200/10 bg-stone-900/50 px-3 py-2.5 sm:rounded-[1.25rem] sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center gap-2 text-[11px] text-stone-500 sm:text-xs">
        <span className="text-amber-500">{icon}</span>
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <p className="mt-1 sm:mt-2 break-words text-[13px] sm:text-sm font-medium text-stone-200">{value || "-"}</p>
    </div>
);

export default function CustomerRequestsPage() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<CustomerRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<CustomerRequestFilter>("all");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [paymentSummaries, setPaymentSummaries] = useState<Map<string, CustomerPaymentSummary>>(new Map());
  const [clarificationReply, setClarificationReply] = useState("");
  const [clarificationReplyLoading, setClarificationReplyLoading] = useState(false);

  const selectedRequestId = searchParams.get("request");
  const lang = locale === "ar" ? "ar" : "en";
  const listRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const shouldRevealDetailsRef = useRef(Boolean(selectedRequestId));
  const hasScrolledToListRef = useRef(false);

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
      const customerRows: CustomerRequestRow[] = loadedRows.map((row) => ({
        ...row,
        status: row.status as CustomerRequestRow["status"],
      }));
      setRows(customerRows);
      const dealIds = loadedRows.map((row) => row.convertedDealId).filter(Boolean) as string[];
      setPaymentSummaries(dealIds.length ? await loadCustomerPaymentSummaries(dealIds) : new Map());
    } catch (loadError) {
      logOperationalError("customer_requests_load", loadError);
      setError(t("requests.loadError"));
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

  const requestPatterns = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => detectRepeatRequestPatterns(rows as any),
    [rows]
  );

  const selectedStatusCopy = selectedRow && selectedRow.status !== "cancelled"
      ? getCustomerRequestStatusCopy(selectedRow.status, locale === "ar" ? "ar" : "en")
      : null;
  const selectedStatusMeta = selectedRow ? getStatusMeta(selectedRow.status) : null;
  const selectedPaymentSummary = selectedRow?.convertedDealId
      ? paymentSummaries.get(selectedRow.convertedDealId)
      : undefined;
  const submitReceiptLabel = locale === "ar" ? "إرسال الإيصال" : t("transferProof.submitButton");
  const receiptSubmittedMessage =
      locale === "ar" ? "تم إرسال الإيصال وهو قيد المراجعة" : "Receipt submitted and under review";
  const removeActionLabel = locale === "ar" ? "حذف من قائمتي" : "Remove from my list";

  const requestMetrics = useMemo(
      () => ({
        total: rows.length,
        submitted: rows.filter((row) => row.status === "intake_submitted").length,
        review: rows.filter((row) => row.status === "under_review" || row.status === "ready_for_conversion" || row.status === "transfer_proof_pending").length,
        converted: rows.filter((row) => row.status === "in_progress" || row.status === "completed").length,
      }),
      [rows],
  );

  const setSelectedRequest = useCallback(
    (requestId: string, revealDetails = true, replace = false) => {
      if (!requestId) return;

      shouldRevealDetailsRef.current = revealDetails;
      setSearchParams(setStableSearchParam(searchParams, "request", requestId), { replace });

      if (requestId === selectedRequestId && revealDetails) {
        shouldRevealDetailsRef.current = false;
        revealActiveSection(detailsRef.current, { force: true, focus: true });
      }
    },
    [searchParams, selectedRequestId, setSearchParams],
  );

  useEffect(() => {
    if (!filteredRows.length) {
      return;
    }

    const existsInFiltered = selectedRequestId
      ? filteredRows.some((row) => row.id === selectedRequestId)
      : false;

    if (!existsInFiltered) {
      setSelectedRequest(filteredRows[0].id, false, true);
    }
  }, [filteredRows, selectedRequestId, setSelectedRequest]);

  useEffect(() => {
    if (selectedRow && shouldRevealDetailsRef.current) {
      shouldRevealDetailsRef.current = false;
      revealActiveSection(detailsRef.current, { force: true, focus: true });
    }
  }, [selectedRow]);

  useEffect(() => {
    if (loading || location.hash !== "#requests" || hasScrolledToListRef.current) {
      return;
    }

    hasScrolledToListRef.current = true;
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, location.hash]);

  useEffect(() => {
    setSelectedProofFile(null);
    setClarificationReply("");
  }, [selectedRow?.id]);

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

      setSelectedRequest(request.id, false, true);
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

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    selectProofFile(file || null);
  };

  const selectProofFile = (file: File | null) => {
    if (!file) {
      setSelectedProofFile(null);
      return;
    }

    if (!ACCEPTED_TRANSFER_PROOF_TYPES.has(file.type)) {
      toast.error(locale === "ar" ? "يرجى رفع صورة PNG/JPG/WEBP أو ملف PDF." : "Please upload a PNG, JPG, WEBP, or PDF receipt.");
      return;
    }

    if (file.size > MAX_TRANSFER_PROOF_SIZE) {
      toast.error(locale === "ar" ? "يجب ألا يتجاوز حجم الإيصال 8 ميجابايت." : "Receipt file must be 8 MB or less.");
      return;
    }

    setSelectedProofFile(file);
  };

  const handleProofDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    selectProofFile(event.dataTransfer.files?.[0] || null);
  };

  const handleSubmitProof = async () => {
    if (!selectedProofFile || !selectedRow || uploadingProof) return;

    setUploadingProof(true);
    try {
      const { error } = await uploadTransferProof(selectedRow.id, selectedProofFile);

      if (error) {
        console.error("[lourex:customer-transfer-proof-submit:error]", {
          requestId: selectedRow.id,
          message: error.message,
          cause: error.cause,
        });
        throw new Error(error.message || t("transferProof.error"));
      }

      toast.success(receiptSubmittedMessage);
      setSelectedProofFile(null);
      void loadRows("refresh");
      setSelectedRequest(selectedRow.id, false, true);
    } catch (proofError) {
      logOperationalError("customer_transfer_proof_submit", proofError, {
        requestId: selectedRow.id,
      });
      toast.error(proofError instanceof Error && proofError.message ? proofError.message : t("transferProof.error"));
    } finally {
      setUploadingProof(false);
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
      toast.error(t("requests.remove.failed"));
    } else {
      toast.success(t("requests.remove.success"));
      const remainingRows = filteredRows.filter((row) => row.id !== request.id);
      if (remainingRows[0]) {
        setSelectedRequest(remainingRows[0].id, false, true);
      }
      void loadRows("refresh");
    }
  };

  const handleSubmitClarificationReply = async () => {
    if (!selectedRow || clarificationReplyLoading || !clarificationReply.trim()) {
      return;
    }

    setClarificationReplyLoading(true);

    try {
      const { error } = await submitPurchaseRequestClarificationReply(selectedRow.id, clarificationReply);
      if (error) {
        throw error;
      }

      toast.success(t("requests.smart.customerReplySent"));
      setClarificationReply("");
      await loadRows("refresh");
      setSelectedRequest(selectedRow.id, false, true);
    } catch (replyError) {
      logOperationalError("customer_request_clarification_reply", replyError, { requestId: selectedRow.id });
      toast.error(t("requests.smart.customerReplyError"));
    } finally {
      setClarificationReplyLoading(false);
    }
  };

  if (loading) {
    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Skeleton className="h-[600px] rounded-[2rem]" />
          <Skeleton className="h-[600px] rounded-[2rem]" />
        </div>
    );
  }

  return (
      <div className="min-w-0 space-y-5 overflow-x-clip pb-16 [overflow-wrap:anywhere]">
        <details className="group rounded-2xl border border-amber-300/15 bg-stone-900/60 sm:hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-amber-200 marker:text-amber-400">
            {lang === "ar" ? "دليل استخدام طلباتي" : "How to use My Requests"}
          </summary>
          <div className="px-3 pb-3"><PageHelpBox pageKey="purchase_requests" role="customer" /></div>
        </details>
        <div className="hidden sm:block"><PageHelpBox pageKey="purchase_requests" role="customer" /></div>
        <div className="grid w-full max-w-full min-w-0 items-start gap-5 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.15fr)]">
          <div id="requests" ref={listRef} className="w-full max-w-full min-w-0 scroll-mt-24">
          <BentoCard className="flex min-w-0 max-w-full flex-col gap-5 overflow-hidden rounded-[1.6rem] border border-amber-300/15 bg-stone-950/90 p-4 shadow-xl shadow-black/20 sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 border-b border-amber-200/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 max-w-full">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400 sm:text-xs">
                  LOUREX / {lang === "ar" ? "بوابة العميل" : "CUSTOMER PORTAL"}
                </p>
                <h1 className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight text-stone-50 sm:text-3xl">
                  {lang === "ar" ? "طلباتي وعروض الأسعار" : "My requests & quotations"}
                </h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-stone-400">
                  {lang === "ar" ? "تابع طلباتك واختر أي طلب للاطلاع على تفاصيله وعرض السعر عند صدوره." : "Track each request, review details and view issued quotations."}
                </p>
              </div>

              <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex sm:w-auto sm:shrink-0">
                <Button variant="outline" size="sm" onClick={() => void loadRows("refresh")} disabled={refreshing} aria-label={lang === "ar" ? "تحديث الطلبات" : "Refresh requests"} title={lang === "ar" ? "تحديث الطلبات" : "Refresh requests"} className="h-11 w-11 shrink-0 border-amber-200/20 bg-stone-800/70 p-0 text-amber-200 hover:bg-stone-800">
                  <RotateCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
                <Button asChild size="sm" className="h-11 min-w-0 rounded-xl bg-amber-400 px-5 font-bold text-stone-950 shadow-md shadow-amber-500/10 hover:bg-amber-300">
                  <Link to="/request">
                    <Plus className="me-2 h-4 w-4 shrink-0" />
                    {lang === "ar" ? "إنشاء طلب جديد" : "Create new request"}
                  </Link>
                </Button>
              </div>
            </div>

            {error ? (
                <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-label={lang === "ar" ? "ملخص الطلبات" : "Request summary"}>
              {[
                { label: lang === "ar" ? "جميع الطلبات" : "All requests", value: requestMetrics.total },
                { label: lang === "ar" ? "تم الإرسال" : "Submitted", value: requestMetrics.submitted },
                { label: lang === "ar" ? "قيد المراجعة" : "In review", value: requestMetrics.review },
                { label: lang === "ar" ? "قيد التنفيذ" : "In progress", value: requestMetrics.converted },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-2xl border border-amber-200/10 bg-gradient-to-br from-stone-800/85 to-stone-900/70 px-3 py-4 text-start sm:px-4">
                  <p className="text-2xl font-bold tabular-nums leading-none text-amber-100 sm:text-3xl">{item.value.toLocaleString(lang === "ar" ? "ar" : "en")}</p>
                  <p className="mt-2 text-xs font-medium leading-5 text-stone-300">{item.label}</p>
                </div>
              ))}
            </div>
            <details className="rounded-xl border border-amber-200/10 bg-amber-500/5">
              <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-amber-200">
                {lang === "ar" ? "كيف أتابع حالة طلباتي؟" : "How do I track my requests?"}
              </summary>
              <p className="px-4 pb-4 text-sm leading-6 text-stone-300">
                {lang === "ar"
                  ? "اختر بطاقة الطلب لعرض الأصناف والمرفقات والحالة الحالية، ثم تابع أي توضيح أو عرض سعر يصدر من فريق LOUREX."
                  : "Select a request card to review its items, documents and status, then follow up on any clarification or quotation."}
              </p>
            </details>

            <div className="shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={lang === "ar" ? "ابحث برقم الطلب أو اسم المنتج..." : "Search by request number or product..."}
                    className="h-11 rounded-xl border-amber-200/15 bg-stone-900/80 ps-10 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:ring-amber-400/40"
                />
              </div>

              <div className="no-scrollbar -mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
                {requestFilters.map((filter) => (
                    <Button
                        key={filter.key}
                        variant={activeFilter === filter.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveFilter(filter.key)}
                        className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-semibold whitespace-nowrap ${
                          activeFilter === filter.key
                          ? "bg-amber-500/10 text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
                          : "border-amber-200/15 bg-stone-50/5 text-stone-400 hover:bg-stone-50/10 hover:text-stone-100"
                        }`}
                    >
                      {filter.label}
                    </Button>
                ))}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              {!loading && rows.length > 0 && requestPatterns.length > 0 && (
                <div className="mb-4">
                  <CustomerSuccessInsights insights={requestPatterns} />
                </div>
              )}
              {filteredRows.length === 0 ? (
                  <EmptyState
                      icon={ClipboardList}
                      title={t("requests.emptyTitle")}
                      description={t("requests.emptyDescription")}
                      className="bg-stone-900/50 border-amber-200/10"
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
                            aria-current={isSelected ? "true" : undefined}
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
                            className={`group w-full max-w-full min-w-0 cursor-pointer rounded-2xl border p-4 text-start shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 sm:p-5 ${
                                isSelected
                                    ? "border-amber-400/60 bg-gradient-to-br from-amber-500/15 to-stone-900 shadow-lg shadow-amber-500/5"
                                    : "border-white/10 bg-stone-900/70 hover:border-amber-500/35 hover:bg-stone-800/70"
                            }`}
                        >
                          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="break-all text-xs font-bold tracking-wide text-amber-300/90">
                                {row.requestNumber}
                              </p>
                              <p className="mt-2 break-words text-base font-semibold leading-6 text-stone-100">
                                {row.productName || t("requests.genericRequest")}
                              </p>
                            </div>

                            <span className={`max-w-full self-start break-words rounded-full border border-amber-200/10 px-3 py-1.5 text-xs font-semibold ${statusMeta.tone.replace('bg-secondary', 'bg-stone-800')}`}>
                          {t(`statuses.${row.status}`)}
                        </span>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs text-stone-500">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDate(row.createdAt, locale)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <FileImage className="h-3.5 w-3.5" />
                                {row.attachments.length}
                              </div>
                            </div>
                            
                            <div className="flex shrink-0 flex-wrap gap-2">
                              {canEditRequest(row.status) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-11 w-11 rounded-xl text-amber-200 hover:bg-amber-500/10" aria-label={lang === "ar" ? "تعديل الطلب" : "Edit request"} title={lang === "ar" ? "تعديل الطلب" : "Edit request"}
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
                                className="h-11 w-11 rounded-xl text-red-300 hover:bg-red-500/10"
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
          </div>

          <div ref={detailsRef} tabIndex={-1} className="min-w-0 scroll-mt-24 outline-none">
            {selectedRow ? (
                <BentoCard className="flex min-w-0 max-w-full flex-col gap-5 overflow-hidden rounded-[1.6rem] border border-amber-300/15 bg-stone-950/90 p-4 shadow-xl shadow-black/20 sm:gap-6 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="min-w-0 max-w-full">
                      <div className="flex min-w-0 items-center gap-2">
                        <Package className="h-4 w-4 text-amber-500" />
                        <p className="whitespace-normal text-xs font-semibold text-stone-500">
                          {selectedRow.requestNumber}
                        </p>
                      </div>
                      <h2 className="mt-2 break-words font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-stone-100">
                        {selectedRow.productName || t("requests.genericRequest")}
                      </h2>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:shrink-0">
                      <Button asChild variant="outline" className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                        <Link to={`/customer-portal/request-detail?request=${selectedRow.id}`}>
                          <Eye className="me-2 h-4 w-4 text-amber-500" />
                          {lang === "ar" ? "العرض الاحترافي" : "Pro View"}
                        </Link>
                      </Button>

                      {canResubmitRequest(selectedRow.status) && (
                          <Button
                              disabled={actionLoadingId === selectedRow.id}
                              onClick={() => handleResubmitRequest(selectedRow)}
                              className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110"
                          >
                            {actionLoadingId === selectedRow.id ? (
                                <RotateCcw className="me-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RotateCcw className="me-2 h-4 w-4" />
                            )}
                            {t("requests.actions.resubmit")}
                          </Button>
                      )}

                      {canEditRequest(selectedRow.status) && !selectedRow.requestNumber?.startsWith("RFQ-") && (
                          <Button variant="outline" onClick={() => handleEditRequest(selectedRow)} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                            {t("requests.actions.edit")}
                          </Button>
                      )}

                      {canCancelRequest(selectedRow.status) && (
                          <Button
                              variant="outline"
                              disabled={actionLoadingId === selectedRow.id}
                              onClick={() => handleCancelRequest(selectedRow)}
                              className="border-red-500/30 text-red-500 hover:bg-red-500/5"
                          >
                            {t("requests.actions.cancel")}
                          </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                <span className={`max-w-full break-words rounded-full px-3 py-1 text-xs font-medium ${selectedStatusMeta?.tone.replace('bg-secondary', 'bg-stone-800')}`}>
                  {t(`statuses.${selectedRow.status}`)}
                </span>
                    <div className="flex min-w-0 items-center gap-2 text-xs text-stone-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {t("requests.submittedAt", { value: formatDateTime(selectedRow.createdAt, locale) })}
                    </div>
                  </div>

                  {selectedStatusCopy && (
                      <div className="w-full max-w-full rounded-[1.35rem] border border-amber-500/20 bg-amber-500/5 p-4 leading-7 sm:p-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                          <p className="min-w-0 break-words font-medium text-stone-100">{selectedStatusCopy.label}</p>
                        </div>
                        <p className="mt-2 break-words text-sm text-stone-400">{selectedStatusCopy.description}</p>
                      </div>
                  )}

                  <SmartRfqItems requestId={selectedRow.id} requestNumber={selectedRow.requestNumber} lang={lang === "ar" ? "ar" : "en"} />
                  <CustomerCommercialQuotationPanel requestId={selectedRow.id} requestNumber={selectedRow.requestNumber} lang={lang === "ar" ? "ar" : "en"} />

                  <SmartPurchaseRequestPanel
                    request={selectedRow}
                    lang={lang}
                    t={t}
                    showCustomerReply={selectedRow.status === "awaiting_clarification"}
                    customerReply={clarificationReply}
                    onCustomerReplyChange={setClarificationReply}
                    onSubmitCustomerReply={() => void handleSubmitClarificationReply()}
                    customerReplyBusy={clarificationReplyLoading}
                    showInternalSections={false}
                  />

                  <OfficialOrderConversationBox
                    requestId={selectedRow.id}
                    requestNumber={selectedRow.requestNumber}
                    dealId={selectedRow.convertedDealId}
                    customerId={selectedRow.customer.id}
                    status={selectedRow.status}
                    role="customer"
                  />

                  <OrderFollowupTimeline
                    requestId={selectedRow.id}
                    dealId={selectedRow.convertedDealId}
                    customerId={selectedRow.customer.id}
                    mode="customer"
                  />

                  {selectedPaymentSummary ? (
                      <div className="w-full max-w-full rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4 sm:p-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <CreditCard className="h-5 w-5 text-amber-500" />
                          <div>
                            <p className="font-medium text-stone-100">
                              {locale === "ar" ? "ملخص المدفوعات" : "Payment summary"}
                            </p>
                            <p className="text-xs text-stone-500">
                              {locale === "ar" ? "يعرض المدفوعات المرتبطة بهذه العملية فقط." : "Only payments linked to this operation are shown."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <RequestInfoTile
                              icon={<CreditCard className="h-3.5 w-3.5" />}
                              label={locale === "ar" ? "المطلوب" : "Expected"}
                              value={formatMoney(selectedPaymentSummary.expectedAmount, selectedPaymentSummary.currency, locale)}
                          />
                          <RequestInfoTile
                              icon={<ShieldCheck className="h-3.5 w-3.5" />}
                              label={locale === "ar" ? "المدفوع" : "Paid"}
                              value={formatMoney(selectedPaymentSummary.paidAmount, selectedPaymentSummary.currency, locale)}
                          />
                          <RequestInfoTile
                              icon={<Hash className="h-3.5 w-3.5" />}
                              label={locale === "ar" ? "المتبقي" : "Remaining"}
                              value={formatMoney(selectedPaymentSummary.remainingAmount, selectedPaymentSummary.currency, locale)}
                          />
                        </div>

                        {selectedPaymentSummary.payments.length ? (
                            <div className="mt-4 divide-y divide-amber-200/10 rounded-[1.1rem] border border-amber-200/10 bg-stone-950/30">
                              {selectedPaymentSummary.payments.map((payment) => (
                                  <div key={payment.id} className="flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="break-words font-medium text-stone-200">{payment.referenceNumber}</p>
                                      <p className="text-xs text-stone-500">
                                        {formatDateTime(payment.receivedAt || payment.createdAt, locale)}
                                      </p>
                                    </div>
                                    <div className="min-w-0 text-start sm:text-end">
                                      <p className="font-semibold text-stone-100">
                                        {formatMoney(payment.amount, payment.currency, locale)}
                                      </p>
                                      <p className="text-xs text-stone-500">{payment.paymentStatus}</p>
                                    </div>
                                  </div>
                              ))}
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-stone-500">
                              {locale === "ar" ? "لا توجد مدفوعات مسجلة بعد." : "No payments recorded yet."}
                            </p>
                        )}
                      </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
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

                  <div className="grid gap-4 sm:gap-6 lg:grid-cols-1">
                    <div className="grid grid-cols-1 gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))] sm:gap-3">
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
                          <div key={item.label} className="min-w-0 rounded-[1rem] bg-stone-900/50 border border-amber-200/10 px-3 py-2.5 sm:rounded-[1.25rem] sm:px-4 sm:py-3">
                            <p className="break-words text-[11px] text-stone-500 sm:text-xs">{item.label}</p>
                            <p className="mt-1 break-words text-[13px] sm:text-sm font-medium text-stone-200">
                              {item.value || t("common.notAvailable")}
                            </p>
                          </div>
                      ))}
                    </div>

                    {selectedRow.technicalSpecs ? (
                        <div className="w-full max-w-full rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4">
                          <p className="font-medium text-stone-100">
                            {t("requests.intake.technicalSpecs")}
                          </p>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-stone-400">
                            {selectedRow.technicalSpecs}
                          </p>
                        </div>
                    ) : null}

                    {selectedRow.deliveryNotes || selectedRow.referenceLink ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-[1.25rem] border border-amber-200/10 bg-stone-900/50 p-4">
                            <p className="font-medium text-stone-100">{t("requests.intake.deliveryNotes")}</p>
                            <p className="mt-2 break-words text-sm leading-7 text-stone-400">
                              {selectedRow.deliveryNotes || t("common.notAvailable")}
                            </p>
                          </div>

                          <div className="rounded-[1.25rem] border border-amber-200/10 bg-stone-900/50 p-4">
                            <p className="font-medium text-stone-100">{t("requests.intake.referenceLink")}</p>
                            {selectedRow.referenceLink ? (
                                <a
                                    href={selectedRow.referenceLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 block break-words text-sm leading-7 text-amber-500 underline-offset-4 hover:underline"
                                >
                                  {selectedRow.referenceLink}
                                </a>
                            ) : (
                                <p className="mt-2 text-sm text-stone-500">
                                  {getSafeLabel(t("common.notAvailable"), "N/A")}
                                </p>
                            )}
                          </div>
                        </div>
                    ) : null}

                    {selectedRow.status === "ready_for_conversion" || selectedRow.status === "transfer_proof_rejected" ? (
                        <div className="rounded-[1.35rem] border border-amber-500/20 bg-amber-500/5 p-4 sm:p-6">
                          <div className="flex min-w-0 items-center gap-3">
                            <Plus className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold text-stone-100">{t("transferProof.title")}</h3>
                          </div>
                          <p className="mt-2 text-sm text-stone-400">
                            {t("transferProof.description")}
                          </p>
                          
                          {selectedRow.status === "transfer_proof_rejected" && selectedRow.transferRejectionReason && (
                            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                              <p className="font-bold">{t("transferProof.rejectionReason")}</p>
                              <p className="mt-1">{selectedRow.transferRejectionReason}</p>
                            </div>
                          )}

                          <div
                              className="mt-6 rounded-[1.25rem] border border-dashed border-amber-500/35 bg-stone-950/30 p-4"
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={handleProofDrop}
                          >
                            <input
                                type="file"
                                id="proof-upload"
                                className="hidden"
                                accept="image/png,image/jpeg,image/webp,application/pdf"
                                onChange={handleProofFileChange}
                                disabled={uploadingProof}
                            />
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                              <Button
                                  asChild
                                  variant="outline"
                                  disabled={uploadingProof}
                                  className="h-12 w-full px-4 sm:w-auto sm:px-8 border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10"
                              >
                                <label htmlFor="proof-upload" className="cursor-pointer">
                                  {t("transferProof.uploadButton")}
                                </label>
                              </Button>
                              <Button
                                  onClick={handleSubmitProof}
                                  disabled={!selectedProofFile || uploadingProof}
                                  className="h-12 w-full px-4 sm:w-auto sm:px-8 bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110"
                              >
                                {uploadingProof ? t("transferProof.uploading") : submitReceiptLabel}
                              </Button>
                            </div>
                            <p className="mt-3 text-xs leading-5 text-stone-500">
                              {locale === "ar"
                                ? "اسحب الإيصال هنا أو اختر ملفاً. الملفات المدعومة: PNG, JPG, WEBP, PDF حتى 8MB."
                                : "Drag the receipt here or choose a file. Supported: PNG, JPG, WEBP, PDF up to 8MB."}
                            </p>
                            {selectedProofFile ? (
                              <p className="mt-3 break-words text-sm text-stone-400">
                                {selectedProofFile.name}
                              </p>
                            ) : null}
                          </div>
                        </div>
                    ) : null}

                    {selectedRow.status === "transfer_proof_pending" ? (
                        <div className="rounded-[1.35rem] border border-amber-200/20 bg-amber-500/10 p-4 text-amber-100 sm:p-6">
                          <div className="flex min-w-0 items-center gap-3">
                            <RotateCcw className="h-5 w-5 animate-spin text-amber-500" />
                            <p className="min-w-0 break-words font-medium">{t("transferProof.statusPending")}</p>
                          </div>
                        </div>
                    ) : null}

                    {!canEditRequest(selectedRow.status) && selectedRow.status !== "ready_for_conversion" && selectedRow.status !== "transfer_proof_rejected" ? (
                        <div className="rounded-[1.35rem] border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-7 text-amber-200">
                          {locale === "ar"
                              ? "لا يمكن تعديل هذا الطلب بعد بدء المراجعة أو تحويله إلى عملية تشغيلية."
                              : "This request cannot be edited after review starts or after it is converted into an operation."}
                        </div>
                    ) : null}

                    <div className="rounded-[1.35rem] border border-amber-200/10 bg-stone-900/50 p-4">
                      <div className="flex items-center gap-3">
                        <FileImage className="h-4 w-4 text-amber-500" />
                        <p className="font-medium text-stone-100">
                          {getSafeLabel(t("requests.labels.attachments"), locale === "ar" ? "المرفقات والصور" : "Attachments")}
                        </p>
                      </div>

                      {selectedRow.attachments.length === 0 ? (
                          <p className="mt-3 text-sm text-stone-500">
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
                                    className="group flex min-w-0 items-center justify-between gap-3 rounded-[1.2rem] border border-amber-200/10 bg-stone-950/50 px-4 py-4 transition-colors hover:border-amber-500/25"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-stone-200 group-hover:text-amber-200">
                                      {attachment.fileName}
                                    </p>
                                    <p className="mt-1 text-[10px] uppercase tracking-wider text-stone-500">
                                      {attachment.category}
                                    </p>
                                  </div>
                                  <ImageIcon className="h-4 w-4 shrink-0 text-stone-600 group-hover:text-amber-500" />
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
