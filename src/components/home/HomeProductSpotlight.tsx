import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, PackageSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { fetchCatalogProducts } from "@/features/products/services/productCatalogService";
import type { ProductCatalogItem } from "@/features/products/types/productTypes";

const isPresentableProduct = (product: ProductCatalogItem) => {
  const isDemo = product.id.startsWith("sample-")
    || product.brand?.toLowerCase().includes("sample")
    || product.tagsEn.some((tag) => /demo|sample/i.test(tag));
  return product.status === "active" && !isDemo && Boolean(product.slug);
};

/** Curated window onto the existing product catalog. Read-only: no writes or new APIs. */
export default function HomeProductSpotlight() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const reducedMotion = useReducedMotion();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);

  useEffect(() => {
    let active = true;

    fetchCatalogProducts()
      .then((items) => {
        if (!active) return;
        setProducts(items.filter(isPresentableProduct).slice(0, 3));
      })
      .catch(() => {
        // This visual section is optional. Catalog errors must not affect the homepage.
      });

    return () => {
      active = false;
    };
  }, []);

  if (!products.length) return null;

  return (
    <section id="featured-products" aria-labelledby="featured-products-title" className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-10 xl:px-14">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reducedMotion ? 0 : 0.6 }}
          className="mb-10 flex flex-col items-start justify-between gap-7 sm:mb-14 lg:flex-row lg:items-end"
        >
          <div className="max-w-[47rem]">
            <span className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary rtl:tracking-normal">
              <span className="h-px w-9 bg-primary/60" aria-hidden="true" />
              {ar ? "من الكتالوج" : "FROM OUR CATALOG"}
            </span>
            <h2 id="featured-products-title" className="mt-5 text-[clamp(2.2rem,4.3vw,4.35rem)] font-extrabold leading-[1.17] tracking-[-0.04em] text-heading rtl:tracking-normal">
              {ar ? <>منتجات تستحق <span className="text-primary">نظرة أقرب.</span></> : <>Explore the products. <span className="text-primary">Start a conversation.</span></>}
            </h2>
            <p className="mt-5 max-w-lg text-[15px] leading-8 text-muted-foreground">
              {ar ? "تعرّف على المنتجات المعروضة وابدأ طلبًا بالمواصفات والكميات التي تحتاجها." : "Discover listed products and send a sourcing request with your own quantities and specifications."}
            </p>
          </div>
          <Link to="/products" className="group inline-flex min-h-12 shrink-0 items-center gap-3 border-b border-primary/50 py-2 text-sm font-bold text-primary transition-colors hover:border-primary">
            {ar ? "عرض الكتالوج كاملًا" : "See the entire catalog"}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </motion.div>

        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 [scrollbar-width:thin] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {products.map((product, index) => {
            const image = product.images.find((photo) => photo.url && photo.url !== "/logo.png");
            const name = ar ? product.nameAr : product.nameEn;
            const summary = ar ? product.shortDescriptionAr : product.shortDescriptionEn;

            return (
              <motion.article
                key={product.id}
                initial={reducedMotion ? false : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : index * 0.09 }}
                className="group flex w-[min(83vw,360px)] shrink-0 snap-center flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_65px_-42px_rgba(8,127,120,0.4)] sm:w-auto"
              >
                <Link to={`/products/${product.slug}`} aria-label={name} className="relative flex aspect-[1.22] items-center justify-center overflow-hidden bg-[#E7F2EC] dark:bg-[#172D29]">
                  <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-24 h-64 w-64 rounded-full border border-primary/15" />
                  <div aria-hidden="true" className="pointer-events-none absolute -end-7 -top-10 h-44 w-44 rounded-full border border-primary/10" />
                  {image ? (
                    <img
                      src={image.url}
                      alt={ar ? image.altAr || name : image.altEn || name}
                      loading="lazy"
                      decoding="async"
                      className="relative h-full w-full object-contain p-10 transition-transform duration-700 group-hover:scale-[1.06]"
                    />
                  ) : (
                    <PackageSearch className="h-20 w-20 text-primary/35" strokeWidth={0.8} aria-hidden="true" />
                  )}
                  <span className="absolute start-5 top-5 rounded-full border border-primary/15 bg-card/90 px-3 py-1 text-[10px] font-bold text-primary backdrop-blur">
                    {ar ? "كتالوج لوريكس" : "LOUREX CATALOG"}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary rtl:tracking-normal">{product.originCountry}</p>
                  <h3 className="mt-2 line-clamp-2 text-[clamp(1.2rem,1.8vw,1.65rem)] font-bold leading-snug text-heading">{name}</h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-7 text-muted-foreground">{summary}</p>
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-border/70 pt-5 [margin-top:1.5rem]">
                    <Link to={`/request?source=products&product=${encodeURIComponent(product.id)}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-center text-xs font-bold text-primary-foreground transition hover:opacity-90 sm:text-[13px]">
                      {ar ? "طلب توريد" : "Request sourcing"}
                      <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                    <Link to={`/products/${product.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-xs font-bold text-heading transition hover:border-primary/30 hover:text-primary sm:text-[13px]">
                      {ar ? "التفاصيل" : "Details"}
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
