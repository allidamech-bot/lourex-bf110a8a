import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, Truck, Package, ShoppingBag } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const GOLD = "#C5A059";
const GOLD_LIGHT = "#D4BF8A";
const MATTE = "#1E1E1E";

export const AdminAnalytics = () => {
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingOrders: 0,
    activeStaff: 0,
    totalFactories: 0,
    statusBreakdown: [] as { name: string; value: number }[],
    monthlyGrowth: [] as { month: string; shipments: number; orders: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [shipmentsRes, ordersRes, staffRes, factoriesRes] = await Promise.all([
        supabase.from("shipments").select("status, created_at"),
        supabase.from("orders").select("status, created_at"),
        supabase.from("organization_staff").select("id, status"),
        supabase.from("factories").select("id", { count: "exact", head: true }),
      ]);

      const shipments = shipmentsRes.data || [];
      const orders = ordersRes.data || [];
      const staff = staffRes.data || [];

      // Status breakdown for pie
      const statusMap: Record<string, number> = {};
      shipments.forEach((s: any) => {
        statusMap[s.status] = (statusMap[s.status] || 0) + 1;
      });
      const statusBreakdown = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      // Monthly growth (last 6 months)
      const months: string[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleString("default", { month: "short" }));
      }
      const monthlyGrowth = months.map((month, idx) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - (4 - idx), 1);
        const sCount = shipments.filter((s: any) => {
          const sd = new Date(s.created_at);
          return sd >= d && sd < nextD;
        }).length;
        const oCount = orders.filter((o: any) => {
          const od = new Date(o.created_at);
          return od >= d && od < nextD;
        }).length;
        return { month, shipments: sCount, orders: oCount };
      });

      setStats({
        totalShipments: shipments.length,
        pendingOrders: orders.filter((o: any) => o.status === "pending").length,
        activeStaff: staff.filter((s: any) => s.status === "active").length,
        totalFactories: factoriesRes.count || 0,
        statusBreakdown,
        monthlyGrowth,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const PIE_COLORS = [GOLD, "#8B7355", "#6B5B3E", GOLD_LIGHT, "#A09060"];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="font-serif text-xl font-semibold">Platform Analytics</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Shipments", value: stats.totalShipments, icon: Truck },
          { label: "Pending Orders", value: stats.pendingOrders, icon: ShoppingBag },
          { label: "Active Staff", value: stats.activeStaff, icon: Users },
          { label: "Factories", value: stats.totalFactories, icon: Package },
        ].map((kpi, i) => (
          <BentoCard key={kpi.label} delay={i * 0.06}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="font-serif text-2xl md:text-3xl font-bold">{kpi.value}</p>
          </BentoCard>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart — Growth */}
        <BentoCard delay={0.25}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-serif text-base font-semibold">6-Month Growth</h3>
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
                <Bar dataKey="shipments" fill={GOLD} radius={[6, 6, 0, 0]} name="Shipments" />
                <Bar dataKey="orders" fill={GOLD_LIGHT} radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Pie Chart — Status */}
        <BentoCard delay={0.3}>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-primary" />
            <h3 className="font-serif text-base font-semibold">Shipment Status</h3>
          </div>
          {stats.statusBreakdown.length > 0 ? (
            <div className="h-[220px] flex items-center">
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
                    {stats.statusBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: MATTE, border: `1px solid ${GOLD}`, borderRadius: 12, color: "#fff", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 min-w-[100px]">
                {stats.statusBreakdown.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground capitalize">{s.name}</span>
                    <span className="text-xs font-medium ms-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No shipment data yet</p>
          )}
        </BentoCard>
      </div>
    </div>
  );
};
