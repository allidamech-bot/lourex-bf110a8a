import { useEffect, useMemo, useState } from "react";
import { Activity, Mail, Phone, Route, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAuditPreviewRows,
  fetchCustomers,
  fetchDeals,
  fetchFinancialEntries,
  fetchRequests,
} from "@/domain/operations/service";
import type { AuditPreviewRow } from "@/domain/operations/types";
import { shipmentStages } from "@/lib/shipmentStages";
import { useI18n } from "@/lib/i18n";

const EMPTY_VALUE = "-";
const AUDIT_SUMMARY_KEY = "summary";
const AUDIT_EMAIL_KEY = "requested_by_email";
const AUDIT_CUSTOMER_ID_KEY = "customer_id";
const AUDIT_CUSTOMER_NAME_KEY = "customer_name";

const formatAuditAction = (action: string) => action.replace(/\./g, " ");

export default function CustomersPage() {
  const { locale, t } = useI18n();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchCustomers>>>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchRequests>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof fetchDeals>>>([]);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof fetchFinancialEntries>>>([]);
  const [auditRows, setAuditRows] = useState<AuditPreviewRow[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const [customersData, requestsData, dealsData, entriesData, auditData] = await Promise.all([
          fetchCustomers(),
          fetchRequests(),
          fetchDeals(),
          fetchFinancialEntries(),
          fetchAuditPreviewRows(),
        ]);

        setRows(customersData);
        setRequests(requestsData);
        setDeals(dealsData);
        setEntries(entriesData);
        setAuditRows(auditData);
        setSelectedCustomerId((current) => current || customersData[0]?.id || "");
      } finally {
        setLoading(false);
      }
    };

    void load();
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
      const values = row.newValues;
      return (
        values?.[AUDIT_CUSTOMER_ID_KEY] === selectedCustomer.id ||
        values?.[AUDIT_CUSTOMER_NAME_KEY] === selectedCustomer.fullName ||
        values?.[AUDIT_EMAIL_KEY] === selectedCustomer.email
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
        title={t("customers.emptyTitle")}
        description={t("customers.emptyDescription")}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <BentoCard className="space-y-3 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
          <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-widest text-stone-500">
            {t("customers.directory")}
          </p>
          <h2 className="font-serif text-2xl font-semibold text-stone-100">{t("customers.title")}</h2>
          <p className="text-sm leading-7 text-stone-400">{t("customers.description")}</p>
        </BentoCard>

        <div className="space-y-3">
          {rows.map((customer, index) => {
            const isActive = customer.id === selectedCustomer?.id;
            return (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomerId(customer.id)}
                className={`w-full rounded-[1.7rem] border p-5 text-start transition-all ${
                  isActive
                    ? "border-amber-500/30 bg-amber-500/5 shadow-[0_12px_40px_-12px_rgba(251,191,36,0.25)]"
                    : "border-amber-200/10 bg-stone-900/50 hover:border-amber-500/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-xl font-semibold text-stone-100">{customer.fullName}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {customer.country || EMPTY_VALUE} / {customer.city || EMPTY_VALUE}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-800/50 border border-stone-700 px-3 py-1 text-[10px] font-bold text-stone-400">
                    {t("customers.metrics.deals", { count: customer.dealsCount })}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: t("customers.metrics.requests"), value: customer.requestsCount },
                    { label: t("customers.metrics.entries"), value: customer.financialEntriesCount },
                    { label: t("customers.metrics.audit"), value: customer.auditCount },
                  ].map((item) => (
                    <div
                      key={`${customer.id}-${item.label}-${index}`}
                      className="rounded-[1.1rem] bg-stone-950/40 border border-amber-200/5 px-3 py-3"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-stone-600 font-bold">{item.label}</p>
                      <p className="mt-1 text-lg font-bold text-stone-200">{item.value}</p>
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
          <BentoCard className="border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                  {t("customers.relationship")}
                </p>
                <h2 className="font-serif text-3xl font-semibold text-stone-100">{selectedCustomer.fullName}</h2>
                <p className="max-w-3xl text-sm leading-7 text-stone-400">
                  {t("customers.relationshipDescription")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-amber-200/10 bg-stone-950/40 px-4 py-4">
                  <div className="flex items-center gap-2 text-stone-500">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider font-bold">{t("customers.phone")}</span>
                  </div>
                  <p className="mt-2 font-medium text-stone-200">{selectedCustomer.phone || t("common.notAvailable")}</p>
                </div>
                <div className="rounded-[1.2rem] border border-amber-200/10 bg-stone-950/40 px-4 py-4">
                  <div className="flex items-center gap-2 text-stone-500">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wider font-bold">{t("customers.email")}</span>
                  </div>
                  <p className="mt-2 font-medium text-stone-200">{selectedCustomer.email || t("common.notAvailable")}</p>
                </div>
              </div>
            </div>
          </BentoCard>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
            {[
              { label: t("customers.metrics.activeRequests"), value: selectedRequests.length },
              { label: t("customers.metrics.linkedDeals"), value: selectedDeals.length },
              {
                label: t("customers.metrics.totalIncome"),
                value: `${totals.income.toLocaleString(locale)} SAR`,
              },
              {
                label: t("customers.metrics.net"),
                value: `${totals.net.toLocaleString(locale)} SAR`,
                highlight: totals.net >= 0 ? "text-emerald-400" : "text-rose-400",
              },
            ].map((item) => (
              <BentoCard key={item.label} className="border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{item.label}</p>
                <p className={`mt-2 text-3xl font-bold ${item.highlight || "text-stone-100"}`}>{item.value}</p>
              </BentoCard>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-3">
                <Route className="h-5 w-5 text-amber-500" />
                <h3 className="font-serif text-2xl font-semibold text-stone-100">
                  {t("customers.requestsAndDeals")}
                </h3>
              </div>

              <div className="space-y-3">
                {selectedRequests.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-amber-200/10 bg-stone-950/20 px-5 py-6 text-sm leading-7 text-stone-500 text-center">
                    {t("customers.noRequests")}
                  </div>
                ) : (
                  selectedRequests.slice(0, 3).map((request) => {
                    const linkedDeal = selectedDeals.find((deal) => deal.sourceRequestId === request.id);

                    return (
                      <div
                        key={request.id}
                        className="rounded-[1.45rem] border border-amber-200/10 bg-stone-950/40 p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-medium text-stone-200">{request.requestNumber}</p>
                            <p className="mt-1 text-sm text-stone-500">
                              {request.productName || t("customers.requestFallbackProduct")}
                              {request.statusLabel ? ` | ${request.statusLabel}` : ""}
                            </p>
                          </div>
                          {linkedDeal ? (
                            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-wider">
                              {t("customers.convertedTo", { deal: linkedDeal.dealNumber })}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <Link
                            to={`/dashboard/requests?request=${request.id}`}
                            className="font-bold text-amber-500 hover:text-amber-400 transition-colors"
                          >
                            {t("customers.openRequest")}
                          </Link>
                          {linkedDeal ? (
                            <Link
                              to={`/dashboard/deals?deal=${linkedDeal.dealNumber}`}
                              className="font-bold text-amber-500 hover:text-amber-400 transition-colors"
                            >
                              {t("customers.openDeal")}
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
                  <div className="rounded-[1.4rem] border border-dashed border-amber-200/10 bg-stone-950/20 px-5 py-6 text-sm leading-7 text-stone-500 text-center">
                    {t("customers.noDeals")}
                  </div>
                ) : (
                  selectedDeals.slice(0, 3).map((deal) => {
                    const currentStage = shipmentStages.find((stage) => stage.code === deal.stage);
                    return (
                      <div
                        key={deal.id}
                        className="rounded-[1.45rem] border border-amber-200/10 bg-stone-950/40 p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-medium text-stone-200">{deal.dealNumber}</p>
                            <p className="mt-1 text-sm text-stone-500">{deal.operationTitle}</p>
                          </div>
                          <span className="rounded-full bg-stone-800 border border-stone-700 px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                            {currentStage?.label || t("customers.stageUndefined")}
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-[1.1rem] bg-stone-900/50 p-4 border border-amber-200/5">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-stone-600">{t("customers.tracking")}</p>
                            <p className="mt-1 font-medium text-stone-300">{deal.trackingId || t("deals.noTracking")}</p>
                          </div>
                          <div className="rounded-[1.1rem] bg-stone-900/50 p-4 border border-amber-200/5">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-stone-600">
                              {t("customers.accountingReference")}
                            </p>
                            <p className="mt-1 font-medium text-stone-300">
                              {deal.accountingReference || t("common.notSpecified")}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <Link
                            to={`/dashboard/deals?deal=${deal.dealNumber}`}
                            className="font-bold text-amber-500 hover:text-amber-400 transition-colors"
                          >
                            {t("customers.dealCenter")}
                          </Link>
                          {deal.trackingId ? (
                            <Link
                              to={`/dashboard/tracking?deal=${deal.dealNumber}`}
                              className="font-bold text-amber-500 hover:text-amber-400 transition-colors"
                            >
                              {t("customers.operationalTracking")}
                            </Link>
                          ) : null}
                          <Link
                            to={`/dashboard/accounting?deal=${deal.dealNumber}`}
                            className="font-bold text-amber-500 hover:text-amber-400 transition-colors"
                          >
                            {t("customers.accounting")}
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </BentoCard>

            <div className="space-y-4">
              <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-amber-500" />
                  <h3 className="font-serif text-2xl font-semibold text-stone-100">{t("customers.financeContext")}</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.2rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-600">{t("customers.expense")}</p>
                    <p className="mt-2 text-2xl font-bold text-rose-400">
                      {totals.expense.toLocaleString(locale)} SAR
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-600">{t("customers.linkedEntries")}</p>
                    <p className="mt-2 text-2xl font-bold text-stone-100">{selectedEntries.length}</p>
                  </div>
                </div>
                {selectedEntries.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-dashed border-amber-200/10 bg-stone-950/20 px-5 py-6 text-sm leading-7 text-stone-500 text-center">
                    {t("customers.noEntries")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEntries.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[1.2rem] border border-amber-200/10 bg-stone-950/40 px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-stone-200">{entry.entryNumber}</p>
                            <p className="mt-1 text-xs text-stone-500 uppercase tracking-wider font-bold">
                              {entry.type === "income" ? t("customers.income") : t("customers.expense")}
                              {" | "}
                              {entry.scope === "deal"
                                ? t("customers.dealLinkedEntry")
                                : t("customers.generalEntry")}
                            </p>
                          </div>
                          <p className={`font-bold ${entry.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {entry.amount.toLocaleString(locale)} {entry.currency}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </BentoCard>

              <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-amber-500" />
                  <h3 className="font-serif text-2xl font-semibold text-stone-100">{t("customers.activity")}</h3>
                </div>
                {selectedAudit.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-dashed border-amber-200/10 bg-stone-950/20 px-5 py-6 text-sm leading-7 text-stone-500 text-center">
                    {t("customers.noAudit")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedAudit.slice(0, 4).map((row) => (
                      <div
                        key={row.id}
                        className="rounded-[1.2rem] border border-amber-200/10 bg-stone-950/40 px-4 py-4"
                      >
                        <p className="font-medium text-stone-200">
                          {typeof row.newValues?.[AUDIT_SUMMARY_KEY] === "string"
                            ? row.newValues[AUDIT_SUMMARY_KEY]
                            : formatAuditAction(row.action)}
                        </p>
                        <p className="mt-1 text-xs text-stone-500 uppercase tracking-wider">
                          {new Date(row.createdAt).toLocaleString(locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  to="/dashboard/audit"
                  className="inline-flex text-sm font-bold text-amber-500 hover:text-amber-400 transition-colors"
                >
                  {t("customers.viewAudit")}
                </Link>
              </BentoCard>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
