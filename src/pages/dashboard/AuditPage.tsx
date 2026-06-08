import { useEffect, useMemo, useState } from "react";
import { History, RefreshCw, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useI18n } from "@/lib/i18n";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { fetchRequests, fetchDeals } from "@/domain/operations/service";
import {
  generateExecutiveWorkspaceState
} from "@/features/executive-command/lib/executiveWorkspaceEngine";
import { CrossSystemInsightsPanel } from "@/features/executive-command/components/CrossSystemInsightsPanel";
import { AdminAuditLogs } from "@/components/admin/AdminAuditLogs";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type JsonObject = { [key: string]: Json | undefined };

const isJsonObject = (value: Json | null): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const humanizeIdentifier = (value: string) =>
  value
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const valueToString = (value: Json | undefined): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => valueToString(item)).filter(Boolean).join(" ");
  }

  return Object.values(value).map((item) => valueToString(item)).filter(Boolean).join(" ");
};

const getLogContext = (row: AuditLogRow) => {
  const nextValues = isJsonObject(row.new_values) ? row.new_values : {};
  const previousValues = isJsonObject(row.old_values) ? row.old_values : {};

  return {
    requestId:
      valueToString(nextValues.request_id) ||
      valueToString(nextValues.source_request_id) ||
      valueToString(previousValues.request_id),
    requestNumber:
      valueToString(nextValues.request_number) || valueToString(previousValues.request_number),
    dealNumber:
      valueToString(nextValues.deal_number) ||
      valueToString(nextValues.reference_deal_number) ||
      valueToString(previousValues.deal_number),
    trackingNumber:
      valueToString(nextValues.tracking_number) ||
      valueToString(nextValues.shipment_tracking_number) ||
      valueToString(previousValues.tracking_number),
    summary:
      valueToString(nextValues.summary) ||
      valueToString(nextValues.reason) ||
      valueToString(previousValues.summary),
    actorName:
      valueToString(nextValues.changed_by_name) ||
      valueToString(nextValues.reviewed_by_name) ||
      row.changed_by ||
      "",
    customer:
      valueToString(nextValues.customer_name) ||
      valueToString(nextValues.requested_by_name) ||
      valueToString(previousValues.customer_name),
    fullText: [
      row.action,
      row.table_name,
      row.record_id,
      valueToString(row.new_values),
      valueToString(row.old_values),
      row.changed_by ?? "",
    ]
      .join(" ")
      .toLowerCase(),
  };
};

const getRowLink = (row: AuditLogRow) => {
  const context = getLogContext(row);

  if (context.dealNumber) {
    return `/dashboard/deals?deal=${encodeURIComponent(context.dealNumber)}`;
  }

  if (context.requestId) {
    return `/dashboard/requests?request=${encodeURIComponent(context.requestId)}`;
  }

  if (context.trackingNumber) {
    const params = new URLSearchParams();
    params.set("tracking", context.trackingNumber);

    if (context.dealNumber) {
      params.set("deal", context.dealNumber);
    }

    return `/dashboard/tracking?${params.toString()}`;
  }

  if (row.table_name === "financial_edit_requests" || row.table_name === "financial_entries") {
    const params = new URLSearchParams();

    if (context.dealNumber) {
      params.set("deal", context.dealNumber);
    }

    return `/dashboard/edit-requests${params.toString() ? `?${params.toString()}` : ""}`;
  }

  return null;
};

