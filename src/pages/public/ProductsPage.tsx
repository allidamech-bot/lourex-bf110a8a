import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Filter, Loader2, PackageSearch, Search, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  fetchCatalogProducts,
  filterProductList,
  getCategoryById,
  listProductCategories,
} from "@/features/products/services/productCatalogService";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";

export default function ProductsPage() {
  const { t, lang } = useI18n();
  const isArabic = lang === "ar";
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [catalogProducts, setCatalogProducts] = useState<ProductCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const categories = listProductCategories();
  const products = useMemo(
    () => filterProductList({ products: catalogProducts, query, categoryId }),
    [catalogProducts, categoryId, query],
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetchCatalogProducts()
      .then((nextProducts) => {
        if (!cancelled) {
          setCatalogProducts(nextProducts);
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
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SEO
        title={isArabic ? "منتجات وخدمات لوركس" : "Lourex Products & Sourcing"}
        description={
          isArabic
            ? "استعرض أمثلة المنتجات والخدمات التي يمكن لفريق Lourex توريدها، ثم أنشئ طلب توريد حر بالمواصفات التي تحتاجها."
            : "Browse examples of products and sourcing services Lourex can handle, then create a free-form sourcing request with your own specifications."
        }
      />
      <SiteHeader />

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.05),transparent_32%)]" />
        <section className="container relative mx-auto px-4 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-500">
              <Sparkles className="h-4 w-4" />
              {isArabic ? "نماذج منتجات وخدمات Lourex" : "Lourex sourcing examples"}
            </div>
            <h1 className="mt-6 font-serif text-4xl font-bold tracking-tight text-stone-100 md:text-6xl">
              {isArabic ? "منتجات نعرضها لإظهار خدمات التوريد" : "Products shown as sourcing service examples"}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-stone-400 md:text-lg">
              {isArabic
                ? "هذه المنتجات للعرض وإظهار نوع الخدمات التي يمكن لفريق Lourex التعامل معها. عند الضغط على إنشاء طلب توريد، ستفتح صفحة طلب حر لتكتب المواصفات والكمية والوجهة التي تريدها."
                : "These products are displayed to show the kind of sourcing work Lourex can handle. When you create a sourcing request, you will open a free-form request page where you describe your own specifications, quantity, and destination."}
            </p>
          </div>

          <div className="mt-10 rounded-[2rem] border border-amber-200/15 bg-stone-50/5 p-4 shadow-2xl backdrop-blur-xl md:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <label className="relative block">
                <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 ${isArabic ? "right-3" : "left-3"}`} />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isArabic ? "ابحث باسم المنتج أو التصنيف أو المواصفة..." : "Search by product, category, or specification..."}
                  className={`bg-stone-900/50 border-amber-200/10 text-stone-100 placeholder:text-stone-600 ${isArabic ? "pr-10" : "pl-10"}`}
                />
              </label>
              <label className="relative block">
                <Filter className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 ${isArabic ? "right-3" : "left-3"}`} />
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className={`h-10 w-full rounded-md border border-amber-200/10 bg-stone-900/50 px-3 py-2 text-sm text-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50 ${isArabic ? "pr-10" : "pl-10"}`}
                >
                  <option value="all" className="bg-stone-900">{isArabic ? "كل التصنيفات" : "All categories"}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id} className="bg-stone-900">
                      {isArabic ? category.labelAr : category.labelEn}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="mt-10 flex items-center justify-center gap-3 rounded-[2rem] border border-amber-200/15 bg-stone-50/5 p-10 text-sm text-stone-400 backdrop-blur-xl">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              {isArabic ? "جاري تحميل المنتجات..." : "Loading products..."}
            </div>
          ) : null}

          {!loading ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const category = getCategoryById(product.categoryId);
                const image = product.images[0];
                return (
                  <article key={product.id} className="group flex min-h-full flex-col overflow-hidden rounded-[2rem] border border-amber-200/15 bg-stone-50/5 shadow-2xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-amber-500/30">
                    <div className="relative aspect-[4/3] overflow-hidden bg-stone-900/50">
                      <img
                        src={image?.url || "/logo.png"}
                        alt={isArabic ? image?.altAr || product.nameAr : image?.altEn || product.nameEn}
                        className="h-full w-full object-contain p-10 transition duration-500 group-hover:scale-105"
                      />
                      {product.isFeatured ? (
                        <span className="absolute top-4 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 ltr:left-4 rtl:right-4">
                          {isArabic ? "مثال مميز" : "Featured example"}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs font-semibold text-amber-500">{category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId}</p>
                      <span className="mt-1 inline-flex w-fit items-center rounded-full border border-amber-200/10 bg-amber-500/5 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        {t("requests.labels.sourcingExample")}
                      </span>
                      <h2 className="mt-2 break-words font-serif text-2xl font-semibold text-stone-100">
                        {isArabic ? product.nameAr : product.nameEn}
                      </h2>
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-400">
                        {isArabic ? product.shortDescriptionAr : product.shortDescriptionEn}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(isArabic ? product.tagsAr : product.tagsEn).slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full border border-amber-200/10 bg-stone-900/50 px-3 py-1 text-xs text-stone-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-2 rounded-2xl bg-stone-900/50 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-stone-500">{isArabic ? "بلد المنشأ" : "Origin"}</span>
                          <span className="font-semibold text-stone-300">{product.originCountry}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-stone-500">{isArabic ? "طبيعة الطلب" : "Request type"}</span>
                          <span className="font-semibold text-stone-300">{isArabic ? "طلب حر" : "Free-form"}</span>
                        </div>
                      </div>
                      <div className="mt-auto flex gap-2 pt-5">
                        <Button asChild variant="outline" className="flex-1 rounded-xl border-amber-200/20 text-stone-300 hover:bg-stone-800 hover:text-stone-100">
                          <Link to={`/products/${product.slug}`}>{isArabic ? "التفاصيل" : "Details"}</Link>
                        </Button>
                        <Button asChild className="flex-1 rounded-xl bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-semibold text-stone-950 shadow-lg shadow-amber-950/20 hover:brightness-110">
                          <Link to={`/request?source=products&product=${encodeURIComponent(product.id)}`}>
                            {isArabic ? "إنشاء طلب توريد" : "Create request"}
                            <ArrowRight className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
) : null}

          {!loading && products.length === 0 ? (
            <div className="mt-10 rounded-[2rem] border border-dashed border-amber-200/20 bg-stone-50/5 p-10 text-center backdrop-blur-xl">
              <PackageSearch className="mx-auto h-10 w-10 text-stone-600" />
              <h2 className="mt-4 font-serif text-2xl font-semibold text-stone-100">{t("requests.labels.emptyCatalogTitle")}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-stone-400">
                {t("requests.labels.emptyCatalogDescription")}
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
