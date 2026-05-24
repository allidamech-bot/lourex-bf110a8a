import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, PackageSearch, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  getCategoryById,
  getProductBySlug,
} from "@/features/products/services/productCatalogService";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { lang } = useI18n();
  const isArabic = lang === "ar";
  const product = slug ? getProductBySlug(slug) : null;

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  const category = getCategoryById(product.categoryId);
  const image = product.images[0];
  const specs = [
    { label: isArabic ? "التصنيف" : "Category", value: category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId },
    { label: isArabic ? "بلد المنشأ" : "Origin", value: product.originCountry },
    { label: isArabic ? "العلامة" : "Brand", value: product.brand },
    { label: "MOQ", value: product.moq },
    { label: isArabic ? "الوحدة" : "Unit", value: product.unit },
    { label: isArabic ? "التعبئة" : "Packaging", value: product.packaging },
    { label: isArabic ? "الوزن" : "Weight", value: product.weight },
    { label: isArabic ? "الأبعاد" : "Dimensions", value: product.dimensions },
    { label: isArabic ? "الخامة" : "Material", value: product.material },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={isArabic ? product.nameAr : product.nameEn}
        description={isArabic ? product.shortDescriptionAr : product.shortDescriptionEn}
      />
      <SiteHeader />

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_34%)]" />
        <section className="container relative mx-auto px-4 py-10 md:px-8 md:py-14">
          <Button asChild variant="ghost" className="mb-6 rounded-xl">
            <Link to="/products">
              {isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {isArabic ? "العودة للمنتجات" : "Back to products"}
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <div className="overflow-hidden rounded-[2.4rem] border border-border/60 bg-card/90 shadow-[0_30px_80px_-55px_rgba(0,0,0,0.75)]">
              <div className="aspect-[4/3] bg-secondary/35 p-10">
                <img
                  src={image?.url || "/logo.png"}
                  alt={isArabic ? image?.altAr || product.nameAr : image?.altEn || product.nameEn}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="rounded-[2.4rem] border border-border/60 bg-card/90 p-6 shadow-[0_30px_80px_-55px_rgba(0,0,0,0.75)] md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                {category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId}
              </div>
              <h1 className="mt-5 break-words font-serif text-4xl font-bold md:text-5xl">
                {isArabic ? product.nameAr : product.nameEn}
              </h1>
              <p className="mt-5 text-base leading-8 text-muted-foreground">
                {isArabic ? product.descriptionAr : product.descriptionEn}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {(isArabic ? product.tagsAr : product.tagsEn).map((tag) => (
                  <span key={tag} className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {specs.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {product.technicalSpecs ? (
                <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h2 className="font-serif text-xl font-semibold">{isArabic ? "مواصفات مبدئية" : "Initial specifications"}</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{product.technicalSpecs}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-7 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
                {isArabic ? product.priceNoteAr : product.priceNoteEn}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="gold" className="min-h-11 flex-1 rounded-xl">
                  <Link to={`/request?product=${encodeURIComponent(product.id)}`}>
                    {isArabic ? "اطلب هذا المنتج" : "Request this product"}
                    <PackageSearch className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="min-h-11 flex-1 rounded-xl">
                  <Link to="/contact">{isArabic ? "تواصل للاستفسار" : "Contact for inquiry"}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
