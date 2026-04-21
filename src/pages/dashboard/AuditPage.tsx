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
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
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

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    setRows(error ? [] : (data ?? []));
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
      <BentoCard className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t("audit.explorer")}
            </p>
            <h2 className="font-serif text-3xl font-semibold">{t("audit.title")}</h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              {t("audit.description")}
            </p>
          </div>

          <Button variant="outline" onClick={() => void fetchLogs()}>
            <RefreshCw className="me-2 h-4 w-4" />
            {t("audit.refresh")}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("audit.filters.searchPlaceholder")}
              className="ps-10"
            />
          </div>

          <select
            value={tableFilter}
            onChange={(event) => setTableFilter(event.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">{t("audit.filters.allEntities")}</option>
            {tableOptions
              .filter((option) => option !== "all")
              .map((option) => (
                <option key={option} value={option}>
                  {translate(`audit.entities.${option}`, humanizeIdentifier(option))}
                </option>
              ))}
          </select>

          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">{t("audit.filters.allActions")}</option>
            {actionOptions
              .filter((option) => option !== "all")
              .map((option) => (
                <option key={option} value={option}>
                  {translate(`audit.actions.${option}`, humanizeIdentifier(option))}
                </option>
              ))}
          </select>
        </div>
      </BentoCard>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t("audit.metrics.total"), value: metrics.total },
          { label: t("audit.metrics.approvals"), value: metrics.approvals },
          { label: t("audit.metrics.rejections"), value: metrics.rejections },
          { label: t("audit.metrics.financial"), value: metrics.financial },
        ].map((item) => (
          <BentoCard key={item.label}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
          </BentoCard>
        ))}
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={History}
          title={t("audit.noMatchTitle")}
          description={t("audit.noMatchDescription")}
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
              <BentoCard key={row.id} className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {actionLabel}
                      </span>
                      <span className="rounded-full bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
                        {entityLabel}
                      </span>
                    </div>
                    <h3 className="font-medium">
                      {context.summary || `${actionLabel} - ${entityLabel}`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(row.created_at).toLocaleString(locale)}
                    </p>
                  </div>

                  {rowLink ? (
                    <Button variant="outline" asChild>
                      <Link to={rowLink}>{t("common.open")}</Link>
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                    <p className="text-xs text-muted-foreground">{t("audit.reference")}</p>
                    <p className="mt-1 font-medium">
                      {context.dealNumber || context.requestNumber || row.record_id}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                    <p className="text-xs text-muted-foreground">{t("audit.actor")}</p>
                    <p className="mt-1 font-medium">
                      {context.actorName || t("audit.system")}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                    <p className="text-xs text-muted-foreground">{t("audit.context")}</p>
                    <p className="mt-1 font-medium">
                      {context.customer || context.trackingNumber || t("audit.genericContext")}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] bg-secondary/20 p-4">
                    <p className="text-xs text-muted-foreground">{t("audit.why")}</p>
                    <p className="mt-1 font-medium">
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
