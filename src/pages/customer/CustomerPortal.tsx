import { motion } from "framer-motion";
import {
  AlertCircle,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  RefreshCw,
  Route,
  ShieldCheck,
  UserCircle2,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import BentoCard from "@/components/BentoCard";
import { SupportConversationWidget } from "@/components/SupportConversationWidget";
import { ReadableInfoCard, ReadableMetricCard, ResponsiveInfoGrid, SectionHelpBox } from "@/components/readable/ReadableCards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { getRoleDisplayName } from "@/lib/identity";
import { formatMoney as libFormatMoney } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { fetchCustomerDashboard, fetchRequests } from "@/domain/operations/service";
import type { OperationsCustomer, OperationsRequest } from "@/domain/operations/types";
import { fetchClientDeals } from "@/domain/clientPortal/portalService";
import type { ClientPortalDealView } from "@/domain/clientPortal/types";
import { logOperationalError } from "@/lib/monitoring";
import {
  getCustomerFinancialSummaryCopy,
  getCustomerRequestStatusCopy,
} from "@/lib/customerExperience";
import { CustomerOperationsHealthWidget } from "@/features/customer-intelligence/components/CustomerOperationsHealthWidget";
import { FinancialVisibilityLayer } from "@/features/customer-intelligence/components/FinancialVisibilityLayer";
import { CustomerAIAssistantStub } from "@/features/customer-intelligence/components/CustomerAIAssistantStub";
import {
  generateCustomerSuccessInsights
} from "@/features/customer-success-intelligence/lib/customerSuccessEngine";
import { CustomerSuccessInsights } from "@/features/customer-success-intelligence/components/CustomerSuccessInsights";

const getSafeLabel = (value: string, fallback: string) => {
  if (!value || value.includes(".")) {
    return fallback;
  }

  return value;
};

const formatNumber = (value: number, locale: string) =>
    new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(value || 0);

const formatMoney = (value: number | string | null | undefined, locale: string, currency?: string | null) =>
    libFormatMoney(value, currency, locale === "ar" ? "ar" : "en");

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

const getRequestEmail = (request: OperationsRequest) => {
  const requestWithCustomer = request as OperationsRequest & {
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

const getTrackingCode = (request: OperationsRequest) => {
  const requestWithTracking = request as OperationsRequest & {
    trackingCode?: string;
    tracking_code?: string;
  };

  return requestWithTracking.trackingCode || requestWithTracking.tracking_code || "";
};

const CustomerPortal = () => {
  const { profile } = useAuthSession();
  const { locale, t } = useI18n();

  const [customerData, setCustomerData] = useState<OperationsCustomer | null>(null);
  const [recentRequests, setRecentRequests] = useState<OperationsRequest[]>([]);
  const [deals, setDeals] = useState<ClientPortalDealView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const lang = locale === "ar" ? "ar" : "en";
  const normalizedProfileEmail = profile?.email?.trim().toLowerCase() || "";

  const loadData = async (mode: "initial" | "refresh" = "initial") => {
    if (!profile?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setLoadError("");

    try {
      let dashboard: OperationsCustomer | null = null;
      let requests: OperationsRequest[] = [];
      let dealsData: ClientPortalDealView[] = [];
      let dashboardError: unknown = null;
      let requestsError: unknown = null;

      try {
        dashboard = await fetchCustomerDashboard();
      } catch (error) {
        dashboardError = error;
        logOperationalError("customer_portal_dashboard_load", error, {
          customerId: profile.id,
        });
      }

      try {
        requests = await fetchRequests();
      } catch (error) {
        requestsError = error;
        logOperationalError("customer_portal_requests_load", error, {
          customerId: profile.id,
        });
      }

      try {
        dealsData = await fetchClientDeals();
        setDeals(dealsData);
      } catch (error) {
        logOperationalError("customer_portal_deals_load", error, {
          customerId: profile.id,
        });
      }

      setCustomerData(dashboard || null);

      const myRequests = [...requests]
          .filter((request) => {
            if (!normalizedProfileEmail) {
              return true;
            }

            const requestEmail = getRequestEmail(request).trim().toLowerCase();

            if (!requestEmail) {
              return false;
            }

            return requestEmail === normalizedProfileEmail;
          })
          .sort(
              (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

      setRecentRequests(myRequests.slice(0, 3));

      if (dashboardError || requestsError) {
        setLoadError(
            locale === "ar"
                ? "تعذر تحميل بعض بيانات لوحة العميل حالياً. يمكنك متابعة الطلبات أو إنشاء طلب جديد."
                : "Some customer portal data could not be loaded right now. You can still view requests or create a new request.",
        );
      }
    } catch (error) {
      logOperationalError("customer_portal_load", error, {
        customerId: profile.id,
      });

      setLoadError(
          locale === "ar"
              ? "تعذر تحميل بيانات لوحة العميل حالياً. حاول مرة أخرى."
              : "Unable to load the customer portal right now. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, normalizedProfileEmail]);

  const portalMetrics = useMemo(
      () => ({
        requests: customerData?.requestsCount || recentRequests.length || 0,
        deals: customerData?.dealsCount || 0,
        balance: customerData?.financialBalance || 0,
        recent: recentRequests.length,
      }),
      [customerData, recentRequests.length],
  );

  const menuItems = [
    {
      title: getSafeLabel(
          t("customerPortal.actions.newRequest.title"),
          locale === "ar" ? "طلب جديد" : "New request",
      ),
      description: getSafeLabel(
          t("customerPortal.actions.newRequest.description"),
          locale === "ar"
              ? "أرسل طلب شراء جديداً مع الصور والمواصفات."
              : "Submit a new purchase request with images and specifications.",
      ),
      icon: PlusCircle,
      link: "/request",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      badge: null as number | null,
    },
    {
      title: getSafeLabel(
          t("customerPortal.actions.requests.title"),
          locale === "ar" ? "طلباتي" : "My requests",
      ),
      description: getSafeLabel(
          t("customerPortal.actions.requests.description"),
          locale === "ar"
              ? "راجع طلباتك وتابع حالة المراجعة."
              : "Review your purchase requests and follow their progress.",
      ),
      icon: ClipboardList,
      link: "/customer-portal/requests#requests",
      color: "text-amber-200",
      bgColor: "bg-amber-500/10",
      badge: portalMetrics.requests,
    },
    {
      title: getSafeLabel(
          t("customerPortal.actions.tracking.title"),
          locale === "ar" ? "التتبع" : "Tracking",
      ),
      description: getSafeLabel(
          t("customerPortal.actions.tracking.description"),
          locale === "ar"
              ? "تابع الشحنات والعمليات بعد اعتماد الطلب."
              : "Track shipments and operations after request approval.",
      ),
      icon: Route,
      link: "/customer-portal/tracking",
      color: "text-amber-200",
      bgColor: "bg-amber-500/10",
      badge: portalMetrics.deals,
    },
    {
      title: getSafeLabel(
          t("customerPortal.actions.profile.title"),
          locale === "ar" ? "الملف الشخصي" : "Profile",
      ),
      description: getSafeLabel(
          t("customerPortal.actions.profile.description"),
          locale === "ar"
              ? "راجع بيانات حسابك ومعلومات التواصل."
              : "Review your account and contact information.",
      ),
      icon: UserCircle2,
      link: "/profile",
      color: "text-amber-200",
      bgColor: "bg-amber-500/10",
      badge: null as number | null,
    },
  ];

  const recentRequestStatus = recentRequests[0]
      ? getCustomerRequestStatusCopy(recentRequests[0].status, lang)
      : null;

  const financialSummaryCopy = getCustomerFinancialSummaryCopy(lang, {
    hasMixedCurrencies: false,
    dealsCount: customerData?.dealsCount || 0,
  });

  const successInsights = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateCustomerSuccessInsights(recentRequests as any, deals as any),
    [recentRequests, deals]
  );

  const statementNotice = getSafeLabel(
      t("customerPortal.financial.statementNotice"),
      locale === "ar"
          ? "الأرقام المالية المعروضة هنا ملخص تشغيلي، والتقرير النهائي يعتمد على مراجعة الإدارة."
          : "The financial numbers shown here are operational summaries. Final statements depend on management review.",
  );

  return (
      <>
        <PageHelpBox pageKey="customer_portal" role={profile?.role} className="mb-6" />
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex w-full max-w-full min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-500/80">
              {getSafeLabel(
                  t("customerPortal.eyebrow"),
                  locale === "ar" ? "لوحة العميل" : "Customer portal",
              )}
            </p>

            <h1 className="mt-2 break-words font-serif text-2xl font-bold text-stone-100 sm:text-3xl md:text-4xl">
              {getSafeLabel(t("customerPortal.welcome"), locale === "ar" ? "مرحباً" : "Welcome")}{" "}
              <span className="text-amber-500">
              {profile?.fullName || profile?.email || ""}
            </span>
            </h1>

            <p className="mt-3 max-w-3xl break-words text-stone-400">
              {getSafeLabel(
                  t("customerPortal.description"),
                  locale === "ar"
                      ? "تابع طلبات الشراء والشحنات والحسابات التشغيلية من مكان واحد."
                      : "Manage purchase requests, shipments, and operational accounting from one place.",
              )}
            </p>
          </div>

          <Button
              variant="outline"
              className="w-full md:w-auto border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10"
              onClick={() => void loadData("refresh")}
              disabled={loading || refreshing}
          >
            <RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin text-amber-500" : "text-amber-500"}`} />
            {refreshing
                ? locale === "ar"
                    ? "جاري التحديث..."
                    : "Refreshing..."
                : locale === "ar"
                    ? "تحديث"
                    : "Refresh"}
          </Button>
        </motion.div>

        <div className="mb-8">
          <CustomerOperationsHealthWidget
            activeShipmentsCount={deals.filter(d => d.operationalStatus !== "delivered" && d.operationalStatus !== "closed").length}
            openRequestsCount={recentRequests.filter(r => r.status !== "completed" && r.status !== "cancelled").length}
            delayedCount={deals.filter(d => d.shipment?.currentStage === "customs_clearance" || d.shipment?.currentStage === "in_transit").length}
            lastUpdateDate={deals[0]?.createdAt || recentRequests[0]?.createdAt}
            nextAction={recentRequestStatus?.label}
            nextActionAr={recentRequestStatus?.label}
          />
        </div>

        {!loading && successInsights.length > 0 && (
          <div className="mb-8">
            <CustomerSuccessInsights insights={successInsights} />
          </div>
        )}

        {loadError ? (
            <div className="mb-6 flex w-full max-w-full items-start gap-3 rounded-[1.5rem] border border-destructive/20 bg-destructive/10 px-4 py-4 text-sm text-destructive sm:px-5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{loadError}</span>
            </div>
        ) : null}

        <ResponsiveInfoGrid className="mb-6" min="minmax(min(100%,11rem),1fr)">
          {[
            {
              label: locale === "ar" ? "الطلبات" : "Requests",
              value: formatNumber(portalMetrics.requests, locale),
              icon: ClipboardList,
            },
            {
              label: locale === "ar" ? "العمليات" : "Operations",
              value: formatNumber(portalMetrics.deals, locale),
              icon: Route,
            },
            {
              label: locale === "ar" ? "الرصيد" : "Balance",
              value: formatMoney(portalMetrics.balance, locale),
              icon: Wallet,
            },
            {
              label: locale === "ar" ? "الأحدث" : "Recent",
              value: formatNumber(portalMetrics.recent, locale),
              icon: ShieldCheck,
            },
          ].map((item) => (
              <ReadableMetricCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
          ))}
        </ResponsiveInfoGrid>

        <ResponsiveInfoGrid className="gap-6" min="minmax(min(100%,13rem),1fr)">
          {menuItems.map((item, index) => (
              <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
              >
                <Link to={item.link} className="block h-full min-w-0">
                  <BentoCard className="group relative h-full cursor-pointer overflow-hidden transition-all hover:border-amber-200/30">
                    <div
                        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${item.bgColor} ${item.color}`}
                    >
                      <item.icon className="h-6 w-6" />
                    </div>

                    <h3 className="break-words font-serif text-xl font-semibold text-stone-100 transition-colors group-hover:text-amber-200">
                      {item.title}
                    </h3>

                    <p className="mt-2 break-words text-sm leading-6 text-stone-400">
                      {item.description}
                    </p>

                    {item.badge !== null && item.badge > 0 ? (
                        <div className="absolute end-4 top-4 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-950">
                          {formatNumber(item.badge, locale)}
                        </div>
                    ) : null}
                  </BentoCard>
                </Link>
              </motion.div>
          ))}
        </ResponsiveInfoGrid>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SupportConversationWidget compact />

          <BentoCard className="flex flex-col justify-center p-4 sm:p-8">
            <div className="mb-6 flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Wallet className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="min-w-0 break-words font-serif text-xl font-semibold text-stone-100">
                {getSafeLabel(
                    t("customerPortal.financial.title"),
                    locale === "ar" ? "الملخص المالي" : "Financial summary",
                )}
              </h3>
            </div>

            {loading ? (
                <div className="space-y-4 py-4">
                  <Skeleton className="h-12 w-full bg-stone-900" />
                  <Skeleton className="h-12 w-full bg-stone-900" />
                  <Skeleton className="h-32 w-full rounded-[1.5rem] bg-stone-900" />
                </div>
            ) : customerData ? (
                <div className="space-y-4">
                  <div className="rounded-[1.25rem] border border-amber-500/15 bg-amber-500/5 p-4 text-sm leading-7 text-stone-400">
                    {financialSummaryCopy}
                  </div>

                  <div className="rounded-[1.25rem] border border-amber-200/10 bg-stone-900/50 p-4 text-sm leading-7 text-stone-400">
                    {statementNotice}
                  </div>
                  <SectionHelpBox
                    title={locale === "ar" ? "ماذا يعني الملخص المالي؟" : "What does this financial summary mean?"}
                    body={
                      locale === "ar"
                        ? "الرصيد يوضح الفرق بين المدفوعات والمصروفات المسجلة على عملياتك. إذا ظهر مبلغ متبقٍ فهذا يعني أنه يحتاج دفعاً أو مراجعة من الإدارة."
                        : "The balance shows the difference between payments and expenses recorded for your operations."
                    }
                    example={
                      locale === "ar"
                        ? "مثال: إذا كان المتبقي 100$ فهذا يعني أن العميل لم يدفع هذا المبلغ بعد أو أنه لم تتم مراجعته نهائياً."
                        : "Example: if 100 USD remains, that amount is not yet paid or not finally reviewed."
                    }
                  />

                  <ResponsiveInfoGrid min="minmax(min(100%,11rem),1fr)">
                    <ReadableInfoCard
                      label={getSafeLabel(t("customerPortal.financial.balance"), locale === "ar" ? "الرصيد" : "Balance")}
                      value={<span className={customerData.financialBalance >= 0 ? "text-emerald-400" : "text-rose-400"}>{formatMoney(customerData.financialBalance, locale)}</span>}
                    />
                    <ReadableInfoCard
                      label={getSafeLabel(t("customerPortal.financial.operations"), locale === "ar" ? "العمليات" : "Operations")}
                      value={formatNumber(customerData.dealsCount, locale)}
                    />
                    <ReadableInfoCard
                      label={getSafeLabel(t("customerPortal.financial.incomeTracked"), locale === "ar" ? "الإيرادات المسجلة" : "Income tracked")}
                      value={<span className="text-emerald-400">{formatMoney(customerData.financialIncome, locale)}</span>}
                    />
                    <ReadableInfoCard
                      label={getSafeLabel(t("customerPortal.financial.expenseTracked"), locale === "ar" ? "المصروفات المسجلة" : "Expense tracked")}
                      value={<span className="text-rose-400">{formatMoney(customerData.financialExpense, locale)}</span>}
                    />
                  </ResponsiveInfoGrid>

                  <div className="pt-6 mt-6 border-t border-amber-200/5">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">
                      {t("commandCenter.financialVisibilityDetail")}
                    </p>
                    <FinancialVisibilityLayer
                      paidAmount={customerData.financialIncome}
                      remainingAmount={Math.abs(customerData.financialBalance)}
                      totalAmount={customerData.financialIncome + Math.abs(customerData.financialBalance)}
                      currency="SAR"
                      completionState={customerData.financialBalance >= 0 ? "Settled" : "Outstanding"}
                    />
                  </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 rounded-full bg-stone-900 p-4">
                    <LayoutDashboard className="h-8 w-8 text-stone-600" />
                  </div>
                  <p className="text-sm text-stone-500">
                    {getSafeLabel(
                        t("customerPortal.financial.empty"),
                        locale === "ar"
                            ? "لا توجد بيانات مالية متاحة حالياً."
                            : "No financial data is available yet.",
                    )}
                  </p>
                </div>
            )}
          </BentoCard>

          <BentoCard className="flex flex-col justify-center p-4 sm:p-8">
            <div className="mb-6 flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <ClipboardList className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="min-w-0 break-words font-serif text-xl font-semibold text-stone-100">
                {getSafeLabel(
                    t("customerPortal.recent.title"),
                    locale === "ar" ? "آخر الطلبات" : "Recent requests",
                )}
              </h3>
            </div>

            {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-[1.25rem] bg-stone-900" />
                  <Skeleton className="h-20 w-full rounded-[1.25rem] bg-stone-900" />
                  <Skeleton className="h-20 w-full rounded-[1.25rem] bg-stone-900" />
                </div>
            ) : recentRequests.length > 0 ? (
                <div className="space-y-3">
                  {recentRequestStatus ? (
                      <div className="rounded-[1.2rem] border border-amber-500/15 bg-amber-500/5 p-4 text-sm leading-7 text-stone-400">
                        <p className="font-medium text-stone-100">
                          {recentRequestStatus.label}
                        </p>
                        <p className="mt-2">{recentRequestStatus.nextStep}</p>
                      </div>
                  ) : null}

                  {recentRequests.map((request) => {
                    const statusCopy = getCustomerRequestStatusCopy(request.status, lang);
                    const trackingCode = getTrackingCode(request);

                    return (
                        <div
                            key={request.id}
                            className="block w-full max-w-full min-w-0 rounded-xl border border-amber-200/10 bg-stone-900/50 p-4 transition-colors hover:border-amber-500/25 hover:bg-stone-800/50"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-medium text-stone-100">{request.requestNumber}</p>
                              <p className="mt-1 max-w-full break-words text-xs text-stone-400 sm:max-w-[260px] sm:truncate">
                                {request.productName ||
                                    (locale === "ar" ? "طلب شراء" : "Purchase request")}
                              </p>

                              {trackingCode ? (
                                  <p className="mt-2 break-words text-xs text-stone-500">
                                    {locale === "ar" ? "كود التتبع: " : "Tracking: "}
                                    {trackingCode}
                                  </p>
                              ) : null}
                            </div>

                            <div className="min-w-0 shrink-0 text-start sm:text-end">
                        <span className="inline-flex max-w-full break-words rounded-md bg-stone-800 px-2 py-1 text-[10px] uppercase text-stone-400">
                          {statusCopy?.label || request.statusLabel || request.status}
                        </span>
                              <p className="mt-2 text-xs text-stone-500">
                                {formatDate(request.createdAt, locale)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-4 border-t border-amber-200/5 pt-3">
                            <Button variant="link" className="h-auto p-0 text-xs font-bold text-amber-500 hover:text-amber-400" asChild>
                              <Link to={`/customer-portal/request-detail?request=${request.id}`}>
                                {lang === "ar" ? "العرض الاحترافي" : "Pro View"}
                              </Link>
                            </Button>
                            {trackingCode ? (
                              <Button variant="link" className="h-auto p-0 text-xs font-bold text-amber-500 hover:text-amber-400" asChild>
                                <Link to={`/customer-portal/tracking-pro?tracking=${encodeURIComponent(trackingCode)}`}>
                                  {lang === "ar" ? "التتبع الاحترافي" : "Tracking Pro"}
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                    );
                  })}

                  <Button variant="link" className="h-auto p-0 text-xs text-amber-500 hover:text-amber-400" asChild>
                    <Link to="/customer-portal/requests#requests">
                      {getSafeLabel(
                          t("customerPortal.recent.viewAll"),
                          locale === "ar" ? "عرض كل الطلبات" : "View all requests",
                      )}
                    </Link>
                  </Button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                  <p className="max-w-sm text-sm leading-7 text-stone-400">
                    {locale === "ar"
                        ? "لم يتم تسجيل أي طلبات بعد. ابدأ بطلب شراء جديد ليظهر هنا."
                        : "No requests have been submitted yet. Start a new purchase request to see it here."}
                  </p>

                  <Button variant="outline" className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10" asChild>
                    <Link to="/request">
                      {getSafeLabel(
                          t("customerPortal.recent.firstRequest"),
                          locale === "ar" ? "إنشاء أول طلب" : "Create first request",
                      )}
                    </Link>
                  </Button>
                </div>
            )}
          </BentoCard>
        </div>

        <CustomerAIAssistantStub requests={recentRequests} deals={deals} />
      </>
  );
};

export default CustomerPortal;


