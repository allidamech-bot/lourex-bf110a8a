import { useEffect, useState } from "react";
import { BarChart, Bar, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { BarChart3, Package, ShoppingBag, TrendingUp, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import BentoCard from "@/components/BentoCard";
import { fetchAdminAnalytics, type AdminAnalyticsData } from "@/domain/admin/analytics";
import { useI18n } from "@/lib/i18n";

const GOLD = "#C5A059";
const GOLD_LIGHT = "#D4BF8A";
const MATTE = "#1E1E1E";
const PIE_COLORS = [GOLD, "#8B7355", "#6B5B3E", GOLD_LIGHT, "#A09060"];

export const AdminAnalytics = () => {
  const { t } = useI18n();
  const [stats, setStats] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const result = await fetchAdminAnalytics();
      if (result.error || !result.data) {
        toast.error(t("adminAnalytics.loadFailed"));
      } else {
        setStats(result.data);
      }

      setLoading(false);
    };

    void load();
  }, [t]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-serif text-xl font-semibold">{t("adminAnalytics.title")}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t("adminAnalytics.totalShipments"), value: stats.totalShipments, icon: Truck },
          { label: t("adminAnalytics.pendingOrders"), value: stats.pendingOrders, icon: ShoppingBag },
          { label: t("adminAnalytics.activeStaff"), value: stats.activeStaff, icon: Users },
          { label: t("adminAnalytics.factories"), value: stats.totalFactories, icon: Package },
        ].map((kpi, index) => (
          <BentoCard key={kpi.label} delay={index * 0.06}>
            <div className="mb-2 flex items-center gap-2">
              <kpi.icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="font-serif text-2xl font-bold md:text-3xl">{kpi.value}</p>
          </BentoCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BentoCard delay={0.25}>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-base font-semibold">{t("adminAnalytics.growth")}</h3>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyGrowth} barGap={4}>
                <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: MATTE, border: `1px solid ${GOLD}`, borderRadius: 12, color: "#fff", fontSize: 12 }}
                  cursor={{ fill: "rgba(197,160,89,0.08)" }}
                />
                <Bar dataKey="shipments" fill={GOLD} radius={[6, 6, 0, 0]} name={t("adminAnalytics.shipments")} />
                <Bar dataKey="orders" fill={GOLD_LIGHT} radius={[6, 6, 0, 0]} name={t("adminAnalytics.orders")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        <BentoCard delay={0.3}>
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-base font-semibold">{t("adminAnalytics.shipmentStatus")}</h3>
          </div>
          {stats.statusBreakdown.length > 0 ? (
            <div className="flex h-[220px] items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.statusBreakdown.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: MATTE, border: `1px solid ${GOLD}`, borderRadius: 12, color: "#fff", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="min-w-[100px] space-y-2">
                {stats.statusBreakdown.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="text-xs capitalize text-muted-foreground">{item.name}</span>
                    <span className="ms-auto text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("adminAnalytics.noShipmentData")}</p>
          )}
        </BentoCard>
      </div>
    </div>
  );
};
