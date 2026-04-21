import { useEffect, useMemo, useState } from "react";
import { BarChart3, ClipboardList, FilePenLine, PackageSearch, Receipt, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import BentoCard from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { loadDeals, loadFinancialEditRequests, loadPurchaseRequests, loadShipments } from "@/lib/operationsDomain";
import { useI18n } from "@/lib/i18n";

interface OverviewMetrics {
  requests: number;
  deals: number;
  shipments: number;
  audits: number;
}

const loadingCards = Array.from({ length: 4 });

export default function OverviewPage() {
  const { locale, t } = useI18n();
  const [metrics, setMetrics] = useState<OverviewMetrics>({ requests: 0, deals: 0, shipments: 0, audits: 0 });
  const [recentRequests, setRecentRequests] = useState<Awaited<ReturnType<typeof loadPurchaseRequests>>>([]);
  const [shipments, setShipments] = useState<Awaited<ReturnType<typeof loadShipments>>>([]);
  const [editRequests, setEditRequests] = useState<Awaited<ReturnType<typeof loadFinancialEditRequests>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [requestsDomain, dealsDomain, shipmentsDomain, auditCount, editsDomain] = await Promise.all([
        loadPurchaseRequests(),
        loadDeals(),
        loadShipments(),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        loadFinancialEditRequests(),
      ]);

      setMetrics({
        requests: requestsDomain.length || 0,
        deals: dealsDomain.length || 0,
        shipments: shipmentsDomain.length || 0,
        audits: auditCount.count || 0,
      });
      setRecentRequests(requestsDomain.slice(0, 4));
      setShipments(shipmentsDomain);
      setEditRequests(editsDomain);
      setLoading(false);
    };

    void load();
  }, []);

  const requestSummary = useMemo(
    () => ({
      review: recentRequests.filter((item) => item.status === "under_review").length,
      ready: recentRequests.filter((item) => item.status === "ready_for_conversion").length,
      converted: recentRequests.filter((item) => item.status === "converted_to_deal").length,
    }),
    [recentRequests],
  );

  const deliverySummary = useMemo(
    () => ({
      active: shipments.filter((item) => item.stage !== "delivered").length,
      delivered: shipments.filter((item) => item.stage === "delivered").length,
    }),
    [shipments],
  );

  const pendingEditRequests = editRequests.filter((item) => item.status === "pending").length;

  return (
    <div className="space-y-6">
      <BentoCard span="full" className="rounded-[2rem] p-8 md:p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t("overview.heroEyebrow")}</p>
        <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              {t("overview.heroTitle")} <span className="text-gradient-gold">Lourex</span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("overview.heroDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="gold" asChild>
              <Link to="/dashboard/requests">{t("overview.openRequests")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/deals">{t("overview.openDeals")}</Link>
            </Button>
          </div>
        </div>
      </BentoCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading
          ? loadingCards
          : [
              { label: t("overview.metrics.requests"), value: metrics.requests, icon: ClipboardList },
              { label: t("overview.metrics.deals"), value: metrics.deals, icon: PackageSearch },
              { label: t("overview.metrics.shipments"), value: metrics.shipments, icon: Truck },
              { label: t("overview.metrics.audits"), value: metrics.audits, icon: BarChart3 },
            ]
        ).map((item: any, index) => (
          <BentoCard key={index} delay={index * 0.05}>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="mt-5 font-serif text-4xl font-bold">{item.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
              </>
            )}
          </BentoCard>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <BentoCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("overview.priorityBoard")}</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold">{t("overview.priorityTitle")}</h3>
            </div>
            <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-medium text-primary">{t("overview.liveFocus")}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: t("overview.reviewLabel"), value: requestSummary.review, description: t("overview.reviewDescription") },
              { label: t("overview.readyLabel"), value: requestSummary.ready, description: t("overview.readyDescription") },
              { label: t("overview.editLabel"), value: pendingEditRequests, description: t("overview.editDescription") },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-border/60 bg-secondary/20 p-5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-bold">{item.value}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <h3 className="font-serif text-2xl font-semibold">{t("overview.currentOpsTitle")}</h3>
          <div className="grid gap-3">
            <div className="rounded-[1.4rem] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs text-muted-foreground">{t("overview.activeShipments")}</p>
              <p className="mt-2 text-2xl font-bold">{deliverySummary.active}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs text-muted-foreground">{t("overview.deliveredShipments")}</p>
              <p className="mt-2 text-2xl font-bold">{deliverySummary.delivered}</p>
            </div>
            <div className="rounded-[1.4rem] border border-primary/15 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
              {t("overview.currentOpsDescription")}
            </div>
          </div>
        </BentoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <BentoCard span="1" className="p-0">
          <div className="border-b border-border/60 px-6 py-5">
            <h3 className="font-serif text-2xl font-semibold">{t("overview.latestRequests")}</h3>
          </div>
          <div className="space-y-0">
            {loading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : recentRequests.length > 0 ? (
              recentRequests.map((item) => (
                <div key={item.id} className="border-b border-border/40 px-6 py-5 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.customer.fullName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.productName || t("overview.genericRequest")}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {t(`statuses.${item.status}`)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString(locale)}</p>
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-sm text-muted-foreground">{t("overview.noRequests")}</div>
            )}
          </div>
        </BentoCard>

        <BentoCard className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FilePenLine className="h-5 w-5" />
          </div>
          <h3 className="font-serif text-2xl font-semibold">{t("overview.quickActions")}</h3>
          <div className="grid gap-3">
            {[
              { label: t("overview.quickReview"), to: "/dashboard/requests" },
              { label: t("overview.quickDeals"), to: "/dashboard/deals" },
              { label: t("overview.quickTracking"), to: "/dashboard/tracking" },
              { label: t("overview.quickEditRequests"), to: "/dashboard/edit-requests" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="rounded-[1.25rem] border border-border/60 bg-secondary/25 px-4 py-4 text-sm font-medium transition-colors hover:border-primary/25 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
