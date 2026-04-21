import { useEffect, useMemo, useState } from "react";
import { Activity, Mail, Phone, Route, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  loadCustomerDashboards,
  loadDeals,
  loadFinancialEntries,
  loadPurchaseRequests,
} from "@/lib/operationsDomain";
import { supabase } from "@/integrations/supabase/client";
import { shipmentStages } from "@/lib/shipmentStages";

interface AuditPreviewRow {
  id: string;
  action: string;
  created_at: string;
  new_values?: Record<string, any> | null;
}

export default function CustomersPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadCustomerDashboards>>>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof loadPurchaseRequests>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof loadDeals>>>([]);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof loadFinancialEntries>>>([]);
  const [auditRows, setAuditRows] = useState<AuditPreviewRow[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [customersData, requestsData, dealsData, entriesData, auditData] = await Promise.all([
        loadCustomerDashboards(),
        loadPurchaseRequests(),
        loadDeals(),
        loadFinancialEntries(),
        supabase
          .from("audit_logs")
          .select("id, action, created_at, new_values")
          .order("created_at", { ascending: false })
          .limit(120),
      ]);

      setRows(customersData);
      setRequests(requestsData);
      setDeals(dealsData);
      setEntries(entriesData);
      setAuditRows((auditData.data as AuditPreviewRow[]) || []);
      setSelectedCustomerId((current) => current || customersData[0]?.id || "");
      setLoading(false);
    };

    load();
  }, []);

  const selectedCustomer =
    rows.find((customer) => customer.id === selectedCustomerId) || rows[0] || null;

  const selectedRequests = useMemo(() => {
    if (!selectedCustomer) return [];

    return requests.filter(
      (request) =>
        request.customer.id === selectedCustomer.id ||
        request.customer.email === selectedCustomer.email,
    );
  }, [requests, selectedCustomer]);

  const selectedDeals = useMemo(() => {
    if (!selectedCustomer) return [];

    return deals.filter(
      (deal) =>
        deal.customerId === selectedCustomer.id || deal.customerEmail === selectedCustomer.email,
    );
  }, [deals, selectedCustomer]);

  const selectedEntries = useMemo(() => {
    if (!selectedCustomer) return [];

    return entries.filter(
      (entry) =>
        entry.customerId === selectedCustomer.id ||
        entry.customerName === selectedCustomer.fullName,
    );
  }, [entries, selectedCustomer]);

  const selectedAudit = useMemo(() => {
    if (!selectedCustomer) return [];

    return auditRows.filter((row) => {
      const values = row.new_values || {};
      return (
        values.customer_id === selectedCustomer.id ||
        values.customer_name === selectedCustomer.fullName ||
        values.requested_by_email === selectedCustomer.email
      );
    });
  }, [auditRows, selectedCustomer]);

  const totals = useMemo(() => {
    const income = selectedEntries
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expense = selectedEntries
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      income,
      expense,
      net: income - expense,
    };
  }, [selectedEntries]);

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Skeleton className="h-[620px] w-full rounded-[2rem]" />
        <div className="grid gap-4">
          <Skeleton className="h-44 w-full rounded-[2rem]" />
          <Skeleton className="h-[420px] w-full rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="لا توجد قاعدة عملاء تشغيلية بعد"
        description="عند بدء تحويل الطلبات إلى صفقات سيظهر هنا ملف العميل التشغيلي الذي يجمع الطلبات والصفقات والحركة المالية والأثر التدقيقي."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <BentoCard className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Customer Directory
          </p>
          <h2 className="font-serif text-2xl font-semibold">سياق العملاء التشغيلي</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            كل عميل هنا يمثل علاقة تشغيلية كاملة: طلبات، صفقات، شحنات، محاسبة، وتاريخ
            نشاط مرتبط بالصفقات.
          </p>
        </BentoCard>

        <div className="space-y-3">
          {rows.map((customer, index) => {
            const isActive = customer.id === selectedCustomer?.id;
            return (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomerId(customer.id)}
                className={`w-full rounded-[1.7rem] border p-5 text-right transition-all ${
                  isActive
                    ? "border-primary/30 bg-primary/8 shadow-[0_20px_40px_-32px_rgba(189,146,65,0.7)]"
                    : "border-border/60 bg-card hover:border-primary/15"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-xl font-semibold">{customer.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {customer.country || "—"} / {customer.city || "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
                    {customer.dealsCount} صفقات
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "طلبات", value: customer.requestsCount },
                    { label: "قيود", value: customer.financialEntriesCount },
                    { label: "تدقيق", value: customer.auditCount },
                  ].map((item) => (
                    <div
                      key={`${customer.id}-${item.label}-${index}`}
                      className="rounded-[1.1rem] bg-secondary/20 px-3 py-3"
                    >
                      <p className="text-[11px] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-lg font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedCustomer ? (
        <div className="space-y-4">
          <BentoCard>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Customer Relationship
                </p>
                <h2 className="font-serif text-3xl font-semibold">{selectedCustomer.fullName}</h2>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  هذا الملف يجمع صورة العميل داخل Lourex: ما الذي طلبه، ما الذي تحول إلى
                  صفقة، ما أثره المالي، وما النشاط التشغيلي المرتبط به.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-border/60 bg-secondary/10 px-4 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs">الهاتف</span>
                  </div>
                  <p className="mt-2 font-medium">{selectedCustomer.phone || "غير متوفر"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/60 bg-secondary/10 px-4 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs">البريد</span>
                  </div>
                  <p className="mt-2 font-medium">{selectedCustomer.email || "غير متوفر"}</p>
                </div>
              </div>
            </div>
          </BentoCard>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "طلبات فعالة", value: selectedRequests.length },
              { label: "صفقات مرتبطة", value: selectedDeals.length },
              { label: "إجمالي الدخل", value: `${totals.income.toLocaleString()} SAR` },
              {
                label: "الصافي",
                value: `${totals.net.toLocaleString()} SAR`,
                highlight: totals.net >= 0 ? "text-emerald-400" : "text-rose-400",
              },
            ].map((item) => (
              <BentoCard key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`mt-2 text-3xl font-bold ${item.highlight || ""}`}>{item.value}</p>
              </BentoCard>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <BentoCard className="space-y-4">
              <div className="flex items-center gap-3">
                <Route className="h-5 w-5 text-primary" />
                <h3 className="font-serif text-2xl font-semibold">الطلبات والصفقات</h3>
              </div>

              <div className="space-y-3">
                {selectedRequests.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-border/60 bg-secondary/10 px-5 py-6 text-sm leading-7 text-muted-foreground">
                    لا توجد طلبات شراء مسجلة لهذا العميل بعد.
                  </div>
                ) : (
                  selectedRequests.slice(0, 3).map((request) => {
                    const linkedDeal = selectedDeals.find(
                      (deal) => deal.sourceRequestId === request.id,
                    );
                    return (
                      <div
                        key={request.id}
                        className="rounded-[1.45rem] border border-border/60 bg-secondary/10 p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-medium">{request.requestNumber}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {request.productName || "طلب شراء"} • {request.statusLabel}
                            </p>
                          </div>
                          {linkedDeal ? (
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                              تحول إلى {linkedDeal.dealNumber}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <Link
                            to={`/dashboard/requests?request=${request.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            فتح الطلب
                          </Link>
                          {linkedDeal ? (
                            <Link
                              to={`/dashboard/deals?deal=${linkedDeal.dealNumber}`}
                              className="font-medium text-primary hover:underline"
                            >
                              فتح الصفقة
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-3">
                {selectedDeals.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-border/60 bg-secondary/10 px-5 py-6 text-sm leading-7 text-muted-foreground">
                    لم يتم إنشاء صفقات تشغيلية لهذا العميل حتى الآن.
                  </div>
                ) : (
                  selectedDeals.slice(0, 3).map((deal) => {
                    const currentStage = shipmentStages.find((stage) => stage.code === deal.stage);
                    return (
                      <div
                        key={deal.id}
                        className="rounded-[1.45rem] border border-border/60 bg-card p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-medium">{deal.dealNumber}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {deal.operationTitle}
                            </p>
                          </div>
                          <span className="rounded-full bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
                            {currentStage?.label || "مرحلة غير محددة"}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-[1.1rem] bg-secondary/20 p-4">
                            <p className="text-xs text-muted-foreground">التتبع</p>
                            <p className="mt-1 font-medium">{deal.trackingId || "لم يخصص بعد"}</p>
                          </div>
                          <div className="rounded-[1.1rem] bg-secondary/20 p-4">
                            <p className="text-xs text-muted-foreground">المرجع المحاسبي</p>
                            <p className="mt-1 font-medium">
                              {deal.accountingReference || "غير محدد"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <Link
                            to={`/dashboard/deals?deal=${deal.dealNumber}`}
                            className="font-medium text-primary hover:underline"
                          >
                            مركز الصفقة
                          </Link>
                          {deal.trackingId ? (
                            <Link
                              to={`/dashboard/tracking?deal=${deal.dealNumber}`}
                              className="font-medium text-primary hover:underline"
                            >
                              التتبع التشغيلي
                            </Link>
                          ) : null}
                          <Link
                            to={`/dashboard/accounting?deal=${deal.dealNumber}`}
                            className="font-medium text-primary hover:underline"
                          >
                            المحاسبة
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </BentoCard>

            <div className="space-y-4">
              <BentoCard className="space-y-4">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h3 className="font-serif text-2xl font-semibold">السياق المالي</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.2rem] bg-secondary/15 p-4">
                    <p className="text-xs text-muted-foreground">إجمالي المصروف</p>
                    <p className="mt-2 text-2xl font-bold">{totals.expense.toLocaleString()} SAR</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-secondary/15 p-4">
                    <p className="text-xs text-muted-foreground">القيود المرتبطة</p>
                    <p className="mt-2 text-2xl font-bold">{selectedEntries.length}</p>
                  </div>
                </div>
                {selectedEntries.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-dashed border-border/60 bg-secondary/10 px-5 py-6 text-sm leading-7 text-muted-foreground">
                    لا توجد قيود مالية مرتبطة بهذا العميل حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEntries.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[1.2rem] border border-border/60 bg-card px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{entry.entryNumber}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {entry.type === "income" ? "دخل" : "مصروف"} •{" "}
                              {entry.scope === "deal" ? "مرتبط بصفقة" : "قيد عام"}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {entry.amount.toLocaleString()} {entry.currency}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </BentoCard>

              <BentoCard className="space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="font-serif text-2xl font-semibold">النشاط الأخير</h3>
                </div>
                {selectedAudit.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-dashed border-border/60 bg-secondary/10 px-5 py-6 text-sm leading-7 text-muted-foreground">
                    لا توجد أحداث تدقيق مرتبطة بهذا العميل بعد.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedAudit.slice(0, 4).map((row) => (
                      <div
                        key={row.id}
                        className="rounded-[1.2rem] border border-border/60 bg-secondary/10 px-4 py-4"
                      >
                        <p className="font-medium">
                          {row.new_values?.summary || row.action.replaceAll(".", " ")}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  to="/dashboard/audit"
                  className="inline-flex text-sm font-medium text-primary hover:underline"
                >
                  عرض سجل التدقيق الكامل
                </Link>
              </BentoCard>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
