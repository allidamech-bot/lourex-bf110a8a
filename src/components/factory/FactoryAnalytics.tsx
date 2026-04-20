import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { BarChart3, Package, ShoppingBag, Truck, Users } from "lucide-react";
import BentoCard from "@/components/BentoCard";

interface FactoryAnalyticsProps {
  orders: any[];
  products: any[];
  staffCount: number;
}

const pieColors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "hsl(var(--secondary-foreground))"];

export const FactoryAnalytics = ({ orders, products, staffCount }: FactoryAnalyticsProps) => {
  const [monthlyData, setMonthlyData] = useState<{ month: string; orders: number; ready: number }[]>([]);

  useEffect(() => {
    const now = new Date();
    const data = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
      const month = date.toLocaleString("default", { month: "short" });
      const periodOrders = orders.filter((order) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= date && createdAt < nextDate;
      });

      return {
        month,
        orders: periodOrders.length,
        ready: periodOrders.filter((order) => ["quality_check", "shipped", "delivered"].includes(order.status)).length,
      };
    });

    setMonthlyData(data);
  }, [orders]);

  const statusData = Object.entries(
    orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-serif text-xl font-semibold">Factory Analytics</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Orders", value: orders.length, icon: ShoppingBag },
          { label: "Products", value: products.length, icon: Package },
          { label: "Ready Shipments", value: orders.filter((order) => ["quality_check", "shipped", "delivered"].includes(order.status)).length, icon: Truck },
          { label: "Active Staff", value: staffCount, icon: Users },
        ].map((item, index) => (
          <BentoCard key={item.label} delay={index * 0.05}>
            <div className="mb-2 flex items-center gap-2">
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="font-serif text-2xl font-bold md:text-3xl">{item.value}</p>
          </BentoCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BentoCard>
          <h3 className="mb-4 font-serif text-base font-semibold">6-Month Activity</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="ready" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        <BentoCard>
          <h3 className="mb-4 font-serif text-base font-semibold">Order Status Split</h3>
          {statusData.length ? (
            <div className="flex h-[220px] items-center gap-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="none">
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="min-w-[110px] space-y-2">
                {statusData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                    <span className="text-xs capitalize text-muted-foreground">{item.name}</span>
                    <span className="ms-auto text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No order data yet</p>
          )}
        </BentoCard>
      </div>
    </div>
  );
};