import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

import CustomerRequestDetailProView from "@/features/customer/CustomerRequestDetailProView";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadCustomerPaymentSummaries, type CustomerPaymentSummary } from "@/domain/accounting/payments";
import { fetchRequests, fetchShipments } from "@/domain/operations/service";
import type { OperationsRequest, OperationsShipment } from "@/domain/operations/types";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";

const getRequestEmail = (request: OperationsRequest) => {
  const row = request as OperationsRequest & {
    customer?: { email?: string };
    customerEmail?: string;
    email?: string;
  };

  return row.customer?.email || row.customerEmail || row.email || "";
};

const CustomerRequestDetailProPage = () => {
  const { profile } = useAuthSession();
  const { locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<OperationsRequest[]>([]);
  const [shipments, setShipments] = useState<OperationsShipment[]>([]);
  const [paymentSummaries, setPaymentSummaries] = useState<Map<string, CustomerPaymentSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const lang = locale === "ar" ? "ar" : "en";
  const selectedRequestId = searchParams.get("request");
  const normalizedEmail = profile?.email?.trim().toLowerCase() || "";

  const loadData = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);

    setError("");

    try {
      const [loaded, loadedShipments] = await Promise.all([
        fetchRequests(),
        fetchShipments()
      ]);

      const visibleRequests = [...loaded]
        .filter((request) => {
          if (!normalizedEmail) return true;
          return getRequestEmail(request).trim().toLowerCase() === normalizedEmail;
        })
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

      setRequests(visibleRequests);
      setShipments(loadedShipments);

      const dealIds = visibleRequests.map((request) => request.convertedDealId).filter(Boolean) as string[];
      setPaymentSummaries(dealIds.length ? await loadCustomerPaymentSummaries(dealIds) : new Map());

      if (!selectedRequestId && visibleRequests[0]) {
        setSearchParams({ request: visibleRequests[0].id }, { replace: true });
      }
    } catch (err) {
      logOperationalError("customer_request_detail_pro_load", err, { customerId: profile?.id });
      setError(lang === "ar" ? "تعذر تحميل تفاصيل الطلب الاحترافية." : "Unable to load the pro request details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, normalizedEmail, lang]);

  const selectedRequest = useMemo(() => {
    if (!requests.length) return null;
    return requests.find((request) => request.id === selectedRequestId) || requests[0];
  }, [requests, selectedRequestId]);

  const selectedShipment = useMemo(() => {
    if (!selectedRequest || !shipments.length) return null;
    return shipments.find(s =>
      s.dealId === selectedRequest.convertedDealId ||
      (selectedRequest.trackingCode && s.trackingId === selectedRequest.trackingCode)
    ) || null;
  }, [selectedRequest, shipments]);

  const selectedPaymentSummary = selectedRequest?.convertedDealId
    ? paymentSummaries.get(selectedRequest.convertedDealId)
    : undefined;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-[1.75rem] bg-stone-900" />
        <Skeleton className="h-[640px] rounded-[1.75rem] bg-stone-900" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Button asChild variant="link" className="h-auto p-0 text-amber-300">
            <Link to="/customer-portal/requests">
              <ArrowLeft className="me-2 h-4 w-4" />
              {lang === "ar" ? "العودة إلى الطلبات" : "Back to requests"}
            </Link>
          </Button>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-amber-500/80">
            {lang === "ar" ? "تفاصيل الطلب" : "Request detail"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-stone-100 md:text-4xl">
            {lang === "ar" ? "العرض الاحترافي للطلب" : "Customer Request Pro View"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
            {lang === "ar"
              ? "صفحة واحدة تجمع حالة الطلب، الإجراء التالي، الدفع، التتبع، التواصل الرسمي، والمرفقات."
              : "One page for status, next action, payment, tracking, official communication, and attachments."}
          </p>
        </div>
        <Button
          variant="outline"
          className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10"
          onClick={() => void loadData("refresh")}
          disabled={refreshing}
        >
          <RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin text-amber-500" : "text-amber-500"}`} />
          {refreshing ? (lang === "ar" ? "جاري التحديث..." : "Refreshing...") : (lang === "ar" ? "تحديث" : "Refresh")}
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-[1.5rem] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {selectedRequest ? (
        <CustomerRequestDetailProView
          request={selectedRequest}
          shipment={selectedShipment}
          paymentSummary={selectedPaymentSummary}
          locale={locale}
        />
      ) : (
        <EmptyState
          icon={AlertCircle}
          title={lang === "ar" ? "لا يوجد طلب محدد" : "No request selected"}
          description={lang === "ar" ? "أنشئ طلباً جديداً أو ارجع إلى صفحة الطلبات." : "Create a new request or return to the requests page."}
        />
      )}
    </div>
  );
};

export default CustomerRequestDetailProPage;
