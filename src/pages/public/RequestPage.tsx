import { SEO } from "@/components/seo/SEO";
import { ClipboardList, PackageSearch, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import { TradeEmblem } from "@/components/shared/TradeEmblem";
import { PurchaseRequestForm } from "@/features/purchase-requests/components/PurchaseRequestForm";
import { RequestContactGate } from "@/features/purchase-requests/components/RequestContactGate";
import { fetchRequests } from "@/domain/operations/service";
import { useI18n } from "@/lib/i18n";
import { PageHelpBox } from "@/features/help-center/components/PageHelpBox";
import type { OperationsRequest } from "@/domain/operations/types";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getProductById } from "@/features/products/services/productCatalogService";

export default function RequestPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editRequestId = searchParams.get("edit");
  const productId = searchParams.get("product");
  const requestSource = searchParams.get("source");
  const [editRequest, setEditRequest] = useState<OperationsRequest | null>(null);
  const [loadingEditRequest, setLoadingEditRequest] = useState(Boolean(editRequestId));
  const [editRequestError, setEditRequestError] = useState("");

  const productSource = useMemo(
    () => (!editRequestId && productId ? getProductById(productId) : null),
    [editRequestId, productId],
  );
  const isCatalogInspiredRequest = !editRequestId && (requestSource === "products" || Boolean(productId));

  useEffect(() => {
    let cancelled = false;

    if (!editRequestId) {
      setEditRequest(null);
      setLoadingEditRequest(false);
      setEditRequestError("");
      return;
    }

    setLoadingEditRequest(true);
    setEditRequestError("");

    fetchRequests()
      .then((requests) => {
        if (cancelled) return;

        const request = requests.find((item) => item.id === editRequestId) || null;
        setEditRequest(request);

        if (!request) {
          setEditRequestError(t("requests.intake.errors.notFound"));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditRequestError(t("requests.intake.errors.notFound"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEditRequest(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [editRequestId, t]);

  const cards = [
    {
      icon: ClipboardList,
      title: t("requestPage.cards.detail.title"),
      desc: t("requestPage.cards.detail.desc"),
    },
    {
      icon: PackageSearch,
      title: t("requestPage.cards.conversion.title"),
      desc: t("requestPage.cards.conversion.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("requestPage.cards.trust.title"),
      desc: t("requestPage.cards.trust.desc"),
    },
  ];

  const productDisplayName = productSource ? (lang === "ar" ? productSource.nameAr : productSource.nameEn) : "";

  return (
    <div className="lourex-public lourex-request min-h-screen bg-background text-foreground">
      <SEO
        title={t("requestPage.seoTitle")}
        description={t("requestPage.seoDescription")}
        url="https://www.lou-rex.com/request"
      />
      <SiteHeader />
      <main className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_5%,rgba(170,54,36,0.06),transparent_32%)] dark:bg-[radial-gradient(ellipse_at_10%_5%,rgba(214,173,108,0.04),transparent_32%)]" />
        <div className="container relative mx-auto px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <header className="lrx-request-intro">
            <div>
              <p className="lrx-brand-kicker">LOUREX / SOURCING DESK</p>
              <h1>{t("requestPage.title")}</h1>
              <p>{t("requestPage.description")}</p>
            </div>
            <TradeEmblem lang={lang} compact />
          </header>
          <PageHelpBox pageKey="request" className="mb-7" />
          <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] xl:gap-16">
            <div className="lrx-request-aside space-y-7 xl:sticky xl:top-28">
              <div className="lrx-request-guide">
                <p className="lrx-brand-kicker">{lang === "ar" ? "قبل أن تبدأ" : "BEFORE YOU BEGIN"}</p>
                <h2>{lang === "ar" ? "كل تفصيل يقربنا من المصدر المناسب." : "Every detail brings the right source closer."}</h2>
              </div>
              <div className="overflow-hidden rounded-[1.65rem] border border-border/70 bg-card shadow-soft">
                {cards.map((item, index) => (
                  <details key={item.title} className="group border-b border-border/70 last:border-b-0">
                    <summary className="flex min-h-[78px] cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/50 [&::-webkit-details-marker]:hidden">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold tabular-nums text-primary/70">0{index + 1}</span>
                        <span className="block text-sm font-bold leading-6 text-heading">{item.title}</span>
                      </span>
                      <span aria-hidden="true" className="text-xl font-light text-primary group-open:hidden">+</span>
                      <span aria-hidden="true" className="hidden text-xl font-light text-primary group-open:block">−</span>
                    </summary>
                    <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                  </details>
                ))}
              </div>
            </div>

            {loadingEditRequest ? (
              <div className="rounded-[2rem] border border-border/70 bg-card p-8 shadow-soft text-sm text-muted-foreground backdrop-blur-xl">
                {t("common.loading") || "Loading..."}
              </div>
            ) : editRequestId && editRequestError ? (
              <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8 text-sm text-red-400">
                {editRequestError}
              </div>
            ) : (
              <div className="space-y-4">
                {isCatalogInspiredRequest ? (
                  <div className="rounded-[1.6rem] border border-primary/20 bg-primary-soft p-4 text-sm leading-7 text-muted-foreground">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                      {t("requests.labels.catalogOriginRequest")}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {t("requestPage.freeFormTitle")}
                    </p>
                    <p className="mt-1">
                      {lang === "ar"
                        ? productDisplayName
                          ? `شاهدت ${productDisplayName} في كتالوج Lourex. اكتب الآن طلبك الحقيقي بالمواصفات والكمية والوجهة التي تريدها، وفريقنا يراجع أفضل خيار توريد مناسب.`
                          : "شاهدت كتالوج منتجات Lourex. اكتب طلبك الحقيقي بالمواصفات والكمية والوجهة التي تريدها، وفريقنا يراجع أفضل خيار توريد مناسب."
                        : productDisplayName
                          ? t("requestPage.catalogDescription", { product: productDisplayName })
                          : t("requestPage.catalogDescriptionGeneric")}
                    </p>
                  </div>
                ) : null}

                <RequestContactGate lang={lang}>
                  <PurchaseRequestForm
                    mode={editRequestId ? "edit" : "create"}
                    requestId={editRequestId || undefined}
                    initialRequest={editRequest}
                    sourceProductId={productId}
                    onEditSuccess={(request) => navigate(`/customer-portal/requests?request=${request.id}`)}
                  />
                </RequestContactGate>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
