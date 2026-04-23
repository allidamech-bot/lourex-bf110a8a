import { motion } from "framer-motion";
import {
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  Route,
  UserCircle2,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import BentoCard from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { fetchCustomerDashboard, fetchRequests } from "@/domain/operations/service";
import type { OperationsCustomer, OperationsRequest } from "@/domain/operations/types";
import { logOperationalError } from "@/lib/monitoring";

export default function CustomerPortal() {
  const { profile } = useAuthSession();
  const { locale, t } = useI18n();
  const [customerData, setCustomerData] = useState<OperationsCustomer | null>(null);
  const [recentRequests, setRecentRequests] = useState<OperationsRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const [dashboard, requests] = await Promise.all([
          fetchCustomerDashboard(),
          fetchRequests(),
        ]);

        setCustomerData(dashboard);
        const myRequests = requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setRecentRequests(myRequests.slice(0, 3));
      } catch (error) {
        logOperationalError("customer_portal_load", error, { customerId: profile.id });
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [profile?.id]);

  const menuItems = [
    {
      title: t("customerPortal.actions.newRequest.title"),
      description: t("customerPortal.actions.newRequest.description"),
      icon: PlusCircle,
      link: "/request",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("customerPortal.actions.requests.title"),
      description: t("customerPortal.actions.requests.description"),
      icon: ClipboardList,
      link: "/customer-portal/requests",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: t("customerPortal.actions.tracking.title"),
      description: t("customerPortal.actions.tracking.description"),
      icon: Route,
      link: "/customer-portal/tracking",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: t("customerPortal.actions.profile.title"),
      description: t("customerPortal.actions.profile.description"),
      icon: UserCircle2,
      link: "/profile",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
          {t("customerPortal.eyebrow")}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
          {t("customerPortal.welcome")} <span className="text-gradient-gold">{profile?.fullName}</span>
        </h1>
        <p className="mt-3 text-muted-foreground">{t("customerPortal.description")}</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {menuItems.map((item, index) => {
          let badge = null;
          if (item.link === "/customer-portal/requests" && customerData) {
            badge = customerData.requestsCount;
          } else if (item.link === "/customer-portal/tracking" && customerData) {
            badge = customerData.dealsCount;
          }

          return (
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
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>

                  {badge !== null && badge > 0 ? (
                    <div className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {badge}
                    </div>
                  ) : null}
                </BentoCard>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <BentoCard className="flex flex-col justify-center p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-serif text-xl font-semibold">{t("customerPortal.financial.title")}</h3>
          </div>

          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : customerData ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                <p className="text-xs text-muted-foreground">{t("customerPortal.financial.balance")}</p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    customerData.financialBalance >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {customerData.financialBalance.toLocaleString(locale)} SAR
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                <p className="text-xs text-muted-foreground">{t("customerPortal.financial.operations")}</p>
                <p className="mt-2 text-2xl font-bold">{customerData.dealsCount}</p>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                <p className="text-xs text-muted-foreground">Income tracked</p>
                <p className="mt-2 text-2xl font-bold text-emerald-500">
                  {customerData.financialIncome.toLocaleString(locale)} SAR
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                <p className="text-xs text-muted-foreground">Expense tracked</p>
                <p className="mt-2 text-2xl font-bold text-rose-500">
                  {customerData.financialExpense.toLocaleString(locale)} SAR
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-secondary p-4">
                <LayoutDashboard className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">{t("customerPortal.financial.empty")}</p>
            </div>
          )}
        </BentoCard>

        <BentoCard className="flex flex-col justify-center p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-serif text-xl font-semibold">{t("customerPortal.recent.title")}</h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : recentRequests.length > 0 ? (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/5 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{request.requestNumber}</p>
                    <p className="max-w-[150px] truncate text-xs text-muted-foreground">{request.productName}</p>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-1 text-[10px] uppercase text-muted-foreground">
                    {request.statusLabel || request.status}
                  </span>
                </div>
              ))}
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link to="/customer-portal/requests">{t("customerPortal.recent.viewAll")}</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Button variant="outline" asChild>
                <Link to="/request">{t("customerPortal.recent.firstRequest")}</Link>
              </Button>
            </div>
          )}
        </BentoCard>
      </div>
    </>
  );
}
