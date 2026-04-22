import { motion } from "framer-motion";
import { 
  ClipboardList, 
  LayoutDashboard, 
  PlusCircle, 
  Route, 
  UserCircle2,
  BarChart3,
  Wallet,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import BentoCard from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { fetchCustomerDashboard, fetchRequests } from "@/domain/operations/service";
import type { OperationsCustomer, OperationsRequest } from "@/domain/operations/types";

export default function CustomerPortal() {
  const { profile } = useAuthSession();
  const { t, lang, locale } = useI18n();
  const [customerData, setCustomerData] = useState<OperationsCustomer | null>(null);
  const [recentRequests, setRecentRequests] = useState<OperationsRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.email) return;
      setLoading(true);
      try {
        const [dashboard, requests] = await Promise.all([
          fetchCustomerDashboard(profile.email),
          fetchRequests()
        ]);
        
        setCustomerData(dashboard);
        // Filter requests for this customer and take top 3
        const myRequests = requests
          .filter(r => r.customer.email.toLowerCase() === profile.email.toLowerCase())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setRecentRequests(myRequests.slice(0, 3));
      } catch (error) {
        console.error("Failed to load customer portal data:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [profile?.email]);

  const menuItems = [
    {
      title: lang === "ar" ? "طلب شراء جديد" : "New Purchase Request",
      description: lang === "ar" ? "ابدأ بتقديم طلب شراء منتج جديد" : "Start by submitting a new product purchase request",
      icon: PlusCircle,
      link: "/request",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: lang === "ar" ? "طلباتي" : "My Requests",
      description: lang === "ar" ? "تابع حالة طلبات الشراء الحالية" : "Follow the status of your current purchase requests",
      icon: ClipboardList,
      link: "/dashboard/requests", // These will need to be customer-friendly
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: lang === "ar" ? "تتبع الشحنات" : "Track Shipments",
      description: lang === "ar" ? "تتبع مسار شحناتك في الوقت الحقيقي" : "Track your shipments in real-time",
      icon: Route,
      link: "/dashboard/tracking",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: lang === "ar" ? "الملف الشخصي" : "My Profile",
      description: lang === "ar" ? "إدارة معلومات الحساب والشركة" : "Manage account and company information",
      icon: UserCircle2,
      link: "/profile",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              {lang === "ar" ? "لوحة التحكم" : "Customer Portal"}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">
              {lang === "ar" ? "مرحباً بك،" : "Welcome back,"} <span className="text-gradient-gold">{profile?.fullName}</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              {lang === "ar" 
                ? "هنا يمكنك إدارة جميع طلبات الشراء وتتبع عملياتك التشغيلية مع Lourex."
                : "Manage all your purchase requests and track your operational flow with Lourex here."}
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {menuItems.map((item, index) => {
              let badge = null;
              if (item.link === "/dashboard/requests" && customerData) {
                badge = customerData.requestsCount;
              } else if (item.link === "/dashboard/tracking" && customerData) {
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
                    <BentoCard className="group h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg relative overflow-hidden">
                      <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${item.bgColor} ${item.color}`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-serif text-xl font-semibold group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                      
                      {badge !== null && badge > 0 && (
                        <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {badge}
                        </div>
                      )}
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
                <h3 className="font-serif text-xl font-semibold">
                  {lang === "ar" ? "الملخص المالي" : "Financial Summary"}
                </h3>
              </div>
              
              {loading ? (
                <div className="space-y-4 py-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : customerData ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "الرصيد الحالي" : "Current Balance"}
                    </p>
                    <p className={`mt-2 text-2xl font-bold ${customerData.financialBalance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {customerData.financialBalance.toLocaleString(locale)} SAR
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] bg-secondary/15 p-5">
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "إجمالي العمليات" : "Total Operations"}
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      {customerData.dealsCount}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-secondary p-4 mb-4">
                    <LayoutDashboard className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lang === "ar" 
                      ? "سيتم تفعيل التقارير والملخصات المالية فور بدء عملياتك."
                      : "Financial reports and summaries will be activated once your operations begin."}
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
                  {lang === "ar" ? "آخر الطلبات" : "Recent Requests"}
                </h3>
              </div>
              
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : recentRequests.length > 0 ? (
                <div className="space-y-3">
                  {recentRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/5">
                      <div>
                        <p className="font-medium text-sm">{request.requestNumber}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{request.productName}</p>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground uppercase">
                        {request.statusLabel || request.status}
                      </span>
                    </div>
                  ))}
                  <Button variant="link" className="p-0 h-auto text-xs" asChild>
                    <Link to="/dashboard/requests">
                      {lang === "ar" ? "عرض جميع الطلبات" : "View all requests"}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Button variant="outline" asChild>
                    <Link to="/request">
                      {lang === "ar" ? "ابدأ طلبك الأول" : "Start your first request"}
                    </Link>
                  </Button>
                </div>
              )}
            </BentoCard>
          </div>
        </div>
      </main>
    </div>
  );
}