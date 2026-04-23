import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BadgeCheck, Star, MapPin, Package, Globe, Shield, Send,
  ShoppingCart, ArrowLeft, MessageCircle
} from "lucide-react";
import { toast } from "sonner";

interface Factory {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string | null;
  is_verified: boolean;
  reliability_score: number | null;
  logo_url: string | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price_per_unit: number | null;
  currency: string | null;
  moq: string | null;
  image_url: string | null;
  cert_halal: boolean;
  cert_iso: boolean;
  cert_sfda: boolean;
  cert_saber: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const SupplierProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [factory, setFactory] = useState<Factory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      // Public profile only resolves for verified suppliers.
      const [{ data: f }, { data: p }, { data: r }] = await Promise.all([
        supabase.from("factories").select("*").eq("id", id).eq("is_verified", true).maybeSingle(),
        supabase
          .from("products")
          .select("*")
          .eq("factory_id", id)
          .eq("is_active", true)
          .eq("status", "approved"),
        supabase.from("reviews").select("*").eq("factory_id", id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (f) setFactory(f as Factory);
      setProducts((p as Product[]) || []);
      setReviews((r as Review[]) || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const addToCart = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { error } = await supabase.from("cart_items").upsert(
      { user_id: user.id, product_id: productId, quantity: 1 },
      { onConflict: "user_id,product_id" }
    );
    if (error) toast.error(error.message);
    else toast.success(lang === "ar" ? "تمت الإضافة للسلة" : "Added to cart");
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!factory) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 container mx-auto px-4 text-center">
        <p className="text-muted-foreground">Supplier not found</p>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 me-1" />
            {lang === "ar" ? "رجوع" : "Back"}
          </Button>

          {/* Supplier Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 mb-8"
          >
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                {factory.logo_url ? (
                  <img src={factory.logo_url} alt={factory.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <Globe className="w-10 h-10 text-primary/40" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{factory.name}</h1>
                  {factory.is_verified && (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <BadgeCheck className="w-3.5 h-3.5 me-1" />
                      {lang === "ar" ? "مورد مُتحقَّق منه" : "Verified Supplier"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {factory.location}</span>
                  <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {products.length} {lang === "ar" ? "منتج" : "Products"}</span>
                  {avgRating && (
                    <span className="flex items-center gap-1 text-primary">
                      <Star className="w-3.5 h-3.5 fill-current" /> {avgRating} ({reviews.length} {lang === "ar" ? "تقييم" : "reviews"})
                    </span>
                  )}
                </div>
                {factory.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{factory.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="gold" onClick={() => navigate(`/rfq/new?factory=${factory.id}`)}>
                  <Send className="w-4 h-4 me-1" /> {lang === "ar" ? "طلب عرض" : "Request Quote"}
                </Button>
                <Button variant="outline">
                  <MessageCircle className="w-4 h-4 me-1" /> {lang === "ar" ? "تواصل" : "Contact"}
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{products.length}</p>
                <p className="text-xs text-muted-foreground">{lang === "ar" ? "المنتجات" : "Products"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{avgRating || "—"}</p>
                <p className="text-xs text-muted-foreground">{lang === "ar" ? "التقييم" : "Rating"}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{factory.reliability_score || "—"}</p>
                <p className="text-xs text-muted-foreground">{lang === "ar" ? "الموثوقية" : "Reliability"}</p>
              </div>
            </div>
          </motion.div>

          {/* Products */}
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {lang === "ar" ? "المنتجات" : "Products"}
          </h2>
          {products.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {lang === "ar" ? "لا توجد منتجات حالياً" : "No products listed yet"}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border/30 rounded-xl overflow-hidden hover:border-primary/30 transition-all"
                >
                  <div className="h-36 bg-secondary/50 flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm">{p.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{p.category}</span>
                      {p.price_per_unit && (
                        <span className="text-sm font-bold text-primary">${p.price_per_unit}</span>
                      )}
                    </div>
                    {p.moq && <p className="text-[10px] text-muted-foreground">MOQ: {p.moq}</p>}
                    <div className="flex gap-1 flex-wrap">
                      {p.cert_halal && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Halal</Badge>}
                      {p.cert_iso && <Badge variant="outline" className="text-[10px] px-1.5 py-0">ISO</Badge>}
                      {p.cert_sfda && <Badge variant="outline" className="text-[10px] px-1.5 py-0">SFDA</Badge>}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => addToCart(p.id)}>
                        <ShoppingCart className="w-3 h-3 me-1" /> Cart
                      </Button>
                      <Button variant="gold" size="sm" className="flex-1 text-xs" asChild>
                        <Link to={`/product/${p.id}`}>Details</Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                {lang === "ar" ? "التقييمات" : "Reviews"}
              </h2>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="bg-card border border-border/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-primary fill-current" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SupplierProfile;
