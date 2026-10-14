import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, ChevronDown, Filter, Loader2, PackageSearch, Search, X } from "lucide-react";
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
import "./lourex-home.css";
import "./lourex-catalog.css";

export default function ProductsPage() {
  const { t, lang } = useI18n();
  const isArabic = lang === "ar";
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [catalogProducts, setCatalogProducts] = useState<ProductCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const categories = listProductCategories();
  const products = useMemo(
    () => filterProductList({ products: catalogProducts, query, categoryId }),
    [catalogProducts, categoryId, query],
  );
  const counts = useMemo(() => catalogProducts.reduce<Record<string, number>>((result, product) => {
    result[product.categoryId] = (result[product.categoryId] || 0) + 1;
    return result;
  }, {}), [catalogProducts]);
  const activeCategory = getCategoryById(categoryId);
  const hasFilters = Boolean(query.trim() || categoryId !== "all");
  const resetFilters = () => { setQuery(""); setCategoryId("all"); };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchCatalogProducts()
      .then((nextProducts) => {
        if (!cancelled) setCatalogProducts(nextProducts);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [attempt]);

  return (
    <div className="dark lourex-home lourex-catalog min-h-screen bg-background text-foreground" data-lourex-catalog>
      <SEO title={t("products.listing.seoTitle")} description={t("products.listing.seoDescription")} url="https://www.lou-rex.com/products" />
      <SiteHeader />
      <main>
        <section className="lrx-catalog-intro" aria-labelledby="catalog-title">
          <div className="lrx-catalog-shell lrx-catalog-intro-layout">
            <motion.div initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .6 }}>
              <nav aria-label={isArabic ? "مسار الصفحة" : "Breadcrumb"} className="lrx-catalog-breadcrumb">
                <Link to="/">LOUREX</Link><span aria-hidden="true">/</span><span>{isArabic ? "المنتجات" : "Products"}</span>
              </nav>
              <p className="lrx-kicker">THE LIVING TRADE / CATALOG</p>
              <h1 id="catalog-title">{isArabic ? <>منتجك القادم.<br /><span>فرصتك التالية.</span></> : <>Your next product.<br /><span>Your next possibility.</span></>}</h1>
              <p className="lrx-catalog-description">{isArabic ? "استكشف المنتجات المعروضة وحدّد ما تحتاجه تجارتك. أنشئ طلب توريد بالمواصفات والكمية والوجهة المناسبة لك." : "Explore the catalog and define what your business needs. Start a sourcing request with your specifications, quantity and destination."}</p>
              <div className="lrx-catalog-intro-actions">
                <a href="#catalog-browser" className="lrx-text-link">{isArabic ? "استكشف الكتالوج" : "Explore the catalog"}<ArrowDown size={16} aria-hidden="true" /></a>
                <Link to="/request" className="lrx-primary">{isArabic ? "لديك منتج محدّد؟" : "Have a specific product in mind?"}<ArrowUpRight size={17} className="rtl:-scale-x-100" aria-hidden="true" /></Link>
              </div>
            </motion.div>
            <div className="lrx-catalog-brief">
              <div className="lrx-catalog-brief-top"><span>LOUREX / SOURCING BRIEF</span><img src="/lourex-official.jpeg" alt="" width="56" height="56" /></div>
              <p>{isArabic ? "من المنتج، إلى طلب واضح." : "From a product to a clear brief."}</p>
              <ol>
                {(isArabic ? ["المنتج", "المواصفات", "الكمية", "الوجهة"] : ["Product", "Specs", "Quantity", "Destination"]).map((label, index) => (
                  <li key={label}><span className="lrx-brief-facet" aria-hidden="true">0{index + 1}</span><span>{label}</span></li>
                ))}
              </ol>
              <span className="lrx-catalog-brief-note">{isArabic ? "نبدأ من التفاصيل التي تحتاجها تجارتك." : "The details your business needs. The place we start."}</span>
            </div>
          </div>
          <div className="lrx-catalog-colorline" aria-hidden="true" />
        </section>

        <section id="catalog-browser" className="lrx-catalog-shell lrx-catalog-browser" aria-labelledby="catalog-browser-title">
          <div className="lrx-catalog-browser-heading">
            <div><p className="lrx-kicker">LOUREX / PRODUCT EXPLORER</p><h2 id="catalog-browser-title">{isArabic ? "استكشف الكتالوج" : "Explore the catalog"}</h2></div>
            <p className="lrx-catalog-disclaimer">{t("products.listing.examplesEyebrow")}</p>
          </div>
          <div className="lrx-catalog-controls">
            <label className="lrx-catalog-search">
              <span className="sr-only">{t("products.listing.searchPlaceholder")}</span>
              <Search size={19} aria-hidden="true" />
              <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("products.listing.searchPlaceholder")} className="lrx-catalog-input" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label={isArabic ? "مسح البحث" : "Clear search"}><X size={17} aria-hidden="true" /></button>}
            </label>
            <label className="lrx-catalog-select">
              <span className="sr-only">{t("products.listing.allCategories")}</span><Filter size={16} aria-hidden="true" />
              <select value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                <option value="all">{t("products.listing.allCategories")}</option>
                {categories.map(category => <option key={category.id} value={category.id}>{isArabic ? category.labelAr : category.labelEn}</option>)}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          </div>
          <div className="lrx-catalog-workspace">
            <aside className="lrx-catalog-sectors" aria-label={isArabic ? "تصفية حسب القطاع" : "Filter by sector"}>
              <p>{isArabic ? "قطاعات التوريد" : "Sourcing sectors"}</p>
              <div className="lrx-sector-options">
                <button type="button" aria-pressed={categoryId === "all"} onClick={() => setCategoryId("all")}><span>{t("products.listing.allCategories")}</span><span>{loading ? "—" : catalogProducts.length}</span></button>
                {categories.map((category, index) => <button type="button" key={category.id} aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}><span className="lrx-sector-index" aria-hidden="true">0{index + 1}</span><span>{isArabic ? category.labelAr : category.labelEn}</span><span>{loading ? "—" : counts[category.id] || 0}</span></button>)}
              </div>
              <div className="lrx-catalog-sidebar-note"><PackageSearch size={21} aria-hidden="true" /><p>{isArabic ? "لم تجد ما تبحث عنه؟ حدّد المنتج والمواصفات في طلب توريد." : "Looking for something else? Tell us the product and specifications in a sourcing request."}</p><Link to="/request">{isArabic ? "أنشئ طلبك" : "Create your brief"}<ArrowUpRight size={16} className="rtl:-scale-x-100" aria-hidden="true" /></Link></div>
            </aside>
            <div className="lrx-catalog-results" aria-busy={loading}>
              <div className="lrx-catalog-results-bar">
                <h3>{activeCategory ? (isArabic ? activeCategory.labelAr : activeCategory.labelEn) : t("products.listing.allCategories")}</h3>
                <span role="status" aria-live="polite">{loading ? (isArabic ? "جارٍ التحميل…" : "Loading…") : loadError ? (isArabic ? "تعذّر التحميل" : "Unable to load") : `${products.length} ${isArabic ? "نتيجة" : products.length === 1 ? "result" : "results"}`}</span>
                {hasFilters && <button type="button" onClick={resetFilters}>{isArabic ? "إعادة ضبط" : "Reset filters"}<X size={13} aria-hidden="true" /></button>}
              </div>
              {loading ? (
                <div className="lrx-catalog-state" role="status"><Loader2 className="animate-spin" size={27} aria-hidden="true" /><p>{t("products.listing.loading")}</p></div>
              ) : loadError ? (
                <div className="lrx-catalog-state" role="alert"><PackageSearch size={32} aria-hidden="true" /><h3>{isArabic ? "تعذّر تحميل الكتالوج" : "The catalog could not be loaded"}</h3><p>{isArabic ? "أعد المحاولة للاطلاع على المنتجات." : "Please try again to view the products."}</p><button className="lrx-primary" type="button" onClick={() => setAttempt(value => value + 1)}>{isArabic ? "إعادة المحاولة" : "Try again"}</button></div>
              ) : products.length ? (
                <div className="lrx-catalog-product-grid">
                  {products.map(product => {
                    const category = getCategoryById(product.categoryId);
                    const image = product.images.find(photo => photo.url && photo.url !== "/logo.png");
                    const isExample = product.id.startsWith("sample-") || product.tagsEn.some(tag => /demo|sample/i.test(tag));
                    return (
                      <article key={product.id} className="lrx-catalog-product" data-product-id={product.id}>
                        <Link to={`/products/${product.slug}`} className="lrx-catalog-product-image" aria-label={isArabic ? product.nameAr : product.nameEn}>
                          {image ? <img src={image.url} alt={isArabic ? image.altAr || product.nameAr : image.altEn || product.nameEn} loading="lazy" decoding="async" width="600" height="480" /> : <div className="lrx-catalog-image-placeholder"><svg viewBox="0 0 180 180" aria-hidden="true"><path d="M90 15 155 53V127L90 165 25 127V53Z M25 53 90 90 155 53 M90 90V165 M25 127 90 90 155 127" /></svg><span>{isArabic ? "صورة المنتج غير متاحة" : "Product image unavailable"}</span></div>}
                          {(product.isFeatured || isExample) && <span className="lrx-catalog-product-badge">{isExample ? t("requests.labels.sourcingExample") : t("products.listing.featuredExample")}</span>}
                          <span className="lrx-catalog-image-action" aria-hidden="true"><ArrowUpRight size={18} className="rtl:-scale-x-100" /></span>
                        </Link>
                        <div className="lrx-catalog-product-body">
                          <p className="lrx-catalog-product-category">{category ? (isArabic ? category.labelAr : category.labelEn) : product.categoryId}</p>
                          <h2><Link to={`/products/${product.slug}`}>{isArabic ? product.nameAr : product.nameEn}</Link></h2>
                          <p className="lrx-catalog-product-summary">{isArabic ? product.shortDescriptionAr : product.shortDescriptionEn}</p>
                          <div className="lrx-catalog-tags">{(isArabic ? product.tagsAr : product.tagsEn).slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}</div>
                          <dl><div><dt>{t("products.listing.origin")}</dt><dd>{product.originCountry}</dd></div>{product.packaging && <div><dt>{isArabic ? "التعبئة" : "Packaging"}</dt><dd>{product.packaging}</dd></div>}</dl>
                          <div className="lrx-catalog-product-actions"><Link to={`/products/${product.slug}`} className="lrx-catalog-details">{t("products.listing.details")}</Link><Link to={`/request?source=products&product=${encodeURIComponent(product.id)}`} className="lrx-primary">{t("products.listing.createRequest")}<ArrowUpRight size={16} className="rtl:-scale-x-100" aria-hidden="true" /></Link></div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="lrx-catalog-state"><PackageSearch size={36} aria-hidden="true" /><h3>{t("requests.labels.emptyCatalogTitle")}</h3><p>{t("requests.labels.emptyCatalogDescription")}</p>{hasFilters && <button type="button" className="lrx-catalog-reset" onClick={resetFilters}>{isArabic ? "مسح الفلاتر" : "Clear filters"}</button>}<Link to="/request" className="lrx-primary">{isArabic ? "ابدأ طلب توريد" : "Start a sourcing request"}<ArrowUpRight size={16} className="rtl:-scale-x-100" aria-hidden="true" /></Link></div>
              )}
            </div>
          </div>
        </section>
        <section className="lrx-catalog-closing"><div className="lrx-catalog-shell"><div><p className="lrx-kicker">YOUR NEXT CONNECTION</p><h2>{isArabic ? "طلبك يبدأ من التفاصيل." : "Your brief starts with the details."}</h2><p>{isArabic ? "المنتج، المواصفات، الكمية والوجهة. اجمعها في طلب واحد." : "Product, specifications, quantity and destination. Bring them together in one request."}</p></div><Link to="/request" className="lrx-primary">{isArabic ? "أنشئ طلب توريد" : "Create a sourcing request"}<ArrowUpRight size={18} className="rtl:-scale-x-100" aria-hidden="true" /></Link></div></section>
      </main>
      <Footer />
    </div>
  );
}
