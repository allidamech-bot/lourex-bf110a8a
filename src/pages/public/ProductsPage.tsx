import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Filter, PackageSearch, Search, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  filterProducts,
  getCategoryById,
  listProductCategories,
} from "@/features/products/services/productCatalogService";

export default function ProductsPage() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const categories = listProductCategories();
  const products = useMemo(() => filterProducts({ query, categoryId }), [categoryId, query]);

  return (
    <div className="min-h-screen bg-background">
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_32%)]" />
        <section className="container relative mx-auto px-4 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              {isArabic ? "نماذج منتجات وخدمات Lourex" : "Lourex sourcing examples"}
            </div>
            <h1 className="mt-6 font-serif text-4xl font-bold tracking-tight md:text-6xl">
              {isArabic ? "منتجات نعرضها لإظهار خدمات التوريد" : "Products shown as sourcing service examples"}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              {isArabic
                ? "هذه المنتجات للعرض وإظهار نوع الخدمات التي يمكن لفريق Lourex التعامل معها. عند الضغط على إنشاء طلب توريد، ستفتح صفحة طلب حر لتكتب المواصفات والكمية والوجهة التي تريدها."
                : "These products are displayed to show the kind of sourcing work Lourex can handle. When you create a sourcing request, you will open a free-form request page where you describe your own specifications, quantity, and destination."}
            </p>
          </div>

          <div className="mt-10 rounded-[2rem] border border-border/60 bg-card/85 p-4 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.65)] md:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <label className="relative block">
                <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`} />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isArabic ? "ابحث باسم المنتج أو التصنيف أو المواصفة..." : "Search by product, category, or specification..."}
                  className={isArabic ? "pr-10" : "pl-10"}
                />
              </label>
              <label className="relative block">
                <Filter className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`} />
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className={`h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isArabic ? "pr-10" : "pl-10"}`}
                >
                  <option value="all">{isArabic ? "كل التصنيفات" : "All categories"}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {isArabic ? category.labelAr : category.labelEn}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const category = getCategoryById(product.categoryId);
              const image = product.images[0];
              return (
                <article key={product.id} className="group flex min-h-full flex-col overflow-hidden rounded-[2rem] border border-border/60 bg-card/90 shadow-[0_24px_55px_-40px_rgba(0,0,0,0.7)] transition hover:-translate-y-1 hover:border-primary/25">
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary/40">
                    <img
                      src={image?.url || "/logo.png"}
                      alt={isArabic ? image?.altAr || product.nameAr : image?.altEn || product.nameEn}
                      className="h-full w-full object-contain p-10 transition duration-500 group-hover:scale-105"
                    />
                    {product.isFeatured ? (
                      <span className="absolute top-4 rounded-full border border-primary/25 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary ltr:left-4 rtl:right-4">
                        {isArabic ? "مثال مميز" : "Featured example"}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-semibold text-primary">{category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId}</p>
                    <h2 className="mt-2 break-words font-serif text-2xl font-semibold">
                      {isArabic ? product.nameAr : product.nameEn}
                    </h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">
                      {isArabic ? product.shortDescriptionAr : product.shortDescriptionEn}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(isArabic ? product.tagsAr : product.tagsEn).slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-xs text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-2 rounded-2xl bg-secondary/25 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{isArabic ? "بلد المنشأ" : "Origin"}</span>
                        <span className="font-semibold">{product.originCountry}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{isArabic ? "طبيعة الطلب" : "Request type"}</span>
                        <span className="font-semibold">{isArabic ? "طلب حر" : "Free-form"}</span>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-2 pt-5">
                      <Button asChild variant="outline" className="flex-1 rounded-xl">
                        <Link to={`/products/${product.slug}`}>{isArabic ? "التفاصيل" : "Details"}</Link>
                      </Button>
                      <Button asChild variant="gold" className="flex-1 rounded-xl">
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

          {products.length === 0 ? (
            <div className="mt-10 rounded-[2rem] border border-dashed border-border bg-card/70 p-10 text-center">
              <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 font-serif text-2xl font-semibold">{isArabic ? "لا توجد منتجات مطابقة" : "No matching products"}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                {isArabic ? "غيّر البحث أو التصنيف. هذه الصفحة مخصصة لعرض نماذج المنتجات والخدمات التي يمكن لفريق Lourex التعامل معها." : "Adjust the search or category. This page is designed to show product and sourcing service examples Lourex can handle."}
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
