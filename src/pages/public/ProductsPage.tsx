import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Filter, Loader2, PackageSearch, Search } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
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
        if (!cancelled) setCatalogProducts(nextProducts);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={t("products.listing.seoTitle")}
        description={t("products.listing.seoDescription")}
        url="https://www.lou-rex.com/products"
      />
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-border/70 bg-[#E9F3F0] py-14 dark:bg-[#0E1B1B] sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute -end-40 -top-44 h-[34rem] w-[34rem] rounded-full border border-primary/15" />
          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-[47rem]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{isArabic ? "الكتالوج" : "OUR CATALOG"}</p>
              <h1 className="mt-4 text-[clamp(2.6rem,5vw,4.8rem)] font-bold leading-[1.12] tracking-tight text-heading">
                {t("products.listing.title")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
                {t("products.listing.description")}
              </p>
              <span className="mt-5 inline-flex text-xs font-medium text-primary">{t("products.listing.examplesEyebrow")}</span>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <div className="sticky top-16 z-20 rounded-[1.5rem] border border-border/75 bg-card/95 p-3 shadow-soft backdrop-blur-xl sm:p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <label className="relative block">
                <span className="sr-only">{t("products.listing.searchPlaceholder")}</span>
                <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("products.listing.searchPlaceholder")}
                  className="h-12 rounded-xl border-border/75 bg-background ps-12 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30"
                />
              </label>
              <label className="relative block">
                <span className="sr-only">{t("products.listing.allCategories")}</span>
                <Filter className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-border/75 bg-background pe-4 ps-11 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <option value="all">{t("products.listing.allCategories")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {isArabic ? category.labelAr : category.labelEn}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="mt-9 flex min-h-[220px] items-center justify-center gap-3 rounded-[1.5rem] border border-border/70 bg-card text-sm text-muted-foreground" role="status">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              {t("products.listing.loading")}
            </div>
          ) : products.length ? (
            <div className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const category = getCategoryById(product.categoryId);
                const image = product.images[0];
                return (
                  <article key={product.id} className="group flex min-h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/75 bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_22px_60px_-35px_rgba(8,127,120,0.35)]">
                    <Link to={`/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[#F0F6F3] dark:bg-[#172124]">
                      <img
                        src={image?.url || "/logo.png"}
                        alt={image ? (isArabic ? image.altAr || product.nameAr : image.altEn || product.nameEn) : "LOUREX product sourcing"}
                        className="h-full w-full object-contain p-8 transition-transform duration-500 group-hover:scale-[1.045]"
                        loading="lazy"
                      />
                      {product.isFeatured && (
                        <span className="absolute start-4 top-4 rounded-full border border-primary/20 bg-card/95 px-3 py-1 text-xs font-semibold text-primary">
                          {t("products.listing.featuredExample")}
                        </span>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-xs font-bold text-primary">
                        {category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId}
                      </p>
                      <h2 className="mt-3 text-[1.4rem] font-bold leading-snug text-heading">
                        {isArabic ? product.nameAr : product.nameEn}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">
                        {isArabic ? product.shortDescriptionAr : product.shortDescriptionEn}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                          {t("requests.labels.sourcingExample")}
                        </span>
                        {(isArabic ? product.tagsAr : product.tagsEn).slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/65 pt-4 text-xs text-muted-foreground">
                        <span>{t("products.listing.origin")}</span>
                        <span className="font-semibold text-foreground">{product.originCountry}</span>
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                        <Link to={`/products/${product.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-2 text-center text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary sm:text-sm">
                          {t("products.listing.details")}
                        </Link>
                        <Link to={`/request?source=products&product=${encodeURIComponent(product.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-center text-xs font-bold text-primary-foreground transition hover:opacity-90 sm:text-sm">
                          {t("products.listing.createRequest")}
                          <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-9 flex min-h-[260px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card p-8 text-center">
              <PackageSearch className="h-9 w-9 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-heading">{t("requests.labels.emptyCatalogTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                {t("requests.labels.emptyCatalogDescription")}
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
