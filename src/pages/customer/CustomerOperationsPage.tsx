import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { CustomerOperationsCommandCenter } from "@/features/customer/CustomerOperationsCommandCenter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { fetchCustomerDashboard, fetchRequests } from "@/domain/operations/service";
import type { OperationsCustomer, OperationsRequest } from "@/domain/operations/types";
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

const CustomerOperationsPage = () => {
  const { profile } = useAuthSession();
  const { locale } = useI18n();
  const [customerData, setCustomerData] = useState<OperationsCustomer | null>(null);
  const [requests, setRequests] = useState<OperationsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const normalizedProfileEmail = profile?.email?.trim().toLowerCase() || "";
  const lang = locale === "ar" ? "ar" : "en";

  const loadData = async (mode: "initial" | "refresh" = "initial") => {
    if (!profile?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === "initial") setLoading(true);
    else setRefreshing(true);

    setError("");

    try {
      const [dashboardResult, requestResult] = await Promise.allSettled([
        fetchCustomerDashboard(),
        fetchRequests(),
      ]);

      if (dashboardResult.status === "fulfilled") {
        setCustomerData(dashboardResult.value || null);
      } else {
        logOperationalError("customer_operations_dashboard_load", dashboardResult.reason, { customerId: profile.id });
      }

      if (requestResult.status === "fulfilled") {
        const visibleRequests = [...requestResult.value]
          .filter((request) => {
            if (!normalizedProfileEmail) return true;
            return getRequestEmail(request).trim().toLowerCase() === normalizedProfileEmail;
          })
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        setRequests(visibleRequests);
      } else {
        logOperationalError("customer_operations_requests_load", requestResult.reason, { customerId: profile.id });
      }

      if (dashboardResult.status === "rejected" || requestResult.status === "rejected") {
        setError(
          lang === "ar"
            ? "تعذر تحميل بعض بيانات مركز العمليات حالياً."
            : "Some operations center data could not be loaded right now.",
        );
      }
    } catch (err) {
      logOperationalError("customer_operations_center_load", err, { customerId: profile.id });
      setError(lang === "ar" ? "تعذر تحميل مركز العمليات." : "Unable to load operations center.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, normalizedProfileEmail, lang]);

  const recentRequests = useMemo(() => requests.slice(0, 8), [requests]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-[1.75rem] bg-stone-900" />
        <Skeleton className="h-64 rounded-[1.75rem] bg-stone-900" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-500/80">
            {lang === "ar" ? "مركز عمليات العميل" : "Customer operations"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-stone-100 md:text-4xl">
            {lang === "ar" ? "مركز المتابعة الذكي" : "Smart Operations Center"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
            {lang === "ar"
              ? "صفحة واحدة تجمع الإجراء التالي، آخر الطلبات، التتبع، والإشعارات الرسمية."
              : "One page for the next action, recent requests, tracking, and official notifications."}
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

      <CustomerOperationsCommandCenter
        requests={recentRequests}
        totalRequests={requests.length}
        dealsCount={customerData?.dealsCount || 0}
        loading={loading}
      />
    </div>
  );
};

export default CustomerOperationsPage;
