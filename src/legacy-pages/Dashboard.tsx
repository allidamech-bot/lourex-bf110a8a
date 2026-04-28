import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";
import QuickActionFab from "@/components/QuickActionFab";
import BentoCard from "@/components/BentoCard";
import { SharedAccountPanel } from "@/components/account/SharedAccountPanel";
import { TeamManagement } from "@/components/admin/TeamManagement";
import AddProductModal from "@/components/AddProductModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import {
  Package, Weight, Ship, FileText, TrendingUp, MapPin, UserCog, Users,
  ShoppingBag, Heart, MessageCircle, BarChart3, Store, Handshake, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

interface Shipment {
  tracking_id: string;
  status: string;
  client_name: string;
  destination: string;
  pallets: number;
  weight: number;
}

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pt-20 pb-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-1.5 mb-6">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  </div>
);

const Dashboard = () => {
  const { t, lang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "account">("overview");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/auth"); return; }
        setUser(user);
        const [{ data: shipData }, { data: roles }, { data: orders }, { data: deals }] = await Promise.all([
          supabase.from("shipments").select("tracking_id, status, client_name, destination, pallets, weight").eq("user_id", user.id),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("orders").select("id").eq("buyer_id", user.id),
          supabase.from("deals").select("id").eq("client_id", user.id),
        ]);
        setShipments((shipData as Shipment[]) || []);
        setUserRoles(roles?.map(r => r.role) || []);
        setOrderCount(orders?.length || 0);
        setDealCount(deals?.length || 0);

        const { data: factory } = await supabase
          .from("factories")
          .select("id")
          .eq("owner_user_id", user.id)
          .maybeSingle();
        if (factory) setFactoryId(factory.id);
      } catch {
        // fail gracefully
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const totalPallets = shipments.reduce((s, sh) => s + (sh.pallets || 0), 0);
  const totalWeight = shipments.reduce((s, sh) => s + (sh.weight || 0), 0);
  const activeShipments = shipments.filter((s) => s.status !== "delivered").length;
  const destinations = [...new Set(shipments.map((s) => s.destination))].length;

  const statusColor: Record<string, string> = {
    factory: "bg-blue-500/20 text-blue-500",
    warehouse: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    shipping: "bg-purple-500/20 text-purple-500",
    customs: "bg-orange-500/20 text-orange-500",
    delivered: "bg-emerald-500/20 text-emerald-500",
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              {t("dash.title")} <span className="text-gradient-gold">{t("dash.titleHighlight")}</span>
            </h1>
            <p className="text-muted-foreground mt-1">{user?.email}</p>
          </div>

          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-none">
            {[
              { key: "overview" as const, icon: Package, label: lang === "ar" ? "نظرة عامة" : "Overview" },
              { key: "team" as const, icon: Users, label: lang === "ar" ? "الفريق" : "Team" },
              { key: "account" as const, icon: UserCog, label: lang === "ar" ? "الحساب" : "Account" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && <>
            {/* Add Product */}
            {factoryId && (
              <div className="mb-4">
                <Button variant="gold" onClick={() => setShowAddProduct(true)}>
                  <Plus className="w-4 h-4 me-2" />
                  {lang === "ar" ? "إضافة منتج" : "Add Product"}
                </Button>
              </div>
            )}
            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/orders">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <span className="text-xs">{lang === "ar" ? "طلباتي" : "My Orders"}</span>
                  <span className="text-lg font-bold">{orderCount}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/deals">
                  <Handshake className="w-5 h-5 text-primary" />
                  <span className="text-xs">{lang === "ar" ? "الصفقات" : "Deals"}</span>
                  <span className="text-lg font-bold">{dealCount}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/marketplace">
                  <Store className="w-5 h-5 text-primary" />
                  <span className="text-xs">{lang === "ar" ? "السوق" : "Marketplace"}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/cart">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="text-xs">{lang === "ar" ? "السلة" : "Cart"}</span>
                </Link>
              </Button>
            </div>

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
              {[
                { label: t("dash.active"), value: activeShipments, icon: Ship, color: "text-primary" },
                { label: t("dash.totalPallets"), value: totalPallets, icon: Package, color: "text-primary" },
                { label: t("dash.totalWeight"), value: `${totalWeight.toLocaleString()} kg`, icon: Weight, color: "text-primary" },
                { label: t("hero.countries"), value: destinations, icon: MapPin, color: "text-primary" },
              ].map((stat, i) => (
                <BentoCard key={stat.label} delay={i * 0.08}>
                  <div className="flex items-center gap-2 mb-3">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                </BentoCard>
              ))}
            </div>

            {/* Bento Grid: Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BentoCard span="2" delay={0.3} className="overflow-hidden p-0">
                <div className="p-5 border-b border-border flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h2 className="font-serif text-lg font-semibold">{t("dash.overview")}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-start p-4 font-medium">{t("track.trackingId")}</th>
                        <th className="text-start p-4 font-medium">{t("orders.status")}</th>
                        <th className="text-start p-4 font-medium hidden sm:table-cell">{t("track.destination")}</th>
                        <th className="text-start p-4 font-medium hidden md:table-cell">{t("track.pallets")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.map((s) => (
                        <tr key={s.tracking_id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                          <td className="p-4 font-medium text-primary">{s.tracking_id}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColor[s.status] || "bg-secondary"}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="p-4 hidden sm:table-cell text-muted-foreground">{s.destination}</td>
                          <td className="p-4 hidden md:table-cell">{s.pallets}</td>
                        </tr>
                      ))}
                      {shipments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Ship className="w-8 h-8 text-muted-foreground/20" />
                              <p className="text-sm text-muted-foreground">{t("dash.noShipments")}</p>
                              <p className="text-xs text-muted-foreground/60">
                                {lang === "ar" ? "ستظهر شحناتك هنا عند إنشاء طلبات" : "Your shipments will appear here when you create orders"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </BentoCard>

              <BentoCard delay={0.4}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-serif text-lg font-semibold">{lang === "ar" ? "تحليلات سريعة" : "Quick Insights"}</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{lang === "ar" ? "نسبة التسليم" : "Delivery Rate"}</span>
                    <span className="text-sm font-semibold">
                      {shipments.length > 0
                        ? `${Math.round((shipments.filter((s) => s.status === "delivered").length / shipments.length) * 100)}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: shipments.length > 0
                          ? `${(shipments.filter((s) => s.status === "delivered").length / shipments.length) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                  {shipments.length > 0 ? (
                    <div className="border-t border-border pt-4 space-y-3">
                      {Object.entries(
                        shipments.reduce<Record<string, number>>((acc, s) => {
                          acc[s.status] = (acc[s.status] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor[status] || "bg-secondary"}`}>
                            {status}
                          </span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-t border-border pt-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        {lang === "ar" ? "لا توجد بيانات بعد" : "No data yet"}
                      </p>
                    </div>
                  )}
                </div>
              </BentoCard>
            </div>
          </>}

          {activeTab === "team" && <TeamManagement />}
          {activeTab === "account" && <SharedAccountPanel title={lang === "ar" ? "ملفي الشخصي" : "My Profile"} companyTitle={lang === "ar" ? "ملف الشركة" : "Company Profile"} deleteRedirectTo="/" />}
        </div>
      </main>
      <QuickActionFab />
      <WhatsAppButton />
      {factoryId && user && (
        <AddProductModal
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
          factoryId={factoryId}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