export default function AuditPage() {
  const { locale, t } = useI18n();
  const { profile } = useAuthSession();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchRequests>>>([]);
  const [deals, setDeals] = useState<Awaited<ReturnType<typeof fetchDeals>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(
    [searchParams.get("deal"), searchParams.get("request"), searchParams.get("customer")]
      .filter(Boolean)
      .join(" "),
  );
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);

    const [logsResult, requestsData, dealsData] = await Promise.all([
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      fetchRequests(),
      fetchDeals()
    ]);

    setRows(logsResult.error ? [] : (logsResult.data ?? []));
    setRequests(requestsData);
    setDeals(dealsData);
    setLoading(false);
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  const tableOptions = useMemo(
    () => ["all", ...new Set(rows.map((row) => row.table_name))],
    [rows],
  );

  const actionOptions = useMemo(
    () => ["all", ...new Set(rows.map((row) => row.action))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const context = getLogContext(row);
      const matchesSearch = !normalizedSearch || context.fullText.includes(normalizedSearch);
      const matchesTable = tableFilter === "all" || row.table_name === tableFilter;
      const matchesAction = actionFilter === "all" || row.action === actionFilter;

      return matchesSearch && matchesTable && matchesAction;
    });
  }, [actionFilter, rows, search, tableFilter]);

  const metrics = useMemo(
    () => ({
      total: filteredRows.length,
      approvals: filteredRows.filter((row) => row.action.includes("approved")).length,
      rejections: filteredRows.filter((row) => row.action.includes("rejected")).length,
      financial: filteredRows.filter(
        (row) =>
          row.table_name === "financial_entries" || row.table_name === "financial_edit_requests",
      ).length,
    }),
    [filteredRows],
  );

  const executiveWorkspaceState = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => generateExecutiveWorkspaceState(requests as any, deals as any, [], [], []),
    [requests, deals]
  );

  const translate = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-44 w-full rounded-[2rem]" />
        <Skeleton className="h-28 w-full rounded-[2rem]" />
        <Skeleton className="h-[460px] w-full rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHelpBox pageKey="audit" role={profile?.role} />
      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="whitespace-normal text-[10px] font-semibold uppercase tracking-widest text-stone-500">
              {t("audit.explorer")}
            </p>
            <h2 className="font-serif text-3xl font-semibold text-stone-100">{t("audit.title")}</h2>
            <p className="max-w-3xl text-sm leading-7 text-stone-400">
              {t("audit.description")}
            </p>
          </div>

          <Button variant="outline" onClick={() => void fetchLogs()} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
            <RefreshCw className={`me-2 h-4 w-4 ${loading ? 'animate-spin text-amber-500' : 'text-amber-500'}`} />
            {t("audit.refresh")}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("audit.filters.searchPlaceholder")}
              className="ps-10 bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={tableFilter}
            onChange={(event) => setTableFilter(event.target.value)}
            className="flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none"
          >
            <option value="all" className="bg-stone-900">{t("audit.filters.allEntities")}</option>
            {tableOptions
              .filter((option) => option !== "all")
              .map((option) => (
                <option key={option} value={option} className="bg-stone-900">
                  {translate(`audit.entities.${option}`, humanizeIdentifier(option))}
                </option>
              ))}
          </select>

          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-950/40 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none"
          >
            <option value="all" className="bg-stone-900">{t("audit.filters.allActions")}</option>
            {actionOptions
              .filter((option) => option !== "all")
              .map((option) => (
                <option key={option} value={option} className="bg-stone-900">
                  {translate(`audit.actions.${option}`, humanizeIdentifier(option))}
                </option>
              ))}
          </select>
        </div>
      </BentoCard>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        {[
          { label: t("audit.metrics.total"), value: metrics.total },
          { label: t("audit.metrics.approvals"), value: metrics.approvals },
          { label: t("audit.metrics.rejections"), value: metrics.rejections },
          { label: t("audit.metrics.financial"), value: metrics.financial },
        ].map((item) => (
          <BentoCard key={item.label} className="border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-stone-100">{item.value}</p>
          </BentoCard>
        ))}
      </div>

      {!loading && (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <AdminAuditLogs />
          <CrossSystemInsightsPanel insights={executiveWorkspaceState.insights.filter(i => i.type === 'strategic')} />
        </div>
      )}

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={History}
          title={t("audit.noMatchTitle")}
          description={t("audit.noMatchDescription")}
          className="bg-stone-900/50 border-amber-200/10"
        />
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row) => {
            const context = getLogContext(row);
            const rowLink = getRowLink(row);
            const actionLabel = translate(
              `audit.actions.${row.action}`,
              humanizeIdentifier(row.action),
            );
            const entityLabel = translate(
              `audit.entities.${row.table_name}`,
              humanizeIdentifier(row.table_name),
            );

            return (
              <BentoCard key={row.id} className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest">
                        {actionLabel}
                      </span>
                      <span className="rounded-full bg-stone-800 border border-stone-700 px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                        {entityLabel}
                      </span>
                    </div>
                    <h3 className="font-bold text-stone-100">
                      {context.summary || `${actionLabel} - ${entityLabel}`}
                    </h3>
                    <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">
                      {new Date(row.created_at).toLocaleString(locale)}
                    </p>
                  </div>

                  {rowLink ? (
                    <Button variant="outline" asChild className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
                      <Link to={rowLink}>{t("common.open")}</Link>
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
                  <div className="rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-600">{t("audit.reference")}</p>
                    <p className="mt-1 font-bold text-stone-200">
                      {context.dealNumber || context.requestNumber || row.record_id}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-600">{t("audit.actor")}</p>
                    <p className="mt-1 font-bold text-stone-200">
                      {context.actorName || t("audit.system")}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-600">{t("audit.context")}</p>
                    <p className="mt-1 font-bold text-stone-200">
                      {context.customer || context.trackingNumber || t("audit.genericContext")}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] bg-stone-950/40 border border-amber-200/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-600">{t("audit.why")}</p>
                    <p className="mt-1 font-bold text-stone-200">
                      {context.summary || t("audit.noReason")}
                    </p>
                  </div>
                </div>
              </BentoCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
