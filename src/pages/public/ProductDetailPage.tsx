import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, PackageSearch, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
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

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      setProduct(null);
      setLoading(false);
      return;
    }

    setLoading(true);
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
      <div className="min-h-screen bg-stone-950 text-stone-100">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200/15 bg-stone-50/5 px-5 py-4 text-sm text-stone-400 backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            {isArabic ? "جاري تحميل المنتج..." : "Loading product..."}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  const category = getCategoryById(product.categoryId);
  const image = product.images[0];
  const specs = [
    { label: isArabic ? "التصنيف" : "Category", value: category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId },
    { label: isArabic ? "بلد المنشأ" : "Origin", value: product.originCountry },
    { label: isArabic ? "العلامة" : "Brand", value: product.brand },
    { label: isArabic ? "طبيعة الطلب" : "Request type", value: isArabic ? "طلب توريد حر" : "Free-form sourcing" },
    { label: isArabic ? "الوحدة" : "Unit", value: product.unit },
    { label: isArabic ? "التعبئة" : "Packaging", value: product.packaging },
    { label: isArabic ? "الوزن" : "Weight", value: product.weight },
    { label: isArabic ? "الأبعاد" : "Dimensions", value: product.dimensions },
    { label: isArabic ? "الخامة" : "Material", value: product.material },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO
        title={isArabic ? product.nameAr : product.nameEn}
        description={isArabic ? product.shortDescriptionAr : product.shortDescriptionEn}
      />
      <SiteHeader />

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.05),transparent_34%)]" />
        <section className="container relative mx-auto px-4 py-10 md:px-8 md:py-14">
          <Button asChild variant="ghost" className="mb-6 rounded-xl text-stone-400 hover:bg-stone-800 hover:text-stone-100">
            <Link to="/products">
              {isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {isArabic ? "العودة للمنتجات" : "Back to products"}
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <div className="overflow-hidden rounded-[2.4rem] border border-amber-200/15 bg-stone-50/5 shadow-2xl backdrop-blur-xl">
              <div className="aspect-[4/3] bg-stone-900/50 p-10">
                <img
                  src={image?.url || "/logo.png"}
                  alt={isArabic ? image?.altAr || product.nameAr : image?.altEn || product.nameEn}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="rounded-[2.4rem] border border-amber-200/15 bg-stone-50/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-500">
                <Sparkles className="h-4 w-4" />
                {category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId}
              </div>
              <h1 className="mt-5 break-words font-serif text-4xl font-bold text-stone-100 md:text-5xl">
                {isArabic ? product.nameAr : product.nameEn}
                <span className="mt-2 ml-2 inline-block rounded-full border border-amber-200/10 bg-amber-500/5 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  {t("requests.labels.sourcingExample")}
                </span>
              </h1>
              <p className="mt-5 text-base leading-8 text-stone-300">
                {isArabic ? product.descriptionAr : product.descriptionEn}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {(isArabic ? product.tagsAr : product.tagsEn).map((tag) => (
                  <span key={tag} className="rounded-full border border-amber-200/10 bg-stone-900/50 px-3 py-1 text-xs text-stone-400">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {specs.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-amber-200/10 bg-stone-900/50 p-4">
                    <p className="text-xs text-stone-500">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-stone-200">{item.value}</p>
                  </div>
                ))}
              </div>

              {product.technicalSpecs ? (
                <div className="mt-6 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-amber-500" />
                    <div>
                      <h2 className="font-serif text-xl font-semibold text-stone-100">{isArabic ? "مواصفات مبدئية للعرض" : "Initial display specifications"}</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-400">{product.technicalSpecs}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-7 rounded-2xl border border-amber-200/20 bg-amber-500/10 p-5 text-sm leading-7 text-amber-200">
                {isArabic
                  ? "هذا المنتج معروض كنموذج لخدمة التوريد. الطلب النهائي يبقى طلباً حراً حسب المواصفات والكمية والوجهة التي تحددها."
                  : "This product is shown as a sourcing service example. The final request remains free-form based on the specifications, quantity, and destination you define."}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="min-h-11 flex-1 rounded-xl bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-semibold text-stone-950 shadow-lg shadow-amber-950/20 hover:brightness-110">
                  <Link to={`/request?source=products&product=${encodeURIComponent(product.id)}`}>
                    {isArabic ? "إنشاء طلب توريد" : "Create sourcing request"}
                    <PackageSearch className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="min-h-11 flex-1 rounded-xl border-amber-200/20 text-stone-300 hover:bg-stone-800 hover:text-stone-100">
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