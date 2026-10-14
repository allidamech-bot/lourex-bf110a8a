import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, PackageSearch, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  fetchCatalogProductBySlug,
  getCategoryById,
} from "@/features/products/services/productCatalogService";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const isArabic = lang === "ar";
  const [product, setProduct] = useState<ProductCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      setProduct(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setActiveImageIndex(0);
    fetchCatalogProductBySlug(slug, true)
      .then((nextProduct) => {
        if (!cancelled) {
          setProduct(nextProduct);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="lourex-public lourex-productdetail min-h-screen bg-background text-foreground">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-card px-5 py-4 text-sm text-muted-foreground backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            {t("products.detail.loading")}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  const category = getCategoryById(product.categoryId);
  const image = product.images[activeImageIndex] ?? product.images[0];
  const hasProductImage = Boolean(image?.url && !/\/?logo\.png(?:[?#].*)?$/.test(image.url));
  const specs = [
    { label: t("products.detail.category"), value: category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId },
    { label: t("products.detail.origin"), value: product.originCountry },
    { label: t("products.detail.brand"), value: product.brand },
    { label: t("products.detail.requestType"), value: t("products.detail.freeFormSourcing") },
    { label: t("products.detail.unit"), value: product.unit },
    { label: t("products.detail.packaging"), value: product.packaging },
    { label: t("products.detail.weight"), value: product.weight },
    { label: t("products.detail.dimensions"), value: product.dimensions },
    { label: t("products.detail.material"), value: product.material },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="lourex-public lourex-productdetail min-h-screen bg-background text-foreground">
      <SEO
        title={isArabic ? product.nameAr : product.nameEn}
        description={isArabic ? product.shortDescriptionAr : product.shortDescriptionEn}
        url={`https://www.lou-rex.com/products/${product.slug}`}
      />
      <SiteHeader />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(8,127,120,0.055),transparent_36%)] dark:bg-[radial-gradient(circle_at_top,rgba(54,211,192,0.035),transparent_36%)]" />
        <section className="container relative mx-auto px-4 py-10 sm:px-6 md:py-20 lg:px-8">
          <Button asChild variant="ghost" className="mb-6 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground">
            <Link to="/products">
              {isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t("products.detail.backToProducts")}
            </Link>
          </Button>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:items-start xl:gap-16">
            <div className="min-w-0 lg:sticky lg:top-28">
              <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-card shadow-[0_28px_65px_-42px_rgba(8,127,120,0.3)]">
                <div className="relative flex aspect-[4/3] items-center justify-center bg-[#EAF3F0] p-8 dark:bg-[#152323] sm:p-12">
                  <div aria-hidden="true" className="pointer-events-none absolute inset-6 rounded-[1.5rem] border border-primary/10" />
                  {hasProductImage ? <img
                    src={image.url}
                    alt={
                      image
                        ? isArabic
                          ? image.altAr || product.nameAr
                          : image.altEn || product.nameEn
                        : "LOUREX product sourcing"
                    }
                    className="relative h-full w-full object-contain"
                    decoding="async"
                  /> : <div className="lrx-detail-placeholder">
                    <svg viewBox="0 0 180 180" fill="none" aria-hidden="true"><path d="m90 15 65 38v74l-65 38-65-38V53Z M25 53l65 37 65-37M90 90v75M90 15v75" stroke="currentColor" /><path d="m25 127 65-37 65 37" stroke="currentColor" opacity=".35" /></svg>
                    <p>{isArabic ? "صورة المنتج غير متاحة" : "Product image unavailable"}</p>
                  </div>}
                </div>
              </div>
              {product.images.length > 1 ? (
                <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label={isArabic ? "صور المنتج" : "Product gallery"}>
                  {product.images.map((photo, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={(isArabic ? "عرض صورة " : "View image ") + (index + 1)}
                      aria-pressed={activeImageIndex === index}
                      className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-card p-2 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${
                        activeImageIndex === index ? "border-primary shadow-soft" : "border-border/70 hover:border-primary/40"
                      }`}
                    >
                      {photo.url && !/\/?logo\.png(?:[?#].*)?$/.test(photo.url) ? <img
                        src={photo.url}
                        alt={isArabic ? photo.altAr || product.nameAr : photo.altEn || product.nameEn}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        decoding="async"
                      /> : <PackageSearch className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-border/75 bg-card p-6 shadow-soft sm:p-8 lg:p-9">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-2 text-xs font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                {category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId}
              </div>
              <h1 className="mt-5 break-words text-[clamp(2.25rem,4.5vw,3.6rem)] font-extrabold leading-[1.15] tracking-tight text-heading">
                {isArabic ? product.nameAr : product.nameEn}
                <span className="mt-2 ml-2 inline-block rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">
                  {t("requests.labels.sourcingExample")}
                </span>
              </h1>
              <p className="mt-5 text-[15px] leading-8 text-muted-foreground sm:text-base">
                {isArabic ? product.descriptionAr : product.descriptionEn}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {(isArabic ? product.tagsAr : product.tagsEn).map((tag) => (
                  <span key={tag} className="rounded-full border border-primary/20 bg-secondary/65 px-3 py-1 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>

              <dl className="mt-8 divide-y divide-border/75 border-y border-border/75">
                {specs.map((item) => (
                  <div key={item.label} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] sm:items-start">
                    <dt className="text-sm text-muted-foreground">{item.label}</dt>
                    <dd className="break-words text-sm font-semibold text-heading">{item.value}</dd>
                  </div>
                ))}
              </dl>

              {product.technicalSpecs ? (
                <div className="mt-6 rounded-2xl border border-primary/20 bg-primary-soft p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h2 className="font-serif text-xl font-semibold text-foreground">{t("products.detail.initialSpecsTitle")}</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{product.technicalSpecs}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-7 rounded-2xl border border-primary/15 bg-primary-soft p-5 text-sm leading-7 text-heading">
                {t("products.detail.sourcingNote")}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="min-h-12 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground shadow-soft transition hover:opacity-90">
                  <Link to={`/request?source=products&product=${encodeURIComponent(product.id)}`}>
                    {t("products.detail.createSourcingRequest")}
                    <PackageSearch className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="min-h-12 flex-1 rounded-xl border-border text-heading transition hover:bg-accent hover:text-heading">
                  <Link to="/contact">{t("products.detail.contactInquiry")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
