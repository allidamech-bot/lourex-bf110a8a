import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, BadgeCheck, Star, Package, MapPin,
  ChevronDown, Send, X, Filter, Grid3X3, List, ShoppingCart, ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import ProductImage from "@/components/ProductImage";
import { useMemo } from "react";

interface ProductRow {
  id: string;
  name: string;
  category: string;
  moq: string;
  factory_id: string;
  price_per_unit: number | null;
  currency: string | null;
  image_url: string | null;
  description: string | null;
  weight_per_unit: number | null;
  dimensions: string | null;
  cert_sfda: boolean;
  cert_saber: boolean;
  cert_halal: boolean;
  cert_iso: boolean;
  created_at: string;
}

interface FactoryRow {
  id: string;
  name: string;
  category: string;
  location: string;
  is_verified: boolean;
  reliability_score: number | null;
  logo_url: string | null;
}

type SortOption = "newest" | "price_low" | "price_high" | "popular" | "name";

const ProductCardSkeleton = () => (
  <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
    <Skeleton className="h-40 w-full rounded-none" />
    <div className="p-4 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-1.5 mt-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  </div>
);

const Marketplace = () => {
  const { t, dir, lang } = useI18n();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [factories, setFactories] = useState<FactoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [country, setCountry] = useState("All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 99999]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Public visibility: only verified factories, and only their
        // active+approved products (RLS enforces the latter, but we
        // also constrain the query for clarity and performance).
        const [{ data: f }, { data: p }] = await Promise.all([
          supabase.from("factories").select("*").eq("is_verified", true).order("name"),
          supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .eq("status", "approved"),
        ]);
        const verifiedFactories = (f as FactoryRow[]) || [];
        const verifiedIds = new Set(verifiedFactories.map((x) => x.id));
        setFactories(verifiedFactories);
        setProducts(((p as ProductRow[]) || []).filter((x) => verifiedIds.has(x.factory_id)));
      } catch {
        // fail silently, show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const factoryMap = useMemo(() => {
    const m: Record<string, FactoryRow> = {};
    factories.forEach((f) => (m[f.id] = f));
    return m;
  }, [factories]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const countries = useMemo(
    () => ["All", ...Array.from(new Set(factories.map((f) => f.location).filter(Boolean)))],
    [factories]
  );

  const filtered = useMemo(() => {
    const result = products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (p.price_per_unit && (p.price_per_unit < priceRange[0] || p.price_per_unit > priceRange[1])) return false;
      if (country !== "All") {
        const f = factoryMap[p.factory_id];
        if (!f || f.location !== country) return false;
      }
      if (verifiedOnly) {
        const f = factoryMap[p.factory_id];
        if (!f || !f.is_verified) return false;
      }
      return true;
    });

    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "price_low":
        result.sort((a, b) => (a.price_per_unit || 0) - (b.price_per_unit || 0));
        break;
      case "price_high":
        result.sort((a, b) => (b.price_per_unit || 0) - (a.price_per_unit || 0));
        break;
      case "popular":
        result.sort((a, b) => {
          const fa = factoryMap[a.factory_id]?.reliability_score || 0;
          const fb = factoryMap[b.factory_id]?.reliability_score || 0;
          return fb - fa;
        });
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return result;
  }, [products, category, search, priceRange, country, factoryMap, sortBy, verifiedOnly]);

  const handleRFQ = (product: ProductRow) => {
    navigate("/deals/new", { state: { product, factory: factoryMap[product.factory_id] } });
  };

  const addToCart = async (product: ProductRow) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { error } = await supabase.from("cart_items").upsert(
      { user_id: user.id, product_id: product.id, quantity: 1 },
      { onConflict: "user_id,product_id" }
    );
    if (error) toast.error(error.message);
    else toast.success(lang === "ar" ? "تمت الإضافة للسلة" : "Added to cart");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <Breadcrumbs />
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">
              Global <span className="text-gradient-gold">Marketplace</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {lang === "ar"
                ? "اكتشف موردين موثقين، قارن المنتجات، وابدأ صفقاتك — كل ذلك مدعوم بالذكاء الاصطناعي."
                : "Discover verified suppliers, compare products, and start deals — all powered by AI."}
            </p>
          </motion.div>

          {/* Search & Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <SearchAutocomplete
              value={search}
              onChange={setSearch}
              placeholder={lang === "ar" ? "ابحث عن منتجات أو موردين..." : "Search products, suppliers..."}
              className="flex-1"
            />
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-card border border-border/50 rounded-lg px-3 py-2 text-sm"
              >
                <option value="newest">{lang === "ar" ? "الأحدث" : "Newest"}</option>
                <option value="price_low">{lang === "ar" ? "السعر: الأقل" : "Price: Low → High"}</option>
                <option value="price_high">{lang === "ar" ? "السعر: الأعلى" : "Price: High → Low"}</option>
                <option value="popular">{lang === "ar" ? "الأكثر شعبية" : "Most Popular"}</option>
                <option value="name">{lang === "ar" ? "الاسم" : "Name A-Z"}</option>
              </select>
              <Button
                variant={verifiedOnly ? "gold" : "outline"}
                size="sm"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className="text-xs whitespace-nowrap"
              >
                <BadgeCheck className="w-3.5 h-3.5 me-1" />
                {lang === "ar" ? "موثقين فقط" : "Verified Only"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "border-primary text-primary" : ""}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" /> {lang === "ar" ? "الفلاتر" : "Filters"}
                    </h3>
                    <button onClick={() => { setCategory("All"); setCountry("All"); setPriceRange([0, 99999]); }} className="text-xs text-primary hover:underline">
                      {lang === "ar" ? "مسح الكل" : "Clear All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "التصنيف" : "Category"}</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-secondary border border-border/50 rounded-lg px-3 py-2 text-sm"
                      >
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "بلد المنشأ" : "Origin Country"}</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-secondary border border-border/50 rounded-lg px-3 py-2 text-sm"
                      >
                        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "أقصى سعر" : "Max Price (USD)"}</label>
                      <Input
                        type="number"
                        value={priceRange[1] === 99999 ? "" : priceRange[1]}
                        onChange={(e) => setPriceRange([0, e.target.value ? Number(e.target.value) : 99999])}
                        placeholder={lang === "ar" ? "بدون حد" : "No limit"}
                        className="bg-secondary border-border/50"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Results count */}
          {!loading && (
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} {lang === "ar" ? "منتج" : `product${filtered.length !== 1 ? "s" : ""}`} {lang === "ar" ? "تم العثور عليه" : "found"}
            </p>
          )}

          {/* Products grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="font-serif text-lg font-semibold mb-1">
                {lang === "ar" ? "لا توجد منتجات" : "No products found"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {lang === "ar"
                  ? "جرّب تغيير الفلاتر أو البحث بكلمات مختلفة"
                  : "Try adjusting your filters or search with different keywords."}
              </p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-3"}>
              {filtered.map((product, i) => {
                const factory = factoryMap[product.factory_id];
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className={`bg-card border border-border/30 rounded-xl overflow-hidden hover:border-primary/30 transition-all group cursor-pointer ${
                      viewMode === "list" ? "flex" : ""
                    }`}
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {/* Image */}
                    <div className={viewMode === "list" ? "w-24 h-24 shrink-0" : "h-40"}>
                      <ProductImage
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-4 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                        {product.price_per_unit ? (
                          <span className="text-primary font-bold text-sm shrink-0">
                            ${product.price_per_unit}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                      {factory && (
                        <Link
                          to={`/supplier/${factory.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{factory.name}</span>
                          {factory.is_verified && <BadgeCheck className="w-3 h-3 text-primary shrink-0" />}
                          {factory.reliability_score != null && factory.reliability_score > 0 && (
                            <span className="flex items-center gap-0.5 text-primary shrink-0">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{factory.reliability_score}</span>
                            </span>
                          )}
                        </Link>
                      )}
                      {/* Certs */}
                      <div className="flex gap-1 flex-wrap">
                        {product.cert_halal && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Halal</Badge>}
                        {product.cert_iso && <Badge variant="outline" className="text-[10px] px-1.5 py-0">ISO</Badge>}
                        {product.cert_sfda && <Badge variant="outline" className="text-[10px] px-1.5 py-0">SFDA</Badge>}
                        {product.cert_saber && <Badge variant="outline" className="text-[10px] px-1.5 py-0">SABER</Badge>}
                      </div>
                      {product.moq && <p className="text-[10px] text-muted-foreground">MOQ: {product.moq}</p>}
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        >
                          <ShoppingCart className="w-3 h-3 me-1" /> {lang === "ar" ? "السلة" : "Cart"}
                        </Button>
                        <Button
                          variant="gold"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleRFQ(product); }}
                        >
                          <Send className="w-3 h-3 me-1" /> RFQ
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Marketplace;
