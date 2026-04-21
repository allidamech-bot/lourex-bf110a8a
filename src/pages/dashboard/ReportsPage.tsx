import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  PackageSearch,
  Receipt,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  loadCustomerDashboards,
  loadDeals,
  loadFinancialEntries,
  loadPurchaseRequests,
  loadShipments,
} from "@/lib/operationsDomain";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type ReportRange = "monthly" | "quarterly" | "semiannual" | "annual" | "custom";

type ReportSummary = {
  requests: number;
  deals: number;
  shipments: number;
  customers: number;
  audits: number;
  linked_entries: number;
  income: number;
  expense: number;
  average_operation_value: number;
  in_transit: number;
  destination: number;
  delivered: number;
};

type TopCustomer = {
  customer_id: string;
  full_name: string;
  email: string;
  requests_count: number;
  deals_count: number;
};

type ExpenseCategory = {
  category: string;
  amount: number;
};

const getRangeStart = (range: ReportRange, customStart?: string) => {
  const now = new Date();
  if (range === "custom" && customStart) return new Date(customStart);

  const start = new Date(now);
  if (range === "monthly") start.setMonth(now.getMonth() - 1);
  if (range === "quarterly") start.setMonth(now.getMonth() - 3);
  if (range === "semiannual") start.setMonth(now.getMonth() - 6);
  if (range === "annual") start.setFullYear(now.getFullYear() - 1);
  return start;
};

const isInRange = (dateValue: string, start: Date, end: Date) => {
  const date = new Date(dateValue);
  return date >= start && date <= end;
};

