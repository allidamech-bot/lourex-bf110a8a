import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import Footer from "@/components/Footer";
import ProductImage from "@/components/ProductImage";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart, ArrowLeft, Package, Shield, Award,
  MapPin, Factory, FileText, Star, Send, MessageCircle, Heart, ClipboardList
} from "lucide-react";
import RequestOrderForm from "@/components/RequestOrderForm";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price_per_unit: number | null;
  currency: string | null;
  moq: string | null;
  weight_per_unit: number | null;
  units_per_carton: number | null;
  dimensions: string | null;
  image_url: string | null;
  cert_sfda: boolean;
  cert_saber: boolean;
  cert_halal: boolean;
  cert_iso: boolean;
  factory_id: string;
  factories?: { name: string; location: string; is_verified: boolean; reliability_score: number | null };
}

interface ProductPrice {
  currency: string;
  price: number;
}

const ProductDetailSkeleton = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pt-24 pb-16 container mx-auto px-4 max-w-5xl">
      <Skeleton className="h-4 w-48 mb-6" />
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </main>
  </div>
);

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("*, factories(name, location, is_verified, reliability_score)")
          .eq("id", id)
          .single();
        if (data) setProduct(data as unknown as Product);

        const { data: priceData } = await supabase
          .from("product_prices")
          .select("currency, price")
          .eq("product_id", id);
        if (priceData) setPrices(priceData);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: wl } = await supabase.from("wishlist")
            .select("id").eq("user_id", user.id).eq("product_id", id).maybeSingle();
          if (wl) setWishlisted(true);
        }
      } catch {
        // fail gracefully
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const addToCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    setAdding(true);
    const { error } = await supabase.from("cart_items").upsert(
      { user_id: user.id, product_id: id!, quantity: qty },
      { onConflict: "user_id,product_id" }
    );
    setAdding(false);
    if (error) toast.error(error.message);
    else toast.success(lang === "ar" ? "تمت الإضافة للسلة" : "Added to cart");
  };

  const displayPrice = () => {
    if (!product) return "";
    const alt = prices.find(p => p.currency === currency);
    const p = alt ? alt.price : product.price_per_unit ?? 0;
    const c = alt ? alt.currency : product.currency ?? "USD";
    return `${p.toLocaleString()} ${c}`;
  };

  if (loading) return <ProductDetailSkeleton />;

  if (!product) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 container mx-auto px-4 text-center">
        <div className="py-20">
          <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="font-serif text-xl font-semibold mb-2">
            {lang === "ar" ? "المنتج غير موجود" : "Product not found"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {lang === "ar" ? "قد يكون قد تم إزالته أو أن الرابط غير صحيح" : "It may have been removed or the link is incorrect."}
          </p>
          <Button variant="outline" onClick={() => navigate("/marketplace")}>
            {lang === "ar" ? "تصفح السوق" : "Browse Marketplace"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  const certs = [
    { key: "cert_sfda", label: "SFDA", active: product.cert_sfda },
    { key: "cert_saber", label: "SABER", active: product.cert_saber },
    { key: "cert_halal", label: "Halal", active: product.cert_halal },
    { key: "cert_iso", label: "ISO", active: product.cert_iso },
  ].filter(c => c.active);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-5xl">
        <Breadcrumbs />
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {lang === "ar" ? "رجوع" : "Back"}
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-2xl border border-primary/20 bg-card overflow-hidden">
            <ProductImage
              src={product.image_url}
              alt={product.name}
              className="w-full h-full"
              iconSize="w-20 h-20"
            />
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit">{product.category}</Badge>
            <h1 className="text-3xl font-bold">{product.name}</h1>

            {/* Factory */}
            {product.factories && (
              <Link
                to={`/supplier/${product.factory_id}`}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Factory className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.factories.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {product.factories.location}
                  </p>
                </div>
                {product.factories.is_verified && (
                  <Badge className="bg-primary/20 text-primary text-[10px] shrink-0">
                    <Shield className="w-3 h-3 mr-0.5" /> {lang === "ar" ? "موثق" : "Verified"}
                  </Badge>
                )}
                {product.factories.reliability_score != null && product.factories.reliability_score > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-primary shrink-0">
                    <Star className="w-3.5 h-3.5 fill-current" /> {product.factories.reliability_score}
                  </span>
                )}
              </Link>
            )}

            {/* Price */}
            <div className="bg-card border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-1">{lang === "ar" ? "سعر الوحدة" : "Unit Price"}</p>
              <p className="text-2xl font-bold text-gradient-gold">{displayPrice()}</p>
              {prices.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[product.currency || "USD", ...prices.map(p => p.currency)].filter((v, i, a) => a.indexOf(v) === i).map(c => (
                    <button key={c} onClick={() => setCurrency(c)}
                      className={`px-2 py-0.5 rounded text-xs ${currency === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Certs */}
            {certs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {certs.map(c => (
                  <Badge key={c.key} variant="outline" className="border-primary/30 text-primary">
                    <Award className="w-3 h-3 mr-1" /> {c.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Specs */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {product.moq && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">{lang === "ar" ? "الحد الأدنى" : "MOQ"}</p>
                  <p className="font-medium">{product.moq}</p>
                </div>
              )}
              {product.weight_per_unit != null && product.weight_per_unit > 0 && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">{lang === "ar" ? "الوزن" : "Weight"}</p>
                  <p className="font-medium">{product.weight_per_unit} kg</p>
                </div>
              )}
              {product.units_per_carton != null && product.units_per_carton > 0 && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">{lang === "ar" ? "وحدات/كرتون" : "Units/Carton"}</p>
                  <p className="font-medium">{product.units_per_carton}</p>
                </div>
              )}
              {product.dimensions && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">{lang === "ar" ? "الأبعاد" : "Dimensions"}</p>
                  <p className="font-medium">{product.dimensions}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 mt-2">
              <Button
                onClick={() => setShowOrderForm(!showOrderForm)}
                className="w-full bg-gradient-gold text-primary-foreground font-semibold h-12 text-base"
              >
                <ClipboardList className="w-5 h-5 mr-2" />
                {lang === "ar" ? "طلب شراء" : "Request Order"}
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-muted-foreground hover:text-foreground">−</button>
                  <span className="px-3 py-2 font-medium min-w-[3rem] text-center">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-muted-foreground hover:text-foreground">+</button>
                </div>
                <Button onClick={addToCart} disabled={adding} variant="outline" className="flex-1 font-semibold">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {lang === "ar" ? "أضف للسلة" : "Add to Cart"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/deals/new", { state: { product, factory: product.factories } })}
                >
                  <Send className="w-4 h-4 me-2" />
                  {lang === "ar" ? "طلب عرض سعر" : "Request Quote"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (!product.factories) return;
                    navigate(`/supplier/${product.factory_id}`);
                  }}
                >
                  <MessageCircle className="w-4 h-4 me-2" />
                  {lang === "ar" ? "تواصل" : "Contact"}
                </Button>
                <Button
                  variant={wishlisted ? "default" : "outline"}
                  size="icon"
                  className={wishlisted ? "bg-primary" : ""}
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) { navigate("/auth"); return; }
                    if (wishlisted) {
                      await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", id!);
                      setWishlisted(false);
                      toast.success(lang === "ar" ? "تمت الإزالة" : "Removed from wishlist");
                    } else {
                      await supabase.from("wishlist").insert({ user_id: user.id, product_id: id! });
                      setWishlisted(true);
                      toast.success(lang === "ar" ? "تمت الإضافة للمفضلة" : "Added to wishlist");
                    }
                  }}
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Request Order Form */}
            <AnimatePresence>
              {showOrderForm && product && (
                <RequestOrderForm
                  product={product}
                  factoryName={product.factories?.name}
                  onClose={() => setShowOrderForm(false)}
                />
              )}
            </AnimatePresence>

            {/* Description */}
            {product.description && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  {lang === "ar" ? "الوصف" : "Description"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
