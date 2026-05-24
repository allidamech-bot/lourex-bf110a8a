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
import {
  buildProductRequestPrefill,
  getProductById,
} from "@/features/products/services/productCatalogService";

const buildPrefilledRequestFromProduct = (
  productId: string,
  lang: "ar" | "en",
): OperationsRequest | null => {
  const product = getProductById(productId);

  if (!product) {
    return null;
  }

  const prefill = buildProductRequestPrefill(product, lang);
  const now = new Date().toISOString();

  return {
    id: `product-prefill-${product.id}`,
    requestNumber: "",
    status: "intake_submitted",
    statusLabel: "",
    customer: {
      id: "",
      fullName: "",
      phone: "",
      email: "",
      country: "",
      city: "",
    },
    productName: prefill.productName,
    productDescription: prefill.productDescription,
    quantity: 0,
    sizeDimensions: prefill.sizeDimensions,
    color: "",
    material: prefill.material,
    technicalSpecs: prefill.technicalSpecs,
    referenceLink: prefill.referenceLink,
    preferredShippingMethod: "sea",
    deliveryNotes: prefill.deliveryNotes,
    imageUrls: [],
    createdAt: now,
    internalNotes: "",
    reviewedAt: null,
    convertedDealId: null,
    convertedDealNumber: null,
    attachments: [],
    weight: prefill.weight,
    manufacturingCountry: prefill.manufacturingCountry,
    brand: prefill.brand,
    qualityLevel: prefill.qualityLevel,
    isReadyMade: true,
    hasPreviousSample: false,
    expectedSupplyDate: "",
    destination: "",
    deliveryAddress: "",
    isFullSourcing: true,
    trackingCode: "",
  };
};

export default function RequestPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editRequestId = searchParams.get("edit");
  const productId = searchParams.get("product");
  const [editRequest, setEditRequest] = useState<OperationsRequest | null>(null);
  const [loadingEditRequest, setLoadingEditRequest] = useState(Boolean(editRequestId));
  const [editRequestError, setEditRequestError] = useState("");

  const productPrefillRequest = useMemo(
    () => (!editRequestId && productId ? buildPrefilledRequestFromProduct(productId, lang === "ar" ? "ar" : "en") : null),
    [editRequestId, lang, productId],
  );

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

  return (
    <div className="min-h-screen bg-background">
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_30%)]" />
        <div className="container relative mx-auto px-4 py-12 md:px-8 md:py-16">
          <PageHelpBox pageKey="request" className="mb-8" />
          <div className="grid gap-10 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <SectionHeading
                eyebrow={t("requestPage.eyebrow")}
                title={t("requestPage.title")}
                description={t("requestPage.description")}
              />
              <div className="grid gap-4">
                {cards.map((item) => (
                  <div key={item.title} className="rounded-[1.7rem] border border-primary/12 bg-card/90 p-5 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.2)] dark:shadow-[0_18px_42px_-34px_rgba(0,0,0,0.48)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {loadingEditRequest ? (
              <div className="rounded-[2rem] border border-border/60 bg-card/90 p-8 text-sm text-muted-foreground">
                {t("common.loading") || "Loading..."}
              </div>
            ) : editRequestId && editRequestError ? (
              <div className="rounded-[2rem] border border-destructive/20 bg-destructive/10 p-8 text-sm text-destructive">
                {editRequestError}
              </div>
            ) : (
              <div className="space-y-4">
                {productId && productPrefillRequest ? (
                  <div className="rounded-[1.6rem] border border-primary/20 bg-primary/8 p-4 text-sm leading-7 text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {lang === "ar" ? "تم تجهيز الطلب من كتالوج المنتجات" : "Request prepared from the product catalog"}
                    </p>
                    <p className="mt-1">
                      {lang === "ar"
                        ? "راجع الكمية والوجهة وارفع صورك أو أي مرفقات إضافية قبل الإرسال."
                        : "Review the quantity and destination, then upload your images or any extra references before submitting."}
                    </p>
                  </div>
                ) : productId && !productPrefillRequest ? (
                  <div className="rounded-[1.6rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100">
                    {lang === "ar"
                      ? "لم يتم العثور على المنتج المطلوب. يمكنك متابعة تعبئة الطلب يدوياً."
                      : "The selected product was not found. You can continue filling the request manually."}
                  </div>
                ) : null}
                <PurchaseRequestForm
                  mode={editRequestId ? "edit" : "create"}
                  requestId={editRequestId || undefined}
                  initialRequest={editRequestId ? editRequest : productPrefillRequest}
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