export default function ReportsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<ReportRange>("monthly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topExpenseCategories, setTopExpenseCategories] = useState<ExpenseCategory[]>([]);

  const rangeStart = useMemo(() => getRangeStart(range, customStart), [range, customStart]);
  const rangeEnd = useMemo(() => (range === "custom" && customEnd ? new Date(customEnd) : new Date()), [range, customEnd]);

  useEffect(() => {
    const loadWithStructuredQueries = async () => {
      const startIso = rangeStart.toISOString();
      const endIso = rangeEnd.toISOString();

      const [summaryResult, customersResult, expenseResult] = await Promise.all([
        (supabase as any).rpc("lourex_report_summary", { p_start: startIso, p_end: endIso }),
        (supabase as any).rpc("lourex_report_top_customers", { p_start: startIso, p_end: endIso, p_limit: 4 }),
        (supabase as any).rpc("lourex_report_top_expense_categories", { p_start: startIso, p_end: endIso, p_limit: 4 }),
      ]);

      if (summaryResult.error || customersResult.error || expenseResult.error) {
        throw summaryResult.error || customersResult.error || expenseResult.error;
      }

      setSummary((summaryResult.data || null) as ReportSummary | null);
      setTopCustomers((customersResult.data || []) as TopCustomer[]);
      setTopExpenseCategories((expenseResult.data || []) as ExpenseCategory[]);
    };

    const loadFallback = async () => {
      const [requests, deals, shipments, entries, customers, auditCount] = await Promise.all([
        loadPurchaseRequests(),
        loadDeals(),
        loadShipments(),
        loadFinancialEntries(),
        loadCustomerDashboards(),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
      ]);

      const filteredRequests = requests.filter((item) => isInRange(item.createdAt, rangeStart, rangeEnd));
      const filteredDeals = deals.filter((item) => isInRange(item.createdAt, rangeStart, rangeEnd));
      const filteredShipments = shipments.filter((item) => isInRange(item.updatedAt, rangeStart, rangeEnd));
      const filteredEntries = entries.filter((item) => isInRange(item.createdAt, rangeStart, rangeEnd));

      const income = filteredEntries.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
      const expense = filteredEntries.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

      setSummary({
        requests: filteredRequests.length,
        deals: filteredDeals.length,
        shipments: filteredShipments.length,
        customers: customers.length,
        audits: auditCount.count || 0,
        linked_entries: filteredEntries.filter((item) => item.scope !== "global").length,
        income,
        expense,
        average_operation_value: filteredDeals.length > 0 ? filteredDeals.reduce((sum, item) => sum + item.totalValue, 0) / filteredDeals.length : 0,
        in_transit: filteredShipments.filter((item) => item.stage === "in_transit").length,
        destination: filteredShipments.filter((item) => item.stage === "arrived_destination" || item.stage === "destination_customs").length,
        delivered: filteredShipments.filter((item) => item.stage === "delivered").length,
      });

      setTopCustomers(
        [...customers]
          .sort((a, b) => b.dealsCount - a.dealsCount || b.requestsCount - a.requestsCount)
          .slice(0, 4)
          .map((item) => ({
            customer_id: item.id,
            full_name: item.fullName,
            email: item.email,
            requests_count: item.requestsCount,
            deals_count: item.dealsCount,
          })),
      );

      const categoryMap = new Map<string, number>();
      filteredEntries
        .filter((entry) => entry.type === "expense")
        .forEach((entry) => {
          const key = entry.category || t("reports.uncategorized");
          categoryMap.set(key, (categoryMap.get(key) || 0) + entry.amount);
        });

      setTopExpenseCategories(
        [...categoryMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([category, amount]) => ({ category, amount })),
      );
    };

    const load = async () => {
      setLoading(true);
      try {
        await loadWithStructuredQueries();
      } catch {
        await loadFallback();
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [rangeStart, rangeEnd, t]);

  const metrics = useMemo(() => {
    const activeSummary = summary || {
      requests: 0,
      deals: 0,
      shipments: 0,
      customers: 0,
      audits: 0,
      linked_entries: 0,
      income: 0,
      expense: 0,
      average_operation_value: 0,
      in_transit: 0,
      destination: 0,
      delivered: 0,
    };

    return {
      ...activeSummary,
      net: activeSummary.income - activeSummary.expense,
    };
  }, [summary]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-60 w-full rounded-[2rem]" />
        <Skeleton className="h-60 w-full rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BentoCard className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("reports.window")}</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">{t("reports.title")}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as ReportRange)}
              className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="monthly">{t("reports.ranges.monthly")}</option>
              <option value="quarterly">{t("reports.ranges.quarterly")}</option>
              <option value="semiannual">{t("reports.ranges.semiannual")}</option>
              <option value="annual">{t("reports.ranges.annual")}</option>
              <option value="custom">{t("reports.ranges.custom")}</option>
            </select>
            <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      </BentoCard>

      <div className="grid gap-4 xl:grid-cols-4">
        {[
          { label: t("reports.metrics.requests"), value: metrics.requests, icon: ClipboardList },
          { label: t("reports.metrics.deals"), value: metrics.deals, icon: PackageSearch },
          { label: t("reports.metrics.shipments"), value: metrics.shipments, icon: Truck },
          { label: t("reports.metrics.customers"), value: metrics.customers, icon: Users },
        ].map((item) => (
          <BentoCard key={item.label} className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <p className="font-serif text-4xl font-bold">{item.value}</p>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </BentoCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <BentoCard className="space-y-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-semibold">{t("reports.operationsRead")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("reports.metrics.audits"), value: metrics.audits, icon: ShieldCheck },
              { label: t("reports.metrics.linkedEntries"), value: metrics.linked_entries, icon: Receipt },
              { label: t("reports.metrics.income"), value: `${metrics.income.toLocaleString()} SAR`, icon: Receipt },
              { label: t("reports.metrics.expense"), value: `${metrics.expense.toLocaleString()} SAR`, icon: Receipt },
              { label: t("reports.metrics.profit"), value: `${metrics.net.toLocaleString()} SAR`, icon: Receipt },
              { label: t("reports.metrics.averageValue"), value: `${Math.round(metrics.average_operation_value).toLocaleString()} SAR`, icon: Receipt },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
            {t("reports.structuredHint")}
          </div>
        </BentoCard>

        <BentoCard className="space-y-5">
          <h2 className="font-serif text-2xl font-semibold">{t("reports.shipmentSummary")}</h2>
          <div className="grid gap-3">
            {[
              { label: t("reports.inTransit"), value: metrics.in_transit },
              { label: t("reports.destination"), value: metrics.destination },
              { label: t("reports.delivered"), value: metrics.delivered },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-border/60 bg-secondary/15 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-3xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <BentoCard className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold">{t("reports.topCustomers")}</h2>
          <div className="space-y-3">
            {topCustomers.length > 0 ? (
              topCustomers.map((customer) => (
                <div key={customer.customer_id} className="rounded-[1.3rem] border border-border/60 bg-secondary/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{customer.full_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                    <div className="text-end text-sm text-muted-foreground">
                      <div>{t("reports.requestsCount", { count: customer.requests_count })}</div>
                      <div>{t("reports.dealsCount", { count: customer.deals_count })}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.3rem] border border-border/60 bg-secondary/15 p-4 text-sm text-muted-foreground">
                {t("reports.noCustomers")}
              </div>
            )}
          </div>
        </BentoCard>

        <BentoCard className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold">{t("reports.topExpenses")}</h2>
          <div className="space-y-3">
            {topExpenseCategories.length > 0 ? (
              topExpenseCategories.map((item) => (
                <div key={item.category} className="rounded-[1.3rem] border border-border/60 bg-secondary/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.category}</p>
                    <p className="text-sm font-semibold">{Number(item.amount).toLocaleString()} SAR</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.3rem] border border-border/60 bg-secondary/15 p-4 text-sm text-muted-foreground">
                {t("reports.noExpenses")}
              </div>
            )}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
