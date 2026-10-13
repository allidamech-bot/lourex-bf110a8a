import { SEO } from "@/components/seo/SEO";
import { ClipboardList, PackageSearch, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
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
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={t("requestPage.seoTitle")}
        description={t("requestPage.seoDescription")}
        url="https://www.lou-rex.com/request"
      />
      <SiteHeader />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.05),transparent_30%)]" />
        <div className="container relative mx-auto px-4 py-12 md:px-8 md:py-16">
          <PageHelpBox pageKey="request" className="mb-8 opacity-80" />
          <div className="grid gap-10 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <SectionHeading
                eyebrow={t("requestPage.eyebrow")}
                title={t("requestPage.title")}
                description={t("requestPage.description")}
              />
              <div className="grid gap-4">
                {cards.map((item) => (
                  <div key={item.title} className="rounded-[1.7rem] border border-primary/20 bg-card p-5 shadow-soft backdrop-blur-xl">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                  </div>
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
      </div>
    </div>
  );
}
