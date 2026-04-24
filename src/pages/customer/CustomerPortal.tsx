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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { fetchCustomerDashboard, fetchRequests } from "@/domain/operations/service";
import type { OperationsCustomer, OperationsRequest } from "@/domain/operations/types";
import { logOperationalError } from "@/lib/monitoring";
import {
  getCustomerFinancialSummaryCopy,
  getCustomerRequestStatusCopy,
} from "@/lib/customerExperience";

const getSafeLabel = (value: string, fallback: string) => {
  if (!value || value.includes(".")) {
    return fallback;
  }

  return value;
};

const formatNumber = (value: number, locale: string) =>
    new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(value || 0);

const formatMoney = (value: number, locale: string) =>
    `${formatNumber(value || 0, locale)} SAR`;

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
              ? "أرسل طلب شراء جديد مع الصور والمواصفات."
              : "Submit a new purchase request with images and specifications.",
      ),
      icon: PlusCircle,
      link: "/request",
      color: "text-primary",
      bgColor: "bg-primary/10",
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
      link: "/customer-portal/requests",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
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
      color: "text-green-500",
      bgColor: "bg-green-500/10",
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
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
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

  const statementNotice = getSafeLabel(
      t("customerPortal.financial.statementNotice"),
      locale === "ar"
          ? "الأرقام المالية المعروضة هنا ملخص تشغيلي، والتقرير النهائي يعتمد على مراجعة الإدارة."
          : "The financial numbers shown here are operational summaries. Final statements depend on management review.",
  );

  return (
      <>
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              {getSafeLabel(
                  t("customerPortal.eyebrow"),
                  locale === "ar" ? "لوحة العميل" : "Customer portal",
              )}
            </p>

            <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
              {getSafeLabel(t("customerPortal.welcome"), locale === "ar" ? "مرحباً" : "Welcome")}{" "}
              <span className="text-gradient-gold">
              {profile?.fullName || profile?.email || ""}
            </span>
            </h1>

            <p className="mt-3 max-w-3xl text-muted-foreground">
              {getSafeLabel(
                  t("customerPortal.description"),
                  locale === "ar"
                      ? "تابع طلبات الشراء، الشحنات، والحسابات التشغيلية من مكان واحد."
                      : "Manage purchase requests, shipments, and operational accounting from one place.",
              )}
            </p>
          </div>

          <Button
              variant="outline"
              onClick={() => void loadData("refresh")}
              disabled={loading || refreshing}
          >
            <RefreshCw className={`me-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing
                ? locale === "ar"
                    ? "جارٍ التحديث..."
                    : "Refreshing..."
                : locale === "ar"
                    ? "تحديث"
                    : "Refresh"}
          </Button>
        </motion.div>

        {loadError ? (
            <div className="mb-6 flex items-start gap-3 rounded-[1.5rem] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              label: locale === "ar" ? "آخر الطلبات" : "Recent",
              value: formatNumber(portalMetrics.recent, locale),
              icon: ShieldCheck,
            },
          ].map((item) => (
              <BentoCard key={item.label} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold">{item.value}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </BentoCard>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {menuItems.map((item, index) => (
              <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
              >
                <Link to={item.link}>
                  <BentoCard className="group relative h-full cursor-pointer overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg">
                    <div
                        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${item.bgColor} ${item.color}`}
                    >
                      <item.icon className="h-6 w-6" />
                    </div>

                    <h3 className="font-serif text-xl font-semibold transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>

                    {item.badge !== null && item.badge > 0 ? (
                        <div className="absolute end-4 top-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {formatNumber(item.badge, locale)}
                        </div>
                    ) : null}
                  </BentoCard>
                </Link>
              </motion.div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <BentoCard className="flex flex-col justify-center p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold">
                {getSafeLabel(
                    t("customerPortal.financial.title"),
                    locale === "ar" ? "الملخص المالي" : "Financial summary",
                )}
              </h3>
            </div>

            {loading ? (
                <div className="space-y-4 py-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full rounded-[1.5rem]" />
                </div>
            ) : customerData ? (
                <div className="space-y-4">
                  <div className="rounded-[1.25rem] border border-primary/15 bg-primary/10 p-4 text-sm leading-7 text-muted-foreground">
                    {financialSummaryCopy}
                  </div>

                  <div className="rounded-[1.25rem] border border-border/60 bg-secondary/10 p-4 text-sm leading-7 text-muted-foreground">
                    {statementNotice}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                      <p className="text-xs text-muted-foreground">
                        {getSafeLabel(
                            t("customerPortal.financial.balance"),
                            locale === "ar" ? "الرصيد" : "Balance",
                        )}
                      </p>
                      <p
                          className={`mt-2 text-2xl font-bold ${
                              customerData.financialBalance >= 0
                                  ? "text-emerald-500"
                                  : "text-rose-500"
                          }`}
                      >
                        {formatMoney(customerData.financialBalance, locale)}
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                      <p className="text-xs text-muted-foreground">
                        {getSafeLabel(
                            t("customerPortal.financial.operations"),
                            locale === "ar" ? "العمليات" : "Operations",
                        )}
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {formatNumber(customerData.dealsCount, locale)}
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                      <p className="text-xs text-muted-foreground">
                        {getSafeLabel(
                            t("customerPortal.financial.incomeTracked"),
                            locale === "ar" ? "الإيرادات المسجلة" : "Income tracked",
                        )}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-emerald-500">
                        {formatMoney(customerData.financialIncome, locale)}
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                      <p className="text-xs text-muted-foreground">
                        {getSafeLabel(
                            t("customerPortal.financial.expenseTracked"),
                            locale === "ar" ? "المصاريف المسجلة" : "Expense tracked",
                        )}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-rose-500">
                        {formatMoney(customerData.financialExpense, locale)}
                      </p>
                    </div>
                  </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 rounded-full bg-secondary p-4">
                    <LayoutDashboard className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">
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

          <BentoCard className="flex flex-col justify-center p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold">
                {getSafeLabel(
                    t("customerPortal.recent.title"),
                    locale === "ar" ? "آخر الطلبات" : "Recent requests",
                )}
              </h3>
            </div>

            {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-[1.25rem]" />
                  <Skeleton className="h-20 w-full rounded-[1.25rem]" />
                  <Skeleton className="h-20 w-full rounded-[1.25rem]" />
                </div>
            ) : recentRequests.length > 0 ? (
                <div className="space-y-3">
                  {recentRequestStatus ? (
                      <div className="rounded-[1.2rem] border border-primary/15 bg-primary/10 p-4 text-sm leading-7 text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {recentRequestStatus.label}
                        </p>
                        <p className="mt-2">{recentRequestStatus.nextStep}</p>
                      </div>
                  ) : null}

                  {recentRequests.map((request) => {
                    const statusCopy = getCustomerRequestStatusCopy(request.status, lang);
                    const trackingCode = getTrackingCode(request);

                    return (
                        <Link
                            key={request.id}
                            to={`/customer-portal/requests?request=${request.id}`}
                            className="block rounded-xl border border-border/40 bg-secondary/5 p-4 transition-colors hover:border-primary/25 hover:bg-secondary/15"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{request.requestNumber}</p>
                              <p className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
                                {request.productName ||
                                    (locale === "ar" ? "طلب شراء" : "Purchase request")}
                              </p>

                              {trackingCode ? (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    {locale === "ar" ? "كود التتبع: " : "Tracking: "}
                                    {trackingCode}
                                  </p>
                              ) : null}
                            </div>

                            <div className="shrink-0 text-start sm:text-end">
                        <span className="inline-flex w-fit rounded-md bg-secondary px-2 py-1 text-[10px] uppercase text-muted-foreground">
                          {statusCopy?.label || request.statusLabel || request.status}
                        </span>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {formatDate(request.createdAt, locale)}
                              </p>
                            </div>
                          </div>
                        </Link>
                    );
                  })}

                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link to="/customer-portal/requests">
                      {getSafeLabel(
                          t("customerPortal.recent.viewAll"),
                          locale === "ar" ? "عرض كل الطلبات" : "View all requests",
                      )}
                    </Link>
                  </Button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                  <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                    {locale === "ar"
                        ? "لم يتم تسجيل أي طلبات بعد. ابدأ بطلب شراء جديد ليظهر هنا."
                        : "No requests have been submitted yet. Start a new purchase request to see it here."}
                  </p>

                  <Button variant="outline" asChild>
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
      </>
  );
};

export default CustomerPortal;
