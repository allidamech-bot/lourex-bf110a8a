import { SEO } from "@/components/seo/SEO";
import { ClipboardList, PackageSearch, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PurchaseRequestForm } from "@/features/purchase-requests/components/PurchaseRequestForm";
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
          setEditRequestError(t("requests.intake.errors.notFound") || "The request could not be found.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditRequestError(t("requests.intake.errors.notFound") || "The request could not be found.");
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
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO
        title={lang === "ar" ? "إرسال طلب شراء" : "Submit Purchase Request"}
        description={
          lang === "ar"
            ? "أرسل طلب شراء جديد لعمليات التوريد والاستيراد والتصدير عبر منصة Lourex."
            : "Submit a new purchase request for sourcing, import, and export operations through the Lourex platform."
        }
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
                  <div key={item.title} className="rounded-[1.7rem] border border-amber-200/15 bg-stone-50/5 p-5 shadow-2xl backdrop-blur-xl">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl font-semibold text-stone-100">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {loadingEditRequest ? (
              <div className="rounded-[2rem] border border-amber-200/15 bg-stone-50/5 p-8 text-sm text-stone-400 backdrop-blur-xl">
                {t("common.loading") || "Loading..."}
              </div>
            ) : editRequestId && editRequestError ? (
              <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8 text-sm text-red-400">
                {editRequestError}
              </div>
            ) : (
              <div className="space-y-4">
                {isCatalogInspiredRequest ? (
                  <div className="rounded-[1.6rem] border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-7 text-stone-400">
                    <p className="font-semibold text-stone-100">
                      {lang === "ar" ? "إنشاء طلب توريد حر" : "Create a free-form sourcing request"}
                    </p>
                    <p className="mt-1">
                      {lang === "ar"
                        ? productDisplayName
                          ? `شاهدت ${productDisplayName} في كتالوج Lourex. اكتب الآن طلبك الحقيقي بالمواصفات والكمية والوجهة التي تريدها، وفريقنا يراجع أفضل خيار توريد مناسب.`
                          : "شاهدت كتالوج منتجات Lourex. اكتب طلبك الحقيقي بالمواصفات والكمية والوجهة التي تريدها، وفريقنا يراجع أفضل خيار توريد مناسب."
                        : productDisplayName
                          ? `You viewed ${productDisplayName} in the Lourex catalog. Now describe your actual request with the specifications, quantity, and destination you need, and our team will review the best sourcing option.`
                          : "You viewed the Lourex product catalog. Now describe your actual request with the specifications, quantity, and destination you need, and our team will review the best sourcing option."}
                    </p>
                  </div>
                ) : null}
                <PurchaseRequestForm
                  mode={editRequestId ? "edit" : "create"}
                  requestId={editRequestId || undefined}
                  initialRequest={editRequest}
                  sourceProductId={productId}
                  onEditSuccess={(request) => navigate(`/customer-portal/requests?request=${request.id}`)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
