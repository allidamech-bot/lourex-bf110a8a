import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Heart, Package, Trash2, ShoppingCart, Send } from "lucide-react";

interface WishlistItem {
  id: string;
  product_id: string;
  products: {
    name: string;
    price_per_unit: number | null;
    currency: string | null;
    image_url: string | null;
    category: string;
    moq: string | null;
    factory_id: string;
  };
}

const Wishlist = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data } = await supabase
        .from("wishlist")
        .select("id, product_id, products(name, price_per_unit, currency, image_url, category, moq, factory_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as unknown as WishlistItem[]) || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const removeItem = async (id: string) => {
    await supabase.from("wishlist").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success(lang === "ar" ? "تمت الإزالة من المفضلة" : "Removed from wishlist");
  };

  const addToCart = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-4xl">
        <Breadcrumbs />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">
            <Heart className="w-7 h-7 inline mr-2 text-primary" />
            {lang === "ar" ? "المفضلة" : "Wishlist"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {items.length} {lang === "ar" ? "منتج محفوظ" : "saved item(s)"}
          </p>
        </motion.div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{lang === "ar" ? "لا توجد منتجات محفوظة" : "No saved products yet"}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/marketplace")}>
              {lang === "ar" ? "تصفح المنتجات" : "Browse Products"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border/30 rounded-xl overflow-hidden hover:border-primary/30 transition-all">
                <Link to={`/product/${item.product_id}`}>
                  <div className="h-36 bg-secondary/50 flex items-center justify-center">
                    {item.products?.image_url ? (
                      <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                    ) : <Package className="w-8 h-8 text-muted-foreground/20" />}
                  </div>
                </Link>
                <div className="p-4 space-y-2">
                  <Link to={`/product/${item.product_id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                    {item.products?.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{item.products?.category}</p>
                  {item.products?.price_per_unit && (
                    <p className="text-primary font-bold text-sm">
                      {item.products.price_per_unit.toLocaleString()} {item.products.currency || "USD"}
                    </p>
                  )}
                  {item.products?.moq && <p className="text-[10px] text-muted-foreground">MOQ: {item.products.moq}</p>}
                  <div className="flex gap-1.5 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 text-xs"
                      onClick={() => addToCart(item.product_id)}>
                      <ShoppingCart className="w-3 h-3 me-1" /> {lang === "ar" ? "السلة" : "Cart"}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive"
                      onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Wishlist;
