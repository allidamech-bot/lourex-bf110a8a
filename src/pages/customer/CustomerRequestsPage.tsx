import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Eye, FileImage, Search } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { loadPurchaseRequests, requestStatusMeta } from "@/lib/operationsDomain";
import { getCustomerRequestStatusCopy } from "@/lib/customerExperience";
import type { PurchaseRequestStatus } from "@/types/lourex";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";

export default function CustomerRequestsPage() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadPurchaseRequests>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | PurchaseRequestStatus>("all");

  const selectedRequestId = searchParams.get("request");

  useEffect(() => {
    const loadRows = async () => {
      setLoading(true);
      setError("");

      try {
        setRows(await loadPurchaseRequests());
      } catch (error) {
        logOperationalError("customer_requests_load", error);
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    void loadRows();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestFilters: Array<{ key: "all" | PurchaseRequestStatus; label: string }> = [
    { key: "all", label: t("requests.filters.all") },
    { key: "intake_submitted", label: t("requests.filters.intake_submitted") },
    { key: "under_review", label: t("requests.filters.under_review") },
    { key: "awaiting_clarification", label: t("requests.filters.awaiting_clarification") },
    { key: "ready_for_conversion", label: t("requests.filters.ready_for_conversion") },
    { key: "converted_to_deal", label: t("requests.filters.converted_to_deal") },
  ];

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter = activeFilter === "all" ? true : row.status === activeFilter;
      const matchesSearch =
        !normalized ||
        row.requestNumber.toLowerCase().includes(normalized) ||
        row.productName.toLowerCase().includes(normalized);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, rows, search]);

  const selectedRow = useMemo(() => {
    if (filteredRows.length === 0) return null;

    return filteredRows.find((row) => row.id === selectedRequestId) || filteredRows[0] || null;
  }, [filteredRows, selectedRequestId]);

  const selectedStatusCopy = selectedRow ? getCustomerRequestStatusCopy(selectedRow.status, locale === "ar" ? "ar" : "en") : null;

  useEffect(() => {
    if (!filteredRows.length) {
      return;
    }

    const existsInFiltered = filteredRows.some((row) => row.id === selectedRequestId);
    if (!existsInFiltered) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("request", filteredRows[0].id);
      setSearchParams(nextParams, { replace: true });
    }
  }, [filteredRows, searchParams, selectedRequestId, setSearchParams]);

  const requestMetrics = useMemo(
    () => ({
      total: rows.length,
      review: rows.filter((row) => row.status === "under_review").length,
      ready: rows.filter((row) => row.status === "ready_for_conversion").length,
      converted: rows.filter((row) => row.status === "converted_to_deal").length,
    }),
    [rows],
  );

  const setSelectedRequest = (requestId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("request", requestId);
    setSearchParams(nextParams);
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-[2rem]" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t("requests.emptyTitle")}
        description={t("requests.emptyDescription")}
        actionLabel={t("customerPortal.actions.newRequest.title")}
        onAction={() => navigate("/request")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <BentoCard className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t("customerPortal.actions.requests.title")}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">{t("requests.inboxTitle")}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t("customerPortal.actions.requests.description")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: t("requests.total"), value: requestMetrics.total },
              { label: t("requests.review"), value: requestMetrics.review },
              { label: t("requests.ready"), value: requestMetrics.ready },
              { label: t("requests.converted"), value: requestMetrics.converted },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 p-4 text-center">
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("requests.searchPlaceholder")}
              className="ps-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {requestFilters.map((filter) => (
              <Button
                key={filter.key}
                variant={activeFilter === filter.key ? "gold" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {error ? (
            <div className="rounded-[1.25rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            {filteredRows.map((row) => {
              const statusMeta = requestStatusMeta[row.status];

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedRequest(row.id)}
                  className={`w-full rounded-[1.4rem] border px-4 py-4 text-start transition-colors ${
                    selectedRow?.id === row.id
                      ? "border-primary/30 bg-primary/10"
                      : "border-border/60 bg-secondary/15 hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{row.requestNumber}</p>
                      <p className="mt-2 font-medium">{row.productName || t("requests.genericRequest")}</p>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusMeta.tone}`}>
                      {t(`statuses.${row.status}`)}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString(locale)}
                  </div>
                </button>
              );
            })}
          </div>
        </BentoCard>

        {selectedRow ? (
          <BentoCard className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{selectedRow.requestNumber}</p>
                <h2 className="mt-2 font-serif text-3xl font-semibold">
                  {selectedRow.productName || t("requests.genericRequest")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {new Date(selectedRow.createdAt).toLocaleString(locale)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${requestStatusMeta[selectedRow.status].tone}`}
                >
                  {t(`statuses.${selectedRow.status}`)}
                </span>

                {selectedRow.convertedDealNumber ? (
                  <Button variant="outline" asChild>
                    <Link to={`/customer-portal/tracking?deal=${selectedRow.convertedDealNumber}`}>
                      <Eye className="me-2 h-4 w-4" />
                      {t("customerPortal.actions.tracking.title")}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-5">
              {selectedStatusCopy ? (
                <div className="rounded-[1.35rem] border border-primary/15 bg-primary/8 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary/80">{selectedStatusCopy.label}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{selectedStatusCopy.description}</p>
                  <p className="mt-3 text-sm font-medium text-foreground">{selectedStatusCopy.nextStep}</p>
                </div>
              ) : null}

              <p className="text-sm leading-7 text-muted-foreground">
                {selectedRow.productDescription || t("requests.noDescription")}
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: t("requests.labels.quantity"), value: String(selectedRow.quantity || t("common.notAvailable")) },
                  { label: t("requests.labels.shipping"), value: selectedRow.preferredShippingMethod || t("common.notAvailable") },
                  { label: t("requests.labels.destination"), value: selectedRow.destination || t("common.notAvailable") },
                  { label: t("requests.labels.expectedDate"), value: selectedRow.expectedSupplyDate || t("common.notAvailable") },
                  { label: t("requests.labels.weight"), value: selectedRow.weight || t("common.notAvailable") },
                  { label: t("requests.labels.brand"), value: selectedRow.brand || t("common.notAvailable") },
                  { label: t("requests.labels.qualityLevel"), value: selectedRow.qualityLevel || t("common.notAvailable") },
                  { label: t("requests.labels.manufacturingCountry"), value: selectedRow.manufacturingCountry || t("common.notAvailable") },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.25rem] bg-secondary/25 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4">
                <div className="flex items-center gap-3">
                  <FileImage className="h-4 w-4 text-primary" />
                  <p className="font-medium">{t("requests.labels.attachments")}</p>
                </div>

                {selectedRow.attachments.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">{t("requests.noAttachments")}</p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedRow.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[1.2rem] border border-border/60 bg-card px-4 py-4 transition-colors hover:border-primary/25"
                      >
                        <p className="break-words font-medium">{attachment.fileName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{attachment.category}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.35rem] border border-border/60 bg-secondary/10 p-4 text-sm leading-7 text-muted-foreground">
                {selectedRow.convertedDealNumber
                  ? locale === "ar"
                    ? "تم إنشاء عملية تشغيلية لهذا الطلب. يمكنك الآن استخدام صفحة التتبع لمعرفة المرحلة الحالية وآخر التحديثات الآمنة للعميل."
                    : "An active operation has been created for this request. You can now use the tracking page to see the current stage and latest customer-safe updates."
                  : locale === "ar"
                    ? "إذا لم يظهر رقم صفقة بعد، فهذا يعني أن الطلب ما زال في مرحلة المراجعة أو التحضير الداخلي قبل بدء التتبع."
                    : "If no deal number is shown yet, the request is still in review or internal preparation before tracking begins."}
              </div>
            </div>
          </BentoCard>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={t("requests.emptyFilteredTitle")}
            description={t("requests.emptyFilteredDescription")}
          />
        )}
      </div>
    </div>
  );
}

