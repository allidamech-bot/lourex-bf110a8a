import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CreditCard, Building2, ArrowLeft, ShieldCheck, Package,
  Truck, CheckCircle2, Loader2, Factory, MapPin
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    name: string;
    price_per_unit: number | null;
    currency: string | null;
    image_url: string | null;
    factory_id: string;
  };
}

interface FactoryInfo {
  id: string;
  name: string;
  location: string;
  is_verified: boolean;
}

const Checkout = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [factories, setFactories] = useState<Record<string, FactoryInfo>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "card">("bank");
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);

      const { data } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity, products(name, price_per_unit, currency, image_url, factory_id)")
        .eq("user_id", user.id);

      const cartItems = (data as unknown as CartItem[]) || [];
      if (cartItems.length === 0) { navigate("/cart"); return; }
      setItems(cartItems);

      // Load supplier info for all factory IDs
      const factoryIds = [...new Set(cartItems.map(i => i.products?.factory_id).filter(Boolean))];
      if (factoryIds.length > 0) {
        const { data: factoryData } = await supabase
          .from("factories")
          .select("id, name, location, is_verified")
          .in("id", factoryIds);
        if (factoryData) {
          const map: Record<string, FactoryInfo> = {};
          factoryData.forEach(f => { map[f.id] = f; });
          setFactories(map);
        }
      }

      setLoading(false);
    };
    load();
  }, [navigate]);

  const total = items.reduce((sum, i) => sum + (i.products?.price_per_unit ?? 0) * i.quantity, 0);
  const deposit = Math.round(total * 0.3);
  const balance = total - deposit;
  const currency = items[0]?.products?.currency ?? "USD";
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleSubmit = async () => {
    if (!user || submitting || submitted) return;
    setSubmitting(true);

    try {
      // Group items by factory
      const byFactory: Record<string, CartItem[]> = {};
      items.forEach(item => {
        const fid = item.products.factory_id;
        if (!byFactory[fid]) byFactory[fid] = [];
        byFactory[fid].push(item);
      });

      const createdOrders: string[] = [];

      for (const [factoryId, factoryItems] of Object.entries(byFactory)) {
        const orderTotal = factoryItems.reduce((s, i) => s + (i.products?.price_per_unit ?? 0) * i.quantity, 0);
        const orderDeposit = Math.round(orderTotal * 0.3);
        const qty = factoryItems.reduce((s, i) => s + i.quantity, 0);
        const orderNumber = `LRX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const { data: order, error } = await supabase.from("orders").insert({
          order_number: orderNumber,
          buyer_id: user.id,
          factory_id: factoryId,
          product_id: factoryItems[0].product_id,
          quantity: qty,
          total_amount: orderTotal,
          deposit_amount: orderDeposit,
          balance_amount: orderTotal - orderDeposit,
          currency,
          notes: [
            notes,
            deliveryDate ? `Preferred delivery: ${deliveryDate}` : "",
          ].filter(Boolean).join("\n") || null,
          status: "pending",
          payment_status: "awaiting_deposit",
        }).select("id, order_number").single();

        if (error) throw error;
        if (order) createdOrders.push(order.order_number);
      }

      // Clear cart
      await supabase.from("cart_items").delete().eq("user_id", user.id);

      setSubmitted(true);
      toast.success(
        lang === "ar"
          ? `تم إنشاء ${createdOrders.length} طلب بنجاح!`
          : `${createdOrders.length} order(s) placed successfully!`
      );
      setTimeout(() => navigate("/orders"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-lg text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">{lang === "ar" ? "تم تقديم الطلب بنجاح!" : "Order Placed Successfully!"}</h1>
          <p className="text-muted-foreground">
            {lang === "ar" ? "جاري التحويل إلى صفحة الطلبات..." : "Redirecting to your orders..."}
          </p>
        </motion.div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-4xl">
        <Breadcrumbs />
        <Button variant="ghost" size="sm" onClick={() => navigate("/cart")} className="mb-4 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> {lang === "ar" ? "العودة للسلة" : "Back to Cart"}
        </Button>

        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-8">
          {lang === "ar" ? "إتمام الطلب" : "Checkout"}
        </motion.h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Order details */}
          <div className="md:col-span-2 space-y-6">
            {/* Items summary with supplier info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {lang === "ar" ? "ملخص المنتجات" : "Order Items"} ({totalQty} {lang === "ar" ? "وحدة" : "units"})
              </h2>
              <div className="space-y-3">
                {items.map(item => {
                  const factory = factories[item.products?.factory_id];
                  return (
                    <div key={item.id} className="flex items-center gap-3 text-sm">
                      <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {item.products?.image_url ? (
                          <img src={item.products.image_url} alt="" className="w-full h-full object-cover" />
                        ) : <Package className="w-4 h-4 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.products?.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{lang === "ar" ? "الكمية" : "Qty"}: {item.quantity}</span>
                          {factory && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Factory className="w-2.5 h-2.5" /> {factory.name}
                              </span>
                              {factory.is_verified && (
                                <ShieldCheck className="w-2.5 h-2.5 text-primary" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-primary shrink-0">
                        {((item.products?.price_per_unit ?? 0) * item.quantity).toLocaleString()} {currency}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Supplier Info Card */}
            {Object.values(factories).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-primary" />
                  {lang === "ar" ? "المورد" : "Supplier Information"}
                </h2>
                <div className="space-y-2">
                  {Object.values(factories).map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Factory className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {f.location}
                        </p>
                      </div>
                      {f.is_verified && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> {lang === "ar" ? "موثق" : "Verified"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Delivery details */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                {lang === "ar" ? "تفاصيل إضافية" : "Additional Details"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {lang === "ar" ? "تاريخ التسليم المطلوب" : "Preferred Delivery Date"}
                  </label>
                  <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                    className="bg-secondary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {lang === "ar" ? "ملاحظات" : "Order Notes"}
                  </label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder={lang === "ar" ? "أي تفاصيل إضافية..." : "Any additional details or specifications..."}
                    className="bg-secondary" rows={3} />
                </div>
              </div>
            </motion.div>

            {/* Payment method */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                {lang === "ar" ? "طريقة الدفع" : "Payment Method"}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("bank")}
                  className={`p-4 rounded-xl border-2 text-start transition-all ${
                    paymentMethod === "bank" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <Building2 className={`w-5 h-5 mb-2 ${paymentMethod === "bank" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">{lang === "ar" ? "تحويل بنكي" : "Bank Transfer"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "ar" ? "دفع عبر التحويل البنكي" : "Pay via wire transfer"}
                  </p>
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-4 rounded-xl border-2 text-start transition-all ${
                    paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <CreditCard className={`w-5 h-5 mb-2 ${paymentMethod === "card" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">{lang === "ar" ? "بطاقة ائتمان" : "Credit Card"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lang === "ar" ? "فيزا / ماستركارد" : "Visa / Mastercard"}
                  </p>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right: Summary */}
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-card border border-primary/20 rounded-xl p-5 sticky top-24">
              <h2 className="font-semibold mb-4">{lang === "ar" ? "ملخص الطلب" : "Order Summary"}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "عدد المنتجات" : "Items"}</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "إجمالي الوحدات" : "Total Units"}</span>
                  <span>{totalQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "المجموع" : "Subtotal"}</span>
                  <span>{total.toLocaleString()} {currency}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-primary">
                    <span className="text-muted-foreground">{lang === "ar" ? "الدفعة المقدمة (30%)" : "Deposit (30%)"}</span>
                    <span className="font-semibold">{deposit.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">{lang === "ar" ? "المتبقي (70%)" : "Balance (70%)"}</span>
                    <span>{balance.toLocaleString()} {currency}</span>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">{lang === "ar" ? "الإجمالي" : "Total"}</span>
                    <span className="text-xl font-bold text-gradient-gold">{total.toLocaleString()} {currency}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || submitted}
                className="w-full mt-6 bg-gradient-gold text-primary-foreground font-semibold h-12"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {lang === "ar" ? "تأكيد الطلب" : "Confirm Order"}
              </Button>

              <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{lang === "ar" ? "جميع المعاملات محمية ومؤمنة" : "All transactions are secure and protected"}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
