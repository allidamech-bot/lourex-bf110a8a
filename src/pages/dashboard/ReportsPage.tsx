import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Download,
  PackageSearch,
  Printer,
  Receipt,
  ShieldCheck,
  Truck,
  Users,
  Clock,
  ExternalLink,
} from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getDashboardReportSnapshot,
  getMetricDetails,
  type DashboardReportSnapshot,
} from "@/lib/reportsDomain";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";
import { buildReportCsv, downloadCsv } from "@/lib/adminOperations";

type ReportRange = "monthly" | "quarterly" | "semiannual" | "annual" | "custom";
type DrillDownItem = { id: string; status: string; totalValue?: number; amount?: number };

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

export default function ReportsPage() {
  const { lang, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<ReportRange>("monthly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [snapshot, setSnapshot] = useState<DashboardReportSnapshot | null>(null);
  const [drillDownData, setDrillDownData] = useState<{ type: string; items: DrillDownItem[] } | null>(null);
  const [loadError, setLoadError] = useState("");

  const rangeStart = useMemo(() => getRangeStart(range, customStart), [range, customStart]);
  const rangeEnd = useMemo(() => (range === "custom" && customEnd ? new Date(customEnd) : new Date()), [range, customEnd]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const nextSnapshot = await getDashboardReportSnapshot(rangeStart, rangeEnd);
        setSnapshot(nextSnapshot);
      } catch (error: unknown) {
        logOperationalError("reports_snapshot_load", error, {
          start: rangeStart.toISOString(),
          end: rangeEnd.toISOString(),
        });
        setSnapshot(null);
        setLoadError(error instanceof Error ? error.message : t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [rangeStart, rangeEnd, t]);

  const metrics = snapshot?.summary || {
    requests: 0,
    deals: 0,
    shipments: 0,
    customers: 0,
    audits: 0,
    linkedEntries: 0,
    lockedEntries: 0,
    pendingEditRequests: 0,
    income: 0,
    expense: 0,
    averageOperationValue: 0,
    inTransit: 0,
    destination: 0,
    delivered: 0,
    currencyGroups: 0,
  };
  const statementExportHint = metrics.currencyGroups > 1
    ? t("reports.statementExportHintMixed")
    : t("reports.statementExportHintSingle");

  const handleDrillDown = async (metric: "active_deals" | "pending_requests" | "recent_expenses") => {
    setLoading(true);
    try {
      const items = await getMetricDetails(metric);
      const normalizedItems: DrillDownItem[] = items.map((item) => {
        if ("totalValue" in item) {
          return { id: item.id, status: item.status, totalValue: item.totalValue };
        }

        if ("amount" in item) {
          return { id: item.id, status: item.type, amount: item.amount };
        }

        return { id: item.id, status: item.status };
      });
      setDrillDownData({ type: metric, items: normalizedItems });
    } catch (error) {
      logOperationalError("report_metric_drilldown", error, { metric });
      setLoadError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!snapshot) {
      const message = t("reports.export.noData");
      setLoadError(message);
      toast.error(message);
      return;
    }
    const exported = downloadCsv(
      `lourex-report-${range}.csv`,
      buildReportCsv(snapshot, {
        metric: t("common.value"),
        value: t("common.value"),
        requests: t("reports.metrics.requests"),
        deals: t("reports.metrics.deals"),
        shipments: t("reports.metrics.shipments"),
        customers: t("reports.metrics.customers"),
        income: t("reports.metrics.income"),
        expense: t("reports.metrics.expense"),
        lockedEntries: t("reports.metrics.lockedEntries"),
        pendingEditRequests: t("reports.metrics.pendingEditRequests"),
        topCustomer: t("reports.topCustomers"),
        outstandingBalance: t("reports.labels.outstandingBalance"),
      }),
    );
    if (!exported) {
      logOperationalError("reports_export_unavailable", new Error("CSV export unavailable"));
      setLoadError(t("reports.export.unavailable"));
      toast.error(t("reports.export.unavailable"));
      return;
    }
    toast.success(t("reports.export.success"));
  };

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
          <div className="grid gap-3 md:grid-cols-5">
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
            <button onClick={handleExport} className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" />{t("common.exportCsv")}</span>
            </button>
            <button onClick={() => window.print()} className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <span className="inline-flex items-center gap-2"><Printer className="h-4 w-4" />{t("common.print")}</span>
            </button>
          </div>
        </div>
        {loadError ? (
          <div className="rounded-[1.35rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
            {loadError}
          </div>
        ) : null}
        <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
          {statementExportHint}
        </div>
      </BentoCard>

      <div className="grid gap-4 xl:grid-cols-4">
        {[
          { label: t("reports.metrics.requests"), value: metrics.requests, icon: ClipboardList, action: () => handleDrillDown("pending_requests") },
          { label: t("reports.metrics.deals"), value: metrics.deals, icon: PackageSearch, action: () => handleDrillDown("active_deals") },
          { label: t("reports.metrics.shipments"), value: metrics.shipments, icon: Truck },
          { label: t("reports.metrics.customers"), value: metrics.customers, icon: Users },
        ].map((item) => (
          <BentoCard key={item.label} className={`space-y-3 ${item.action ? "cursor-pointer hover:bg-secondary/10 transition-colors" : ""}`} onClick={item.action}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-serif text-4xl font-bold">{item.value}</p>
              {item.action ? <ExternalLink className="h-4 w-4 text-muted-foreground" /> : null}
            </div>
            <p className="text-sm text-muted-foreground">{item.label}</p>
          </BentoCard>
        ))}
      </div>

      {drillDownData ? (
        <BentoCard className="space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold capitalize">
              {drillDownData.type.replace("_", " ")} {t("reports.title")}
            </h2>
            <button onClick={() => setDrillDownData(null)} className="text-sm text-primary hover:underline">
              {t("common.close")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">{t("common.id")}</th>
                  <th className="pb-2 font-medium">{t("common.status")}</th>
                  <th className="pb-2 font-medium text-right">{t("common.value")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {drillDownData.items.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/5">
                    <td className="py-3 font-mono text-xs">{item.id.substring(0, 8)}...</td>
                    <td className="py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{item.status}</span>
                    </td>
                    <td className="py-3 text-right">
                      {item.totalValue ? `${item.totalValue.toLocaleString()} SAR` : item.amount ? `${item.amount.toLocaleString()} SAR` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <BentoCard className="space-y-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-semibold">{t("reports.operationsRead")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("reports.metrics.audits"), value: metrics.audits, icon: ShieldCheck },
              { label: t("reports.metrics.linkedEntries"), value: metrics.linkedEntries, icon: Receipt },
              { label: t("reports.metrics.lockedEntries"), value: metrics.lockedEntries, icon: Receipt },
              { label: t("reports.metrics.pendingEditRequests"), value: metrics.pendingEditRequests, icon: Receipt },
              { label: t("reports.currencyGroups"), value: metrics.currencyGroups, icon: Receipt },
              { label: t("reports.metrics.income"), value: `${metrics.income.toLocaleString()} SAR`, icon: Receipt },
              { label: t("reports.metrics.expense"), value: `${metrics.expense.toLocaleString()} SAR`, icon: Receipt },
              { label: t("reports.metrics.profit"), value: `${(metrics.income - metrics.expense).toLocaleString()} SAR`, icon: Receipt },
              { label: t("reports.metrics.averageValue"), value: `${Math.round(metrics.averageOperationValue).toLocaleString()} SAR`, icon: Receipt },
              { label: t("common.active"), value: snapshot?.operations.activeDeals || 0, icon: PackageSearch },
              { label: t("reports.metrics.avgTime"), value: `${Math.round(snapshot?.operations.averageProcessingTimeDays || 0)} ${t("common.days")}`, icon: Clock },
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
              { label: t("reports.inTransit"), value: metrics.inTransit },
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
            {snapshot?.topCustomers.length ? (
              snapshot.topCustomers.map((customer) => (
                <div key={customer.customerId} className="rounded-[1.3rem] border border-border/60 bg-secondary/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{customer.fullName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                    <div className="text-end text-sm text-muted-foreground">
                      <div>{t("reports.requestsCount", { count: customer.requestsCount })}</div>
                      <div>{t("reports.dealsCount", { count: customer.dealsCount })}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1rem] bg-background/60 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">{t("reports.labels.outstandingBalance")}</p>
                      <p className="mt-1 font-semibold">{customer.outstandingBalance.toLocaleString()} SAR</p>
                    </div>
                    <div className="rounded-[1rem] bg-background/60 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">{t("reports.labels.pendingEditRequests")}</p>
                      <p className="mt-1 font-semibold">{customer.pendingEditRequests}</p>
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
            {snapshot?.financialSummary.trends.length ? (
              <div className="mb-4 rounded-[1.3rem] border border-primary/15 bg-primary/5 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  {t("reports.monthlyTrend")}
                </p>
                <div className="space-y-2">
                  {snapshot.financialSummary.trends.slice(-3).map((trend) => (
                    <div key={trend.month} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{trend.month}</span>
                      <span className={`font-mono font-bold ${trend.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {trend.net > 0 ? "+" : ""}
                        {trend.net.toLocaleString()} SAR
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {snapshot?.topExpenseCategories.length ? (
              snapshot.topExpenseCategories.map((item) => (
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
