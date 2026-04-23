import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingCart, Trash2, Plus, Minus, Package, ArrowRight } from "lucide-react";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    name: string;
    price_per_unit: number | null;
    currency: string | null;
    image_url: string | null;
    category: string;
  };
}

const Cart = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data } = await supabase
      .from("cart_items")
      .select("id, product_id, quantity, products(name, price_per_unit, currency, image_url, category)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as unknown as CartItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCart(); }, []);

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return removeItem(id);
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeItem = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success(lang === "ar" ? "تم الحذف" : "Removed");
  };

  const total = items.reduce((sum, i) => sum + (i.products?.price_per_unit ?? 0) * i.quantity, 0);
  const mainCurrency = items[0]?.products?.currency ?? "USD";

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-3xl">
        <Breadcrumbs />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">
            <ShoppingCart className="w-7 h-7 inline mr-2 text-primary" />
            {lang === "ar" ? "سلة التسوق" : "Shopping Cart"}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {items.length} {lang === "ar" ? "منتج" : "item(s)"}
          </p>
        </motion.div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{lang === "ar" ? "سلتك فارغة" : "Your cart is empty"}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/marketplace")}>
              {lang === "ar" ? "تصفح المنتجات" : "Browse Products"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
                <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.products?.image_url ? (
                    <img src={item.products.image_url} alt={item.products?.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/product/${item.product_id}`)}>
                    {item.products?.name}
                  </p>
                  <p className="text-sm text-primary font-semibold">
                    {(item.products?.price_per_unit ?? 0).toLocaleString()} {item.products?.currency ?? "USD"}
                  </p>
                </div>
                <div className="flex items-center border border-border rounded-lg">
                  <button onClick={() => updateQty(item.id, item.quantity - 1)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity + 1)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => removeItem(item.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}

            {/* Summary */}
            <div className="bg-card border border-primary/20 rounded-xl p-5 mt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">{lang === "ar" ? "المجموع" : "Total"}</span>
                <span className="text-2xl font-bold text-gradient-gold">{total.toLocaleString()} {mainCurrency}</span>
              </div>
              <Button className="w-full bg-gradient-gold text-primary-foreground font-semibold"
                onClick={() => navigate("/checkout")}>
                {lang === "ar" ? "إتمام الطلب" : "Proceed to Checkout"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
