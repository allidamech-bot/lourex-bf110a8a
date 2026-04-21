import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { BarChart3, Package, ShoppingBag, Truck, Users } from "lucide-react";
import type {
  FactoryAnalyticsPoint,
  FactoryCommandCenterOrder,
  FactoryCommandCenterProduct,
  FactoryStatusDatum,
} from "@/domain/factory/service";
import BentoCard from "@/components/BentoCard";
import { useI18n } from "@/lib/i18n";

interface FactoryAnalyticsProps {
  orders: FactoryCommandCenterOrder[];
  products: FactoryCommandCenterProduct[];
  staffCount: number;
  readyShipments: number;
  monthlyActivity: FactoryAnalyticsPoint[];
  statusBreakdown: FactoryStatusDatum[];
}

const pieColors = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--secondary-foreground))",
];

export const FactoryAnalytics = ({
  orders,
  products,
  staffCount,
  readyShipments,
  monthlyActivity,
  statusBreakdown,
}: FactoryAnalyticsProps) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-serif text-xl font-semibold">{t("factory.analytics.title")}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t("factory.analytics.orders"), value: orders.length, icon: ShoppingBag },
          { label: t("factory.analytics.products"), value: products.length, icon: Package },
          { label: t("factory.analytics.readyShipments"), value: readyShipments, icon: Truck },
          { label: t("factory.analytics.activeStaff"), value: staffCount, icon: Users },
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
          <h3 className="mb-4 font-serif text-base font-semibold">{t("factory.analytics.sixMonthActivity")}</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyActivity}>
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
          <h3 className="mb-4 font-serif text-base font-semibold">{t("factory.analytics.orderStatusSplit")}</h3>
          {statusBreakdown.length ? (
            <div className="flex h-[220px] items-center gap-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="none">
                    {statusBreakdown.map((_, index) => (
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
                {statusBreakdown.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                    <span className="text-xs capitalize text-muted-foreground">{item.name}</span>
                    <span className="ms-auto text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("factory.analytics.noOrderData")}</p>
          )}
        </BentoCard>
      </div>
    </div>
  );
};
